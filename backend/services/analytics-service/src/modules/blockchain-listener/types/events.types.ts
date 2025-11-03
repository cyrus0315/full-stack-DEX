import { Address } from 'viem';

/**
 * Factory PairCreated 事件
 */
export interface PairCreatedEvent {
  token0: Address;
  token1: Address;
  pair: Address;
  allPairsLength: bigint;
}

/**
 * Pair Sync 事件（储备量更新）
 */
export interface SyncEvent {
  pairAddress: Address;
  reserve0: bigint;
  reserve1: bigint;
}

/**
 * Pair Mint 事件（添加流动性）
 */
export interface MintEvent {
  pairAddress: Address;
  sender: Address;
  amount0: bigint;
  amount1: bigint;
}

/**
 * Pair Burn 事件（移除流动性）
 */
export interface BurnEvent {
  pairAddress: Address;
  sender: Address;
  amount0: bigint;
  amount1: bigint;
  to: Address;
}

/**
 * Pair Swap 事件（交易）
 */
export interface SwapEvent {
  pairAddress: Address;
  sender: Address;
  amount0In: bigint;
  amount1In: bigint;
  amount0Out: bigint;
  amount1Out: bigint;
  to: Address;
}

/**
 * 事件监听器状态
 */
export interface ListenerStatus {
  isRunning: boolean;
  startTime?: Date;
  lastEventTime?: Date;
  eventsProcessed: number;
  errors: number;
}

