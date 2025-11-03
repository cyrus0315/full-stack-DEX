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
 * LiquidityHistory Entity - 流动性操作历史
 * 记录所有的添加/移除流动性事件
 */
@Entity('liquidity_history')
@Index('IDX_liquidity_history_pool_created', ['poolId', 'createdAt'])
@Index('IDX_liquidity_history_user_created', ['userAddress', 'createdAt'])
@Index('IDX_liquidity_history_tx_hash', ['transactionHash'])
@Index('IDX_liquidity_history_action_created', ['actionType', 'createdAt'])
export class LiquidityHistory {
  @PrimaryGeneratedColumn()
  id: number;

  // 关联的交易池
  @Column({ type: 'int' })
  poolId: number;

  @ManyToOne(() => Pool)
  @JoinColumn({ name: 'poolId' })
  pool: Pool;

  // 操作类型：'add' 或 'remove'
  @Column({ type: 'varchar', length: 10 })
  actionType: 'add' | 'remove';

  // 用户地址
  @Column({ type: 'varchar', length: 42 })
  @Index('IDX_liquidity_history_user_address')
  userAddress: string;

  // 接收地址（Mint 时为 to，Burn 时为 from）
  @Column({ type: 'varchar', length: 42 })
  toAddress: string;

  // Token0 数量（原始单位）
  @Column({ type: 'varchar', length: 78 })
  amount0: string;

  // Token1 数量（原始单位）
  @Column({ type: 'varchar', length: 78 })
  amount1: string;

  // LP Token 数量（对于 add 是增加量，对于 remove 是减少量）
  @Column({ type: 'varchar', length: 78 })
  liquidity: string;

  // 交易哈希
  @Column({ type: 'varchar', length: 66 })
  @Index('IDX_liquidity_history_transaction_hash')
  transactionHash: string;

  // 区块号
  @Column({ type: 'bigint' })
  blockNumber: string;

  // 区块时间戳
  @Column({ type: 'int' })
  blockTimestamp: number;

  // 日志索引
  @Column({ type: 'int' })
  logIndex: number;

  // Gas 费用（可选）
  @Column({ type: 'varchar', length: 78, nullable: true })
  gasUsed: string;

  @CreateDateColumn()
  createdAt: Date;
}

