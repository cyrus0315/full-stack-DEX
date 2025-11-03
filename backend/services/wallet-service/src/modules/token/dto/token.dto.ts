import { IsString, IsNotEmpty, IsArray, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * 代币信息响应 DTO
 */
export class TokenInfoDto {
  @ApiProperty({ description: '代币合约地址', example: '0x...' })
  address: string;

  @ApiProperty({ description: '代币名称', example: 'Tether USD' })
  name: string;

  @ApiProperty({ description: '代币符号', example: 'USDT' })
  symbol: string;

  @ApiProperty({ description: '代币精度', example: 6 })
  decimals: number;

  @ApiPropertyOptional({ description: '总供应量', example: '1000000000' })
  totalSupply?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: '是否已验证', example: true })
  isVerified?: boolean;

  @ApiPropertyOptional({ description: '代币描述' })
  description?: string;

  @ApiPropertyOptional({ description: '官网地址' })
  website?: string;

  @ApiProperty({ description: '数据时间戳', example: 1234567890 })
  timestamp: number;
}

/**
 * 批量查询代币请求 DTO
 */
export class BatchTokenQueryDto {
  @ApiProperty({
    description: '代币地址列表',
    example: ['0x...', '0x...'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  addresses: string[];
}

/**
 * 代币列表查询 DTO
 */
export class TokenListQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  limit?: number;

  @ApiPropertyOptional({ description: '搜索关键词（名称或符号）', example: 'USD' })
  search?: string;

  @ApiPropertyOptional({ description: '只显示已验证代币', example: true })
  isVerified?: boolean;
}

/**
 * 代币列表响应 DTO
 */
export class TokenListResponseDto {
  @ApiProperty({ description: '代币列表', type: [TokenInfoDto] })
  tokens: TokenInfoDto[];

  @ApiProperty({ description: '总数量', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页', example: 1 })
  page: number;

  @ApiProperty({ description: '每页数量', example: 20 })
  limit: number;

  @ApiProperty({ description: '总页数', example: 5 })
  totalPages: number;
}

