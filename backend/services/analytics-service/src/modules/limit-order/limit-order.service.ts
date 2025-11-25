import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan, MoreThan } from 'typeorm';
import { LimitOrder, OrderStatus } from './entities/limit-order.entity';
import { QueryOrdersDto, OrderStatisticsDto } from './dto/limit-order.dto';
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { hardhat } from 'viem/chains';

@Injectable()
export class LimitOrderService {
  private readonly logger = new Logger(LimitOrderService.name);
  private publicClient: any;
  private limitOrderBookAddress: string;

  constructor(
    @InjectRepository(LimitOrder)
    private limitOrderRepository: Repository<LimitOrder>,
  ) {
    // 初始化 viem 客户端
    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http(process.env.RPC_URL || 'http://127.0.0.1:8545'),
    });

    this.limitOrderBookAddress = process.env.LIMIT_ORDER_BOOK_ADDRESS || '';
  }

  /**
   * 创建订单记录（从链上事件）
   */
  async createOrderFromEvent(orderData: {
    orderId: string;
    maker: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    minAmountOut: string;
    executionPrice: string;
    expiresAt: string;
    createdAtBlock: number;
    txHash: string;
  }): Promise<LimitOrder> {
    const order = this.limitOrderRepository.create({
      orderId: orderData.orderId,
      maker: orderData.maker.toLowerCase(),
      tokenIn: orderData.tokenIn.toLowerCase(),
      tokenOut: orderData.tokenOut.toLowerCase(),
      amountIn: orderData.amountIn,
      minAmountOut: orderData.minAmountOut,
      executionPrice: orderData.executionPrice,
      expiresAt: orderData.expiresAt === '0' ? null : orderData.expiresAt,
      status: OrderStatus.ACTIVE,
      createdAtBlock: orderData.createdAtBlock,
      txHash: orderData.txHash,
    });

    return await this.limitOrderRepository.save(order);
  }

  /**
   * 更新订单状态（成交）
   */
  async fillOrder(
    orderId: string,
    filledAmountOut: string,
    executor: string,
    filledAtBlock: number,
    filledTxHash: string,
  ): Promise<LimitOrder> {
    const order = await this.findOneByOrderId(orderId);
    if (!order) {
      throw new NotFoundException(`订单 ${orderId} 未找到`);
    }

    order.status = OrderStatus.FILLED;
    order.filledAmountOut = filledAmountOut;
    order.executor = executor.toLowerCase();
    order.filledAtBlock = filledAtBlock;
    order.filledTxHash = filledTxHash;

    return await this.limitOrderRepository.save(order);
  }

  /**
   * 更新订单状态（取消）
   */
  async cancelOrder(orderId: string, txHash: string): Promise<LimitOrder> {
    const order = await this.findOneByOrderId(orderId);
    if (!order) {
      throw new NotFoundException(`订单 ${orderId} 未找到`);
    }

    order.status = OrderStatus.CANCELLED;
    order.filledTxHash = txHash;

    return await this.limitOrderRepository.save(order);
  }

  /**
   * 更新订单状态（过期）
   */
  async expireOrder(orderId: string, txHash: string): Promise<LimitOrder> {
    const order = await this.findOneByOrderId(orderId);
    if (!order) {
      throw new NotFoundException(`订单 ${orderId} 未找到`);
    }

    order.status = OrderStatus.EXPIRED;
    order.filledTxHash = txHash;

    return await this.limitOrderRepository.save(order);
  }

  /**
   * 根据链上订单 ID 查找订单
   */
  async findOneByOrderId(orderId: string): Promise<LimitOrder | null> {
    return await this.limitOrderRepository.findOne({
      where: { orderId },
    });
  }

  /**
   * 根据数据库 ID 查找订单
   */
  async findOneById(id: number): Promise<LimitOrder> {
    const order = await this.limitOrderRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`订单 ${id} 未找到`);
    }

    return order;
  }

  /**
   * 查询订单列表
   */
  async findOrders(query: QueryOrdersDto): Promise<{ orders: LimitOrder[]; total: number }> {
    const { maker, status, tokenIn, tokenOut, page = 1, limit = 20 } = query;

    const where: FindOptionsWhere<LimitOrder> = {};

    if (maker) {
      where.maker = maker.toLowerCase();
    }
    if (status) {
      where.status = status;
    }
    if (tokenIn) {
      where.tokenIn = tokenIn.toLowerCase();
    }
    if (tokenOut) {
      where.tokenOut = tokenOut.toLowerCase();
    }

    const [orders, total] = await this.limitOrderRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { orders, total };
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(userAddress: string, status?: OrderStatus): Promise<LimitOrder[]> {
    const where: FindOptionsWhere<LimitOrder> = {
      maker: userAddress.toLowerCase(),
    };

    if (status) {
      where.status = status;
    }

    return await this.limitOrderRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取活跃订单列表
   */
  async getActiveOrders(): Promise<LimitOrder[]> {
    return await this.limitOrderRepository.find({
      where: { status: OrderStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 获取可执行订单列表（价格满足条件）
   */
  async getExecutableOrders(): Promise<LimitOrder[]> {
    const activeOrders = await this.getActiveOrders();
    const executableOrders: LimitOrder[] = [];

    for (const order of activeOrders) {
      // 检查是否过期
      if (order.expiresAt && BigInt(order.expiresAt) < BigInt(Math.floor(Date.now() / 1000))) {
        // 标记为待过期
        order.status = OrderStatus.EXPIRED;
        await this.limitOrderRepository.save(order);
        continue;
      }

      // 从链上获取当前报价
      try {
        const amountOut = await this.getAmountOut(order.tokenIn, order.tokenOut, order.amountIn);
        
        // 检查是否满足执行条件
        if (BigInt(amountOut) >= BigInt(order.minAmountOut)) {
          order.isExecutable = true;
          order.estimatedAmountOut = amountOut;
          executableOrders.push(order);
        }
      } catch (error) {
        this.logger.warn(`获取订单 ${order.orderId} 报价失败: ${error.message}`);
      }
    }

    return executableOrders;
  }

  /**
   * 从链上获取报价
   */
  async getAmountOut(tokenIn: string, tokenOut: string, amountIn: string): Promise<string> {
    const routerAddress = process.env.ROUTER_ADDRESS;
    if (!routerAddress) {
      throw new Error('Router 地址未配置');
    }

    const routerAbi = parseAbi([
      'function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)',
    ]);

    try {
      const result = await this.publicClient.readContract({
        address: routerAddress as `0x${string}`,
        abi: routerAbi,
        functionName: 'getAmountsOut',
        args: [BigInt(amountIn), [tokenIn as `0x${string}`, tokenOut as `0x${string}`]],
      });

      return result[1].toString();
    } catch (error) {
      throw new Error(`获取报价失败: ${error.message}`);
    }
  }

  /**
   * 获取订单统计数据
   */
  async getOrderStatistics(): Promise<OrderStatisticsDto> {
    const totalOrders = await this.limitOrderRepository.count();
    const activeOrders = await this.limitOrderRepository.count({
      where: { status: OrderStatus.ACTIVE },
    });
    const filledOrders = await this.limitOrderRepository.count({
      where: { status: OrderStatus.FILLED },
    });
    const cancelledOrders = await this.limitOrderRepository.count({
      where: { status: OrderStatus.CANCELLED },
    });
    const expiredOrders = await this.limitOrderRepository.count({
      where: { status: OrderStatus.EXPIRED },
    });

    // TODO: 实现 USD 价值计算
    const totalVolumeUSD = '0';
    const volume24hUSD = '0';

    return {
      totalOrders,
      activeOrders,
      filledOrders,
      cancelledOrders,
      expiredOrders,
      totalVolumeUSD,
      volume24hUSD,
    };
  }

  /**
   * 从链上同步订单状态
   */
  async syncOrderFromChain(orderId: string): Promise<LimitOrder> {
    if (!this.limitOrderBookAddress) {
      throw new BadRequestException('LimitOrderBook 地址未配置');
    }

    const abi = parseAbi([
      'function getOrder(uint256 orderId) view returns (uint256 id, address maker, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 executionPrice, uint8 status, uint256 createdAt, uint256 expiresAt)',
    ]);

    try {
      const orderData = await this.publicClient.readContract({
        address: this.limitOrderBookAddress as `0x${string}`,
        abi,
        functionName: 'getOrder',
        args: [BigInt(orderId)],
      });

      const [id, maker, tokenIn, tokenOut, amountIn, minAmountOut, executionPrice, status, createdAt, expiresAt] = orderData;

      // 映射链上状态到数据库状态
      const statusMap = {
        0: OrderStatus.ACTIVE,
        1: OrderStatus.FILLED,
        2: OrderStatus.CANCELLED,
        3: OrderStatus.EXPIRED,
      };

      const dbOrder = await this.findOneByOrderId(orderId);
      if (dbOrder) {
        dbOrder.status = statusMap[status as number];
        return await this.limitOrderRepository.save(dbOrder);
      } else {
        throw new NotFoundException(`订单 ${orderId} 在数据库中不存在`);
      }
    } catch (error) {
      throw new BadRequestException(`从链上同步订单失败: ${error.message}`);
    }
  }
}

