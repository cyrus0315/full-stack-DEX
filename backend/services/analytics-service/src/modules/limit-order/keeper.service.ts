import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LimitOrderService } from './limit-order.service';
import { createWalletClient, http, parseAbi, formatEther } from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

@Injectable()
export class KeeperService {
  private readonly logger = new Logger(KeeperService.name);
  private walletClient: any;
  private keeperAccount: any;
  private limitOrderBookAddress: string;
  private routerAddress: string;
  private enabled: boolean = false;

  constructor(private limitOrderService: LimitOrderService) {
    this.limitOrderBookAddress = process.env.LIMIT_ORDER_BOOK_ADDRESS || '';
    this.routerAddress = process.env.ROUTER_ADDRESS || '';

    // 检查是否启用 Keeper
    const keeperEnabled = process.env.KEEPER_ENABLED === 'true';
    const keeperPrivateKey = process.env.KEEPER_PRIVATE_KEY;

    if (keeperEnabled && keeperPrivateKey && this.limitOrderBookAddress) {
      try {
        // 初始化 Keeper 账户
        this.keeperAccount = privateKeyToAccount(keeperPrivateKey as `0x${string}`);

        // 初始化 Wallet Client
        this.walletClient = createWalletClient({
          account: this.keeperAccount,
          chain: hardhat,
          transport: http(process.env.RPC_URL || 'http://127.0.0.1:8545'),
        });

        this.enabled = true;
        this.logger.log(`✅ Keeper 服务已启用`);
        this.logger.log(`📍 Keeper 地址: ${this.keeperAccount.address}`);
      } catch (error) {
        this.logger.error(`❌ Keeper 初始化失败: ${error.message}`);
      }
    } else {
      this.logger.warn('⚠️  Keeper 服务未启用（KEEPER_ENABLED=false 或缺少配置）');
    }
  }

  /**
   * 定时检查和执行订单（每 30 秒）
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAndExecuteOrders() {
    if (!this.enabled) {
      return;
    }

    try {
      this.logger.debug('🔍 检查可执行订单...');

      // 获取可执行订单列表
      const executableOrders = await this.limitOrderService.getExecutableOrders();

      if (executableOrders.length === 0) {
        this.logger.debug('📭 没有可执行订单');
        return;
      }

      this.logger.log(`📋 发现 ${executableOrders.length} 个可执行订单`);

      // 批量执行订单（最多 5 个）
      const ordersToExecute = executableOrders.slice(0, 5);

      for (const order of ordersToExecute) {
        try {
          await this.executeOrder(order.orderId, [order.tokenIn, order.tokenOut]);
        } catch (error) {
          this.logger.error(`❌ 执行订单 ${order.orderId} 失败: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Keeper 检查订单失败: ${error.message}`);
    }
  }

  /**
   * 执行单个订单
   */
  async executeOrder(orderId: string, path: string[]): Promise<string> {
    if (!this.enabled) {
      throw new Error('Keeper 服务未启用');
    }

    this.logger.log(`🚀 开始执行订单 ${orderId}...`);

    const abi = parseAbi([
      'function executeOrder(uint256 orderId, uint256 amountOut, address[] path) external',
      'function getOrder(uint256 orderId) view returns (uint256 id, address maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 executionPrice, uint8 status, uint256 createdAt, uint256 expiresAt)',
    ]);

    try {
      // 获取订单信息
      const order = await this.limitOrderService.findOneByOrderId(orderId);
      if (!order) {
        throw new Error(`订单 ${orderId} 不存在`);
      }

      // 获取当前报价
      const amountOut = await this.limitOrderService.getAmountOut(
        order.tokenIn,
        order.tokenOut,
        order.amountIn,
      );

      // 检查是否满足执行条件
      if (BigInt(amountOut) < BigInt(order.minAmountOut)) {
        throw new Error(`输出数量不足: ${amountOut} < ${order.minAmountOut}`);
      }

      // 执行订单
      const txHash = await this.walletClient.writeContract({
        address: this.limitOrderBookAddress as `0x${string}`,
        abi,
        functionName: 'executeOrder',
        args: [BigInt(orderId), BigInt(amountOut), path as `0x${string}`[]],
      });

      this.logger.log(`✅ 订单 ${orderId} 执行成功!`);
      this.logger.log(`   - TX Hash: ${txHash}`);
      this.logger.log(`   - Amount Out: ${formatEther(BigInt(amountOut))}`);

      // 更新数据库（事件监听器会处理）
      return txHash;
    } catch (error) {
      this.logger.error(`❌ 执行订单 ${orderId} 失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 手动执行订单（API 调用）
   */
  async manualExecuteOrder(orderId: string, path?: string[]): Promise<string> {
    if (!this.enabled) {
      throw new Error('Keeper 服务未启用');
    }

    const order = await this.limitOrderService.findOneByOrderId(orderId);
    if (!order) {
      throw new Error(`订单 ${orderId} 不存在`);
    }

    // 如果未提供路径，使用默认路径
    const executionPath = path || [order.tokenIn, order.tokenOut];

    return await this.executeOrder(orderId, executionPath);
  }

  /**
   * 获取 Keeper 状态
   */
  getStatus(): {
    enabled: boolean;
    address: string | null;
    limitOrderBookAddress: string;
  } {
    return {
      enabled: this.enabled,
      address: this.enabled ? this.keeperAccount.address : null,
      limitOrderBookAddress: this.limitOrderBookAddress,
    };
  }

  /**
   * 批量执行订单
   */
  async batchExecuteOrders(
    orderIds: string[],
    amountsOut: string[],
    paths: string[][],
  ): Promise<string> {
    if (!this.enabled) {
      throw new Error('Keeper 服务未启用');
    }

    if (orderIds.length !== amountsOut.length || orderIds.length !== paths.length) {
      throw new Error('参数长度不匹配');
    }

    this.logger.log(`🚀 批量执行 ${orderIds.length} 个订单...`);

    const abi = parseAbi([
      'function batchExecuteOrders(uint256[] orderIds, uint256[] amountsOut, address[][] paths) external',
    ]);

    try {
      const txHash = await this.walletClient.writeContract({
        address: this.limitOrderBookAddress as `0x${string}`,
        abi,
        functionName: 'batchExecuteOrders',
        args: [
          orderIds.map(id => BigInt(id)),
          amountsOut.map(amount => BigInt(amount)),
          paths as `0x${string}`[][],
        ],
      });

      this.logger.log(`✅ 批量执行成功!`);
      this.logger.log(`   - TX Hash: ${txHash}`);

      return txHash;
    } catch (error) {
      this.logger.error(`❌ 批量执行失败: ${error.message}`);
      throw error;
    }
  }
}

