import React, { useState, useEffect } from 'react'
import { Row, Col, Typography, Card, Statistic, Select, Input, Space, Spin, Empty, message } from 'antd'
import { SearchOutlined, FireOutlined, DollarOutlined } from '@ant-design/icons'
import { useAccount } from 'wagmi'
import FarmCard from '../../components/FarmCard'
import { apiService } from '../../services/api'
import { useFarmingWebSocket } from '../../hooks/useFarmingWebSocket'
import './index.css'

const { Title, Text } = Typography
const { Option } = Select

/**
 * Farms 页面
 * 
 * 显示所有挖矿池列表
 */
const Farms: React.FC = () => {
  const { address } = useAccount()
  
  const [loading, setLoading] = useState(true)
  const [farms, setFarms] = useState<any[]>([])
  const [userFarms, setUserFarms] = useState<Map<number, any>>(new Map())
  const [summary, setSummary] = useState<any>(null)
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<'apr' | 'tvl' | 'staked'>('apr')

  // WebSocket 实时更新
  useFarmingWebSocket(() => {
    loadFarms()
    if (address) {
      loadUserFarms()
    }
  })

  // 加载挖矿池数据
  useEffect(() => {
    loadFarms()
  }, [])

  // 加载用户数据
  useEffect(() => {
    if (address) {
      loadUserFarms()
    }
  }, [address])

  const loadFarms = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAllFarms()
      
      if (response.success) {
        setFarms(response.data.farms || [])
        setSummary(response.data.summary || null)
      }
    } catch (error) {
      console.error('Failed to load farms:', error)
      message.error('加载挖矿池失败')
    } finally {
      setLoading(false)
    }
  }

  const loadUserFarms = async () => {
    if (!address) return
    
    try {
      const response = await apiService.getUserFarms(address)
      
      if (response.success && response.data.farms) {
        const userFarmsMap = new Map()
        response.data.farms.forEach((farm: any) => {
          userFarmsMap.set(farm.poolId, farm)
        })
        setUserFarms(userFarmsMap)
      }
    } catch (error) {
      console.error('Failed to load user farms:', error)
    }
  }

  // 筛选和排序
  const filteredAndSortedFarms = React.useMemo(() => {
    let result = [...farms]

    // 搜索过滤
    if (searchText) {
      result = result.filter(farm =>
        farm.lpToken.token0.symbol.toLowerCase().includes(searchText.toLowerCase()) ||
        farm.lpToken.token1.symbol.toLowerCase().includes(searchText.toLowerCase())
      )
    }

    // 排序
    result.sort((a, b) => {
      switch (sortBy) {
        case 'apr':
          return parseFloat(b.apr) - parseFloat(a.apr)
        case 'tvl':
          return parseFloat(b.tvl) - parseFloat(a.tvl)
        case 'staked':
          const aStaked = userFarms.get(a.poolId)?.stakedAmount || '0'
          const bStaked = userFarms.get(b.poolId)?.stakedAmount || '0'
          return parseFloat(bStaked) - parseFloat(aStaked)
        default:
          return 0
      }
    })

    return result
  }, [farms, searchText, sortBy, userFarms])

  if (loading) {
    return (
      <div className="farms-loading">
        <Spin size="large" tip="加载挖矿池..." />
      </div>
    )
  }

  return (
    <div className="farms-page">
      {/* 标题 */}
      <div className="farms-header">
        <Title level={2}>
          <FireOutlined /> 流动性挖矿
        </Title>
        <Text type="secondary">
          质押 LP Token，赚取 DEX 代币奖励
        </Text>
      </div>

      {/* 概览统计 */}
      {summary && (
        <Row gutter={[16, 16]} className="farms-summary">
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总 TVL"
                value={parseFloat(summary.totalTvl).toFixed(2)}
                prefix={<DollarOutlined />}
                suffix="USD"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="活跃池子"
                value={summary.activePools}
                suffix={`/ ${summary.totalPools}`}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="每区块奖励"
                value={parseFloat(summary.rewardPerBlock).toFixed(2)}
                suffix="DEX"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="DEX 价格"
                value={parseFloat(summary.dexPrice).toFixed(4)}
                prefix="$"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选和排序 */}
      <Card className="farms-controls">
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Input
              placeholder="搜索交易对..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="large"
              allowClear
            />
          </Col>
          <Col>
            <Space>
              <Text>排序：</Text>
              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: 120 }}
                size="large"
              >
                <Option value="apr">APR</Option>
                <Option value="tvl">TVL</Option>
                {address && <Option value="staked">我的质押</Option>}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 挖矿池列表 */}
      {filteredAndSortedFarms.length > 0 ? (
        <Row gutter={[16, 16]} className="farms-grid">
          {filteredAndSortedFarms.map((farm) => {
            const userFarm = userFarms.get(farm.poolId)
            
            return (
              <Col key={farm.poolId} xs={24} sm={12} lg={8} xl={6}>
                <FarmCard
                  poolId={farm.poolId}
                  lpToken={farm.lpToken}
                  apr={farm.apr}
                  tvl={farm.tvl}
                  dailyReward={farm.dailyReward}
                  weight={farm.weight}
                  active={farm.active}
                  userStaked={userFarm?.stakedAmount}
                  userPendingReward={userFarm?.pendingReward}
                />
              </Col>
            )
          })}
        </Row>
      ) : (
        <Empty
          description="没有找到匹配的挖矿池"
          style={{ margin: '60px 0' }}
        />
      )}

      {/* 说明 */}
      <Card className="farms-info">
        <Title level={4}>💡 如何参与挖矿？</Title>
        <ol>
          <li>在 <a href="/liquidity">流动性</a> 页面添加流动性，获得 LP Token</li>
          <li>选择一个挖矿池，点击"开始挖矿"</li>
          <li>授权 LP Token 给 MasterChef 合约</li>
          <li>质押 LP Token，开始赚取 DEX 代币</li>
          <li>随时提取 LP Token 和领取奖励</li>
        </ol>
        <Text type="secondary">
          注意：提取 LP Token 时会自动领取待领取的奖励
        </Text>
      </Card>
    </div>
  )
}

export default Farms

