import { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Button,
  Avatar,
  Empty,
  Spin,
  Tag,
} from 'antd'
import {
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useWallet } from '../../hooks/useWallet'
import { apiService } from '../../services/api'
import { formatNumber, formatTimestamp, formatTxHash } from '../../utils/format'
import { DEFAULT_TOKENS } from '../../config/tokens'
import './index.css'

const { Title, Text } = Typography

interface Asset {
  token: {
    symbol: string
    name: string
    logoURI?: string
  }
  balance: string
  value: string
}

interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  timestamp: string
  status: number
}

const PortfolioPage: React.FC = () => {
  const { address, isConnected, balance: ethBalance } = useWallet()
  
  const [assets, setAssets] = useState<Asset[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [txLoading, setTxLoading] = useState(false)

  /**
   * 获取资产列表
   */
  const fetchAssets = async () => {
    if (!address) return
    
    setLoading(true)
    try {
      // 构建资产列表（ETH + 代币）
      const assetList: Asset[] = [
        {
          token: {
            symbol: 'ETH',
            name: 'Ethereum',
            logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
          },
          balance: ethBalance,
          value: '--',
        },
      ]

      // 获取代币余额（这里简化处理，实际应该调用批量查询接口）
      for (const token of DEFAULT_TOKENS.slice(1)) {
        if (token.address) {
          try {
            const response = await apiService.getTokenBalance(address, token.address)
            // 后端直接返回数据
            if (response) {
              assetList.push({
                token: {
                  symbol: token.symbol,
                  name: token.name,
                  logoURI: token.logoURI,
                },
                balance: response.formatted || '0',
                value: '--',
              })
            }
          } catch (error) {
            console.error(`Failed to fetch ${token.symbol} balance:`, error)
          }
        }
      }

      setAssets(assetList)
    } catch (error) {
      console.error('Failed to fetch assets:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取交易历史
   */
  const fetchTransactions = async () => {
    if (!address) return
    
    setTxLoading(true)
    try {
      const response = await apiService.getTransactionsByAddress(address, {
        page: 1,
        limit: 10,
      })
      
      // 后端直接返回 TransactionListResponseDto
      if (response && response.transactions) {
        setTransactions(response.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setTxLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      fetchAssets()
      fetchTransactions()
    }
  }, [isConnected, address, ethBalance])

  /**
   * 计算总余额
   */
  const totalBalance = assets.reduce((sum, asset) => {
    return sum + (parseFloat(asset.balance) || 0)
  }, 0)

  if (!isConnected) {
    return (
      <div className="portfolio-page">
        <Card style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Title level={4}>请先连接钱包</Title>
          <Text type="secondary">连接钱包后即可查看您的资产</Text>
        </Card>
      </div>
    )
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-header">
        <div>
          <Title level={3}>我的资产</Title>
          <Text type="secondary">查看您的余额和交易历史</Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            fetchAssets()
            fetchTransactions()
          }}
          loading={loading || txLoading}
        >
          刷新
        </Button>
      </div>

      {/* 总余额概览 */}
      <div className="balance-overview">
        <Text type="secondary" className="total-balance-label">
          总资产价值
        </Text>
        <div className="total-balance-value">
          {formatNumber(totalBalance, 4)} ETH
        </div>
        <div className="balance-change">
          <Text type="secondary">≈ $--</Text>
        </div>
      </div>

      {/* 资产列表 */}
      <div className="assets-section">
        <div className="section-header">
          <Title level={4} style={{ margin: 0 }}>
            资产列表
          </Title>
        </div>

        <Card className="asset-list-card">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : assets.length === 0 ? (
            <Empty description="暂无资产" style={{ padding: '40px 0' }} />
          ) : (
            assets.map((asset, index) => (
              <div key={index} className="asset-item">
                <div className="asset-info">
                  <Avatar src={asset.token.logoURI} size={40}>
                    {asset.token.symbol[0]}
                  </Avatar>
                  <div className="asset-details">
                    <Text strong>{asset.token.symbol}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {asset.token.name}
                    </Text>
                  </div>
                </div>
                <div className="asset-values">
                  <Text strong>{formatNumber(asset.balance, 6)}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ≈ ${asset.value}
                  </Text>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* 交易历史 */}
      <div className="transactions-section">
        <div className="section-header">
          <Title level={4} style={{ margin: 0 }}>
            交易历史
          </Title>
        </div>

        <Card className="transaction-list-card">
          {txLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
            </div>
          ) : transactions.length === 0 ? (
            <Empty description="暂无交易记录" style={{ padding: '40px 0' }} />
          ) : (
            transactions.map((tx) => (
              <div key={tx.hash} className="transaction-item">
                <div className="transaction-info">
                  <Avatar
                    icon={<SwapOutlined />}
                    size={40}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <div className="transaction-details">
                    <Text strong>{formatTxHash(tx.hash)}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatTimestamp(tx.timestamp)}
                    </Text>
                  </div>
                </div>
                <div className="transaction-values">
                  <Tag
                    className={`status-badge status-${
                      tx.status === 1 ? 'success' : 'failed'
                    }`}
                  >
                    {tx.status === 1 ? '成功' : '失败'}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatNumber(parseFloat(tx.value) / 1e18, 6)} ETH
                  </Text>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}

export default PortfolioPage

