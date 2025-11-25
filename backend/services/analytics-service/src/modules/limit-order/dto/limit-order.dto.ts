import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../entities/limit-order.entity';

export class CreateLimitOrderDto {
  @ApiProperty({ description: '输入代币地址' })
  @IsString()
  @IsNotEmpty()
  tokenIn: string;

  @ApiProperty({ description: '输出代币地址' })
  @IsString()
  @IsNotEmpty()
  tokenOut: string;

  @ApiProperty({ description: '输入数量（wei）' })
  @IsString()
  @IsNotEmpty()
  amountIn: string;

  @ApiProperty({ description: '最小输出数量（wei）' })
  @IsString()
  @IsNotEmpty()
  minAmountOut: string;

  @ApiProperty({ description: '订单有效期（秒），0 表示永不过期' })
  @IsNumber()
  @Min(0)
  duration: number;
}

export class OrderResponseDto {
  @ApiProperty({ description: '数据库 ID' })
  id: number;

  @ApiProperty({ description: '链上订单 ID' })
  orderId: string;

  @ApiProperty({ description: '订单创建者地址' })
  maker: string;

  @ApiProperty({ description: '输入代币地址' })
  tokenIn: string;

  @ApiProperty({ description: '输出代币地址' })
  tokenOut: string;

  @ApiProperty({ description: '输入数量' })
  amountIn: string;

  @ApiProperty({ description: '最小输出数量' })
  minAmountOut: string;

  @ApiProperty({ description: '执行价格' })
  executionPrice: string;

  @ApiProperty({ description: '订单状态', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ description: '创建区块号' })
  createdAtBlock: number;

  @ApiPropertyOptional({ description: '过期时间戳' })
  expiresAt?: string;

  @ApiPropertyOptional({ description: '成交区块号' })
  filledAtBlock?: number;

  @ApiPropertyOptional({ description: '实际成交输出数量' })
  filledAmountOut?: string;

  @ApiPropertyOptional({ description: '执行者地址' })
  executor?: string;

  @ApiProperty({ description: '创建交易哈希' })
  txHash: string;

  @ApiPropertyOptional({ description: '成交交易哈希' })
  filledTxHash?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: '是否可执行' })
  isExecutable?: boolean;

  @ApiPropertyOptional({ description: '预估输出数量' })
  estimatedAmountOut?: string;
}

export class QueryOrdersDto {
  @ApiPropertyOptional({ description: '用户地址' })
  @IsOptional()
  @IsString()
  maker?: string;

  @ApiPropertyOptional({ description: '订单状态', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '输入代币地址' })
  @IsOptional()
  @IsString()
  tokenIn?: string;

  @ApiPropertyOptional({ description: '输出代币地址' })
  @IsOptional()
  @IsString()
  tokenOut?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class ExecuteOrderDto {
  @ApiProperty({ description: '订单 ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: '交易路径' })
  @IsOptional()
  path?: string[];
}

export class OrderStatisticsDto {
  @ApiProperty({ description: '总订单数' })
  totalOrders: number;

  @ApiProperty({ description: '活跃订单数' })
  activeOrders: number;

  @ApiProperty({ description: '已成交订单数' })
  filledOrders: number;

  @ApiProperty({ description: '已取消订单数' })
  cancelledOrders: number;

  @ApiProperty({ description: '已过期订单数' })
  expiredOrders: number;

  @ApiProperty({ description: '总交易量（USD）' })
  totalVolumeUSD: string;

  @ApiProperty({ description: '24h 交易量（USD）' })
  volume24hUSD: string;
}

