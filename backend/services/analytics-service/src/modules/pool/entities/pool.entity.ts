import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Pool Entity - 流动性池实体
 * 存储 DEX 交易对的信息和状态
 */
@Entity('pools')
export class Pool {
  @PrimaryGeneratedColumn()
  id: number;

  // 交易对合约地址
  @Column({ type: 'varchar', length: 42, unique: true })
  @Index()
  pairAddress: string;

  // Token0 地址
  @Column({ type: 'varchar', length: 42 })
  @Index()
  token0Address: string;

  // Token1 地址
  @Column({ type: 'varchar', length: 42 })
  @Index()
  token1Address: string;

  // Token0 信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  token0Symbol: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  token0Name: string;

  @Column({ type: 'int', nullable: true })
  token0Decimals: number;

  // Token1 信息
  @Column({ type: 'varchar', length: 50, nullable: true })
  token1Symbol: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  token1Name: string;

  @Column({ type: 'int', nullable: true })
  token1Decimals: number;

  // 储备量（字符串形式存储大数）
  @Column({ type: 'varchar', length: 78, default: '0' })
  reserve0: string;

  @Column({ type: 'varchar', length: 78, default: '0' })
  reserve1: string;

  // LP 代币总供应量
  @Column({ type: 'varchar', length: 78, default: '0' })
  totalSupply: string;

  // 价格（token1/token0）
  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0 })
  price: string;

  // 流动性（USD 等值，如果有价格feed）
  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0, nullable: true })
  liquidityUsd: string;

  // 24小时交易量
  @Column({ type: 'decimal', precision: 36, scale: 18, default: 0, nullable: true })
  volume24h: string;

  // 手续费率（基点，例如 30 表示 0.3%）
  @Column({ type: 'int', default: 30 })
  feeRate: number;

  // 最后更新的区块号
  @Column({ type: 'bigint', default: 0 })
  lastUpdateBlock: string;

  // 最后更新的区块时间戳
  @Column({ type: 'int', nullable: true })
  lastUpdateTimestamp: number;

  // 是否活跃
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // 是否已验证
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

