import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { Transaction } from './entities/transaction.entity';
import { Address } from '../address/entities/address.entity';
import { createPublicClient, http, Block, TransactionReceipt, Hash } from 'viem';
import { defineChain } from 'viem';
import { EventsGateway } from '../../websocket/events.gateway';

/**
 * Block Scanner Service
 * 自动监听新区块，扫描和导入相关交易
 */
@Injectable()
export class BlockScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockScannerService.name);
  private publicClient: any;
  private unwatchBlocks?: () => void;
  private isScanning = false;
  private monitoredAddresses: Set<string> = new Set();
  private scannerEnabled = true;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * 模块初始化时启动扫描器
   */
  async onModuleInit() {
    this.logger.log('初始化区块扫描器...');

    // 检查是否启用扫描器
    this.scannerEnabled = this.configService.get<boolean>('scanner.enabled', true);
    
    if (!this.scannerEnabled) {
      this.logger.warn('区块扫描器已禁用');
      return;
    }

    try {
      // 初始化区块链客户端
      await this.initializeClient();

      // 加载监控地址列表
      await this.loadMonitoredAddresses();

      // 启动区块监听
      await this.startBlockWatcher();

      this.logger.log('区块扫描器启动成功');
    } catch (error) {
      this.logger.error('区块扫描器启动失败:', error);
    }
  }

  /**
   * 模块销毁时停止扫描器
   */
  async onModuleDestroy() {
    this.logger.log('停止区块扫描器...');
    this.stopBlockWatcher();
  }

  /**
   * 初始化区块链客户端
   */
  private async initializeClient() {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl', 'http://127.0.0.1:8545');
    const chainId = this.configService.get<number>('blockchain.chainId', 31337);

    const hardhatChain = defineChain({
      id: chainId,
      name: 'Hardhat Local',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: [rpcUrl] },
      },
    });

    this.publicClient = createPublicClient({
      chain: hardhatChain,
      transport: http(rpcUrl),
    });

    this.logger.log(`区块链客户端已连接: ${rpcUrl} (chainId: ${chainId})`);
  }

  /**
   * 加载需要监控的地址列表
   */
  private async loadMonitoredAddresses() {
    try {
      const addresses = await this.addressRepository.find();
      this.monitoredAddresses = new Set(
        addresses.map(addr => addr.address.toLowerCase())
      );
      this.logger.log(`加载监控地址: ${this.monitoredAddresses.size} 个`);
    } catch (error) {
      this.logger.error('加载监控地址失败:', error);
      this.monitoredAddresses = new Set();
    }
  }

  /**
   * 添加监控地址
   */
  async addMonitoredAddress(address: string) {
    const lowerAddress = address.toLowerCase();
    this.monitoredAddresses.add(lowerAddress);
    this.logger.debug(`添加监控地址: ${address}`);
  }

  /**
   * 移除监控地址
   */
  removeMonitoredAddress(address: string) {
    const lowerAddress = address.toLowerCase();
    this.monitoredAddresses.delete(lowerAddress);
    this.logger.debug(`移除监控地址: ${address}`);
  }

  /**
   * 刷新监控地址列表
   */
  async refreshMonitoredAddresses() {
    await this.loadMonitoredAddresses();
  }

  /**
   * 启动区块监听
   */
  private async startBlockWatcher() {
    if (this.isScanning) {
      this.logger.warn('区块扫描器已在运行');
      return;
    }

    this.logger.log('开始监听新区块...');
    this.isScanning = true;

    try {
      // 使用 viem 的 watchBlocks 监听新区块
      this.unwatchBlocks = this.publicClient.watchBlocks({
        onBlock: async (block: Block) => {
          await this.handleNewBlock(block);
        },
        onError: (error: Error) => {
          this.logger.error('区块监听错误:', error);
        },
        pollingInterval: 2000, // 2 秒轮询一次
      });

      this.logger.log('区块监听已启动');
    } catch (error) {
      this.logger.error('启动区块监听失败:', error);
      this.isScanning = false;
    }
  }

  /**
   * 停止区块监听
   */
  private stopBlockWatcher() {
    if (this.unwatchBlocks) {
      this.unwatchBlocks();
      this.unwatchBlocks = undefined;
      this.isScanning = false;
      this.logger.log('区块监听已停止');
    }
  }

  /**
   * 处理新区块
   */
  private async handleNewBlock(block: Block) {
    const blockNumber = Number(block.number);
    const txCount = block.transactions?.length || 0;

    this.logger.debug(
      `新区块 #${blockNumber}: ${txCount} 笔交易, hash=${block.hash}`
    );

    // 推送新区块事件
    try {
      this.eventsGateway.emitNewBlock({
        number: (block.number || 0n).toString(),
        hash: block.hash || '',
        timestamp: (block.timestamp || 0n).toString(),
        transactionCount: txCount,
      });
    } catch (wsError) {
      this.logger.warn(`WebSocket 推送新区块失败: ${wsError.message}`);
    }

    // 如果没有交易，跳过
    if (txCount === 0) {
      return;
    }

    try {
      // 获取区块中的所有交易
      const blockWithTxs = await this.publicClient.getBlock({
        blockNumber: block.number,
        includeTransactions: true,
      });

      // 过滤和处理相关交易
      let importedCount = 0;
      for (const tx of blockWithTxs.transactions) {
        if (this.isRelevantTransaction(tx)) {
          await this.importTransaction(tx as any, block);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        this.logger.log(
          `区块 #${blockNumber}: 导入 ${importedCount} 笔相关交易`
        );
      }
    } catch (error) {
      this.logger.error(`处理区块 #${blockNumber} 失败:`, error);
    }
  }

  /**
   * 判断交易是否与监控地址相关
   */
  private isRelevantTransaction(tx: any): boolean {
    if (!tx.from && !tx.to) {
      return false;
    }

    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();

    // 检查发送方或接收方是否在监控列表中
    return (
      this.monitoredAddresses.has(from) ||
      this.monitoredAddresses.has(to)
    );
  }

  /**
   * 导入交易到数据库
   */
  private async importTransaction(tx: any, block: Block) {
    const hash = tx.hash.toLowerCase();

    try {
      // 检查交易是否已存在
      const existing = await this.transactionRepository.findOne({
        where: { hash },
      });

      if (existing) {
        this.logger.debug(`交易 ${hash} 已存在，跳过`);
        return;
      }

      // 获取交易回执
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: tx.hash as Hash,
      });

      // 创建交易记录
      const transaction = new Transaction();
      transaction.hash = hash;
      transaction.from = tx.from?.toLowerCase() || '';
      transaction.to = tx.to?.toLowerCase() || '';
      transaction.value = tx.value?.toString() || '0';
      transaction.gasPrice = tx.gasPrice?.toString() || '0';
      transaction.gasUsed = receipt.gasUsed?.toString() || '0';
      transaction.blockNumber = (block.number || 0n).toString();
      transaction.blockHash = block.hash || '';
      transaction.timestamp = (block.timestamp || 0n).toString();
      transaction.status = receipt.status === 'success' ? 1 : 0;
      transaction.input = tx.input || '0x';
      transaction.nonce = tx.nonce?.toString() || '0';

      // 保存到数据库
      await this.transactionRepository.save(transaction);

      this.logger.debug(
        `导入交易 ${hash}: ${transaction.from} → ${transaction.to}, status=${transaction.status}`
      );

      // 推送 WebSocket 事件
      try {
        this.eventsGateway.emitNewTransaction({
          hash: transaction.hash,
          from: transaction.from,
          to: transaction.to,
          value: transaction.value,
          blockNumber: transaction.blockNumber,
          timestamp: transaction.timestamp,
        });
      } catch (wsError) {
        // WebSocket 推送失败不应影响主流程
        this.logger.warn(`WebSocket 推送失败: ${wsError.message}`);
      }
    } catch (error) {
      this.logger.error(`导入交易 ${hash} 失败:`, error);
    }
  }

  /**
   * 手动扫描指定区块范围
   */
  async scanBlockRange(startBlock: number, endBlock: number) {
    this.logger.log(`手动扫描区块范围: ${startBlock} - ${endBlock}`);

    let importedCount = 0;
    let errorCount = 0;

    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      try {
        const block = await this.publicClient.getBlock({
          blockNumber: BigInt(blockNumber),
          includeTransactions: true,
        });

        for (const tx of block.transactions) {
          if (this.isRelevantTransaction(tx)) {
            await this.importTransaction(tx as any, block);
            importedCount++;
          }
        }

        // 每 10 个区块输出一次进度
        if (blockNumber % 10 === 0) {
          this.logger.log(
            `扫描进度: ${blockNumber}/${endBlock}, 已导入 ${importedCount} 笔交易`
          );
        }
      } catch (error) {
        this.logger.error(`扫描区块 #${blockNumber} 失败:`, error);
        errorCount++;
      }
    }

    this.logger.log(
      `扫描完成: 导入 ${importedCount} 笔交易, 错误 ${errorCount} 次`
    );

    return { importedCount, errorCount };
  }

  /**
   * 获取扫描器状态
   */
  getStatus() {
    return {
      enabled: this.scannerEnabled,
      scanning: this.isScanning,
      monitoredAddresses: this.monitoredAddresses.size,
    };
  }
}

