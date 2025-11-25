import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum OrderStatus {
  ACTIVE = 'active',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING_EXECUTION = 'pending_execution',
}

@Entity('limit_orders')
@Index(['maker'])
@Index(['status'])
@Index(['tokenIn', 'tokenOut'])
export class LimitOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id', type: 'varchar', unique: true })
  @Index()
  orderId: string; // 链上订单 ID

  @Column({ name: 'maker', type: 'varchar' })
  maker: string; // 订单创建者地址

  @Column({ name: 'token_in', type: 'varchar' })
  tokenIn: string; // 输入代币地址

  @Column({ name: 'token_out', type: 'varchar' })
  tokenOut: string; // 输出代币地址

  @Column({ name: 'amount_in', type: 'varchar' })
  amountIn: string; // 输入数量（wei 格式）

  @Column({ name: 'min_amount_out', type: 'varchar' })
  minAmountOut: string; // 最小输出数量（wei 格式）

  @Column({ name: 'execution_price', type: 'varchar' })
  executionPrice: string; // 执行价格（1e18 精度）

  @Column({
    name: 'status',
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.ACTIVE,
  })
  status: OrderStatus;

  @Column({ name: 'created_at_block', type: 'int' })
  createdAtBlock: number; // 创建区块号

  @Column({ name: 'expires_at', type: 'bigint', nullable: true })
  expiresAt: string; // 过期时间戳（秒）, null 表示永不过期

  @Column({ name: 'filled_at_block', type: 'int', nullable: true })
  filledAtBlock: number | null; // 成交区块号

  @Column({ name: 'filled_amount_out', type: 'varchar', nullable: true })
  filledAmountOut: string | null; // 实际成交输出数量

  @Column({ name: 'executor', type: 'varchar', nullable: true })
  executor: string | null; // 执行者地址

  @Column({ name: 'tx_hash', type: 'varchar' })
  txHash: string; // 创建交易哈希

  @Column({ name: 'filled_tx_hash', type: 'varchar', nullable: true })
  filledTxHash: string | null; // 成交交易哈希

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 虚拟字段：当前市场价格是否满足执行条件
  isExecutable?: boolean;

  // 虚拟字段：预估输出数量
  estimatedAmountOut?: string;
}

