import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsArray, IsOptional, IsString } from 'class-validator';

/**
 * 余额响应 DTO
 */
export class BalanceResponseDto {
  @ApiProperty({ description: '地址', example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' })
  address: string;

  @ApiProperty({ description: '余额（格式化后）', example: '1.5' })
  balance: string;

  @ApiProperty({ description: '小数位', example: 18 })
  decimals: number;

  @ApiProperty({ description: '代币符号', example: 'ETH', required: false })
  symbol?: string;

  @ApiProperty({ description: '代币名称', example: 'Ethereum', required: false })
  name?: string;

  @ApiProperty({ description: '美元价值', example: '3000.00', required: false })
  valueUsd?: string;

  @ApiProperty({ description: '时间戳', example: 1234567890 })
  timestamp: number;
}

/**
 * 批量余额查询请求 DTO
 */
export class BatchBalanceRequestDto {
  @ApiProperty({
    description: '地址列表',
    example: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'],
    type: [String],
  })
  @IsArray()
  @IsEthereumAddress({ each: true })
  addresses: string[];

  @ApiProperty({
    description: '代币地址列表（可选，不传则只查询 ETH）',
    example: ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEthereumAddress({ each: true })
  tokens?: string[];
}

/**
 * 批量余额响应 DTO
 */
export class BatchBalanceResponseDto {
  @ApiProperty({ description: '地址' })
  address: string;

  @ApiProperty({ description: '代币地址（ETH 为 null）' })
  token: string | null;

  @ApiProperty({ description: '余额' })
  balance: string;

  @ApiProperty({ description: '小数位' })
  decimals: number;

  @ApiProperty({ description: '代币符号' })
  symbol: string;
}

/**
 * 所有余额响应 DTO
 */
export class AllBalancesResponseDto {
  @ApiProperty({ description: '地址' })
  address: string;

  @ApiProperty({
    description: '余额列表',
    type: Object,
    example: {
      ETH: { balance: '1.5', decimals: 18, valueUsd: '3000.00' },
      USDT: { balance: '1000.50', decimals: 6, valueUsd: '1000.50' },
    },
  })
  balances: Record<string, {
    balance: string;
    decimals: number;
    valueUsd?: string;
  }>;

  @ApiProperty({ description: '总价值（美元）', example: '4500.50' })
  totalValueUsd: string;

  @ApiProperty({ description: '时间戳' })
  timestamp: number;
}

