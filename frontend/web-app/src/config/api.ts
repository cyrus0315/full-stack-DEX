/**
 * API 服务配置
 */

export const API_CONFIG = {
  // Wallet Service API
  WALLET_SERVICE: import.meta.env.VITE_WALLET_SERVICE_URL || '/api/v1',
  
  // Trading Service API
  TRADING_SERVICE: import.meta.env.VITE_TRADING_SERVICE_URL || '/trading',
  
  // WebSocket URL
  WS_URL: import.meta.env.VITE_WS_URL || 'http://localhost:3001',
  
  // 请求超时时间（毫秒）
  TIMEOUT: 10000,
} as const

/**
 * API 端点
 */
export const API_ENDPOINTS = {
  // Balance 相关
  BALANCE_ETH: (address: string) => `${API_CONFIG.WALLET_SERVICE}/balance/eth/${address}`,
  BALANCE_TOKEN: (address: string, tokenAddress: string) => 
    `${API_CONFIG.WALLET_SERVICE}/balance/token/${address}/${tokenAddress}`,
  BALANCE_ALL: (address: string) => `${API_CONFIG.WALLET_SERVICE}/balance/all/${address}`,
  BALANCE_BATCH: `${API_CONFIG.WALLET_SERVICE}/balance/batch`,
  
  // Transaction 相关
  TRANSACTIONS: `${API_CONFIG.WALLET_SERVICE}/transaction`,
  TRANSACTION_BY_HASH: (hash: string) => `${API_CONFIG.WALLET_SERVICE}/transaction/${hash}`,
  TRANSACTION_BY_ADDRESS: (address: string) => 
    `${API_CONFIG.WALLET_SERVICE}/transaction/address/${address}`,
  
  // Pool 相关
  POOLS: `${API_CONFIG.TRADING_SERVICE}/pool`,
  POOL_INFO: (pairAddress: string) => `${API_CONFIG.TRADING_SERVICE}/pool/${pairAddress}`,
  
  // Quote 相关
  QUOTE: `${API_CONFIG.TRADING_SERVICE}/quote`,
  QUOTE_EXACT_OUT: `${API_CONFIG.TRADING_SERVICE}/quote/exact-out`,
  
  // Swap 相关
  SWAP_EXACT_IN: `${API_CONFIG.TRADING_SERVICE}/swap/exact-in`,
  SWAP_EXACT_OUT: `${API_CONFIG.TRADING_SERVICE}/swap/exact-out`,
  
  // Liquidity 相关
  LIQUIDITY_ADD: `${API_CONFIG.TRADING_SERVICE}/liquidity/add`,
  LIQUIDITY_REMOVE: `${API_CONFIG.TRADING_SERVICE}/liquidity/remove`,
  LIQUIDITY_CALCULATE: `${API_CONFIG.TRADING_SERVICE}/liquidity/calculate`,
} as const

