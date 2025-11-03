import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * UserFarm 实体 - 用户挖矿信息
 * 
 * 记录每个用户在每个池子的质押和收益情况
 */
@Entity('user_farms')
@Index('IDX_user_farm_user_pool', ['userAddress', 'poolId'], { unique: true })
@Index('IDX_user_farm_user', ['userAddress'])
@Index('IDX_user_farm_pool', ['poolId'])
@Index('IDX_user_farm_updated', ['updatedAt'])
export class UserFarm {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 用户地址
   */
  @Column()
  userAddress: string;

  /**
   * 池子 ID
   */
  @Column()
  poolId: number;

  /**
   * 已质押数量（LP Token）
   */
  @Column({ type: 'varchar', default: '0' })
  stakedAmount: string;

  /**
   * 已质押价值（USD）
   */
  @Column({ type: 'varchar', default: '0' })
  stakedUsd: string;

  /**
   * 待领取奖励（DEX 代币）
   */
  @Column({ type: 'varchar', default: '0' })
  pendingReward: string;

  /**
   * 累计已赚取奖励（DEX 代币）
   */
  @Column({ type: 'varchar', default: '0' })
  totalEarned: string;

  /**
   * 累计已赚取价值（USD）
   */
  @Column({ type: 'varchar', default: '0' })
  totalEarnedUsd: string;

  /**
   * 占池子比例（百分比）
   */
  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  shareOfPool: number;

  /**
   * 奖励债务（链上数据）
   */
  @Column({ type: 'varchar', default: '0' })
  rewardDebt: string;

  /**
   * 最后操作时间（质押或提取）
   */
  @Column({ type: 'timestamp', nullable: true })
  lastActionAt: Date;

  /**
   * 创建时间（首次质押）
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 更新时间
   */
  @UpdateDateColumn()
  updatedAt: Date;
}

