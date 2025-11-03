import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 添加地址 DTO
 */
export class AddAddressDto {
  @ApiProperty({ description: '钱包地址', example: '0x...' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({ description: '地址标签', example: '我的钱包' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: '地址备注', example: '主要交易账户' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用监控', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isMonitored?: boolean;

  @ApiPropertyOptional({ description: '标签列表', example: ['交易', '冷钱包'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * 更新地址 DTO
 */
export class UpdateAddressDto {
  @ApiPropertyOptional({ description: '地址标签', example: '更新后的标签' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: '地址备注' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用监控' })
  @IsOptional()
  @IsBoolean()
  isMonitored?: boolean;

  @ApiPropertyOptional({ description: '标签列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * 地址信息响应 DTO
 */
export class AddressInfoDto {
  @ApiProperty({ description: 'ID' })
  id: number;

  @ApiProperty({ description: '钱包地址' })
  address: string;

  @ApiProperty({ description: '地址标签' })
  label: string;

  @ApiProperty({ description: '地址备注' })
  description: string;

  @ApiProperty({ description: '地址类型', enum: ['EOA', 'Contract'] })
  type: 'EOA' | 'Contract';

  @ApiProperty({ description: '是否启用监控' })
  isMonitored: boolean;

  @ApiProperty({ description: 'ETH 余额' })
  ethBalance: string;

  @ApiProperty({ description: '交易数量' })
  transactionCount: number;

  @ApiProperty({ description: '标签列表' })
  tags: string[];

  @ApiProperty({ description: '最后同步时间' })
  lastSyncAt: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

/**
 * 地址列表查询 DTO
 */
export class AddressListQueryDto {
  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', example: 20, default: 20 })
  limit?: number;

  @ApiPropertyOptional({ description: '搜索关键词（地址或标签）', example: '0x...' })
  search?: string;

  @ApiPropertyOptional({ description: '是否只显示监控中的地址', example: true })
  isMonitored?: boolean;

  @ApiPropertyOptional({ description: '地址类型', enum: ['EOA', 'Contract'] })
  @IsOptional()
  @IsEnum(['EOA', 'Contract'])
  type?: 'EOA' | 'Contract';

  @ApiPropertyOptional({ description: '标签过滤', example: '交易' })
  tag?: string;
}

/**
 * 地址列表响应 DTO
 */
export class AddressListResponseDto {
  @ApiProperty({ description: '地址列表', type: [AddressInfoDto] })
  addresses: AddressInfoDto[];

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
 * 地址详情响应 DTO
 */
export class AddressDetailDto extends AddressInfoDto {
  @ApiProperty({ description: '代币持仓列表' })
  tokenBalances?: Array<{
    tokenAddress: string;
    symbol: string;
    balance: string;
    decimals: number;
  }>;

  @ApiProperty({ description: '最近交易列表' })
  recentTransactions?: Array<{
    hash: string;
    from: string;
    to: string;
    value: string;
    timestamp: number;
  }>;
}

/**
 * 批量添加地址 DTO
 */
export class BatchAddAddressDto {
  @ApiProperty({ description: '地址列表', type: [AddAddressDto] })
  @IsArray()
  addresses: AddAddressDto[];
}

