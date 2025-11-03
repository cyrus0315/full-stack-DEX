import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Statistic, Row, Col, Tabs, Table, message, Spin } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons'
import { formatUnits } from 'viem'
import PoolAnalyticsCard from '../../components/PoolAnalyticsCard'
import { apiService } from '../../services/api'
import './index.css'

interface Pool {
  id: number
  pairAddress: string
  token0Address: string
  token1Address: string
  token0Symbol: string
  token1Symbol: string
  token0Decimals: number
  token1Decimals: number
  reserve0: string
  reserve1: string
  createdAt: string
}

const PoolDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pool, setPool] = useState<Pool | null>(null)
  const [loading, setLoading] = useState(true)
  const [swapHistory, setSwapHistory] = useState([])
  const [liquidityHistory, setLiquidityHistory] = useState([])
  const [swapLoading, setSwapLoading] = useState(false)
  const [liquidityLoading, setLiquidityLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPoolDetail()
      fetchSwapHistory()
      fetchLiquidityHistory()
    }
  }, [id])

  const fetchPoolDetail = async () => {
    try {
      setLoading(true)
      const data = await apiService.getPoolById(Number(id))
      setPool(data)
    } catch (error: any) {
      message.error(error.message || '获取池子详情失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchSwapHistory = async () => {
    try {
      setSwapLoading(true)
      const response = await apiService.getSwapHistory({
        poolId: Number(id),
        limit: 10,
      })
      setSwapHistory(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch swap history:', error)
    } finally {
      setSwapLoading(false)
    }
  }

  const fetchLiquidityHistory = async () => {
    try {
      setLiquidityLoading(true)
      const response = await apiService.getLiquidityHistory({
        poolId: Number(id),
        limit: 10,
      })
      setLiquidityHistory(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch liquidity history:', error)
    } finally {
      setLiquidityLoading(false)
    }
  }

  const swapColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '用户',
      dataIndex: 'userAddress',
      key: 'userAddress',
      render: (text: string) => `${text.slice(0, 6)}...${text.slice(-4)}`,
    },
    {
      title: 'Token In',
      key: 'tokenIn',
      render: (_: any, record: any) => {
        const amount = formatUnits(BigInt(record.amountIn || '0'), pool?.token0Decimals || 18)
        return `${parseFloat(amount).toFixed(4)} ${pool?.token0Symbol}`
      },
    },
    {
      title: 'Token Out',
      key: 'tokenOut',
      render: (_: any, record: any) => {
        const amount = formatUnits(BigInt(record.amountOut || '0'), pool?.token1Decimals || 18)
        return `${parseFloat(amount).toFixed(4)} ${pool?.token1Symbol}`
      },
    },
    {
      title: '交易哈希',
      dataIndex: 'transactionHash',
      key: 'transactionHash',
      render: (text: string) => (
        <a
          href={`http://localhost:8545/tx/${text}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {text.slice(0, 6)}...{text.slice(-4)}
        </a>
      ),
    },
  ]

  const liquidityColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '类型',
      dataIndex: 'actionType',
      key: 'actionType',
      render: (text: string) => (
        <span style={{ color: text === 'add' ? '#3f8600' : '#cf1322' }}>
          {text === 'add' ? '添加' : '移除'}
        </span>
      ),
    },
    {
      title: '用户',
      dataIndex: 'userAddress',
      key: 'userAddress',
      render: (text: string) => `${text.slice(0, 6)}...${text.slice(-4)}`,
    },
    {
      title: `${pool?.token0Symbol || 'Token0'} 数量`,
      dataIndex: 'amount0',
      key: 'amount0',
      render: (text: string) => {
        const amount = formatUnits(BigInt(text || '0'), pool?.token0Decimals || 18)
        return parseFloat(amount).toFixed(4)
      },
    },
    {
      title: `${pool?.token1Symbol || 'Token1'} 数量`,
      dataIndex: 'amount1',
      key: 'amount1',
      render: (text: string) => {
        const amount = formatUnits(BigInt(text || '0'), pool?.token1Decimals || 18)
        return parseFloat(amount).toFixed(4)
      },
    },
    {
      title: '交易哈希',
      dataIndex: 'transactionHash',
      key: 'transactionHash',
      render: (text: string) => (
        <a
          href={`http://localhost:8545/tx/${text}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {text.slice(0, 6)}...{text.slice(-4)}
        </a>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="pool-detail-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="pool-detail-empty">
        <h3>池子不存在</h3>
        <Button onClick={() => navigate('/pool')}>返回池子列表</Button>
      </div>
    )
  }

  const reserve0Display = formatUnits(BigInt(pool.reserve0 || '0'), pool.token0Decimals)
  const reserve1Display = formatUnits(BigInt(pool.reserve1 || '0'), pool.token1Decimals)
  const price = parseFloat(reserve1Display) / parseFloat(reserve0Display)

  return (
    <div className="pool-detail-container">
      <div className="pool-detail-header">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/pool')}
          style={{ marginBottom: 16 }}
        >
          返回
        </Button>
        <h2>
          {pool.token0Symbol} / {pool.token1Symbol} 池子详情
        </h2>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={`${pool.token0Symbol} 储备`}
                  value={parseFloat(reserve0Display).toFixed(4)}
                  suffix={pool.token0Symbol}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={`${pool.token1Symbol} 储备`}
                  value={parseFloat(reserve1Display).toFixed(4)}
                  suffix={pool.token1Symbol}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="当前价格"
                  value={price.toFixed(6)}
                  suffix={`${pool.token1Symbol}/${pool.token0Symbol}`}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="池子地址"
                  value={`${pool.pairAddress.slice(0, 6)}...${pool.pairAddress.slice(-4)}`}
                />
              </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(`/liquidity?poolId=${pool.id}`)}
                style={{ marginRight: 8 }}
              >
                添加流动性
              </Button>
              <Button
                icon={<MinusOutlined />}
                onClick={() => navigate(`/liquidity?poolId=${pool.id}&action=remove`)}
              >
                移除流动性
              </Button>
            </div>
          </Card>
        </Col>

        <Col span={24}>
          <PoolAnalyticsCard poolId={pool.id} />
        </Col>

        <Col span={24}>
          <Card>
            <Tabs
              items={[
                {
                  key: 'swaps',
                  label: `Swap 历史 (${swapHistory.length})`,
                  children: (
                    <Table
                      columns={swapColumns}
                      dataSource={swapHistory}
                      loading={swapLoading}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  ),
                },
                {
                  key: 'liquidity',
                  label: `流动性历史 (${liquidityHistory.length})`,
                  children: (
                    <Table
                      columns={liquidityColumns}
                      dataSource={liquidityHistory}
                      loading={liquidityLoading}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default PoolDetail

