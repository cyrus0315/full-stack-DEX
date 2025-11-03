import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Pool } from '../pool/entities/pool.entity';
import { SwapHistory } from '../history/entities/swap-history.entity';
import { LiquidityHistory } from '../history/entities/liquidity-history.entity';
import { PriceHistory } from './entities/price-history.entity';
import { OverviewDto, PoolAnalyticsDto, PoolHistoryDto, UserStatsDto } from './dto/analytics.dto';
import { SlippageStatsDto } from '../quote/dto/quote.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>,
    @InjectRepository(SwapHistory)
    private readonly swapHistoryRepository: Repository<SwapHistory>,
    @InjectRepository(LiquidityHistory)
    private readonly liquidityHistoryRepository: Repository<LiquidityHistory>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  /**
   * 获取全局概览数据
   */
  async getOverview(): Promise<OverviewDto> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 总池子数
    const totalPools = await this.poolRepository.count({ where: { isActive: true } });

    // 24h 交易笔数
    const transactions24h = await this.swapHistoryRepository.count({
      where: {
        createdAt: MoreThanOrEqual(since24h),
      },
    });

    // 计算总 TVL（简化版本，暂时基于储备量）
    const pools = await this.poolRepository.find({ where: { isActive: true } });
    let totalTVL = 0n;
    
    // TODO: 这里需要集成价格预言机来获取真实的 USD 价值
    // 目前暂时使用储备量的总和作为占位符
    for (const pool of pools) {
      // 简化计算：假设 token0 和 token1 的价值相等
      totalTVL += BigInt(pool.reserve0) + BigInt(pool.reserve1);
    }

    // 获取 Top 5 交易活跃的池子
    const topPools = await this.getTopPoolsByVolume(5);

    return {
      totalPools,
      totalTVL: totalTVL.toString(),
      volume24h: '0', // TODO: 需要实现交易量计算
      transactions24h,
      topPools,
    };
  }

  /**
   * 获取单个池子的详细分析数据
   */
  async getPoolAnalytics(poolId: number): Promise<PoolAnalyticsDto> {
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });
    if (!pool) {
      throw new Error('Pool not found');
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 统计交易笔数
    const [transactions24h, transactions7d, transactionsAll] = await Promise.all([
      this.swapHistoryRepository.count({
        where: { poolId, createdAt: MoreThanOrEqual(since24h) },
      }),
      this.swapHistoryRepository.count({
        where: { poolId, createdAt: MoreThanOrEqual(since7d) },
      }),
      this.swapHistoryRepository.count({ where: { poolId } }),
    ]);

    // 统计流动性操作
    const [liquidityAdds24h, liquidityRemoves24h] = await Promise.all([
      this.liquidityHistoryRepository.count({
        where: { poolId, actionType: 'add', createdAt: MoreThanOrEqual(since24h) },
      }),
      this.liquidityHistoryRepository.count({
        where: { poolId, actionType: 'remove', createdAt: MoreThanOrEqual(since24h) },
      }),
    ]);

    // 计算当前价格
    const reserve0 = BigInt(pool.reserve0);
    const reserve1 = BigInt(pool.reserve1);
    const currentPrice = reserve0 > 0n ? (Number(reserve1) / Number(reserve0)).toFixed(6) : '0';

    // TODO: 计算交易量（需要代币价格）
    // TODO: 计算价格变化（需要存储历史价格）
    // TODO: 计算 APY（基于手续费收入）

    return {
      poolId: pool.id,
      pairAddress: pool.pairAddress,
      token0Symbol: pool.token0Symbol,
      token1Symbol: pool.token1Symbol,
      reserve0: pool.reserve0,
      reserve1: pool.reserve1,
      tvl: '0', // TODO: 需要集成价格预言机
      volume24h: '0', // TODO
      volume7d: '0', // TODO
      volumeAll: '0', // TODO
      transactions24h,
      transactions7d,
      transactionsAll,
      liquidityAdds24h,
      liquidityRemoves24h,
      currentPrice,
      priceChange24h: '0', // TODO
      apy: undefined,
      fees24h: undefined,
    };
  }

  /**
   * 获取池子的历史数据（用于图表）
   */
  async getPoolHistory(poolId: number, hours: number = 24): Promise<PoolHistoryDto> {
    // TODO: 实现时间序列数据查询
    // 这需要定期快照池子状态或者从事件历史中聚合数据
    
    return {
      poolId,
      priceHistory: [],
      volumeHistory: [],
      tvlHistory: [],
    };
  }

  /**
   * 获取用户统计数据
   */
  async getUserStats(userAddress: string): Promise<UserStatsDto> {
    const normalizedAddress = userAddress.toLowerCase();

    const [totalSwaps, totalLiquidityAdds, totalLiquidityRemoves, recentSwap, recentLiquidity] =
      await Promise.all([
        this.swapHistoryRepository.count({
          where: { userAddress: normalizedAddress },
        }),
        this.liquidityHistoryRepository.count({
          where: { userAddress: normalizedAddress, actionType: 'add' },
        }),
        this.liquidityHistoryRepository.count({
          where: { userAddress: normalizedAddress, actionType: 'remove' },
        }),
        this.swapHistoryRepository.findOne({
          where: { userAddress: normalizedAddress },
          order: { createdAt: 'DESC' },
        }),
        this.liquidityHistoryRepository.findOne({
          where: { userAddress: normalizedAddress },
          order: { createdAt: 'DESC' },
        }),
      ]);

    // 获取用户活跃的池子
    const swaps = await this.swapHistoryRepository
      .createQueryBuilder('swap')
      .select('DISTINCT swap.poolId', 'poolId')
      .where('swap.userAddress = :address', { address: normalizedAddress })
      .getRawMany();

    const activePools = swaps.map((s) => s.poolId);

    // 最后活动时间
    const lastSwapTime = recentSwap?.createdAt?.getTime() || 0;
    const lastLiquidityTime = recentLiquidity?.createdAt?.getTime() || 0;
    const lastActivityAt = new Date(Math.max(lastSwapTime, lastLiquidityTime));

    return {
      userAddress,
      totalSwaps,
      totalSwapVolume: '0', // TODO: 需要计算总交易量
      totalLiquidityAdds,
      totalLiquidityRemoves,
      activePools,
      lastActivityAt,
    };
  }

  /**
   * 获取交易量最高的池子
   */
  private async getTopPoolsByVolume(limit: number = 5): Promise<PoolAnalyticsDto[]> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 统计每个池子的交易笔数
    const poolStats = await this.swapHistoryRepository
      .createQueryBuilder('swap')
      .select('swap.poolId', 'poolId')
      .addSelect('COUNT(*)', 'count')
      .where('swap.createdAt >= :since', { since: since24h })
      .groupBy('swap.poolId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    // 获取这些池子的详细信息
    const result: PoolAnalyticsDto[] = [];
    for (const stat of poolStats) {
      try {
        const analytics = await this.getPoolAnalytics(stat.poolId);
        result.push(analytics);
      } catch (error) {
        this.logger.error(`Failed to get analytics for pool ${stat.poolId}`, error);
      }
    }

    return result;
  }

  /**
   * 计算池子的 24h 交易量（需要代币价格）
   */
  private async calculateVolume24h(poolId: number): Promise<string> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const swaps = await this.swapHistoryRepository.find({
      where: {
        poolId,
        createdAt: MoreThanOrEqual(since24h),
      },
    });

    // TODO: 需要集成价格预言机来计算 USD 价值
    // 暂时返回交易笔数
    return swaps.length.toString();
  }

  /**
   * 获取滑点统计数据
   */
  async getSlippageStats(poolId: number): Promise<SlippageStatsDto> {
    this.logger.log(`Getting slippage stats for pool ${poolId}`);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      // 获取历史价格数据（24h）
      const history24h = await this.priceHistoryRepository.find({
        where: {
          poolId,
          timestamp: MoreThanOrEqual(since24h),
        },
        order: { timestamp: 'ASC' },
      });

      // 获取历史价格数据（7d）
      const history7d = await this.priceHistoryRepository.find({
        where: {
          poolId,
          timestamp: MoreThanOrEqual(since7d),
        },
        order: { timestamp: 'ASC' },
      });

      if (history24h.length < 2) {
        this.logger.warn(`Insufficient price history data for pool ${poolId}`);
        return {
          avgSlippage24h: '0',
          avgSlippage7d: '0',
          p50Slippage: '0',
          p95Slippage: '0',
          p99Slippage: '0',
        };
      }

      // 计算价格变化（作为滑点的近似）
      const priceChanges24h = this.calculatePriceChanges(history24h);
      const priceChanges7d = this.calculatePriceChanges(history7d);

      // 计算统计值
      const avg24h = this.calculateAverage(priceChanges24h);
      const avg7d = this.calculateAverage(priceChanges7d);
      
      // 使用所有数据计算百分位数
      const allChanges = [...priceChanges24h, ...priceChanges7d].sort((a, b) => a - b);
      const p50 = this.calculatePercentile(allChanges, 50);
      const p95 = this.calculatePercentile(allChanges, 95);
      const p99 = this.calculatePercentile(allChanges, 99);

      return {
        avgSlippage24h: avg24h.toFixed(2),
        avgSlippage7d: avg7d.toFixed(2),
        p50Slippage: p50.toFixed(2),
        p95Slippage: p95.toFixed(2),
        p99Slippage: p99.toFixed(2),
      };
    } catch (error) {
      this.logger.error(`Failed to get slippage stats for pool ${poolId}`, error);
      throw error;
    }
  }

  /**
   * 记录价格历史
   */
  async recordPriceHistory(poolId: number, reserve0: string, reserve1: string, blockNumber: string): Promise<void> {
    try {
      // 计算价格
      const price = BigInt(reserve1) > 0n 
        ? (Number(BigInt(reserve1)) / Number(BigInt(reserve0))).toString()
        : '0';

      await this.priceHistoryRepository.save({
        poolId,
        price,
        reserve0,
        reserve1,
        blockNumber,
      });

      this.logger.debug(`Price history recorded for pool ${poolId}`);
    } catch (error) {
      this.logger.error(`Failed to record price history for pool ${poolId}`, error);
    }
  }

  /**
   * 计算价格变化百分比
   */
  private calculatePriceChanges(history: PriceHistory[]): number[] {
    const changes: number[] = [];

    for (let i = 1; i < history.length; i++) {
      const priceBefore = parseFloat(history[i - 1].price);
      const priceAfter = parseFloat(history[i].price);

      if (priceBefore > 0) {
        const change = Math.abs((priceAfter - priceBefore) / priceBefore) * 100;
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }
}

