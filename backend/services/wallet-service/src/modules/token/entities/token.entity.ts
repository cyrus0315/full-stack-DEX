import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Token 实体
 * 用于存储 ERC20 代币的元数据信息
 */
@Entity('tokens')
export class Token {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 代币合约地址（唯一）
   */
  @Column({ unique: true, length: 42 })
  @Index()
  address: string;

  /**
   * 代币名称
   */
  @Column({ length: 100, nullable: true })
  name: string;

  /**
   * 代币符号
   */
  @Column({ length: 20, nullable: true })
  symbol: string;

  /**
   * 代币精度
   */
  @Column({ type: 'int', default: 18 })
  decimals: number;

  /**
   * 总供应量（字符串格式，避免大数溢出）
   */
  @Column({ type: 'varchar', length: 78, nullable: true })
  totalSupply: string;

  /**
   * Logo URL
   */
  @Column({ length: 500, nullable: true })
  logoUrl: string;

  /**
   * 是否已验证（官方代币）
   */
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  /**
   * 代币描述
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 官网地址
   */
  @Column({ length: 500, nullable: true })
  website: string;

  /**
   * 最后更新区块高度
   */
  @Column({ type: 'bigint', nullable: true })
  lastUpdateBlock: string;

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

