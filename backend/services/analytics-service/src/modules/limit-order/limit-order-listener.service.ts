import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createPublicClient, http, parseAbi, Block } from 'viem';
import { hardhat } from 'viem/chains';
import { LimitOrderService } from './limit-order.service';

@Injectable()
export class LimitOrderListenerService implements OnModuleInit {
  private readonly logger = new Logger(LimitOrderListenerService.name);
  private publicClient: any;
  private limitOrderBookAddress: string;
  private isListening = false;

  constructor(private limitOrderService: LimitOrderService) {
    this.limitOrderBookAddress = process.env.LIMIT_ORDER_BOOK_ADDRESS || '';

    // 初始化 Public Client
    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http(process.env.RPC_URL || 'http://127.0.0.1:8545'),
    });
  }

  async onModuleInit() {
    if (this.limitOrderBookAddress) {
      await this.startListening();
    } else {
      this.logger.warn('⚠️  LimitOrderBook 地址未配置，跳过事件监听');
    }
  }

  /**
   * 开始监听限价单事件
   */
  async startListening() {
    if (this.isListening) {
      this.logger.warn('限价单事件监听器已在运行中');
      return;
    }

    this.logger.log('🎧 开始监听限价单事件...');
    this.logger.log(`📍 LimitOrderBook 地址: ${this.limitOrderBookAddress}`);

    const abi = parseAbi([
      'event OrderCreated(uint256 indexed orderId, address indexed maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 executionPrice, uint256 expiresAt)',
      'event OrderFilled(uint256 indexed orderId, address indexed maker, address indexed executor, uint256 amountIn, uint256 amountOut)',
      'event OrderCancelled(uint256 indexed orderId, address indexed maker)',
      'event OrderExpired(uint256 indexed orderId, address indexed maker)',
    ]);

    try {
      // 监听 OrderCreated 事件
      this.publicClient.watchContractEvent({
        address: this.limitOrderBookAddress as `0x${string}`,
        abi,
        eventName: 'OrderCreated',
        onLogs: (logs: any[]) => {
          logs.forEach((log: any) => this.handleOrderCreated(log));
        },
      });

      // 监听 OrderFilled 事件
      this.publicClient.watchContractEvent({
        address: this.limitOrderBookAddress as `0x${string}`,
        abi,
        eventName: 'OrderFilled',
        onLogs: (logs: any[]) => {
          logs.forEach((log: any) => this.handleOrderFilled(log));
        },
      });

      // 监听 OrderCancelled 事件
      this.publicClient.watchContractEvent({
        address: this.limitOrderBookAddress as `0x${string}`,
        abi,
        eventName: 'OrderCancelled',
        onLogs: (logs: any[]) => {
          logs.forEach((log: any) => this.handleOrderCancelled(log));
        },
      });

      // 监听 OrderExpired 事件
      this.publicClient.watchContractEvent({
        address: this.limitOrderBookAddress as `0x${string}`,
        abi,
        eventName: 'OrderExpired',
        onLogs: (logs: any[]) => {
          logs.forEach((log: any) => this.handleOrderExpired(log));
        },
      });

      this.isListening = true;
      this.logger.log('✅ 限价单事件监听器启动成功');
    } catch (error) {
      this.logger.error(`❌ 启动限价单事件监听器失败: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * 处理 OrderCreated 事件
   */
  private async handleOrderCreated(log: any) {
    try {
      const { args, blockNumber, transactionHash } = log;
      const { orderId, maker, tokenIn, tokenOut, amountIn, minAmountOut, executionPrice, expiresAt } = args;

      this.logger.log(`📝 订单创建事件: Order ID ${orderId}`);

      await this.limitOrderService.createOrderFromEvent({
        orderId: orderId.toString(),
        maker,
        tokenIn,
        tokenOut,
        amountIn: amountIn.toString(),
        minAmountOut: minAmountOut.toString(),
        executionPrice: executionPrice.toString(),
        expiresAt: expiresAt.toString(),
        createdAtBlock: Number(blockNumber),
        txHash: transactionHash,
      });

      this.logger.log(`✅ 订单 ${orderId} 已保存到数据库`);
    } catch (error) {
      this.logger.error(`❌ 处理 OrderCreated 事件失败: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * 处理 OrderFilled 事件
   */
  private async handleOrderFilled(log: any) {
    try {
      const { args, blockNumber, transactionHash } = log;
      const { orderId, maker, executor, amountIn, amountOut } = args;

      this.logger.log(`✅ 订单成交事件: Order ID ${orderId}`);
      this.logger.log(`   - Maker: ${maker}`);
      this.logger.log(`   - Executor: ${executor}`);
      this.logger.log(`   - Amount In: ${amountIn}`);
      this.logger.log(`   - Amount Out: ${amountOut}`);

      await this.limitOrderService.fillOrder(
        orderId.toString(),
        amountOut.toString(),
        executor,
        Number(blockNumber),
        transactionHash,
      );

      this.logger.log(`✅ 订单 ${orderId} 状态已更新为 FILLED`);
    } catch (error) {
      this.logger.error(`❌ 处理 OrderFilled 事件失败: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * 处理 OrderCancelled 事件
   */
  private async handleOrderCancelled(log: any) {
    try {
      const { args, transactionHash } = log;
      const { orderId, maker } = args;

      this.logger.log(`❌ 订单取消事件: Order ID ${orderId}`);
      this.logger.log(`   - Maker: ${maker}`);

      await this.limitOrderService.cancelOrder(orderId.toString(), transactionHash);

      this.logger.log(`✅ 订单 ${orderId} 状态已更新为 CANCELLED`);
    } catch (error) {
      this.logger.error(`❌ 处理 OrderCancelled 事件失败: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * 处理 OrderExpired 事件
   */
  private async handleOrderExpired(log: any) {
    try {
      const { args, transactionHash } = log;
      const { orderId, maker } = args;

      this.logger.log(`⏰ 订单过期事件: Order ID ${orderId}`);
      this.logger.log(`   - Maker: ${maker}`);

      await this.limitOrderService.expireOrder(orderId.toString(), transactionHash);

      this.logger.log(`✅ 订单 ${orderId} 状态已更新为 EXPIRED`);
    } catch (error) {
      this.logger.error(`❌ 处理 OrderExpired 事件失败: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * 停止监听
   */
  stopListening() {
    this.isListening = false;
    this.logger.log('⏹️  限价单事件监听器已停止');
  }

  /**
   * 获取监听状态
   */
  getStatus() {
    return {
      isListening: this.isListening,
      limitOrderBookAddress: this.limitOrderBookAddress,
    };
  }
}

