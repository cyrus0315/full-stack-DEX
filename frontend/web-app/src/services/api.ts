import axios, { AxiosInstance } from 'axios'
import { API_CONFIG } from '../config/api'
import { message } from 'antd'

/**
 * 创建 Axios 实例
 */
const createApiClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 请求拦截器
  client.interceptors.request.use(
    (config) => {
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  client.interceptors.response.use(
    (response) => {
      // 直接返回后端数据，不包装
      return response.data
    },
    (error) => {
      const errorMessage = error.response?.data?.message || error.message || '请求失败'
      message.error(errorMessage)
      return Promise.reject(error)
    }
  )

  return client
}

/**
 * Wallet Service API 客户端
 */
export const walletApi = createApiClient(API_CONFIG.WALLET_SERVICE)

/**
 * Trading Service API 客户端
 */
export const tradingApi = createApiClient(API_CONFIG.TRADING_SERVICE)

/**
 * API 服务类
 */
export const apiService = {
  // ==================== Balance ====================
  
  /**
   * 获取 ETH 余额
   */
  getEthBalance: async (address: string): Promise<any> => {
    return walletApi.get(`/balance/eth/${address}`)
  },

  /**
   * 获取代币余额
   */
  getTokenBalance: async (address: string, tokenAddress: string): Promise<any> => {
    return walletApi.get(`/balance/token/${address}/${tokenAddress}`)
  },

  /**
   * 批量获取余额
   */
  getBatchBalances: async (requests: Array<{
    address: string
    tokenAddress: string
  }>): Promise<any> => {
    return walletApi.post('/balance/batch', { requests })
  },

  /**
   * 获取所有余额
   */
  getAllBalances: async (address: string): Promise<any> => {
    return walletApi.get(`/balance/all/${address}`)
  },

  // ==================== Transaction ====================
  
  /**
   * 获取交易列表
   */
  getTransactions: async (params?: {
    page?: number
    limit?: number
  }): Promise<any> => {
    return walletApi.get('/transaction', { params })
  },

  /**
   * 根据哈希获取交易
   */
  getTransactionByHash: async (hash: string): Promise<any> => {
    return walletApi.get(`/transaction/${hash}`)
  },

  /**
   * 根据地址获取交易
   */
  getTransactionsByAddress: async (
    address: string,
    params?: { page?: number; limit?: number }
  ): Promise<any> => {
    return walletApi.get(`/transaction/address/${address}`, { params })
  },

  // ==================== Pool ====================
  
  /**
   * 获取所有交易对
   */
  getPools: async (): Promise<any> => {
    return tradingApi.get('/pool')
  },

  /**
   * 根据 ID 获取单个交易对
   */
  getPoolById: async (poolId: number): Promise<any> => {
    return tradingApi.get(`/pool/${poolId}`)
  },

  /**
   * 获取交易对信息（通过 pairAddress）
   */
  getPoolInfo: async (pairAddress: string): Promise<any> => {
    return tradingApi.get(`/pool/address/${pairAddress}`)
  },

  /**
   * 根据代币对查询 Pool
   */
  getPoolByTokens: async (token0: string, token1: string): Promise<any> => {
    return tradingApi.get(`/pool/pair/${token0}/${token1}`)
  },

  /**
   * 刷新交易对数据（从链上同步最新储备量）
   */
  refreshPool: async (poolId: number): Promise<any> => {
    return tradingApi.post(`/pool/${poolId}/refresh`)
  },

  /**
   * 根据代币对查询并刷新 Pool
   */
  refreshPoolByTokens: async (token0: string, token1: string): Promise<any> => {
    try {
      // 1. 先查询 Pool 信息
      let poolResponse: any
      try {
        poolResponse = await tradingApi.get(`/pool/pair/${token0}/${token1}`)
      } catch (error: any) {
        // 如果 Pool 不存在（404），先创建它
        if (error.response?.status === 404) {
          console.log('ℹ️ Pool not found, creating...', token0, token1)
          
          // 调用 getOrCreatePool API
          poolResponse = await tradingApi.post('/pool', {
            token0Address: token0,
            token1Address: token1,
          })
          
          console.log('✅ Pool created:', poolResponse.pairAddress)
        } else {
          throw error
        }
      }
      
      if (poolResponse && poolResponse.id) {
        // 2. 刷新 Pool 数据（从链上同步最新数据）
        await tradingApi.post(`/pool/${poolResponse.id}/refresh`)
        console.log('✅ Pool refreshed:', poolResponse.pairAddress)
        return poolResponse
      }
    } catch (error: any) {
      console.warn('⚠️ Failed to refresh pool (non-critical):', error.message)
      // 不抛出错误，避免影响交易成功提示
    }
  },

  // ==================== Quote ====================
  
  /**
   * 获取交易报价（精确输入）
   */
  getQuote: async (params: {
    tokenIn: string
    tokenOut: string
    amountIn: string
  }): Promise<any> => {
    return tradingApi.post('/quote', params)
  },

  /**
   * 获取交易报价（精确输出）
   */
  getQuoteExactOut: async (params: {
    tokenIn: string
    tokenOut: string
    amountOut: string
  }): Promise<any> => {
    return tradingApi.post('/quote/exact-out', params)
  },

  /**
   * 获取增强报价（包含滑点分析、推荐等）
   */
  getEnhancedQuote: async (params: {
    tokenIn: string
    tokenOut: string
    amountIn: string
    slippage?: number
  }): Promise<{
    tokenIn: string
    tokenOut: string
    amountIn: string
    amountOut: string
    priceImpact: string
    executionPrice: string
    route: string[]
    minimumReceived: {
      '0.5': string
      '1.0': string
      '5.0': string
    }
    priceBeforeSwap: string
    priceAfterSwap: string
    liquidityDepth: 'high' | 'medium' | 'low'
    gasEstimate?: string
    recommendation: {
      suggestedSlippage: number
      warning: string | null
    }
    pairAddress: string
    reserve0: string
    reserve1: string
  }> => {
    return tradingApi.post('/quote/enhanced', params)
  },

  // ==================== Swap ====================
  
  // ==================== History ====================
  
  /**
   * ⚠️ 注意：Swap 和 Liquidity 执行功能已废弃
   * 
   * 交易和流动性操作应由前端直接调用智能合约：
   * - 使用 useSwap hook 执行 Swap
   * - 使用 useLiquidity hook 执行添加/移除流动性
   * 
   * 后端仅提供只读查询服务：
   * - History API: 查询历史记录
   * - Analytics API: 查询统计数据
   * - Pool API: 查询池子信息
   * - Quote API: 查询价格报价
   */

  /**
   * 获取 Swap 历史记录
   */
  getSwapHistory: async (params: {
    userAddress?: string
    poolId?: number
    page?: number
    limit?: number
  }): Promise<any> => {
    return tradingApi.get('/history/swaps', { params })
  },

  /**
   * 获取 Liquidity 历史记录
   */
  getLiquidityHistory: async (params: {
    userAddress?: string
    poolId?: number
    actionType?: 'add' | 'remove'
    page?: number
    limit?: number
  }): Promise<any> => {
    return tradingApi.get('/history/liquidity', { params })
  },

  /**
   * 获取用户最近活动
   */
  getUserRecentActivity: async (userAddress: string, limit?: number): Promise<any> => {
    return tradingApi.get(`/history/user/${userAddress}/recent`, {
      params: { limit },
    })
  },

  /**
   * 获取池子统计数据
   */
  getPoolStats: async (poolId: number, hours?: number): Promise<any> => {
    return tradingApi.get(`/history/pool/${poolId}/stats`, {
      params: { hours },
    })
  },

  // ==================== Analytics ====================

  /**
   * 获取全局概览数据
   */
  getAnalyticsOverview: async (): Promise<any> => {
    return tradingApi.get('/analytics/overview')
  },

  /**
   * 获取池子详细分析数据
   */
  getPoolAnalytics: async (poolId: number): Promise<any> => {
    return tradingApi.get(`/analytics/pool/${poolId}`)
  },

  /**
   * 获取池子历史数据（用于图表）
   */
  getPoolHistory: async (poolId: number, hours?: number): Promise<any> => {
    return tradingApi.get(`/analytics/pool/${poolId}/history`, {
      params: { hours },
    })
  },

  /**
   * 获取用户统计数据
   */
  getUserStats: async (userAddress: string): Promise<any> => {
    return tradingApi.get(`/analytics/user/${userAddress}`)
  },

  // ==================== Farming ====================

  /**
   * 获取所有挖矿池列表
   */
  getAllFarms: async (): Promise<any> => {
    return tradingApi.get('/farms')
  },

  /**
   * 获取单个池子详情
   */
  getFarm: async (poolId: number): Promise<any> => {
    return tradingApi.get(`/farms/${poolId}`)
  },

  /**
   * 手动同步池子数据
   */
  syncFarm: async (poolId: number): Promise<any> => {
    return tradingApi.get(`/farms/${poolId}/sync`)
  },

  /**
   * 获取用户在所有池子的质押情况
   */
  getUserFarms: async (userAddress: string): Promise<any> => {
    return tradingApi.get(`/farms/user/${userAddress}`)
  },

  /**
   * 获取质押排行榜
   */
  getFarmingLeaderboard: async (limit?: number): Promise<any> => {
    return tradingApi.get('/farms/leaderboard/top', {
      params: { limit: limit || 100 },
    })
  },
}

