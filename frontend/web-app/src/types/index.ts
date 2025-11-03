/**
 * 全局类型定义
 */

/**
 * 代币信息
 */
export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

/**
 * 余额信息
 */
export interface Balance {
  token: Token
  balance: string
  formatted: string
}

/**
 * 交易记录
 */
export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  gasPrice: string
  gasUsed: string
  blockNumber: string
  blockHash: string
  timestamp: string
  status: number
  input: string
  nonce: string
}

/**
 * 交易对信息
 */
export interface PoolInfo {
  pairAddress: string
  token0: Token
  token1: Token
  reserve0: string
  reserve1: string
  totalSupply: string
  token0Price: string
  token1Price: string
}

/**
 * 报价信息
 */
export interface QuoteResult {
  amountIn: string
  amountOut: string
  path: string[]
  priceImpact: string
  minimumReceived?: string
}

/**
 * Swap 参数
 */
export interface SwapParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOutMin: string
  recipient: string
  deadline: number
}

/**
 * 添加流动性参数
 */
export interface AddLiquidityParams {
  tokenA: string
  tokenB: string
  amountADesired: string
  amountBDesired: string
  amountAMin: string
  amountBMin: string
  to: string
  deadline: number
}

/**
 * 移除流动性参数
 */
export interface RemoveLiquidityParams {
  tokenA: string
  tokenB: string
  liquidity: string
  amountAMin: string
  amountBMin: string
  to: string
  deadline: number
}

/**
 * API 响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/**
 * WebSocket 消息类型
 */
export interface WsMessage {
  event: string
  data: any
}

/**
 * 新区块事件
 */
export interface NewBlockEvent {
  number: string
  hash: string
  timestamp: string
  transactionCount: number
}

/**
 * 新交易事件
 */
export interface NewTransactionEvent {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: string
  timestamp: string
}

