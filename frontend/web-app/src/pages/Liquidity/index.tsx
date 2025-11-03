import { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Tabs,
  Input,
  Button,
  Space,
  Avatar,
  message,
  Divider,
  Alert,
  Spin,
} from 'antd'
import { PlusOutlined, DownOutlined, MinusOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useWallet } from '../../hooks/useWallet'
import { useLiquidity } from '../../hooks/useLiquidity'
import TokenSelect from '../../components/TokenSelect'
import { Token } from '../../types'
import { DEFAULT_TOKENS } from '../../config/tokens'
import { formatNumber, isValidNumber, parseTokenAmount } from '../../utils/format'
import { apiService } from '../../services/api'
import './index.css'

const { Title, Text } = Typography

const LiquidityPage: React.FC = () => {
  const { address, isConnected } = useWallet()
  const { addLiquidity: addLiquidityContract, loading } = useLiquidity()

  // 添加流动性状态
  const [tokenA, setTokenA] = useState<Token | null>(DEFAULT_TOKENS[1] || null)
  const [tokenB, setTokenB] = useState<Token | null>(DEFAULT_TOKENS[2] || null)
  const [amountA, setAmountA] = useState<string>('')
  const [amountB, setAmountB] = useState<string>('')
  
  // UI 状态
  const [activeTab, setActiveTab] = useState('add')
  const [showTokenASelect, setShowTokenASelect] = useState(false)
  const [showTokenBSelect, setShowTokenBSelect] = useState(false)
  
  // 流动性信息
  const [lpTokens, setLpTokens] = useState<string>('0')
  const [shareOfPool, setShareOfPool] = useState<string>('0')
  
  // 池子信息
  const [poolInfo, setPoolInfo] = useState<any>(null)
  const [loadingPool, setLoadingPool] = useState(false)
  const [poolPrice, setPoolPrice] = useState<string>('')
  const [isNewPool, setIsNewPool] = useState(false)

  /**
   * 获取池子信息
   */
  useEffect(() => {
    const fetchPoolInfo = async () => {
      if (!tokenA || !tokenB) {
        setPoolInfo(null)
        setPoolPrice('')
        setIsNewPool(false)
        return
      }

      setLoadingPool(true)
      try {
        const response = await apiService.getPoolByTokens(
          tokenA.address,
          tokenB.address
        )
        
        if (response && response.pairAddress) {
          setPoolInfo(response)
          setIsNewPool(false)
          
          // 计算价格（TokenA 以 TokenB 计价）
          const reserve0 = parseFloat(response.reserve0) / Math.pow(10, response.token0Decimals || 18)
          const reserve1 = parseFloat(response.reserve1) / Math.pow(10, response.token1Decimals || 18)
          
          if (reserve0 > 0 && reserve1 > 0) {
            // 判断 tokenA 是 token0 还是 token1
            const isToken0 = response.token0Address.toLowerCase() === tokenA.address.toLowerCase()
            const price = isToken0 ? (reserve1 / reserve0) : (reserve0 / reserve1)
            setPoolPrice(price.toFixed(6))
          }
        } else {
          setPoolInfo(null)
          setPoolPrice('')
          setIsNewPool(true)
        }
      } catch (error) {
        console.log('Pool does not exist yet:', error)
        setPoolInfo(null)
        setPoolPrice('')
        setIsNewPool(true)
      } finally {
        setLoadingPool(false)
      }
    }

    fetchPoolInfo()
  }, [tokenA, tokenB])

  /**
   * 计算LP代币和池子份额
   */
  useEffect(() => {
    const calculateLPInfo = () => {
      if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
        setLpTokens('0')
        setShareOfPool('0')
        return
      }

      const amtA = parseFloat(amountA)
      const amtB = parseFloat(amountB)

      if (isNewPool || !poolInfo || !poolInfo.totalSupply || poolInfo.totalSupply === '0') {
        // 新池子：LP = sqrt(amountA * amountB)
        const lpAmount = Math.sqrt(amtA * amtB)
        setLpTokens(lpAmount.toFixed(6))
        setShareOfPool('100') // 新池子，100%份额
      } else {
        // 已存在的池子：LP = min(amountA / reserve0, amountB / reserve1) * totalSupply
        const reserve0 = parseFloat(poolInfo.reserve0) / Math.pow(10, poolInfo.token0Decimals || 18)
        const reserve1 = parseFloat(poolInfo.reserve1) / Math.pow(10, poolInfo.token1Decimals || 18)
        const totalSupply = parseFloat(poolInfo.totalSupply) / Math.pow(10, 18)

        if (reserve0 > 0 && reserve1 > 0 && totalSupply > 0) {
          // 判断 tokenA 是 token0 还是 token1
          const isToken0 = poolInfo.token0Address.toLowerCase() === tokenA?.address.toLowerCase()
          
          const ratio0 = isToken0 ? (amtA / reserve0) : (amtB / reserve0)
          const ratio1 = isToken0 ? (amtB / reserve1) : (amtA / reserve1)
          
          const lpAmount = Math.min(ratio0, ratio1) * totalSupply
          setLpTokens(lpAmount.toFixed(6))
          
          // 池子份额 = lpAmount / (totalSupply + lpAmount) * 100
          const share = (lpAmount / (totalSupply + lpAmount)) * 100
          setShareOfPool(share.toFixed(4))
        } else {
          setLpTokens('0')
          setShareOfPool('0')
        }
      }
    }

    calculateLPInfo()
  }, [amountA, amountB, poolInfo, isNewPool, tokenA])

  /**
   * 自动计算另一个代币数量（根据池子比例）
   */
  const handleAmountAChange = (value: string) => {
    setAmountA(value)
    
    if (!value || parseFloat(value) <= 0 || !poolInfo || !poolPrice) {
      return
    }

    // 根据池子价格自动计算 amountB
    const calculatedB = (parseFloat(value) * parseFloat(poolPrice)).toFixed(6)
    setAmountB(calculatedB)
  }

  const handleAmountBChange = (value: string) => {
    setAmountB(value)
    
    if (!value || parseFloat(value) <= 0 || !poolInfo || !poolPrice) {
      return
    }

    // 根据池子价格自动计算 amountA
    const calculatedA = (parseFloat(value) / parseFloat(poolPrice)).toFixed(6)
    setAmountA(calculatedA)
  }

  /**
   * 添加流动性（直接调用合约，用户 MetaMask 签名）
   */
  const handleAddLiquidity = async () => {
    if (!isConnected || !address) {
      message.warning('请先连接钱包')
      return
    }

    if (!tokenA || !tokenB) {
      message.warning('请选择代币')
      return
    }

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      message.warning('请输入有效金额')
      return
    }

    try {
      const amountADesired = BigInt(parseTokenAmount(amountA, tokenA.decimals))
      const amountBDesired = BigInt(parseTokenAmount(amountB, tokenB.decimals))
      const amountAMin = BigInt(parseTokenAmount(
        (parseFloat(amountA) * 0.995).toString(),
        tokenA.decimals
      ))
      const amountBMin = BigInt(parseTokenAmount(
        (parseFloat(amountB) * 0.995).toString(),
        tokenB.decimals
      ))
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      const hash = await addLiquidityContract({
        tokenA: tokenA.address,
        tokenB: tokenB.address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        deadline,
      })

      if (hash) {
        setAmountA('')
        setAmountB('')
        setLpTokens('0')
        setShareOfPool('0')
      }
    } catch (error: any) {
      console.error('Add liquidity failed:', error)
      // 错误已在 hook 中处理
    }
  }

  /**
   * 添加流动性表单
   */
  const renderAddLiquidity = () => (
    <div className="liquidity-form">
      {/* 池子信息提示 */}
      {loadingPool && (
        <Alert
          message="正在加载池子信息..."
          icon={<Spin size="small" />}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {isNewPool && tokenA && tokenB && (
        <Alert
          message="创建新池子"
          description={`${tokenA.symbol}/${tokenB.symbol} 交易对尚不存在，您将创建第一个流动性池！您可以自由设置初始价格比例。`}
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}
      
      {poolInfo && poolPrice && (
        <Alert
          message={`当前价格: 1 ${tokenA?.symbol} = ${formatNumber(poolPrice, 6)} ${tokenB?.symbol}`}
          description="输入一个代币数量后，系统会自动根据当前池子比例计算另一个代币的推荐数量。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* Token A 输入 */}
      <div className="token-input-section">
        <div className="panel-header">
          <Text type="secondary">代币 A</Text>
          {isConnected && tokenA && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              余额: --
            </Text>
          )}
        </div>
        <div className="panel-content">
          <Input
            size="large"
            placeholder="0.0"
            value={amountA}
            onChange={(e) => {
              if (isValidNumber(e.target.value)) {
                handleAmountAChange(e.target.value)
              }
            }}
            bordered={false}
            className="amount-input"
          />
          <Button
            type="text"
            onClick={() => setShowTokenASelect(true)}
            className="token-select-button"
          >
            {tokenA ? (
              <Space>
                <Avatar src={tokenA.logoURI} size={24}>
                  {tokenA.symbol[0]}
                </Avatar>
                <Text strong>{tokenA.symbol}</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            ) : (
              <Space>
                <Text>选择代币</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            )}
          </Button>
        </div>
      </div>

      {/* Plus Icon */}
      <div className="plus-icon-wrapper">
        <PlusOutlined style={{ fontSize: 20, color: '#00b96b' }} />
      </div>

      {/* Token B 输入 */}
      <div className="token-input-section">
        <div className="panel-header">
          <Text type="secondary">代币 B</Text>
          {isConnected && tokenB && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              余额: --
            </Text>
          )}
        </div>
        <div className="panel-content">
          <Input
            size="large"
            placeholder="0.0"
            value={amountB}
            onChange={(e) => {
              if (isValidNumber(e.target.value)) {
                handleAmountBChange(e.target.value)
              }
            }}
            bordered={false}
            className="amount-input"
          />
          <Button
            type="text"
            onClick={() => setShowTokenBSelect(true)}
            className="token-select-button"
          >
            {tokenB ? (
              <Space>
                <Avatar src={tokenB.logoURI} size={24}>
                  {tokenB.symbol[0]}
                </Avatar>
                <Text strong>{tokenB.symbol}</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            ) : (
              <Space>
                <Text>选择代币</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            )}
          </Button>
        </div>
      </div>

      {/* 流动性信息 */}
      {amountA && amountB && (
        <div className="liquidity-info">
          <div className="info-item">
            <Text type="secondary">LP 代币</Text>
            <Text strong>{formatNumber(lpTokens, 6)}</Text>
          </div>
          <div className="info-item">
            <Text type="secondary">池子份额</Text>
            <Text strong>{formatNumber(shareOfPool, 4)}%</Text>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div className="info-item">
            <Text type="secondary">{tokenA?.symbol} 数量</Text>
            <Text>{formatNumber(amountA)}</Text>
          </div>
          <div className="info-item">
            <Text type="secondary">{tokenB?.symbol} 数量</Text>
            <Text>{formatNumber(amountB)}</Text>
          </div>
        </div>
      )}

      {/* 添加按钮 */}
      {!isConnected ? (
        <Button
          type="primary"
          size="large"
          block
          disabled
          style={{ marginTop: 16 }}
        >
          请先连接钱包
        </Button>
      ) : (
        <Button
          type="primary"
          size="large"
          block
          onClick={handleAddLiquidity}
          loading={loading}
          disabled={
            !tokenA ||
            !tokenB ||
            !amountA ||
            !amountB ||
            parseFloat(amountA) <= 0 ||
            parseFloat(amountB) <= 0
          }
          style={{ marginTop: 16 }}
        >
          {loading ? '添加中...' : '添加流动性'}
        </Button>
      )}
    </div>
  )

  /**
   * 移除流动性表单
   */
  const renderRemoveLiquidity = () => (
    <div className="liquidity-form">
      <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
        <MinusOutlined style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }} />
        <Title level={4}>移除流动性</Title>
        <Text type="secondary">该功能正在开发中...</Text>
      </Card>
    </div>
  )

  const tabItems = [
    {
      key: 'add',
      label: '添加流动性',
      children: renderAddLiquidity(),
    },
    {
      key: 'remove',
      label: '移除流动性',
      children: renderRemoveLiquidity(),
    },
  ]

  return (
    <div className="liquidity-page">
      <Card className="liquidity-card">
        <Title level={3}>流动性管理</Title>
        <Text type="secondary">添加流动性以赚取交易手续费</Text>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="liquidity-tabs"
          style={{ marginTop: 24 }}
        />
      </Card>

      {/* 代币选择弹窗 */}
      <TokenSelect
        visible={showTokenASelect}
        onClose={() => setShowTokenASelect(false)}
        onSelect={setTokenA}
        selectedToken={tokenA || undefined}
        excludeToken={tokenB || undefined}
      />
      <TokenSelect
        visible={showTokenBSelect}
        onClose={() => setShowTokenBSelect(false)}
        onSelect={setTokenB}
        selectedToken={tokenB || undefined}
        excludeToken={tokenA || undefined}
      />
    </div>
  )
}

export default LiquidityPage

