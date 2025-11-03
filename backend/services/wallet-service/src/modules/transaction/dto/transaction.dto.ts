import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 交易信息响应 DTO
 */
export class TransactionDto {
  @ApiProperty({ description: '交易哈希' })
  hash: string;

  @ApiProperty({ description: '区块号' })
  blockNumber: string;

  @ApiProperty({ description: '区块哈希' })
  blockHash: string;

  @ApiProperty({ description: '发送方地址' })
  from: string;

  @ApiProperty({ description: '接收方地址' })
  to: string;

  @ApiProperty({ description: '转账金额（Wei）' })
  value: string;

  @ApiProperty({ description: 'Gas Price' })
  gasPrice: string;

  @ApiProperty({ description: 'Gas Limit' })
  gas: string;

  @ApiProperty({ description: '实际使用的 Gas' })
  gasUsed: string;

  @ApiProperty({ description: '交易状态 (1:成功, 0:失败)' })
  status: number;

  @ApiProperty({ description: '时间戳' })
  timestamp: string;

  @ApiProperty({ description: '是否为合约创建' })
  isContractCreation: boolean;

  @ApiPropertyOptional({ description: '创建的合约地址' })
  contractAddress?: string;

  @ApiPropertyOptional({ description: '交易方法名称' })
  methodName?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

/**
 * 交易详情响应 DTO
 */
export class TransactionDetailDto extends TransactionDto {
  @ApiProperty({ description: '输入数据（hex）' })
  input: string;

  @ApiProperty({ description: 'Nonce' })
  nonce: string;

  @ApiProperty({ description: '交易在区块中的索引' })
  transactionIndex: number;

  @ApiProperty({ description: '交易类型' })
  type: number;
}

/**
 * 交易列表查询 DTO
 */
export class TransactionListQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '地址过滤（发送方或接收方）' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: '发送方地址' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: '接收方地址' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: '交易状态 (1:成功, 0:失败)' })
  @IsOptional()
  @IsEnum([0, 1])
  status?: number;

  @ApiPropertyOptional({ description: '起始区块号' })
  @IsOptional()
  @IsString()
  startBlock?: string;

  @ApiPropertyOptional({ description: '结束区块号' })
  @IsOptional()
  @IsString()
  endBlock?: string;
}

/**
 * 交易列表响应 DTO
 */
export class TransactionListResponseDto {
  @ApiProperty({ description: '交易列表', type: [TransactionDto] })
  transactions: TransactionDto[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

/**
 * 交易统计响应 DTO
 */
export class TransactionStatsDto {
  @ApiProperty({ description: '总交易数' })
  totalTransactions: number;

  @ApiProperty({ description: '成功交易数' })
  successTransactions: number;

  @ApiProperty({ description: '失败交易数' })
  failedTransactions: number;

  @ApiProperty({ description: '总转账金额（ETH）' })
  totalValue: string;

  @ApiProperty({ description: '总 Gas 费用（ETH）' })
  totalGasCost: string;

  @ApiProperty({ description: '最近24小时交易数' })
  last24HoursCount: number;
}

/**
 * 同步交易请求 DTO
 */
export class SyncTransactionsDto {
  @ApiProperty({ description: '地址' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: '起始区块号', default: '0' })
  @IsOptional()
  @IsString()
  startBlock?: string;

  @ApiPropertyOptional({ description: '结束区块号', default: 'latest' })
  @IsOptional()
  @IsString()
  endBlock?: string;
}

