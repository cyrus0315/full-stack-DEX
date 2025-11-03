import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';

/**
 * 价格查询请求 DTO
 */
export class QuoteRequestDto {
  @ApiProperty({ description: '输入代币地址', example: '0x...' })
  @IsString()
  tokenIn: string;

  @ApiProperty({ description: '输出代币地址', example: '0x...' })
  @IsString()
  tokenOut: string;

  @ApiProperty({ description: '输入金额（最小单位）', example: '1000000000000000000' })
  @IsString()
  amountIn: string;

  @ApiPropertyOptional({ description: '滑点容忍度（%）', example: 0.5, default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  slippage?: number = 0.5;
}

/**
 * 价格查询响应 DTO
 */
export class QuoteResponseDto {
  @ApiProperty({ description: '输入代币地址' })
  tokenIn: string;

  @ApiProperty({ description: '输出代币地址' })
  tokenOut: string;

  @ApiProperty({ description: '输入金额' })
  amountIn: string;

  @ApiProperty({ description: '预期输出金额' })
  amountOut: string;

  @ApiProperty({ description: '最小输出金额（考虑滑点）' })
  amountOutMin: string;

  @ApiProperty({ description: '价格（输出/输入）' })
  price: string;

  @ApiProperty({ description: '价格影响（%）' })
  priceImpact: string;

  @ApiProperty({ description: '交易路径', type: [String] })
  path: string[];

  @ApiProperty({ description: '交易对地址' })
  pairAddress: string;

  @ApiProperty({ description: 'Token0 储备量' })
  reserve0: string;

  @ApiProperty({ description: 'Token1 储备量' })
  reserve1: string;
}

/**
 * 反向价格查询请求 DTO（指定输出金额）
 */
export class QuoteExactOutRequestDto {
  @ApiProperty({ description: '输入代币地址', example: '0x...' })
  @IsString()
  tokenIn: string;

  @ApiProperty({ description: '输出代币地址', example: '0x...' })
  @IsString()
  tokenOut: string;

  @ApiProperty({ description: '期望输出金额（最小单位）', example: '1000000000000000000' })
  @IsString()
  amountOut: string;

  @ApiPropertyOptional({ description: '滑点容忍度（%）', example: 0.5, default: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  slippage?: number = 0.5;
}

/**
 * 反向价格查询响应 DTO
 */
export class QuoteExactOutResponseDto {
  @ApiProperty({ description: '输入代币地址' })
  tokenIn: string;

  @ApiProperty({ description: '输出代币地址' })
  tokenOut: string;

  @ApiProperty({ description: '需要的输入金额' })
  amountIn: string;

  @ApiProperty({ description: '最大输入金额（考虑滑点）' })
  amountInMax: string;

  @ApiProperty({ description: '期望输出金额' })
  amountOut: string;

  @ApiProperty({ description: '价格（输出/输入）' })
  price: string;

  @ApiProperty({ description: '价格影响（%）' })
  priceImpact: string;

  @ApiProperty({ description: '交易路径', type: [String] })
  path: string[];
}

/**
 * 批量价格查询请求 DTO
 */
export class BatchQuoteRequestDto {
  @ApiProperty({ description: '查询列表', type: [QuoteRequestDto] })
  @IsArray()
  quotes: QuoteRequestDto[];
}

/**
 * 批量价格查询响应 DTO
 */
export class BatchQuoteResponseDto {
  @ApiProperty({ description: '查询结果列表', type: [QuoteResponseDto] })
  results: (QuoteResponseDto | null)[];
}

/**
 * 价格信息 DTO
 */
export class PriceInfoDto {
  @ApiProperty({ description: 'Token0 地址' })
  token0: string;

  @ApiProperty({ description: 'Token1 地址' })
  token1: string;

  @ApiProperty({ description: '价格（token1/token0）' })
  price: string;

  @ApiProperty({ description: '反向价格（token0/token1）' })
  inversePrice: string;

  @ApiProperty({ description: 'Token0 储备量' })
  reserve0: string;

  @ApiProperty({ description: 'Token1 储备量' })
  reserve1: string;

  @ApiProperty({ description: '最后更新时间戳' })
  lastUpdate: number;
}

/**
 * 不同滑点下的最小接收量
 */
export class MinimumReceivedDto {
  @ApiProperty({ description: '0.5% 滑点下的最小接收量' })
  '0.5': string;

  @ApiProperty({ description: '1.0% 滑点下的最小接收量' })
  '1.0': string;

  @ApiProperty({ description: '5.0% 滑点下的最小接收量' })
  '5.0': string;
}

/**
 * 推荐信息
 */
export class RecommendationDto {
  @ApiProperty({ description: '建议滑点设置（%）' })
  suggestedSlippage: number;

  @ApiPropertyOptional({ description: '警告信息' })
  warning?: string | null;
}

/**
 * 增强报价响应 DTO
 */
export class EnhancedQuoteResponseDto {
  @ApiProperty({ description: '输入代币地址' })
  tokenIn: string;

  @ApiProperty({ description: '输出代币地址' })
  tokenOut: string;

  @ApiProperty({ description: '输入金额' })
  amountIn: string;

  @ApiProperty({ description: '预期输出金额' })
  amountOut: string;

  @ApiProperty({ description: '价格影响（%）', example: '0.52' })
  priceImpact: string;

  @ApiProperty({ description: '执行价格（输出/输入）', example: '0.995' })
  executionPrice: string;

  @ApiProperty({ description: '交易路径', type: [String] })
  route: string[];

  @ApiProperty({ description: '不同滑点下的最小接收量', type: MinimumReceivedDto })
  minimumReceived: MinimumReceivedDto;

  @ApiProperty({ description: '交易前价格', example: '1.0' })
  priceBeforeSwap: string;

  @ApiProperty({ description: '交易后预估价格', example: '0.9948' })
  priceAfterSwap: string;

  @ApiProperty({ description: '流动性深度评级', example: 'high', enum: ['low', 'medium', 'high'] })
  liquidityDepth: string;

  @ApiPropertyOptional({ description: 'Gas 预估' })
  gasEstimate?: string;

  @ApiProperty({ description: '推荐信息', type: RecommendationDto })
  recommendation: RecommendationDto;

  @ApiProperty({ description: '交易对地址' })
  pairAddress: string;

  @ApiProperty({ description: 'Token0 储备量' })
  reserve0: string;

  @ApiProperty({ description: 'Token1 储备量' })
  reserve1: string;
}

/**
 * 滑点统计 DTO
 */
export class SlippageStatsDto {
  @ApiProperty({ description: '24小时平均滑点（%）' })
  avgSlippage24h: string;

  @ApiProperty({ description: '7天平均滑点（%）' })
  avgSlippage7d: string;

  @ApiProperty({ description: 'P50 滑点（%）' })
  p50Slippage: string;

  @ApiProperty({ description: 'P95 滑点（%）' })
  p95Slippage: string;

  @ApiProperty({ description: 'P99 滑点（%）' })
  p99Slippage: string;
}
