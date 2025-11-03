/**
 * 全局概览数据 DTO
 */
export class OverviewDto {
  totalPools: number;
  totalTVL: string; // 总锁仓价值（USD）
  volume24h: string; // 24h 交易量
  transactions24h: number; // 24h 交易笔数
  topPools: PoolAnalyticsDto[]; // 交易量最高的池子
}

/**
 * 单个 Pool 的分析数据
 */
export class PoolAnalyticsDto {
  poolId: number;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
  
  // TVL
  tvl: string; // USD 等值
  
  // 交易量统计
  volume24h: string;
  volume7d: string;
  volumeAll: string;
  
  // 交易笔数
  transactions24h: number;
  transactions7d: number;
  transactionsAll: number;
  
  // 流动性操作
  liquidityAdds24h: number;
  liquidityRemoves24h: number;
  
  // 价格
  currentPrice: string; // token1/token0
  priceChange24h: string; // 百分比
  
  // APY（年化收益率）
  apy?: string;
  
  // 手续费收入（24h）
  fees24h?: string;
}

/**
 * 时间序列数据点
 */
export class TimeSeriesDataPoint {
  timestamp: number; // Unix 时间戳
  value: string; // 数值
}

/**
 * Pool 历史数据
 */
export class PoolHistoryDto {
  poolId: number;
  
  // 价格历史
  priceHistory: TimeSeriesDataPoint[];
  
  // 交易量历史
  volumeHistory: TimeSeriesDataPoint[];
  
  // TVL 历史
  tvlHistory: TimeSeriesDataPoint[];
}

/**
 * 用户统计数据
 */
export class UserStatsDto {
  userAddress: string;
  
  // 交易统计
  totalSwaps: number;
  totalSwapVolume: string;
  
  // 流动性统计
  totalLiquidityAdds: number;
  totalLiquidityRemoves: number;
  
  // 活跃池子
  activePools: number[];
  
  // 最近活动时间
  lastActivityAt: Date;
}

