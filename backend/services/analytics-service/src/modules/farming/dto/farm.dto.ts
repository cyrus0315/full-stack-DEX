import { ApiProperty } from '@nestjs/swagger';

/**
 * Token 信息 DTO
 */
export class TokenInfoDto {
  @ApiProperty({ description: 'Token 符号' })
  symbol: string;

  @ApiProperty({ description: 'Token 地址' })
  address: string;
}

/**
 * LP Token 信息 DTO
 */
export class LPTokenInfoDto {
  @ApiProperty({ description: 'LP Token 地址' })
  address: string;

  @ApiProperty({ description: 'LP Token 符号' })
  symbol: string;

  @ApiProperty({ description: 'Token0 信息' })
  token0: TokenInfoDto;

  @ApiProperty({ description: 'Token1 信息' })
  token1: TokenInfoDto;
}

/**
 * 单个挖矿池信息 DTO
 */
export class FarmDto {
  @ApiProperty({ description: '池子 ID' })
  poolId: number;

  @ApiProperty({ description: 'LP Token 信息' })
  lpToken: LPTokenInfoDto;

  @ApiProperty({ description: '分配点数（权重）' })
  allocPoint: string;

  @ApiProperty({ description: '权重占比（0-1）', example: 0.4 })
  weight: number;

  @ApiProperty({ description: '总质押量（LP Token）' })
  totalStaked: string;

  @ApiProperty({ description: '总质押价值（USD）' })
  totalStakedUsd: string;

  @ApiProperty({ description: '年化收益率 APR（%）' })
  apr: string;

  @ApiProperty({ description: '年化复利收益率 APY（%）' })
  apy: string;

  @ApiProperty({ description: '每日奖励（DEX）' })
  dailyReward: string;

  @ApiProperty({ description: 'TVL（USD）' })
  tvl: string;

  @ApiProperty({ description: '是否激活' })
  active: boolean;
}

/**
 * 挖矿概览统计 DTO
 */
export class FarmingSummaryDto {
  @ApiProperty({ description: '总池子数' })
  totalPools: number;

  @ApiProperty({ description: '激活池子数' })
  activePools: number;

  @ApiProperty({ description: '总 TVL（USD）' })
  totalTvl: string;

  @ApiProperty({ description: '总分配点数' })
  totalAllocPoint: string;

  @ApiProperty({ description: '每区块奖励（DEX）' })
  rewardPerBlock: string;

  @ApiProperty({ description: 'DEX 代币价格（USD）' })
  dexPrice: string;

  @ApiProperty({ description: '当前区块号' })
  currentBlock: string;
}

/**
 * 所有挖矿池列表响应 DTO
 */
export class FarmsResponseDto {
  @ApiProperty({ description: '挖矿池列表', type: [FarmDto] })
  farms: FarmDto[];

  @ApiProperty({ description: '概览统计' })
  summary: FarmingSummaryDto;
}

/**
 * 用户在单个池子的信息 DTO
 */
export class UserFarmDto {
  @ApiProperty({ description: '池子 ID' })
  poolId: number;

  @ApiProperty({ description: 'LP Token 符号' })
  lpTokenSymbol: string;

  @ApiProperty({ description: '已质押数量（LP Token）' })
  stakedAmount: string;

  @ApiProperty({ description: '已质押价值（USD）' })
  stakedUsd: string;

  @ApiProperty({ description: '待领取奖励（DEX）' })
  pendingReward: string;

  @ApiProperty({ description: '累计已赚取（DEX）' })
  totalEarned: string;

  @ApiProperty({ description: '累计已赚取价值（USD）' })
  totalEarnedUsd: string;

  @ApiProperty({ description: 'APR（%）' })
  apr: string;

  @ApiProperty({ description: '占池子比例（%）' })
  shareOfPool: number;

  @ApiProperty({ description: '最后操作时间' })
  lastActionAt: Date;
}

/**
 * 用户挖矿总览 DTO
 */
export class UserFarmingSummaryDto {
  @ApiProperty({ description: '参与的池子数' })
  totalPools: number;

  @ApiProperty({ description: '总质押价值（USD）' })
  totalStakedUsd: string;

  @ApiProperty({ description: '总待领取奖励（DEX）' })
  totalPendingReward: string;

  @ApiProperty({ description: '累计已赚取（DEX）' })
  totalEarned: string;

  @ApiProperty({ description: '累计已赚取价值（USD）' })
  totalEarnedUsd: string;
}

/**
 * 用户挖矿信息响应 DTO
 */
export class UserFarmsResponseDto {
  @ApiProperty({ description: '用户地址' })
  userAddress: string;

  @ApiProperty({ description: '用户在各池子的质押信息', type: [UserFarmDto] })
  farms: UserFarmDto[];

  @ApiProperty({ description: '用户总览统计' })
  summary: UserFarmingSummaryDto;
}

/**
 * 排行榜项 DTO
 */
export class LeaderboardItemDto {
  @ApiProperty({ description: '排名' })
  rank: number;

  @ApiProperty({ description: '用户地址' })
  userAddress: string;

  @ApiProperty({ description: '总质押价值（USD）' })
  totalStakedUsd: string;

  @ApiProperty({ description: '累计已赚取（DEX）' })
  totalEarned: string;

  @ApiProperty({ description: '参与的池子数' })
  poolCount: number;
}

/**
 * 排行榜响应 DTO
 */
export class LeaderboardResponseDto {
  @ApiProperty({ description: '排行榜', type: [LeaderboardItemDto] })
  leaderboard: LeaderboardItemDto[];

  @ApiProperty({ description: '总用户数' })
  totalUsers: number;
}

