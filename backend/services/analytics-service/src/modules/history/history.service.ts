import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { SwapHistory } from './entities/swap-history.entity';
import { LiquidityHistory } from './entities/liquidity-history.entity';
import {
  QuerySwapHistoryDto,
  QueryLiquidityHistoryDto,
  SwapHistoryDto,
  LiquidityHistoryDto,
  PaginatedResponseDto,
} from './dto/history.dto';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectRepository(SwapHistory)
    private readonly swapHistoryRepository: Repository<SwapHistory>,
    @InjectRepository(LiquidityHistory)
    private readonly liquidityHistoryRepository: Repository<LiquidityHistory>,
  ) {}

  /**
   * 创建 Swap 历史记录
   */
  async createSwapHistory(data: Partial<SwapHistory>): Promise<SwapHistory> {
    try {
      const history = this.swapHistoryRepository.create(data);
      return await this.swapHistoryRepository.save(history);
    } catch (error) {
      this.logger.error(`Failed to create swap history: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 创建 Liquidity 历史记录
   */
  async createLiquidityHistory(
    data: Partial<LiquidityHistory>,
  ): Promise<LiquidityHistory> {
    try {
      const history = this.liquidityHistoryRepository.create(data);
      return await this.liquidityHistoryRepository.save(history);
    } catch (error) {
      this.logger.error(
        `Failed to create liquidity history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 查询 Swap 历史（分页）
   */
  async getSwapHistory(
    query: QuerySwapHistoryDto,
  ): Promise<PaginatedResponseDto<SwapHistoryDto>> {
    const { page = 1, limit = 20, userAddress, poolId, tokenAddress, startTime, endTime } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<SwapHistory> = {};

    if (userAddress) {
      where.userAddress = userAddress.toLowerCase();
    }

    if (poolId) {
      where.poolId = poolId;
    }

    if (tokenAddress) {
      // 查找 tokenIn 或 tokenOut 匹配的记录
      // 注意：这里需要使用 OR 查询，TypeORM 需要特殊处理
    }

    if (startTime || endTime) {
      const start = startTime ? new Date(startTime * 1000) : new Date(0);
      const end = endTime ? new Date(endTime * 1000) : new Date();
      where.createdAt = Between(start, end) as any;
    }

    try {
      const [data, total] = await this.swapHistoryRepository.findAndCount({
        where,
        relations: ['pool'],
        order: {
          createdAt: 'DESC',
          logIndex: 'DESC',
        },
        skip,
        take: limit,
      });

      const formattedData: SwapHistoryDto[] = data.map((item) => ({
        id: item.id,
        poolId: item.poolId,
        pool: item.pool
          ? {
              pairAddress: item.pool.pairAddress,
              token0Symbol: item.pool.token0Symbol,
              token1Symbol: item.pool.token1Symbol,
            }
          : undefined,
        userAddress: item.userAddress,
        toAddress: item.toAddress,
        tokenIn: item.tokenIn,
        tokenOut: item.tokenOut,
        amountIn: item.amountIn,
        amountOut: item.amountOut,
        transactionHash: item.transactionHash,
        blockNumber: item.blockNumber,
        blockTimestamp: item.blockTimestamp,
        priceImpact: item.priceImpact,
        createdAt: item.createdAt,
      }));

      return {
        data: formattedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to query swap history: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 查询 Liquidity 历史（分页）
   */
  async getLiquidityHistory(
    query: QueryLiquidityHistoryDto,
  ): Promise<PaginatedResponseDto<LiquidityHistoryDto>> {
    const { page = 1, limit = 20, userAddress, poolId, actionType, startTime, endTime } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<LiquidityHistory> = {};

    if (userAddress) {
      where.userAddress = userAddress.toLowerCase();
    }

    if (poolId) {
      where.poolId = poolId;
    }

    if (actionType) {
      where.actionType = actionType;
    }

    if (startTime || endTime) {
      const start = startTime ? new Date(startTime * 1000) : new Date(0);
      const end = endTime ? new Date(endTime * 1000) : new Date();
      where.createdAt = Between(start, end) as any;
    }

    try {
      const [data, total] = await this.liquidityHistoryRepository.findAndCount({
        where,
        relations: ['pool'],
        order: {
          createdAt: 'DESC',
          logIndex: 'DESC',
        },
        skip,
        take: limit,
      });

      const formattedData: LiquidityHistoryDto[] = data.map((item) => ({
        id: item.id,
        poolId: item.poolId,
        pool: item.pool
          ? {
              pairAddress: item.pool.pairAddress,
              token0Symbol: item.pool.token0Symbol,
              token1Symbol: item.pool.token1Symbol,
            }
          : undefined,
        actionType: item.actionType,
        userAddress: item.userAddress,
        toAddress: item.toAddress,
        amount0: item.amount0,
        amount1: item.amount1,
        liquidity: item.liquidity,
        transactionHash: item.transactionHash,
        blockNumber: item.blockNumber,
        blockTimestamp: item.blockTimestamp,
        createdAt: item.createdAt,
      }));

      return {
        data: formattedData,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to query liquidity history: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取用户的最近交易
   */
  async getUserRecentActivity(userAddress: string, limit: number = 10) {
    const normalizedAddress = userAddress.toLowerCase();

    const [swaps, liquidity] = await Promise.all([
      this.swapHistoryRepository.find({
        where: { userAddress: normalizedAddress },
        relations: ['pool'],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      this.liquidityHistoryRepository.find({
        where: { userAddress: normalizedAddress },
        relations: ['pool'],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
    ]);

    // 合并并按时间排序
    const combined = [
      ...swaps.map((s) => ({ ...s, type: 'swap' as const })),
      ...liquidity.map((l) => ({ ...l, type: 'liquidity' as const })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return combined;
  }

  /**
   * 获取池子的交易统计
   */
  async getPoolStats(poolId: number, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [swapCount, liquidityCount, totalSwapVolume] = await Promise.all([
      this.swapHistoryRepository.count({
        where: {
          poolId,
          createdAt: Between(since, new Date()) as any,
        },
      }),
      this.liquidityHistoryRepository.count({
        where: {
          poolId,
          createdAt: Between(since, new Date()) as any,
        },
      }),
      // 这里可以计算总交易量，但需要知道代币价格
      // 暂时返回交易笔数
      this.swapHistoryRepository.count({
        where: {
          poolId,
          createdAt: Between(since, new Date()) as any,
        },
      }),
    ]);

    return {
      poolId,
      hours,
      swapCount,
      liquidityCount,
      totalSwapVolume: totalSwapVolume.toString(),
    };
  }
}

