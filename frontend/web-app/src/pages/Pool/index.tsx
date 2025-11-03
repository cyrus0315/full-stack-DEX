import { useState, useEffect, useCallback } from 'react'
import { Card, Typography, Button, Space, Avatar, Empty, Spin, Alert, Badge, Row, Col, Statistic } from 'antd'
import { ReloadOutlined, PlusOutlined, InfoCircleOutlined, WifiOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../services/api'
import { formatNumber } from '../../utils/format'
import { usePoolWebSocket } from '../../hooks/useWebSocket'
import './index.css'

const { Title, Text, Paragraph } = Typography

interface Pool {
  id?: number
  pairAddress: string
  // 兼容多种返回格式
  token0?: {
    symbol: string
    logoURI?: string
  }
  token1?: {
    symbol: string
    logoURI?: string
  }
  // 后端实际返回的字段
  token0Symbol?: string
  token1Symbol?: string
  token0Name?: string
  token1Name?: string
  token0Address?: string
  token1Address?: string
  token0Decimals?: number
  token1Decimals?: number
  
  reserve0: string
  reserve1: string
  totalSupply: string
  token0Price: string
  token1Price: string
  price?: string
  volume24h?: string
  liquidityUsd?: string
}

const PoolPage: React.FC = () => {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState<any>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const navigate = useNavigate()

  /**
   * WebSocket 实时更新处理
   */
  const handlePoolUpdate = useCallback((data: any) => {
    console.log('📡 Received pool update:', data)
    
    setPools((prevPools) => {
      // 查找是否已存在该 Pool
      const existingIndex = prevPools.findIndex(
        (p) => p.pairAddress?.toLowerCase() === data.pairAddress?.toLowerCase()
      )

      if (existingIndex >= 0) {
        // 更新现有 Pool
        const updatedPools = [...prevPools]
        updatedPools[existingIndex] = {
          ...updatedPools[existingIndex],
          reserve0: data.reserve0,
          reserve1: data.reserve1,
          token0Price: data.token0Price || updatedPools[existingIndex].token0Price,
          token1Price: data.token1Price || updatedPools[existingIndex].token1Price,
        }
        return updatedPools
      } else {
        // 新建 Pool（pool:created 事件）
        return [...prevPools, data as Pool]
      }
    })
  }, [])

  // 连接 WebSocket
  const { isConnected } = usePoolWebSocket(handlePoolUpdate)

  /**
   * 获取全局概览数据
   */
  const fetchOverview = async () => {
    setOverviewLoading(true)
    try {
      const data = await apiService.getAnalyticsOverview()
      setOverview(data)
    } catch (error) {
      console.error('Failed to fetch overview:', error)
    } finally {
      setOverviewLoading(false)
    }
  }

  /**
   * 获取交易对列表
   */
  const fetchPools = async () => {
    setLoading(true)
    try {
      const response = await apiService.getPools()
      console.log('Pool response:', response) // 调试日志
      
      if (response && response.pools) {
        setPools(response.pools || [])
      } else if (response && Array.isArray(response)) {
        // 兼容直接返回数组的情况
        setPools(response)
      }
    } catch (error) {
      console.error('Failed to fetch pools:', error)
      setPools([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPools()
    fetchOverview()
    
    // 当页面获得焦点时自动刷新
    const handleFocus = () => {
      fetchPools()
      fetchOverview()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  /**
   * 获取代币符号（兼容多种格式）
   */
  const getTokenSymbol = (pool: Pool, tokenIndex: 0 | 1): string => {
    if (tokenIndex === 0) {
      return pool.token0?.symbol || pool.token0Symbol || 'Token0'
    }
    return pool.token1?.symbol || pool.token1Symbol || 'Token1'
  }

  /**
   * 获取代币名称
   */
  const getTokenName = (pool: Pool, tokenIndex: 0 | 1): string => {
    if (tokenIndex === 0) {
      return pool.token0Name || pool.token0?.symbol || 'Token0'
    }
    return pool.token1Name || pool.token1?.symbol || 'Token1'
  }

  /**
   * 获取代币Logo
   */
  const getTokenLogo = (pool: Pool, tokenIndex: 0 | 1): string | undefined => {
    if (tokenIndex === 0) {
      return pool.token0?.logoURI
    }
    return pool.token1?.logoURI
  }

  /**
   * 计算流动性价值（USD）
   */
  const calculateLiquidityUsd = (pool: Pool): string => {
    // 简化计算，后续可以接入价格预言机
    return pool.liquidityUsd || '--'
  }

  /**
   * 计算24h交易量
   */
  const calculate24hVolume = (pool: Pool): string => {
    return pool.volume24h || '--'
  }

  return (
    <div className="pool-page">
      {/* 页面头部 */}
      <div className="pool-header">
        <div>
          <Title level={3}>💧 流动性池</Title>
          <Text type="secondary">交易对列表 - 提供流动性赚取手续费</Text>
        </div>
        <Space>
          <Badge dot={isConnected} color="green">
            <Button
              icon={<WifiOutlined />}
              type={isConnected ? 'default' : 'dashed'}
              title={isConnected ? 'WebSocket 已连接 - 实时更新' : 'WebSocket 未连接'}
            >
              {isConnected ? '实时' : '离线'}
            </Button>
          </Badge>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { fetchPools(); fetchOverview(); }}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/liquidity')}
          >
            添加流动性
          </Button>
        </Space>
      </div>

      {/* 全局统计概览 */}
      {overview && (
        <Card style={{ marginBottom: 24 }} loading={overviewLoading}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="🏦 总池子数"
                value={overview.totalPools || 0}
                suffix="个"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="💰 总锁仓价值 (TVL)"
                value={overview.totalTVL || 0}
                prefix="$"
                precision={2}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="📊 24h 交易量"
                value={overview.volume24h || 0}
                prefix="$"
                precision={2}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="📈 24h 交易笔数"
                value={overview.transactions24h || 0}
                suffix="笔"
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* 说明信息 */}
      <Alert
        message="什么是交易对（流动性池）？"
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>
              <strong>交易对</strong>是两种代币的流动性池，用户可以在池中交换这两种代币。
            </Paragraph>
            <Paragraph style={{ marginBottom: 8 }}>
              • <strong>储备量</strong>：池中每种代币的数量
            </Paragraph>
            <Paragraph style={{ marginBottom: 8 }}>
              • <strong>价格</strong>：由储备量比例决定（x * y = k 恒定乘积公式）
            </Paragraph>
            <Paragraph style={{ marginBottom: 0 }}>
              • <strong>如何创建</strong>：点击右上角"添加流动性"，选择两种代币并提供初始资金
            </Paragraph>
          </div>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      {/* 统计信息 */}
      <div className="pool-stats">
        <div className="stat-card">
          <Text type="secondary" className="stat-label">
            📊 交易对数量
          </Text>
          <div className="stat-value">{pools.length}</div>
        </div>
        <div className="stat-card">
          <Text type="secondary" className="stat-label">
            💰 总流动性 (USD)
          </Text>
          <div className="stat-value">$--</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            即将支持
          </Text>
        </div>
        <div className="stat-card">
          <Text type="secondary" className="stat-label">
            📈 24h 交易量 (USD)
          </Text>
          <div className="stat-value">$--</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            即将支持
          </Text>
        </div>
      </div>

      {/* 交易对列表 */}
      <Card className="pool-list-card">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ fontSize: 16 }}>
            {pools.length > 0 ? `共 ${pools.length} 个交易对` : '交易对列表'}
          </Text>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : pools.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Title level={4}>暂无流动性池</Title>
                <Paragraph type="secondary">
                  还没有任何交易对。您可以创建第一个流动性池！
                </Paragraph>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/liquidity')}
                  size="large"
                >
                  创建流动性池
                </Button>
              </div>
            }
            style={{ padding: '60px 0' }}
          />
        ) : (
          pools.map((pool, index) => {
            const token0Symbol = getTokenSymbol(pool, 0)
            const token1Symbol = getTokenSymbol(pool, 1)
            const token0Logo = getTokenLogo(pool, 0)
            const token1Logo = getTokenLogo(pool, 1)

            return (
              <div 
                key={pool.pairAddress || index} 
                className="pool-item"
                style={{ cursor: pool.id ? 'pointer' : 'default' }}
                onClick={() => pool.id && navigate(`/pool/${pool.id}`)}
              >
                <div className="pool-item-header">
                  <Space size={16} className="pool-tokens">
                    <Avatar.Group>
                      <Avatar 
                        src={token0Logo} 
                        size={44}
                        style={{ backgroundColor: '#1890ff' }}
                      >
                        {token0Symbol[0]}
                      </Avatar>
                      <Avatar 
                        src={token1Logo} 
                        size={44}
                        style={{ backgroundColor: '#52c41a' }}
                      >
                        {token1Symbol[0]}
                      </Avatar>
                    </Avatar.Group>
                    <div>
                      <Text strong style={{ fontSize: 20, display: 'block' }}>
                        {token0Symbol} / {token1Symbol}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {pool.pairAddress?.slice(0, 6)}...{pool.pairAddress?.slice(-4)}
                      </Text>
                    </div>
                  </Space>
                  <Space size={12}>
                    <Button 
                      type="default"
                      size="large"
                      onClick={(e) => { e.stopPropagation(); navigate('/swap'); }}
                      style={{
                        borderColor: '#00b96b',
                        color: '#00b96b',
                      }}
                    >
                      🔄 交易
                    </Button>
                    <Button 
                      type="primary"
                      size="large"
                      onClick={(e) => { e.stopPropagation(); navigate('/liquidity'); }}
                    >
                      ➕ 添加
                    </Button>
                    {pool.id && (
                      <Button 
                        size="large"
                        onClick={(e) => { e.stopPropagation(); navigate(`/pool/${pool.id}`); }}
                      >
                        📊 详情
                      </Button>
                    )}
                  </Space>
                </div>

                <div className="pool-item-details">
                  {/* 流动性 */}
                  <div className="pool-detail-item">
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
                      💎 总流动性
                    </Text>
                    <Text strong style={{ fontSize: 20, display: 'block' }}>
                      ${calculateLiquidityUsd(pool)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      TVL (Total Value Locked)
                    </Text>
                  </div>

                  {/* Token0 储备 */}
                  <div className="pool-detail-item">
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
                      💰 {token0Symbol} 储备量
                    </Text>
                    <Text strong style={{ fontSize: 20, display: 'block' }}>
                      {formatNumber(
                        parseFloat(pool.reserve0 || '0') / Math.pow(10, pool.token0Decimals || 18),
                        2
                      )}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {getTokenName(pool, 0)}
                    </Text>
                  </div>

                  {/* Token1 储备 */}
                  <div className="pool-detail-item">
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
                      💰 {token1Symbol} 储备量
                    </Text>
                    <Text strong style={{ fontSize: 20, display: 'block' }}>
                      {formatNumber(
                        parseFloat(pool.reserve1 || '0') / Math.pow(10, pool.token1Decimals || 18),
                        2
                      )}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {getTokenName(pool, 1)}
                    </Text>
                  </div>

                  {/* 24h交易量 */}
                  <div className="pool-detail-item">
                    <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>
                      📈 24h 交易量
                    </Text>
                    <Text strong style={{ fontSize: 20, display: 'block' }}>
                      ${calculate24hVolume(pool)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      24h Volume
                    </Text>
                  </div>

                  {/* 价格信息 */}
                  <div className="pool-detail-item" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          📊 {token0Symbol} 价格
                        </Text>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>
                            {formatNumber(pool.token0Price || '0', 6)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            {token1Symbol}
                          </Text>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          📊 {token1Symbol} 价格
                        </Text>
                        <div>
                          <Text strong style={{ fontSize: 16 }}>
                            {formatNumber(pool.token1Price || '0', 6)}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                            {token0Symbol}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}

export default PoolPage

