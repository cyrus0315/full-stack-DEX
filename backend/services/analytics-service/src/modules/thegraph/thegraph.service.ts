/**
 * @title TheGraph Service
 * @notice 提供 The Graph Subgraph 查询服务
 * 
 * 功能：
 * - GraphQL 查询封装
 * - 缓存策略
 * - 降级方案（The Graph 失败时使用数据库）
 */

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphQLClient, gql } from 'graphql-request'

@Injectable()
export class TheGraphService {
  private readonly logger = new Logger(TheGraphService.name)
  private readonly client: GraphQLClient
  private readonly subgraphUrl: string
  private readonly enableTheGraph: boolean

  constructor(private readonly configService: ConfigService) {
    // 从环境变量读取 Subgraph URL
    this.subgraphUrl =
      this.configService.get<string>('SUBGRAPH_URL') ||
      'http://localhost:8000/subgraphs/name/dex-subgraph'

    // 是否启用 The Graph（可通过环境变量控制）
    this.enableTheGraph =
      this.configService.get<string>('ENABLE_THE_GRAPH') !== 'false'

    if (this.enableTheGraph) {
      this.client = new GraphQLClient(this.subgraphUrl, {
        timeout: 10000, // 10秒超时
      })
      this.logger.log(`TheGraph Service 已初始化: ${this.subgraphUrl}`)
    } else {
      this.logger.warn('TheGraph Service 已禁用，将使用数据库作为数据源')
    }
  }

  /**
   * 检查 The Graph 是否可用
   */
  isEnabled(): boolean {
    return this.enableTheGraph
  }

  // ========================================
  // Factory 查询
  // ========================================

  /**
   * 获取全局统计数据
   */
  async getFactory(factoryAddress: string) {
    const query = gql`
      query GetFactory($id: ID!) {
        factory(id: $id) {
          id
          pairCount
          totalVolumeUSD
          totalVolumeETH
          totalLiquidityUSD
          totalLiquidityETH
          txCount
          updatedAt
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        id: factoryAddress.toLowerCase(),
      })
      return data.factory
    } catch (error) {
      this.logger.error(`获取 Factory 数据失败: ${error.message}`)
      throw error
    }
  }

  // ========================================
  // Pair 查询
  // ========================================

  /**
   * 获取所有交易对（分页）
   */
  async getPairs(args?: {
    first?: number
    skip?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    where?: any
  }) {
    const {
      first = 100,
      skip = 0,
      orderBy = 'volumeUSD',
      orderDirection = 'desc',
      where,
    } = args || {}

    const query = gql`
      query GetPairs(
        $first: Int!
        $skip: Int!
        $orderBy: Pair_orderBy
        $orderDirection: OrderDirection
        $where: Pair_filter
      ) {
        pairs(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
          where: $where
        ) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          reserve0
          reserve1
          totalSupply
          reserveUSD
          volumeUSD
          token0Price
          token1Price
          txCount
          createdAtTimestamp
          updatedAt
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        first,
        skip,
        orderBy,
        orderDirection,
        where,
      })
      return data.pairs
    } catch (error) {
      this.logger.error(`获取 Pairs 数据失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 获取单个交易对
   */
  async getPair(pairAddress: string) {
    const query = gql`
      query GetPair($id: ID!) {
        pair(id: $id) {
          id
          token0 {
            id
            symbol
            name
            decimals
          }
          token1 {
            id
            symbol
            name
            decimals
          }
          reserve0
          reserve1
          totalSupply
          reserveUSD
          volumeUSD
          token0Price
          token1Price
          txCount
          createdAtTimestamp
          updatedAt
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        id: pairAddress.toLowerCase(),
      })
      return data.pair
    } catch (error) {
      this.logger.error(
        `获取 Pair ${pairAddress} 数据失败: ${error.message}`,
      )
      throw error
    }
  }

  // ========================================
  // Swap 查询
  // ========================================

  /**
   * 获取最近的交易
   */
  async getSwaps(args?: {
    first?: number
    skip?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    where?: any
  }) {
    const {
      first = 100,
      skip = 0,
      orderBy = 'timestamp',
      orderDirection = 'desc',
      where,
    } = args || {}

    const query = gql`
      query GetSwaps(
        $first: Int!
        $skip: Int!
        $orderBy: Swap_orderBy
        $orderDirection: OrderDirection
        $where: Swap_filter
      ) {
        swaps(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
          where: $where
        ) {
          id
          transaction {
            id
            timestamp
          }
          pair {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
          sender
          to
          amount0In
          amount1In
          amount0Out
          amount1Out
          amountUSD
          timestamp
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        first,
        skip,
        orderBy,
        orderDirection,
        where,
      })
      return data.swaps
    } catch (error) {
      this.logger.error(`获取 Swaps 数据失败: ${error.message}`)
      throw error
    }
  }

  // ========================================
  // Liquidity 查询
  // ========================================

  /**
   * 获取 Mint 事件（添加流动性）
   */
  async getMints(args?: {
    first?: number
    skip?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    where?: any
  }) {
    const {
      first = 100,
      skip = 0,
      orderBy = 'timestamp',
      orderDirection = 'desc',
      where,
    } = args || {}

    const query = gql`
      query GetMints(
        $first: Int!
        $skip: Int!
        $orderBy: Mint_orderBy
        $orderDirection: OrderDirection
        $where: Mint_filter
      ) {
        mints(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
          where: $where
        ) {
          id
          transaction {
            id
            timestamp
          }
          pair {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
          sender
          to
          liquidity
          amount0
          amount1
          amountUSD
          timestamp
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        first,
        skip,
        orderBy,
        orderDirection,
        where,
      })
      return data.mints
    } catch (error) {
      this.logger.error(`获取 Mints 数据失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 获取 Burn 事件（移除流动性）
   */
  async getBurns(args?: {
    first?: number
    skip?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    where?: any
  }) {
    const {
      first = 100,
      skip = 0,
      orderBy = 'timestamp',
      orderDirection = 'desc',
      where,
    } = args || {}

    const query = gql`
      query GetBurns(
        $first: Int!
        $skip: Int!
        $orderBy: Burn_orderBy
        $orderDirection: OrderDirection
        $where: Burn_filter
      ) {
        burns(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
          where: $where
        ) {
          id
          transaction {
            id
            timestamp
          }
          pair {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
          sender
          to
          liquidity
          amount0
          amount1
          amountUSD
          timestamp
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        first,
        skip,
        orderBy,
        orderDirection,
        where,
      })
      return data.burns
    } catch (error) {
      this.logger.error(`获取 Burns 数据失败: ${error.message}`)
      throw error
    }
  }

  // ========================================
  // Farming 查询
  // ========================================

  /**
   * 获取所有挖矿池
   */
  async getFarms(args?: {
    first?: number
    skip?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    where?: any
  }) {
    const {
      first = 100,
      skip = 0,
      orderBy = 'totalStakedUSD',
      orderDirection = 'desc',
      where,
    } = args || {}

    const query = gql`
      query GetFarms(
        $first: Int!
        $skip: Int!
        $orderBy: Farm_orderBy
        $orderDirection: OrderDirection
        $where: Farm_filter
      ) {
        farms(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
          where: $where
        ) {
          id
          lpToken
          pair {
            id
            token0 {
              symbol
            }
            token1 {
              symbol
            }
          }
          allocPoint
          lastRewardBlock
          accRewardPerShare
          totalStaked
          totalStakedUSD
          apr
          status
          createdAtTimestamp
          updatedAt
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        first,
        skip,
        orderBy,
        orderDirection,
        where,
      })
      return data.farms
    } catch (error) {
      this.logger.error(`获取 Farms 数据失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 获取用户质押信息
   */
  async getUserStakes(userAddress: string) {
    const query = gql`
      query GetUserStakes($user: Bytes!) {
        userStakes(where: { user: $user }) {
          id
          user
          farm {
            id
            lpToken
            pair {
              id
              token0 {
                symbol
              }
              token1 {
                symbol
              }
            }
            allocPoint
            totalStaked
            apr
          }
          amount
          amountUSD
          rewardDebt
          pendingReward
          totalEarned
          totalEarnedUSD
          lastDepositTimestamp
          lastWithdrawTimestamp
          updatedAt
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        user: userAddress.toLowerCase(),
      })
      return data.userStakes
    } catch (error) {
      this.logger.error(
        `获取用户 ${userAddress} 质押数据失败: ${error.message}`,
      )
      throw error
    }
  }

  // ========================================
  // Token 查询
  // ========================================

  /**
   * 获取所有代币
   */
  async getTokens(args?: {
    first?: number
    skip?: number
    orderBy?: string
    orderDirection?: 'asc' | 'desc'
    where?: any
  }) {
    const {
      first = 100,
      skip = 0,
      orderBy = 'tradeVolumeUSD',
      orderDirection = 'desc',
      where,
    } = args || {}

    const query = gql`
      query GetTokens(
        $first: Int!
        $skip: Int!
        $orderBy: Token_orderBy
        $orderDirection: OrderDirection
        $where: Token_filter
      ) {
        tokens(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
          where: $where
        ) {
          id
          symbol
          name
          decimals
          totalSupply
          tradeVolume
          tradeVolumeUSD
          txCount
          totalLiquidity
          derivedETH
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        first,
        skip,
        orderBy,
        orderDirection,
        where,
      })
      return data.tokens
    } catch (error) {
      this.logger.error(`获取 Tokens 数据失败: ${error.message}`)
      throw error
    }
  }

  /**
   * 获取单个代币
   */
  async getToken(tokenAddress: string) {
    const query = gql`
      query GetToken($id: ID!) {
        token(id: $id) {
          id
          symbol
          name
          decimals
          totalSupply
          tradeVolume
          tradeVolumeUSD
          txCount
          totalLiquidity
          derivedETH
        }
      }
    `

    try {
      const data = await this.client.request(query, {
        id: tokenAddress.toLowerCase(),
      })
      return data.token
    } catch (error) {
      this.logger.error(
        `获取 Token ${tokenAddress} 数据失败: ${error.message}`,
      )
      throw error
    }
  }
}

