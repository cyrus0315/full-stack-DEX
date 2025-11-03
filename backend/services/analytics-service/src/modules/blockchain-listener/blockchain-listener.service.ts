import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address, parseAbi, Log, decodeEventLog } from 'viem';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { Pool } from '../pool/entities/pool.entity';
import { EventsGateway } from './websocket.gateway';
import { HistoryService } from '../history/history.service';
import {
  PairCreatedEvent,
  SyncEvent,
  MintEvent,
  BurnEvent,
  SwapEvent,
  ListenerStatus,
} from './types/events.types';

/**
 * 区块链事件监听器服务
 * 
 * 功能：
 * 1. 监听 Factory PairCreated 事件 -> 自动创建新交易对
 * 2. 监听 Pair Sync 事件 -> 更新储备量
 * 3. 监听 Pair Mint/Burn 事件 -> 流动性变化
 * 4. 监听 Pair Swap 事件 -> 交易记录
 */
@Injectable()
export class BlockchainListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlockchainListenerService.name);
  
  private status: ListenerStatus = {
    isRunning: false,
    eventsProcessed: 0,
    errors: 0,
  };

  private unwatchFns: Array<() => void> = [];
  private pollingInterval: NodeJS.Timeout;
  private lastProcessedBlock: bigint = 0n;

  // ABI 定义
  private readonly factoryAbi = parseAbi([
    'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
  ]);

  private readonly pairAbi = parseAbi([
    'event Sync(uint112 reserve0, uint112 reserve1)',
    'event Mint(address indexed sender, uint amount0, uint amount1)',
    'event Burn(address indexed sender, uint amount0, uint amount1, address indexed to)',
    'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
  ]);

  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    private readonly configService: ConfigService,
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly historyService: HistoryService,
  ) {}

  async onModuleInit() {
    this.logger.log('🎧 Initializing Blockchain Event Listener...');
    
    // 延迟启动，确保其他模块初始化完成
    setTimeout(() => {
      this.startListening().catch((error) => {
        this.logger.error('Failed to start event listener', error);
      });
    }, 3000);
  }

  async onModuleDestroy() {
    this.logger.log('Stopping event listener...');
    await this.stopListening();
  }

  /**
   * 开始监听事件
   */
  async startListening(): Promise<void> {
    if (this.status.isRunning) {
      this.logger.warn('Event listener is already running');
      return;
    }

    try {
      const factoryAddress = this.blockchainProvider.getFactoryAddress();
      if (!factoryAddress) {
        throw new Error('Factory address not configured');
      }

      // 获取当前区块号
      this.lastProcessedBlock = await this.blockchainProvider.getBlockNumber();
      this.logger.log(`Starting from block: ${this.lastProcessedBlock}`);

      // 启动轮询模式（适用于 Hardhat 本地节点）
      await this.startPolling();

      this.status.isRunning = true;
      this.status.startTime = new Date();
      this.logger.log('✅ Event listener started successfully');
    } catch (error) {
      this.logger.error('Failed to start event listener', error);
      throw error;
    }
  }

  /**
   * 停止监听事件
   */
  async stopListening(): Promise<void> {
    // 停止所有监听器
    this.unwatchFns.forEach((unwatch) => unwatch());
    this.unwatchFns = [];

    // 停止轮询
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.status.isRunning = false;
    this.logger.log('Event listener stopped');
  }

  /**
   * 启动轮询模式（Hardhat 本地节点不支持 WebSocket 订阅，使用轮询）
   */
  private async startPolling(): Promise<void> {
    const factoryAddress = this.blockchainProvider.getFactoryAddress();
    const publicClient = this.blockchainProvider.getPublicClient();

    this.logger.log('📊 Starting polling mode (checking every 5 seconds)...');

    this.pollingInterval = setInterval(async () => {
      try {
        const currentBlock = await this.blockchainProvider.getBlockNumber();
        
        if (currentBlock <= this.lastProcessedBlock) {
          return; // 没有新区块
        }

        this.logger.debug(
          `Processing blocks ${this.lastProcessedBlock + 1n} to ${currentBlock}`,
        );

        // 1. 获取 Factory PairCreated 事件
        const pairCreatedLogs = await publicClient.getLogs({
          address: factoryAddress,
          event: this.factoryAbi[0], // PairCreated event
          fromBlock: this.lastProcessedBlock + 1n,
          toBlock: currentBlock,
        });

        if (pairCreatedLogs.length > 0) {
          this.logger.log(`Found ${pairCreatedLogs.length} PairCreated events`);
          for (const log of pairCreatedLogs) {
            await this.handlePairCreatedEvent(log);
          }
        }

        // 2. 获取所有 Pool 的地址
        const pools = await this.poolRepository.find();
        
        for (const pool of pools) {
          if (!pool.pairAddress) continue;

          // 获取该 Pair 的所有事件
          const pairLogs = await publicClient.getLogs({
            address: pool.pairAddress as Address,
            fromBlock: this.lastProcessedBlock + 1n,
            toBlock: currentBlock,
          });

          for (const log of pairLogs) {
            await this.handlePairEvent(log, pool.pairAddress as Address);
          }
        }

        this.lastProcessedBlock = currentBlock;
      } catch (error) {
        this.logger.error('Error in polling cycle', error);
        this.status.errors++;
      }
    }, 5000); // 每 5 秒检查一次
  }

  /**
   * 处理 PairCreated 事件
   */
  private async handlePairCreatedEvent(log: Log): Promise<void> {
    try {
      const decoded = decodeEventLog({
        abi: this.factoryAbi,
        data: log.data,
        topics: log.topics,
      });

      const event = decoded.args as unknown as PairCreatedEvent;

      this.logger.log(
        `🆕 New Pair Created: ${event.token0}/${event.token1} -> ${event.pair}`,
      );

      // 检查数据库中是否已存在
      const existingPool = await this.poolRepository.findOne({
        where: { pairAddress: event.pair },
      });

      if (existingPool) {
        this.logger.debug(`Pool already exists: ${event.pair}`);
        return;
      }

      // 获取代币信息
      const [token0Info, token1Info] = await Promise.all([
        this.blockchainProvider.getTokenInfo(event.token0),
        this.blockchainProvider.getTokenInfo(event.token1),
      ]);

      // 获取储备量
      const reserves = await this.blockchainProvider.getReserves(event.pair);

      // 创建新的 Pool 记录
      const newPool = this.poolRepository.create({
        pairAddress: event.pair,
        token0Address: event.token0,
        token1Address: event.token1,
        token0Symbol: token0Info.symbol,
        token1Symbol: token1Info.symbol,
        token0Decimals: token0Info.decimals,
        token1Decimals: token1Info.decimals,
        reserve0: reserves.reserve0.toString(),
        reserve1: reserves.reserve1.toString(),
        isActive: true,
      });

      await this.poolRepository.save(newPool);

      this.logger.log(`✅ Pool created in database: ${event.token0}/${event.token1}`);
      this.status.eventsProcessed++;

      // 广播新 Pool 创建事件
      if (this.eventsGateway?.server) {
        this.eventsGateway.broadcastPoolCreated({
          id: newPool.id,
          pairAddress: newPool.pairAddress,
          token0Address: newPool.token0Address,
          token1Address: newPool.token1Address,
          token0Symbol: newPool.token0Symbol,
          token1Symbol: newPool.token1Symbol,
          reserve0: newPool.reserve0,
          reserve1: newPool.reserve1,
        });
      }
    } catch (error) {
      this.logger.error('Error handling PairCreated event', error);
      this.status.errors++;
    }
  }

  /**
   * 处理 Pair 相关事件
   */
  private async handlePairEvent(log: Log, pairAddress: Address): Promise<void> {
    try {
      // 尝试解码事件
      const eventSignature = log.topics[0];

      // Sync: 0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1
      // Mint: 0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f
      // Burn: 0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496
      // Swap: 0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822

      if (
        eventSignature ===
        '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'
      ) {
        // Sync event
        await this.handleSyncEvent(log, pairAddress);
      } else if (
        eventSignature ===
        '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f'
      ) {
        // Mint event
        await this.handleMintEvent(log, pairAddress);
      } else if (
        eventSignature ===
        '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496'
      ) {
        // Burn event
        await this.handleBurnEvent(log, pairAddress);
      } else if (
        eventSignature ===
        '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822'
      ) {
        // Swap event
        await this.handleSwapEvent(log, pairAddress);
      }
    } catch (error) {
      this.logger.error(`Error handling pair event for ${pairAddress}`, error);
      this.status.errors++;
    }
  }

  /**
   * 处理 Sync 事件（更新储备量）
   */
  private async handleSyncEvent(log: Log, pairAddress: Address): Promise<void> {
    try {
      const decoded = decodeEventLog({
        abi: this.pairAbi,
        data: log.data,
        topics: log.topics,
      });

      const { reserve0, reserve1 } = decoded.args as any;

      this.logger.debug(`🔄 Sync: ${pairAddress} -> ${reserve0}/${reserve1}`);

      // 更新数据库
      await this.poolRepository.update(
        { pairAddress },
        {
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString(),
        },
      );

      this.status.eventsProcessed++;
      this.status.lastEventTime = new Date();

      // 广播 Pool 更新事件
      const updatedPool = await this.poolRepository.findOne({ where: { pairAddress } });
      if (updatedPool && this.eventsGateway?.server) {
        this.eventsGateway.broadcastPoolUpdate({
          id: updatedPool.id,
          pairAddress: updatedPool.pairAddress,
          token0Symbol: updatedPool.token0Symbol,
          token1Symbol: updatedPool.token1Symbol,
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString(),
        });
      }
    } catch (error) {
      this.logger.error('Error handling Sync event', error);
      this.status.errors++;
    }
  }

  /**
   * 处理 Mint 事件（添加流动性）
   */
  private async handleMintEvent(log: Log, pairAddress: Address): Promise<void> {
    try {
      const decoded = decodeEventLog({
        abi: this.pairAbi,
        data: log.data,
        topics: log.topics,
      });

      const { sender, amount0, amount1 } = decoded.args as any;

      this.logger.log(
        `➕ Mint: ${pairAddress} by ${sender} -> ${amount0}/${amount1}`,
      );

      // 查找对应的 Pool
      const pool = await this.poolRepository.findOne({ where: { pairAddress } });
      if (pool) {
        // 记录到 liquidity history 表
        await this.historyService.createLiquidityHistory({
          poolId: pool.id,
          actionType: 'add',
          userAddress: sender.toLowerCase(),
          toAddress: sender.toLowerCase(),
          amount0: amount0.toString(),
          amount1: amount1.toString(),
          liquidity: '0', // 从 log 中无法直接获取，可以后续改进
          transactionHash: log.transactionHash || '',
          blockNumber: log.blockNumber?.toString() || '0',
          blockTimestamp: 0, // 需要额外查询 block
          logIndex: Number(log.logIndex || 0),
        }).catch(err => {
          this.logger.warn(`Failed to save liquidity history: ${err.message}`);
        });
      }

      this.status.eventsProcessed++;
      this.status.lastEventTime = new Date();

      // 广播流动性变化事件
      if (this.eventsGateway?.server) {
        this.eventsGateway.broadcastLiquidityChange({
          type: 'mint',
          pairAddress,
          sender,
          amount0: amount0.toString(),
          amount1: amount1.toString(),
        });
      }
    } catch (error) {
      this.logger.error('Error handling Mint event', error);
      this.status.errors++;
    }
  }

  /**
   * 处理 Burn 事件（移除流动性）
   */
  private async handleBurnEvent(log: Log, pairAddress: Address): Promise<void> {
    try {
      const decoded = decodeEventLog({
        abi: this.pairAbi,
        data: log.data,
        topics: log.topics,
      });

      const { sender, amount0, amount1, to } = decoded.args as any;

      this.logger.log(
        `➖ Burn: ${pairAddress} by ${sender} -> ${amount0}/${amount1} to ${to}`,
      );

      // 查找对应的 Pool
      const pool = await this.poolRepository.findOne({ where: { pairAddress } });
      if (pool) {
        // 记录到 liquidity history 表
        await this.historyService.createLiquidityHistory({
          poolId: pool.id,
          actionType: 'remove',
          userAddress: sender.toLowerCase(),
          toAddress: to.toLowerCase(),
          amount0: amount0.toString(),
          amount1: amount1.toString(),
          liquidity: '0', // 从 log 中无法直接获取
          transactionHash: log.transactionHash || '',
          blockNumber: log.blockNumber?.toString() || '0',
          blockTimestamp: 0,
          logIndex: Number(log.logIndex || 0),
        }).catch(err => {
          this.logger.warn(`Failed to save liquidity history: ${err.message}`);
        });
      }

      this.status.eventsProcessed++;
      this.status.lastEventTime = new Date();

      // 广播流动性变化事件
      if (this.eventsGateway?.server) {
        this.eventsGateway.broadcastLiquidityChange({
          type: 'burn',
          pairAddress,
          sender,
          amount0: amount0.toString(),
          amount1: amount1.toString(),
          to,
        });
      }
    } catch (error) {
      this.logger.error('Error handling Burn event', error);
      this.status.errors++;
    }
  }

  /**
   * 处理 Swap 事件（交易）
   */
  private async handleSwapEvent(log: Log, pairAddress: Address): Promise<void> {
    try {
      const decoded = decodeEventLog({
        abi: this.pairAbi,
        data: log.data,
        topics: log.topics,
      });

      const { sender, amount0In, amount1In, amount0Out, amount1Out, to } =
        decoded.args as any;

      this.logger.log(
        `💱 Swap: ${pairAddress} by ${sender} -> In(${amount0In}/${amount1In}) Out(${amount0Out}/${amount1Out})`,
      );

      // 查找对应的 Pool
      const pool = await this.poolRepository.findOne({ where: { pairAddress } });
      if (pool) {
        // 判断输入/输出代币
        const isToken0In = amount0In > 0n;
        const tokenIn = isToken0In ? pool.token0Address : pool.token1Address;
        const tokenOut = isToken0In ? pool.token1Address : pool.token0Address;
        const amountIn = isToken0In ? amount0In.toString() : amount1In.toString();
        const amountOut = isToken0In ? amount1Out.toString() : amount0Out.toString();

        // 记录到 swap history 表
        await this.historyService.createSwapHistory({
          poolId: pool.id,
          userAddress: sender.toLowerCase(),
          toAddress: to.toLowerCase(),
          tokenIn,
          tokenOut,
          amountIn,
          amountOut,
          transactionHash: log.transactionHash || '',
          blockNumber: log.blockNumber?.toString() || '0',
          blockTimestamp: 0, // 需要额外查询 block
          logIndex: Number(log.logIndex || 0),
        }).catch(err => {
          this.logger.warn(`Failed to save swap history: ${err.message}`);
        });
      }

      this.status.eventsProcessed++;
      this.status.lastEventTime = new Date();

      // 广播 Swap 事件
      if (this.eventsGateway?.server) {
        this.eventsGateway.broadcastSwap({
          pairAddress,
          sender,
          amount0In: amount0In.toString(),
          amount1In: amount1In.toString(),
          amount0Out: amount0Out.toString(),
          amount1Out: amount1Out.toString(),
          to,
        });
      }
    } catch (error) {
      this.logger.error('Error handling Swap event', error);
      this.status.errors++;
    }
  }

  /**
   * 获取监听器状态
   */
  getStatus(): ListenerStatus {
    return { ...this.status };
  }

  /**
   * 手动重新同步指定 Pool
   */
  async resyncPool(poolId: number): Promise<void> {
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });
    if (!pool || !pool.pairAddress) {
      throw new Error('Pool not found');
    }

    const reserves = await this.blockchainProvider.getReserves(
      pool.pairAddress as Address,
    );

    await this.poolRepository.update(
      { id: poolId },
      {
        reserve0: reserves.reserve0.toString(),
        reserve1: reserves.reserve1.toString(),
      },
    );

    this.logger.log(`✅ Pool ${poolId} resynced manually`);
  }
}

