import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pool } from '../../pool/entities/pool.entity';

/**
 * SwapHistory Entity - Swap 交易历史
 * 记录所有的 Swap 交易事件
 */
@Entity('swap_history')
@Index('IDX_swap_history_pool_created', ['poolId', 'createdAt'])
@Index('IDX_swap_history_user_created', ['userAddress', 'createdAt'])
@Index('IDX_swap_history_tx_hash', ['transactionHash'])
export class SwapHistory {
  @PrimaryGeneratedColumn()
  id: number;

  // 关联的交易池
  @Column({ type: 'int' })
  poolId: number;

  @ManyToOne(() => Pool)
  @JoinColumn({ name: 'poolId' })
  pool: Pool;

  // 交易发起地址
  @Column({ type: 'varchar', length: 42 })
  @Index('IDX_swap_history_user_address')
  userAddress: string;

  // 接收地址（通常与 userAddress 相同）
  @Column({ type: 'varchar', length: 42 })
  toAddress: string;

  // 输入代币地址
  @Column({ type: 'varchar', length: 42 })
  tokenIn: string;

  // 输出代币地址
  @Column({ type: 'varchar', length: 42 })
  tokenOut: string;

  // 输入金额（原始单位）
  @Column({ type: 'varchar', length: 78 })
  amountIn: string;

  // 输出金额（原始单位）
  @Column({ type: 'varchar', length: 78 })
  amountOut: string;

  // 交易哈希
  @Column({ type: 'varchar', length: 66, unique: true })
  transactionHash: string;

  // 区块号
  @Column({ type: 'bigint' })
  blockNumber: string;

  // 区块时间戳
  @Column({ type: 'int' })
  blockTimestamp: number;

  // 日志索引（用于排序同一区块内的交易）
  @Column({ type: 'int' })
  logIndex: number;

  // Gas 费用（可选）
  @Column({ type: 'varchar', length: 78, nullable: true })
  gasUsed: string;

  // 价格影响（百分比，例如 0.5 表示 0.5%）
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  priceImpact: string;

  @CreateDateColumn()
  createdAt: Date;
}

