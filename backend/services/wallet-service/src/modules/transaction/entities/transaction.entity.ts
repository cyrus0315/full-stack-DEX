import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Transaction 实体
 * 用于存储交易记录
 */
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 交易哈希（唯一）
   */
  @Column({ unique: true, length: 66 })
  @Index()
  hash: string;

  /**
   * 区块号
   */
  @Column({ type: 'bigint' })
  @Index()
  blockNumber: string;

  /**
   * 区块哈希
   */
  @Column({ length: 66, nullable: true })
  blockHash: string;

  /**
   * 交易在区块中的索引
   */
  @Column({ type: 'int', nullable: true })
  transactionIndex: number;

  /**
   * 发送方地址
   */
  @Column({ length: 42 })
  @Index()
  from: string;

  /**
   * 接收方地址
   */
  @Column({ length: 42, nullable: true })
  @Index()
  to: string;

  /**
   * 转账金额（Wei，字符串格式）
   */
  @Column({ type: 'varchar', length: 78 })
  value: string;

  /**
   * Gas Price（Wei）
   */
  @Column({ type: 'varchar', length: 78, nullable: true })
  gasPrice: string;

  /**
   * Gas Limit
   */
  @Column({ type: 'bigint', nullable: true })
  gas: string;

  /**
   * 实际使用的 Gas
   */
  @Column({ type: 'bigint', nullable: true })
  gasUsed: string;

  /**
   * 输入数据（hex）
   */
  @Column({ type: 'text', nullable: true })
  input: string;

  /**
   * Nonce
   */
  @Column({ type: 'bigint', nullable: true })
  nonce: string;

  /**
   * 交易状态
   * 1: 成功
   * 0: 失败
   */
  @Column({ type: 'int', default: 1 })
  @Index()
  status: number;

  /**
   * 交易类型
   * 0: Legacy
   * 2: EIP-1559
   */
  @Column({ type: 'int', default: 0 })
  type: number;

  /**
   * 时间戳
   */
  @Column({ type: 'bigint' })
  @Index()
  timestamp: string;

  /**
   * 是否为合约创建
   */
  @Column({ type: 'boolean', default: false })
  isContractCreation: boolean;

  /**
   * 创建的合约地址（如果是合约创建交易）
   */
  @Column({ length: 42, nullable: true })
  contractAddress: string;

  /**
   * 交易方法名称（解析自 input）
   */
  @Column({ length: 100, nullable: true })
  methodName: string;

  /**
   * 创建时间
   */
  @CreateDateColumn()
  createdAt: Date;
}

