import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Table,
  Button,
  Empty,
  Spin,
  Alert,
  Tag,
  Space,
  message,
} from 'antd'
import {
  DollarOutlined,
  TrophyOutlined,
  FireOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useAccount } from 'wagmi'
import { apiService } from '../../services/api'
import { useFarmingWebSocket } from '../../hooks/useFarmingWebSocket'
import './index.css'

const { Title, Text } = Typography

/**
 * MyFarms 页面
 * 
 * 显示用户的所有挖矿质押和收益
 */
const MyFarms: React.FC = () => {
  const navigate = useNavigate()
  const { address } = useAccount()

  const [loading, setLoading] = useState(true)
  const [userFarms, setUserFarms] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)

  // WebSocket 实时更新
  useFarmingWebSocket(() => {
    if (address) {
      loadUserFarms()
    }
  })

  useEffect(() => {
    if (address) {
      loadUserFarms()
    } else {
      setLoading(false)
    }
  }, [address])

  const loadUserFarms = async () => {
    if (!address) return

    try {
      setLoading(true)
      const response = await apiService.getUserFarms(address)

      if (response.success) {
        setUserFarms(response.data.farms || [])
        setSummary(response.data.summary || null)
      }
    } catch (error) {
      console.error('Failed to load user farms:', error)
      message.error('加载用户数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 表格列定义
  const columns = [
    {
      title: '交易对',
      dataIndex: 'lpTokenSymbol',
      key: 'lpTokenSymbol',
      render: (text: string) => (
        <Space>
          <FireOutlined style={{ color: '#faad14' }} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'APR',
      dataIndex: 'apr',
      key: 'apr',
      render: (apr: string) => {
        const aprValue = parseFloat(apr)
        const color = aprValue >= 100 ? '#52c41a' : aprValue >= 50 ? '#1890ff' : '#faad14'
        return (
          <Text strong style={{ color }}>
            {aprValue.toFixed(2)}%
          </Text>
        )
      },
      sorter: (a: any, b: any) => parseFloat(b.apr) - parseFloat(a.apr),
    },
    {
      title: '已质押',
      dataIndex: 'stakedAmount',
      key: 'stakedAmount',
      render: (amount: string, record: any) => (
        <div>
          <div>{parseFloat(amount).toFixed(4)} LP</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ${parseFloat(record.stakedUsd).toFixed(2)}
          </Text>
        </div>
      ),
      sorter: (a: any, b: any) => parseFloat(b.stakedAmount) - parseFloat(a.stakedAmount),
    },
    {
      title: '待领取奖励',
      dataIndex: 'pendingReward',
      key: 'pendingReward',
      render: (amount: string) => (
        <Text strong style={{ color: '#52c41a' }}>
          {parseFloat(amount).toFixed(4)} DEX
        </Text>
      ),
      sorter: (a: any, b: any) => parseFloat(b.pendingReward) - parseFloat(a.pendingReward),
    },
    {
      title: '累计收益',
      dataIndex: 'totalEarned',
      key: 'totalEarned',
      render: (amount: string, record: any) => (
        <div>
          <div>{parseFloat(amount).toFixed(4)} DEX</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ${parseFloat(record.totalEarnedUsd).toFixed(2)}
          </Text>
        </div>
      ),
      sorter: (a: any, b: any) => parseFloat(b.totalEarned) - parseFloat(a.totalEarned),
    },
    {
      title: '占池子比例',
      dataIndex: 'shareOfPool',
      key: 'shareOfPool',
      render: (share: number) => (
        <Tag color="blue">{share.toFixed(4)}%</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<ArrowRightOutlined />}
          onClick={() => navigate(`/farms/${record.poolId}`)}
        >
          管理
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="my-farms-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!address) {
    return (
      <div className="my-farms-empty">
        <Empty
          description="请先连接钱包"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">连接钱包后查看您的挖矿情况</Text>
        </Empty>
      </div>
    )
  }

  return (
    <div className="my-farms-page">
      {/* 标题 */}
      <div className="my-farms-header">
        <Title level={2}>
          <TrophyOutlined /> 我的挖矿
        </Title>
        <Text type="secondary">
          查看您的所有质押和收益
        </Text>
      </div>

      {/* 概览统计 */}
      {summary && (
        <Row gutter={[16, 16]} className="my-farms-summary">
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="参与池子数"
                value={summary.totalPools}
                suffix="个"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="总质押价值"
                value={parseFloat(summary.totalStakedUsd).toFixed(2)}
                prefix={<DollarOutlined />}
                suffix="USD"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="待领取奖励"
                value={parseFloat(summary.totalPendingReward).toFixed(4)}
                suffix="DEX"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="累计收益"
                value={parseFloat(summary.totalEarned).toFixed(4)}
                suffix="DEX"
                prefix="📈"
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ≈ ${parseFloat(summary.totalEarnedUsd).toFixed(2)}
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* 质押列表 */}
      {userFarms.length > 0 ? (
        <Card className="my-farms-table-card">
          <Table
            columns={columns}
            dataSource={userFarms}
            rowKey="poolId"
            pagination={false}
            scroll={{ x: 800 }}
          />
        </Card>
      ) : (
        <Card>
          <Empty
            description="暂无质押"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              onClick={() => navigate('/farms')}
              icon={<FireOutlined />}
            >
              开始挖矿
            </Button>
          </Empty>
        </Card>
      )}

      {/* 提示 */}
      <Alert
        message="💡 提示"
        description={
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>提取 LP Token 时会自动领取所有待领取奖励</li>
            <li>奖励每个区块自动累积，随时可以提取</li>
            <li>APR 会根据池子的总质押量动态变化</li>
          </ul>
        }
        type="info"
        showIcon
        style={{ marginTop: 24 }}
      />
    </div>
  )
}

export default MyFarms

