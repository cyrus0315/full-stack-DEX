import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { Transaction } from './entities/transaction.entity';
import {
  TransactionDto,
  TransactionDetailDto,
  TransactionListQueryDto,
  TransactionListResponseDto,
  TransactionStatsDto,
} from './dto/transaction.dto';

/**
 * Transaction Service
 * 负责交易的获取、存储和查询
 */
@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly blockchainProvider: BlockchainProvider,
  ) {}

  /**
   * 通过哈希获取交易详情
   */
  async getTransactionByHash(hash: string): Promise<TransactionDetailDto> {
    // 先从数据库查询
    let transaction = await this.transactionRepository.findOne({
      where: { hash: hash.toLowerCase() },
    });

    // 如果数据库没有，从链上获取并保存
    if (!transaction) {
      this.logger.debug(`数据库中未找到交易 ${hash}，从链上获取`);
      transaction = await this.fetchAndSaveTransaction(hash);
    }

    return this.toDetailDto(transaction);
  }

  /**
   * 获取交易列表（分页）
   */
  async getTransactionList(
    query: TransactionListQueryDto,
  ): Promise<TransactionListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    this.logger.debug(`查询交易列表: page=${page}, limit=${limit}`);

    try {
      let queryBuilder = this.transactionRepository.createQueryBuilder('tx');

      // 地址过滤（发送方或接收方）
      if (query.address) {
        const addr = query.address.toLowerCase();
        queryBuilder = queryBuilder.andWhere(
          '(tx.from = :address OR tx.to = :address)',
          { address: addr },
        );
      }

      // 发送方过滤
      if (query.from) {
        queryBuilder = queryBuilder.andWhere('tx.from = :from', {
          from: query.from.toLowerCase(),
        });
      }

      // 接收方过滤
      if (query.to) {
        queryBuilder = queryBuilder.andWhere('tx.to = :to', {
          to: query.to.toLowerCase(),
        });
      }

      // 状态过滤
      if (query.status !== undefined) {
        queryBuilder = queryBuilder.andWhere('tx.status = :status', {
          status: query.status,
        });
      }

      // 区块范围过滤
      if (query.startBlock) {
        queryBuilder = queryBuilder.andWhere('tx.blockNumber >= :startBlock', {
          startBlock: query.startBlock,
        });
      }

      if (query.endBlock) {
        queryBuilder = queryBuilder.andWhere('tx.blockNumber <= :endBlock', {
          endBlock: query.endBlock,
        });
      }

      queryBuilder = queryBuilder
        .orderBy('tx.blockNumber', 'DESC')
        .addOrderBy('tx.transactionIndex', 'DESC')
        .skip(skip)
        .take(limit);

      const [transactions, total] = await queryBuilder.getManyAndCount();

      this.logger.debug(`查询到 ${total} 条交易记录`);

      return {
        transactions: transactions.map((tx) => this.toDto(tx)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`获取交易列表失败`, error.stack);
      throw error;
    }
  }

  /**
   * 根据地址获取交易列表
   */
  async getTransactionsByAddress(
    address: string,
    query: TransactionListQueryDto,
  ): Promise<TransactionListResponseDto> {
    // 复用 getTransactionList 方法，添加 address 过滤
    return this.getTransactionList({
      ...query,
      address,
    });
  }

  /**
   * 获取地址的交易统计
   */
  async getTransactionStats(address: string): Promise<TransactionStatsDto> {
    const normalizedAddress = address.toLowerCase();

    try {
      // 总交易数
      const totalTransactions = await this.transactionRepository.count({
        where: [
          { from: normalizedAddress },
          { to: normalizedAddress },
        ],
      });

      // 成功交易数
      const successTransactions = await this.transactionRepository.count({
        where: [
          { from: normalizedAddress, status: 1 },
          { to: normalizedAddress, status: 1 },
        ],
      });

      // 失败交易数
      const failedTransactions = totalTransactions - successTransactions;

      // 最近24小时交易数
      const dayAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
      const queryBuilder = this.transactionRepository
        .createQueryBuilder('tx')
        .where('(tx.from = :address OR tx.to = :address)', { address: normalizedAddress })
        .andWhere('tx.timestamp >= :dayAgo', { dayAgo: dayAgo.toString() });

      const last24HoursCount = await queryBuilder.getCount();

      // 总转账金额和 Gas 费用（简化计算）
      return {
        totalTransactions,
        successTransactions,
        failedTransactions,
        totalValue: '0', // TODO: 计算总转账金额
        totalGasCost: '0', // TODO: 计算总 Gas 费用
        last24HoursCount,
      };
    } catch (error) {
      this.logger.error(`获取交易统计失败: ${address}`, error.stack);
      throw error;
    }
  }

  /**
   * 从链上获取交易并保存到数据库
   */
  private async fetchAndSaveTransaction(hash: string): Promise<Transaction> {
    try {
      // 获取交易详情
      const [tx, receipt] = await Promise.all([
        this.blockchainProvider.getTransactionByHash(hash),
        this.blockchainProvider.getTransactionReceipt(hash),
      ]);

      if (!tx) {
        throw new NotFoundException(`交易不存在: ${hash}`);
      }

      // 获取区块信息（获取时间戳）
      const block = await this.blockchainProvider.getBlock(tx.blockNumber);

      // 解析方法名称（从 input 前 10 个字符）
      let methodName: string | undefined;
      if (tx.input && tx.input.length >= 10) {
        const methodId = tx.input.substring(0, 10);
        // TODO: 可以从 ABI 解析方法名称
        methodName = methodId;
      }

      // 创建交易记录
      const transaction = this.transactionRepository.create();
      transaction.hash = tx.hash.toLowerCase();
      transaction.blockNumber = tx.blockNumber.toString();
      transaction.blockHash = tx.blockHash || null;
      transaction.transactionIndex = tx.transactionIndex;
      transaction.from = tx.from.toLowerCase();
      transaction.to = tx.to ? tx.to.toLowerCase() : null;
      transaction.value = tx.value.toString();
      transaction.gasPrice = tx.gasPrice?.toString() || '0';
      transaction.gas = tx.gas.toString();
      transaction.gasUsed = receipt.gasUsed.toString();
      transaction.input = tx.input;
      transaction.nonce = tx.nonce.toString();
      transaction.status = receipt.status === 'success' ? 1 : 0;
      transaction.type = tx.type === 'eip1559' ? 2 : 0;
      transaction.timestamp = block.timestamp.toString();
      transaction.isContractCreation = !tx.to;
      transaction.contractAddress = receipt.contractAddress || undefined;
      if (methodName) {
        transaction.methodName = methodName;
      }

      await this.transactionRepository.save(transaction);

      this.logger.log(`交易已保存: ${hash}`);

      return transaction;
    } catch (error) {
      this.logger.error(`获取并保存交易失败: ${hash}`, error.stack);
      throw error;
    }
  }

  /**
   * 同步地址的交易记录（简化版：只获取最新几笔）
   * 注意：完整的历史交易同步需要使用 Etherscan API 或类似服务
   */
  async syncAddressTransactions(
    address: string,
    limit: number = 10,
  ): Promise<number> {
    this.logger.log(`开始同步地址交易: ${address}, 限制 ${limit} 笔`);

    try {
      // 由于 viem/ethers 不直接支持按地址查询交易，这里是简化实现
      // 实际生产环境建议使用:
      // 1. Etherscan API
      // 2. The Graph
      // 3. 自建索引服务（监听区块事件）

      this.logger.warn(
        '注意：当前为简化实现，无法直接从链上获取地址的所有交易',
      );
      this.logger.warn('建议使用 Etherscan API 或 The Graph 进行完整同步');

      return 0;
    } catch (error) {
      this.logger.error(`同步地址交易失败: ${address}`, error.stack);
      throw error;
    }
  }

  /**
   * 转换为 DTO
   */
  private toDto(transaction: Transaction): TransactionDto {
    return {
      hash: transaction.hash,
      blockNumber: transaction.blockNumber,
      blockHash: transaction.blockHash,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value,
      gasPrice: transaction.gasPrice,
      gas: transaction.gas,
      gasUsed: transaction.gasUsed,
      status: transaction.status,
      timestamp: transaction.timestamp,
      isContractCreation: transaction.isContractCreation,
      contractAddress: transaction.contractAddress,
      methodName: transaction.methodName,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * 转换为详情 DTO
   */
  private toDetailDto(transaction: Transaction): TransactionDetailDto {
    return {
      ...this.toDto(transaction),
      input: transaction.input,
      nonce: transaction.nonce,
      transactionIndex: transaction.transactionIndex,
      type: transaction.type,
    };
  }
}

