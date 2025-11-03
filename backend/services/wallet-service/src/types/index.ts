// Blockchain 相关类型
export interface BlockchainConfig {
  network: 'mainnet' | 'sepolia' | 'goerli';
  rpcUrl: string;
  wsUrl?: string;
  chainId: number;
}

// 地址类型
export enum AddressType {
  EOA = 'eoa', // Externally Owned Account
  CONTRACT = 'contract', // Smart Contract
}

// 交易状态
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

// 余额信息
export interface BalanceInfo {
  address: string;
  token?: string;
  balance: string;
  decimals: number;
  symbol?: string;
  valueUsd?: string;
  timestamp: number;
}

// 代币信息
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  priceUsd?: number;
  isVerified: boolean;
}

// 交易信息
export interface TransactionInfo {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  blockTimestamp: Date;
  status: TransactionStatus;
  gasUsed?: string;
  gasPrice?: string;
  tokenAddress?: string;
  tokenValue?: string;
}

// API 响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

