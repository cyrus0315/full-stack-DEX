import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

/**
 * 池子信息响应 DTO
 */
export class PoolInfoDto {
  @ApiProperty({ description: '池子ID' })
  id: number;

  @ApiProperty({ description: '交易对地址' })
  pairAddress: string;

  @ApiProperty({ description: 'Token0 地址' })
  token0Address: string;

  @ApiProperty({ description: 'Token1 地址' })
  token1Address: string;

  @ApiProperty({ description: 'Token0 符号' })
  token0Symbol: string;

  @ApiProperty({ description: 'Token0 名称' })
  token0Name: string;

  @ApiProperty({ description: 'Token0 精度' })
  token0Decimals: number;

  @ApiProperty({ description: 'Token1 符号' })
  token1Symbol: string;

  @ApiProperty({ description: 'Token1 名称' })
  token1Name: string;

  @ApiProperty({ description: 'Token1 精度' })
  token1Decimals: number;

  @ApiProperty({ description: 'Token0 储备量' })
  reserve0: string;

  @ApiProperty({ description: 'Token1 储备量' })
  reserve1: string;

  @ApiProperty({ description: 'LP 代币总供应量' })
  totalSupply: string;

  @ApiProperty({ description: '价格（token1/token0）' })
  price: string;

  @ApiPropertyOptional({ description: '流动性（USD）' })
  liquidityUsd?: string;

  @ApiPropertyOptional({ description: '24小时交易量' })
  volume24h?: string;

  @ApiProperty({ description: '手续费率（基点）' })
  feeRate: number;

  @ApiProperty({ description: '是否活跃' })
  isActive: boolean;

  @ApiProperty({ description: '是否已验证' })
  isVerified: boolean;

  @ApiProperty({ description: '最后更新区块' })
  lastUpdateBlock: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

/**
 * 创建/添加池子 DTO
 */
export class CreatePoolDto {
  @ApiProperty({ description: 'Token0 地址', example: '0x...' })
  @IsString()
  token0Address: string;

  @ApiProperty({ description: 'Token1 地址', example: '0x...' })
  @IsString()
  token1Address: string;
}

/**
 * 查询池子列表 DTO
 */
export class PoolListQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '按字段排序', enum: ['liquidity', 'volume', 'created'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'liquidity';

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: '只显示活跃池子' })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ description: '只显示已验证池子' })
  @IsOptional()
  @IsBoolean()
  verifiedOnly?: boolean;

  @ApiPropertyOptional({ description: '搜索（代币符号或地址）' })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * 池子列表响应 DTO
 */
export class PoolListResponseDto {
  @ApiProperty({ description: '池子列表', type: [PoolInfoDto] })
  pools: PoolInfoDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

/**
 * 更新池子数据 DTO
 */
export class UpdatePoolDto {
  @ApiPropertyOptional({ description: 'Token0 储备量' })
  @IsOptional()
  @IsString()
  reserve0?: string;

  @ApiPropertyOptional({ description: 'Token1 储备量' })
  @IsOptional()
  @IsString()
  reserve1?: string;

  @ApiPropertyOptional({ description: 'LP 代币总供应量' })
  @IsOptional()
  @IsString()
  totalSupply?: string;

  @ApiPropertyOptional({ description: '价格' })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional({ description: '流动性（USD）' })
  @IsOptional()
  @IsString()
  liquidityUsd?: string;

  @ApiPropertyOptional({ description: '是否活跃' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '是否已验证' })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

/**
 * 池子统计信息 DTO
 */
export class PoolStatsDto {
  @ApiProperty({ description: '总池子数' })
  totalPools: number;

  @ApiProperty({ description: '活跃池子数' })
  activePools: number;

  @ApiProperty({ description: '总锁仓价值（TVL）' })
  totalValueLocked: string;

  @ApiProperty({ description: '24小时总交易量' })
  volume24h: string;

  @ApiProperty({ description: '平均 APY' })
  averageApy: string;
}

