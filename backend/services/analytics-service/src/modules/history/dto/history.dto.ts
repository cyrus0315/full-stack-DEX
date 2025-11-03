import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询 Swap 历史的请求参数
 */
export class QuerySwapHistoryDto {
  @IsOptional()
  @IsString()
  userAddress?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  poolId?: number;

  @IsOptional()
  @IsString()
  tokenAddress?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startTime?: number; // Unix timestamp

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endTime?: number; // Unix timestamp
}

/**
 * 查询 Liquidity 历史的请求参数
 */
export class QueryLiquidityHistoryDto {
  @IsOptional()
  @IsString()
  userAddress?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  poolId?: number;

  @IsOptional()
  @IsEnum(['add', 'remove'])
  actionType?: 'add' | 'remove';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startTime?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endTime?: number;
}

/**
 * Swap 历史响应 DTO
 */
export class SwapHistoryDto {
  id: number;
  poolId: number;
  pool?: {
    pairAddress: string;
    token0Symbol: string;
    token1Symbol: string;
  };
  userAddress: string;
  toAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: number;
  priceImpact?: string;
  createdAt: Date;
}

/**
 * Liquidity 历史响应 DTO
 */
export class LiquidityHistoryDto {
  id: number;
  poolId: number;
  pool?: {
    pairAddress: string;
    token0Symbol: string;
    token1Symbol: string;
  };
  actionType: 'add' | 'remove';
  userAddress: string;
  toAddress: string;
  amount0: string;
  amount1: string;
  liquidity: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: number;
  createdAt: Date;
}

/**
 * 分页响应
 */
export class PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

