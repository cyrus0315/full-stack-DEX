import { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Input,
  Button,
  Space,
  Avatar,
  Spin,
  message,
  Divider,
  Badge,
  Tooltip,
  Statistic,
} from 'antd'
import {
  SwapOutlined,
  DownOutlined,
  SettingOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useWallet } from '../../hooks/useWallet'
import TokenSelect from '../../components/TokenSelect'
import { Token } from '../../types'
import { DEFAULT_TOKENS } from '../../config/tokens'
import { apiService } from '../../services/api'
import { formatNumber, isValidNumber, parseTokenAmount } from '../../utils/format'
import './index.css'

const { Title, Text, Paragraph } = Typography

const SwapPage: React.FC = () => {
  const { address, isConnected, balance } = useWallet()

  // 代币选择
  const [tokenIn, setTokenIn] = useState<Token | null>(DEFAULT_TOKENS[1] || null)
  const [tokenOut, setTokenOut] = useState<Token | null>(DEFAULT_TOKENS[2] || null)
  
  // 金额输入
  const [amountIn, setAmountIn] = useState<string>('')
  const [amountOut, setAmountOut] = useState<string>('')
  
  // UI 状态
  const [showTokenInSelect, setShowTokenInSelect] = useState(false)
  const [showTokenOutSelect, setShowTokenOutSelect] = useState(false)
  const [loading, setLoading] = useState(false)
  const [quoteLoading, setQuoteLoading] = useState(false)
  
  // 报价信息
  const [priceImpact, setPriceImpact] = useState<string>('0')
  const [rate, setRate] = useState<string>('0')
  const [minimumReceived, setMinimumReceived] = useState<string>('0')

  /**
   * 获取报价
   */
  const getQuote = async (amount: string) => {
    if (!tokenIn || !tokenOut || !amount || parseFloat(amount) <= 0) {
      setAmountOut('')
      return
    }

    setQuoteLoading(true)
    try {
      const amountInWei = parseTokenAmount(amount, tokenIn.decimals)
      
      const response = await apiService.getQuote({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInWei,
      })

      if (response && response.amountOut) {
        const { amountOut: outAmount, priceImpact: impact } = response
        
        // 格式化输出金额
        const formattedOut = (
          parseFloat(outAmount) / Math.pow(10, tokenOut.decimals)
        ).toString()
        
        setAmountOut(formattedOut)
        setPriceImpact(impact || '0')
        
        // 计算兑换率
        const rateValue = parseFloat(formattedOut) / parseFloat(amount)
        setRate(rateValue.toString())
        
        // 计算最小接收量 (0.5% 滑点)
        const minReceived = parseFloat(formattedOut) * 0.995
        setMinimumReceived(minReceived.toString())
      }
    } catch (error: any) {
      console.error('Failed to get quote:', error)
      setAmountOut('')
    } finally {
      setQuoteLoading(false)
    }
  }

  /**
   * 输入金额变化
   */
  const handleAmountInChange = (value: string) => {
    if (value === '' || isValidNumber(value)) {
      setAmountIn(value)
    }
  }

  /**
   * 自动获取报价（防抖）
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amountIn) {
        getQuote(amountIn)
      } else {
        setAmountOut('')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [amountIn, tokenIn, tokenOut])

  /**
   * 交换输入输出代币
   */
  const handleSwapTokens = () => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn(amountOut)
    setAmountOut(amountIn)
  }

  /**
   * 使用最大余额
   */
  const handleUseMax = () => {
    if (tokenIn?.symbol === 'ETH') {
      // 保留一点 gas 费
      const maxAmount = Math.max(0, parseFloat(balance) - 0.01)
      setAmountIn(maxAmount.toString())
    }
  }

  /**
   * 执行交换
   */
  const handleSwap = async () => {
    if (!isConnected || !address) {
      message.warning('请先连接钱包')
      return
    }

    if (!tokenIn || !tokenOut) {
      message.warning('请选择代币')
      return
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      message.warning('请输入有效金额')
      return
    }

    if (!amountOut || parseFloat(amountOut) <= 0) {
      message.warning('无法获取报价')
      return
    }

    setLoading(true)
    try {
      const amountInWei = parseTokenAmount(amountIn, tokenIn.decimals)
      const amountOutMin = parseTokenAmount(
        (parseFloat(amountOut) * 0.995).toString(),
        tokenOut.decimals
      )
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      const response = await apiService.swapExactIn({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInWei,
        amountOutMin,
        recipient: address,
        deadline,
      })

      if (response) {
        message.success('🎉 交易成功！')
        setAmountIn('')
        setAmountOut('')
      }
    } catch (error: any) {
      console.error('Swap failed:', error)
      message.error(error.message || '交易失败')
    } finally {
      setLoading(false)
    }
  }

  // 计算价格影响的严重程度
  const getPriceImpactColor = () => {
    const impact = parseFloat(priceImpact)
    if (impact < 1) return 'success'
    if (impact < 3) return 'warning'
    return 'error'
  }

  return (
    <div className="swap-page">
      {/* 页面头部 */}
      <div className="swap-page-header">
        <div>
          <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThunderboltOutlined style={{ color: '#00b96b' }} />
            代币交换
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            即时交换代币，无需注册
          </Text>
        </div>
        <Space>
          <Statistic 
            title="24h 交易量" 
            value="$--" 
            valueStyle={{ fontSize: 16 }}
            prefix="💰"
          />
          <Divider type="vertical" style={{ height: 40 }} />
          <Statistic 
            title="流动性" 
            value="$--" 
            valueStyle={{ fontSize: 16 }}
            prefix="💎"
          />
        </Space>
      </div>

      {/* 交换卡片 */}
      <Card className="swap-card-upgraded">
        <div className="swap-header">
          <Title level={4} style={{ margin: 0 }}>
            Swap
          </Title>
          <Space>
            <Tooltip title="刷新报价">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => getQuote(amountIn)}
                loading={quoteLoading}
              />
            </Tooltip>
            <Tooltip title="设置">
              <Button type="text" icon={<SettingOutlined />} />
            </Tooltip>
          </Space>
        </div>

        <div className="swap-form">
          {/* 输入代币 */}
          <div className="token-input-panel-upgraded">
            <div className="panel-header">
              <Text type="secondary" style={{ fontSize: 13 }}>
                你支付
              </Text>
              <Space size={4}>
                {isConnected && (
                  <>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      余额: --
                    </Text>
                    {tokenIn?.symbol === 'ETH' && (
                      <Button 
                        type="link" 
                        size="small" 
                        onClick={handleUseMax}
                        style={{ padding: 0, height: 'auto' }}
                      >
                        MAX
                      </Button>
                    )}
                  </>
                )}
              </Space>
            </div>
            <div className="panel-content-upgraded">
              <Input
                size="large"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => handleAmountInChange(e.target.value)}
                bordered={false}
                className="amount-input-upgraded"
              />
              <Button
                type="text"
                onClick={() => setShowTokenInSelect(true)}
                className="token-select-button-upgraded"
                size="large"
              >
                {tokenIn ? (
                  <Space size={8}>
                    <Avatar src={tokenIn.logoURI} size={28}>
                      {tokenIn.symbol[0]}
                    </Avatar>
                    <Text strong style={{ fontSize: 16 }}>
                      {tokenIn.symbol}
                    </Text>
                    <DownOutlined style={{ fontSize: 10 }} />
                  </Space>
                ) : (
                  <Space>
                    <Text>选择代币</Text>
                    <DownOutlined />
                  </Space>
                )}
              </Button>
            </div>
            {amountIn && (
              <div className="panel-footer">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ≈ $--
                </Text>
              </div>
            )}
          </div>

          {/* 交换按钮 */}
          <div className="swap-icon-wrapper-upgraded">
            <Button
              shape="circle"
              size="large"
              icon={<SwapOutlined />}
              onClick={handleSwapTokens}
              className="swap-icon-button-upgraded"
            />
          </div>

          {/* 输出代币 */}
          <div className="token-input-panel-upgraded">
            <div className="panel-header">
              <Text type="secondary" style={{ fontSize: 13 }}>
                你接收
              </Text>
              {isConnected && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  余额: --
                </Text>
              )}
            </div>
            <div className="panel-content-upgraded">
              <div style={{ flex: 1, position: 'relative' }}>
                <Input
                  size="large"
                  placeholder="0.0"
                  value={quoteLoading ? '' : amountOut}
                  readOnly
                  bordered={false}
                  className="amount-input-upgraded"
                />
                {quoteLoading && (
                  <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                    <Spin size="small" />
                  </div>
                )}
              </div>
              <Button
                type="text"
                onClick={() => setShowTokenOutSelect(true)}
                className="token-select-button-upgraded"
                size="large"
              >
                {tokenOut ? (
                  <Space size={8}>
                    <Avatar src={tokenOut.logoURI} size={28}>
                      {tokenOut.symbol[0]}
                    </Avatar>
                    <Text strong style={{ fontSize: 16 }}>
                      {tokenOut.symbol}
                    </Text>
                    <DownOutlined style={{ fontSize: 10 }} />
                  </Space>
                ) : (
                  <Space>
                    <Text>选择代币</Text>
                    <DownOutlined />
                  </Space>
                )}
              </Button>
            </div>
            {amountOut && (
              <div className="panel-footer">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ≈ $--
                </Text>
              </div>
            )}
          </div>

          {/* 交易信息 */}
          {amountOut && parseFloat(amountOut) > 0 && (
            <div className="trade-info-upgraded">
              <div className="info-row">
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    价格
                  </Text>
                  <Tooltip title="每单位代币的兑换价格">
                    <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
                <Text strong>
                  1 {tokenIn?.symbol} = {formatNumber(rate, 6)} {tokenOut?.symbol}
                </Text>
              </div>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <div className="info-row">
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    价格影响
                  </Text>
                  <Tooltip title="此交易对价格的影响">
                    <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
                <Badge 
                  status={getPriceImpactColor()} 
                  text={
                    <Text 
                      type={parseFloat(priceImpact) > 3 ? 'danger' : undefined}
                      strong
                    >
                      {formatNumber(priceImpact, 2)}%
                    </Text>
                  }
                />
              </div>
              
              <div className="info-row">
                <Space size={4}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    最小接收
                  </Text>
                  <Tooltip title="考虑滑点后最少接收的代币数量">
                    <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
                <Text>
                  {formatNumber(minimumReceived, 6)} {tokenOut?.symbol}
                </Text>
              </div>

              <div className="info-row">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  流动性提供者费用
                </Text>
                <Text>
                  {formatNumber(parseFloat(amountIn) * 0.003, 6)} {tokenIn?.symbol}
                </Text>
              </div>
            </div>
          )}

          {/* 交换按钮 */}
          {!isConnected ? (
            <Button
              type="primary"
              size="large"
              block
              disabled
              style={{ marginTop: 16, height: 56, fontSize: 16, fontWeight: 'bold' }}
            >
              连接钱包以开始交易
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              block
              onClick={handleSwap}
              loading={loading}
              disabled={
                !tokenIn ||
                !tokenOut ||
                !amountIn ||
                !amountOut ||
                parseFloat(amountIn) <= 0 ||
                parseFloat(priceImpact) > 15
              }
              style={{ 
                marginTop: 16, 
                height: 56, 
                fontSize: 16, 
                fontWeight: 'bold',
                background: parseFloat(priceImpact) > 15 ? '#ff4d4f' : undefined
              }}
            >
              {loading ? '交易中...' : 
               parseFloat(priceImpact) > 15 ? '⚠️ 价格影响过大' : 
               '🚀 立即交换'}
            </Button>
          )}
        </div>
      </Card>

      {/* 代币选择弹窗 */}
      <TokenSelect
        visible={showTokenInSelect}
        onClose={() => setShowTokenInSelect(false)}
        onSelect={setTokenIn}
        selectedToken={tokenIn || undefined}
        excludeToken={tokenOut || undefined}
      />
      <TokenSelect
        visible={showTokenOutSelect}
        onClose={() => setShowTokenOutSelect(false)}
        onSelect={setTokenOut}
        selectedToken={tokenOut || undefined}
        excludeToken={tokenIn || undefined}
      />
    </div>
  )
}

export default SwapPage

