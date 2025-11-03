import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Farm 实体 - 挖矿池信息
 * 
 * 对应链上的 MasterChef 池子
 * 存储池子的基本信息和实时数据
 */
@Entity('farms')
@Index('IDX_farm_active', ['active'])
export class Farm {
  /**
   * 池子 ID（对应链上的 poolId）
   */
  @PrimaryColumn()
  poolId: number;

  /**
   * LP Token 合约地址
   */
  @Column()
  @Index('IDX_farm_lp_token')
  lpTokenAddress: string;

  /**
   * LP Token 符号（如 "DAI-USDT LP"）
   */
  @Column()
  lpTokenSymbol: string;

  /**
   * Token0 地址
   */
  @Column()
  token0Address: string;

  /**
   * Token0 符号
   */
  @Column()
  token0Symbol: string;

  /**
   * Token1 地址
   */
  @Column()
  token1Address: string;

  /**
   * Token1 符号
   */
  @Column()
  token1Symbol: string;

  /**
   * 分配点数（权重）
   */
  @Column({ type: 'varchar' })
  allocPoint: string;

  /**
   * 总质押量（LP Token 数量）
   */
  @Column({ type: 'varchar', default: '0' })
  totalStaked: string;

  /**
   * 总质押量（USD）
   */
  @Column({ type: 'varchar', default: '0' })
  totalStakedUsd: string;

  /**
   * 年化收益率（APR）
   * 以百分比表示，例如 "125.5" 表示 125.5%
   */
  @Column({ type: 'varchar', default: '0' })
  apr: string;

  /**
   * 年化复利收益率（APY）
   */
  @Column({ type: 'varchar', default: '0' })
  apy: string;

  /**
   * 总锁仓价值（TVL，USD）
   */
  @Column({ type: 'varchar', default: '0' })
  tvl: string;

  /**
   * 每日奖励（DEX 代币数量）
   */
  @Column({ type: 'varchar', default: '0' })
  dailyReward: string;

  /**
   * 上次奖励区块
   */
  @Column({ type: 'varchar' })
  lastRewardBlock: string;

  /**
   * 累积每份额奖励（链上数据）
   */
  @Column({ type: 'varchar', default: '0' })
  accRewardPerShare: string;

  /**
   * 是否激活
   */
  @Column({ default: true })
  active: boolean;

  /**
   * 创建时间
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 更新时间
   */
  @UpdateDateColumn()
  updatedAt: Date;
}

