import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

/**
 * 价格历史记录实体
 * 用于记录池子的价格变化历史，用于滑点统计和分析
 */
@Entity('price_history')
@Index('IDX_price_history_pool_timestamp', ['poolId', 'timestamp'])
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pool_id', comment: '池子ID' })
  poolId: number;

  @Column({ type: 'numeric', precision: 78, scale: 18, comment: '价格（reserve1/reserve0）' })
  price: string;

  @Column({ type: 'numeric', precision: 78, scale: 18, name: 'reserve0', comment: 'Token0 储备量' })
  reserve0: string;

  @Column({ type: 'numeric', precision: 78, scale: 18, name: 'reserve1', comment: 'Token1 储备量' })
  reserve1: string;

  @Column({ type: 'bigint', name: 'block_number', comment: '区块号' })
  blockNumber: string;

  @CreateDateColumn({ name: 'timestamp', comment: '记录时间' })
  timestamp: Date;
}

