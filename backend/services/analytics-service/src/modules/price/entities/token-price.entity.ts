import { Entity, Column, PrimaryColumn, UpdateDateColumn, CreateDateColumn } from 'typeorm';

/**
 * TokenPrice Entity
 * 
 * 存储代币价格数据（从 PriceOracle 合约读取）
 */
@Entity('token_prices')
export class TokenPrice {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  tokenAddress: string; // 代币地址（小写）

  @Column({ type: 'varchar', length: 20 })
  symbol: string; // 代币符号

  @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
  priceUsd: string; // USD 价格

  @Column({ type: 'varchar', length: 42, nullable: true })
  priceFeedAddress: string; // Chainlink 价格源地址

  @Column({ type: 'bigint', nullable: true })
  lastUpdateBlock: string; // 最后更新区块

  @Column({ type: 'timestamp', nullable: true })
  lastUpdateTime: Date; // 最后更新时间（链上）

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 是否激活

  @Column({ type: 'int', default: 0 })
  decimals: number; // 价格精度

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

