import { ApiProperty } from '@nestjs/swagger';

/**
 * 单个代币价格 DTO
 */
export class TokenPriceDto {
  @ApiProperty({ description: '代币地址' })
  tokenAddress: string;

  @ApiProperty({ description: '代币符号' })
  symbol: string;

  @ApiProperty({ description: 'USD 价格' })
  priceUsd: string;

  @ApiProperty({ description: '最后更新时间' })
  lastUpdateTime?: Date;

  @ApiProperty({ description: '是否激活' })
  isActive: boolean;
}

/**
 * 所有代币价格响应 DTO
 */
export class AllPricesResponseDto {
  @ApiProperty({ description: '价格列表', type: [TokenPriceDto] })
  prices: TokenPriceDto[];

  @ApiProperty({ description: '最后刷新时间' })
  lastRefreshTime: Date;

  @ApiProperty({ description: '总代币数' })
  totalTokens: number;
}

/**
 * 价格历史 DTO
 */
export class PriceHistoryDto {
  @ApiProperty({ description: '时间戳' })
  timestamp: Date;

  @ApiProperty({ description: 'USD 价格' })
  priceUsd: string;
}

/**
 * 代币价格历史响应 DTO
 */
export class TokenPriceHistoryResponseDto {
  @ApiProperty({ description: '代币地址' })
  tokenAddress: string;

  @ApiProperty({ description: '代币符号' })
  symbol: string;

  @ApiProperty({ description: '当前价格' })
  currentPrice: string;

  @ApiProperty({ description: '历史价格', type: [PriceHistoryDto] })
  history: PriceHistoryDto[];
}

