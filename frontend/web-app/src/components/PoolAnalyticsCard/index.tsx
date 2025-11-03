import React, { useEffect, useState } from 'react'
import { Card, Statistic, Row, Col, Spin } from 'antd'
import { RiseOutlined, FallOutlined, SwapOutlined, DollarOutlined } from '@ant-design/icons'
import { apiService } from '../../services/api'

interface PoolAnalyticsCardProps {
  poolId: number
}

const PoolAnalyticsCard: React.FC<PoolAnalyticsCardProps> = ({ poolId }) => {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await apiService.getPoolAnalytics(poolId)
        setAnalytics(data)
      } catch (error) {
        console.error('Failed to fetch pool analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    
    // 每30秒刷新一次
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [poolId])

  if (loading) {
    return (
      <Card>
        <Spin tip="加载中..." />
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  return (
    <Card title={`${analytics.token0Symbol}/${analytics.token1Symbol} 分析`} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="24h 交易笔数"
            value={analytics.transactions24h || 0}
            prefix={<SwapOutlined />}
            suffix="笔"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="7天交易笔数"
            value={analytics.transactions7d || 0}
            suffix="笔"
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="24h 添加流动性"
            value={analytics.liquidityAdds24h || 0}
            prefix={<RiseOutlined style={{ color: '#3f8600' }} />}
            suffix="次"
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="24h 移除流动性"
            value={analytics.liquidityRemoves24h || 0}
            prefix={<FallOutlined style={{ color: '#cf1322' }} />}
            suffix="次"
            valueStyle={{ color: '#cf1322' }}
          />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Statistic
            title="当前价格"
            value={parseFloat(analytics.currentPrice || '0').toFixed(6)}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="总交易笔数"
            value={analytics.transactionsAll || 0}
            suffix="笔"
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="储备量"
            value={`${parseFloat(analytics.reserve0 || '0').toFixed(2)} / ${parseFloat(analytics.reserve1 || '0').toFixed(2)}`}
          />
        </Col>
      </Row>
    </Card>
  )
}

export default PoolAnalyticsCard

