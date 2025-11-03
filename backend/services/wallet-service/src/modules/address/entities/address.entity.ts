import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Address 实体
 * 用于存储监控的地址信息
 */
@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 钱包地址（唯一）
   */
  @Column({ unique: true, length: 42 })
  @Index()
  address: string;

  /**
   * 地址标签/名称
   */
  @Column({ length: 100, nullable: true })
  label: string;

  /**
   * 地址备注
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 地址类型
   * EOA: 外部账户
   * Contract: 合约地址
   */
  @Column({
    type: 'enum',
    enum: ['EOA', 'Contract'],
    default: 'EOA',
  })
  type: 'EOA' | 'Contract';

  /**
   * 是否启用监控
   */
  @Column({ type: 'boolean', default: true })
  isMonitored: boolean;

  /**
   * 最后同步时间
   */
  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date;

  /**
   * ETH 余额缓存（字符串格式）
   */
  @Column({ type: 'varchar', length: 78, nullable: true })
  ethBalance: string;

  /**
   * 交易数量缓存
   */
  @Column({ type: 'int', default: 0 })
  transactionCount: number;

  /**
   * 标签（多个标签用逗号分隔）
   */
  @Column({ type: 'text', nullable: true })
  tags: string;

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

