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
  Tooltip,
  Statistic,
  Alert,
} from 'antd'
import {
  SwapOutlined,
  DownOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { parseUnits, formatUnits, parseAbi, Address } from 'viem'
import { usePublicClient } from 'wagmi'
import { useWallet } from '../../hooks/useWallet'
import { useSwap } from '../../hooks/useSwap'
import { useTokenValue } from '../../hooks/usePriceOracle'
import TokenSelect from '../../components/TokenSelect'
import SlippageSettings from '../../components/SlippageSettings'
import ConfirmSwapModal from '../../components/ConfirmSwapModal'
import { TokenValueDisplay } from '../../components/PriceDisplay'
import { Token } from '../../types'
import { DEFAULT_TOKENS } from '../../config/tokens'
import { apiService } from '../../services/api'
import { formatNumber, isValidNumber } from '../../utils/format'
import './index.css'

const { Title, Text } = Typography

const SwapPage: React.FC = () => {
  const { address, isConnected, balance } = useWallet()
  const { swapExactTokensForTokens, loading: swapLoading } = useSwap()
  const publicClient = usePublicClient()

  // 代币选择
  const [tokenIn, setTokenIn] = useState<Token | null>(DEFAULT_TOKENS[1] || null)
  const [tokenOut, setTokenOut] = useState<Token | null>(DEFAULT_TOKENS[2] || null)
  
  // 金额输入
  const [amountIn, setAmountIn] = useState<string>('')
  const [amountOut, setAmountOut] = useState<string>('')
  
  // UI 状态
  const [showTokenInSelect, setShowTokenInSelect] = useState(false)
  const [showTokenOutSelect, setShowTokenOutSelect] = useState(false)
  const [quoteLoading, setQuoteLoading] = useState(false)
  
  // 代币余额
  const [tokenInBalance, setTokenInBalance] = useState<string>('0')
  const [tokenOutBalance, setTokenOutBalance] = useState<string>('0')
  
  // 报价信息
  const [minimumReceived, setMinimumReceived] = useState<string>('0')

  // 🚀 Phase 4: 滑点设置
  const [slippage, setSlippage] = useState<number>(0.5)
  
  // 🚀 Phase 4: 增强报价数据
  const [enhancedQuote, setEnhancedQuote] = useState<any>(null)
  
  // 🚀 Phase 4: 交易确认弹窗
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // ERC20 ABI
  const erc20Abi = parseAbi([
    'function balanceOf(address) view returns (uint256)',
  ])

  /**
   * 获取代币余额
   */
  const fetchTokenBalance = async (token: Token | null) => {
    if (!token || !address || !publicClient) return '0'

    try {
      if (token.symbol === 'ETH') {
        // ETH 余额直接从 balance 获取
        return balance
      }

      // ERC20 代币余额
      const balanceResult = await publicClient.readContract({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address as Address],
      })

      return formatUnits(balanceResult as bigint, token.decimals)
    } catch (error) {
      console.error('Failed to fetch token balance:', error)
      return '0'
    }
  }

  /**
   * 更新代币余额
   */
  const updateBalances = async () => {
    if (!isConnected) {
      setTokenInBalance('0')
      setTokenOutBalance('0')
      return
    }

    const [inBalance, outBalance] = await Promise.all([
      fetchTokenBalance(tokenIn),
      fetchTokenBalance(tokenOut),
    ])

    setTokenInBalance(inBalance)
    setTokenOutBalance(outBalance)
  }

  useEffect(() => {
    updateBalances()
  }, [tokenIn, tokenOut, address, isConnected])

  /**
   * 🚀 Phase 4: 获取增强报价
   */
  const getQuote = async (inputAmount: string) => {
    if (!tokenIn || !tokenOut || !inputAmount || parseFloat(inputAmount) <= 0) {
      setAmountOut('')
      setMinimumReceived('0')
      setEnhancedQuote(null)
      return
    }

    setQuoteLoading(true)
    try {
      const amountInWei = parseUnits(inputAmount, tokenIn.decimals)

      // 🚀 调用增强报价 API
      const quote = await apiService.getEnhancedQuote({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInWei.toString(),
        slippage,
      })

      // 保存增强报价数据
      setEnhancedQuote(quote)

      // 设置输出金额
      const outputAmount = formatUnits(BigInt(quote.amountOut), tokenOut.decimals)
      setAmountOut(outputAmount)

      // 设置最小接收量（根据当前滑点）
      const slippageKey = slippage.toString() as keyof typeof quote.minimumReceived
      let minReceived = quote.minimumReceived[slippageKey as '0.5' | '1.0' | '5.0']
      
      // 如果没有对应的滑点值，使用自定义计算
      if (!minReceived) {
        const slippageBps = Math.floor(slippage * 100)
        const amountOutBigInt = BigInt(quote.amountOut)
        minReceived = ((amountOutBigInt * (10000n - BigInt(slippageBps))) / 10000n).toString()
      }
      
      const minReceivedFormatted = formatUnits(BigInt(minReceived), tokenOut.decimals)
      setMinimumReceived(minReceivedFormatted)

    } catch (error: any) {
      console.error('Failed to get quote:', error)
      message.error('获取报价失败: ' + (error.response?.data?.message || error.message))
      setAmountOut('')
      setMinimumReceived('0')
      setEnhancedQuote(null)
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
        setEnhancedQuote(null)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [amountIn, tokenIn, tokenOut, slippage])

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
    } else {
      setAmountIn(tokenInBalance)
    }
  }

  /**
   * 🚀 Phase 4: 打开交易确认弹窗
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

    if (!enhancedQuote) {
      message.warning('请等待报价加载')
      return
    }

    // 显示确认弹窗
    setShowConfirmModal(true)
  }

  /**
   * 🚀 Phase 4: 确认并执行交易
   */
  const handleConfirmSwap = async () => {
    if (!tokenIn || !tokenOut || !enhancedQuote) return

    try {
      const amountInBigInt = parseUnits(amountIn, tokenIn.decimals)
      
      // 计算最小接收量
      const slippageKey = slippage.toString() as keyof typeof enhancedQuote.minimumReceived
      let minReceived = enhancedQuote.minimumReceived[slippageKey as '0.5' | '1.0' | '5.0']
      
      if (!minReceived) {
        const slippageBps = Math.floor(slippage * 100)
        const amountOutBigInt = BigInt(enhancedQuote.amountOut)
        minReceived = ((amountOutBigInt * (10000n - BigInt(slippageBps))) / 10000n).toString()
      }

      console.log('=== Swap Execution ===')
      console.log('tokenIn:', tokenIn.address)
      console.log('tokenOut:', tokenOut.address)
      console.log('amountIn:', amountInBigInt.toString())
      console.log('minReceived:', minReceived)
      console.log('slippage:', slippage)

      // 调用合约执行交换
      const hash = await swapExactTokensForTokens({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInBigInt,
        amountOutMin: BigInt(minReceived),
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      })

      if (hash) {
        message.success('🎉 交易成功！', 5)
        setShowConfirmModal(false)
        
        // 清空表单
        setAmountIn('')
        setAmountOut('')
        setMinimumReceived('0')
        setEnhancedQuote(null)
        
        // 刷新余额
        setTimeout(() => {
          updateBalances()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Swap failed:', error)
      // useSwap hook 已经处理了错误消息
    }
  }

  /**
   * 🚀 Phase 4: 获取价格影响颜色
   */
  const getPriceImpactColor = (impact: string) => {
    const impactNum = parseFloat(impact)
    if (impactNum < 1) return '#52c41a' // green
    if (impactNum < 5) return '#faad14' // orange
    return '#ff4d4f' // red
  }

  /**
   * 🚀 Phase 4: 获取流动性深度文本
   */
  const getLiquidityDepthText = (depth: string) => {
    const map: Record<string, string> = {
      high: '充足',
      medium: '中等',
      low: '不足',
    }
    return map[depth] || depth
  }

  /**
   * 🚀 Phase 4: 获取流动性深度颜色
   */
  const getLiquidityDepthColor = (depth: string) => {
    const map: Record<string, string> = {
      high: '#52c41a',
      medium: '#faad14',
      low: '#ff4d4f',
    }
    return map[depth] || '#666'
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
            {/* 🚀 Phase 4: 滑点设置组件 */}
            <SlippageSettings value={slippage} onChange={setSlippage} />
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
                      余额: {formatNumber(tokenInBalance, 2)}
                    </Text>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={handleUseMax}
                      style={{ padding: 0, height: 'auto' }}
                    >
                      MAX
                    </Button>
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
            {tokenIn && amountIn && parseFloat(amountIn) > 0 && (
              <div style={{ 
                paddingLeft: '20px',
                marginTop: '8px',
                fontSize: '13px',
                color: '#8c8c8c'
              }}>
                ≈ <TokenValueDisplay 
                  tokenAddress={tokenIn.address}
                  amount={amountIn}
                  size="small"
                  showIcon={false}
                />
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
                  余额: {formatNumber(tokenOutBalance, 2)}
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
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
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
            {tokenOut && amountOut && parseFloat(amountOut) > 0 && !quoteLoading && (
              <div style={{ 
                paddingLeft: '20px',
                marginTop: '8px',
                fontSize: '13px',
                color: '#8c8c8c'
              }}>
                ≈ <TokenValueDisplay 
                  tokenAddress={tokenOut.address}
                  amount={amountOut}
                  size="small"
                  showIcon={false}
                />
              </div>
            )}
          </div>

          {/* 🚀 Phase 4: 增强信息显示 */}
          {enhancedQuote && amountOut && parseFloat(amountOut) > 0 && (
            <div className="enhanced-info">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {/* 价格影响 */}
                <div className="info-row">
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      价格影响
                    </Text>
                    <Tooltip title="此交易对池子价格的影响">
                      <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                  <Text 
                    strong 
                    style={{ 
                      color: getPriceImpactColor(enhancedQuote.priceImpact),
                      fontSize: 14,
                    }}
                  >
                    {enhancedQuote.priceImpact}%
                  </Text>
                </div>

                <Divider style={{ margin: '8px 0' }} />

                {/* 执行价格 */}
                <div className="info-row">
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    执行价格
                  </Text>
                  <Text style={{ fontSize: 13 }}>
                    1 {tokenIn?.symbol} ≈ {formatNumber(enhancedQuote.executionPrice, 6)} {tokenOut?.symbol}
                  </Text>
                </div>

                {/* 最小接收 */}
                <div className="info-row">
                  <Space size={4}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      最小接收（{slippage}% 滑点）
                    </Text>
                    <Tooltip title="考虑滑点后最少接收的代币数量">
                      <InfoCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                  <Text style={{ fontSize: 13 }}>
                    {formatNumber(minimumReceived, 6)} {tokenOut?.symbol}
                  </Text>
                </div>

                {/* 流动性深度 */}
                <div className="info-row">
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    流动性深度
                  </Text>
                  <Text 
                    style={{ 
                      color: getLiquidityDepthColor(enhancedQuote.liquidityDepth),
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {getLiquidityDepthText(enhancedQuote.liquidityDepth)}
                  </Text>
                </div>

                {/* 手续费 */}
                <div className="info-row">
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    流动性提供者费用
                  </Text>
                  <Text style={{ fontSize: 13 }}>
                    {formatNumber(parseFloat(amountIn) * 0.003, 6)} {tokenIn?.symbol}
                  </Text>
                </div>

                {/* 警告 */}
                {enhancedQuote.recommendation?.warning && (
                  <Alert
                    message={enhancedQuote.recommendation.warning}
                    type="warning"
                    icon={<WarningOutlined />}
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                )}
              </Space>
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
              loading={swapLoading}
              disabled={
                !tokenIn ||
                !tokenOut ||
                !amountIn ||
                !amountOut ||
                parseFloat(amountIn) <= 0 ||
                !enhancedQuote
              }
              danger={enhancedQuote?.recommendation?.warning !== null}
              style={{ 
                marginTop: 16, 
                height: 56, 
                fontSize: 16, 
                fontWeight: 'bold',
              }}
            >
              {swapLoading ? '交易中...' : '🚀 立即交换'}
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

      {/* 🚀 Phase 4: 交易确认弹窗 */}
      {enhancedQuote && (
        <ConfirmSwapModal
          visible={showConfirmModal}
          onConfirm={handleConfirmSwap}
          onCancel={() => setShowConfirmModal(false)}
          loading={swapLoading}
          swapData={{
            tokenIn: {
              symbol: tokenIn?.symbol || '',
              amount: amountIn,
            },
            tokenOut: {
              symbol: tokenOut?.symbol || '',
              amount: amountOut,
            },
            priceImpact: enhancedQuote.priceImpact,
            minimumReceived,
            slippage,
            executionPrice: enhancedQuote.executionPrice,
            warning: enhancedQuote.recommendation?.warning || null,
            liquidityDepth: enhancedQuote.liquidityDepth,
            gasEstimate: enhancedQuote.gasEstimate,
          }}
        />
      )}
    </div>
  )
}

export default SwapPage
