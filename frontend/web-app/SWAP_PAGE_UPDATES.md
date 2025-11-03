# Swap 页面更新指南 - Phase 4

> 这个文档说明如何更新 Swap 页面集成滑点设置和增强报价功能

## 需要修改的文件
`src/pages/Swap/index.tsx`

---

## 1. 添加导入

在文件顶部添加：

```typescript
import SlippageSettings from '../../components/SlippageSettings'
import ConfirmSwapModal from '../../components/ConfirmSwapModal'
```

---

## 2. 添加状态变量

在组件内部添加这些状态：

```typescript
// 滑点设置
const [slippage, setSlippage] = useState<number>(0.5)

// 增强报价数据
const [enhancedQuote, setEnhancedQuote] = useState<any>(null)

// 交易确认弹窗
const [showConfirmModal, setShowConfirmModal] = useState(false)
```

---

## 3. 修改 getQuote 函数

将原来的 `getQuote` 函数改为调用增强报价 API：

```typescript
const getQuote = async (inputAmount: string) => {
  if (!tokenIn || !tokenOut || !inputAmount || parseFloat(inputAmount) <= 0) {
    setAmountOut('')
    setPriceImpact('0')
    setRate('0')
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

    // 设置价格影响
    setPriceImpact(quote.priceImpact)

    // 设置汇率
    setRate(quote.executionPrice)

    // 设置最小接收量（根据当前滑点）
    const minReceivedKey = slippage.toString() as '0.5' | '1.0' | '5.0'
    const minReceived = quote.minimumReceived[minReceivedKey] || quote.minimumReceived['0.5']
    const minReceivedFormatted = formatUnits(BigInt(minReceived), tokenOut.decimals)
    setMinimumReceived(minReceivedFormatted)

  } catch (error: any) {
    console.error('Failed to get quote:', error)
    message.error('获取报价失败: ' + (error.response?.data?.message || error.message))
    setAmountOut('')
    setEnhancedQuote(null)
  } finally {
    setQuoteLoading(false)
  }
}
```

---

## 4. 更新滑点设置按钮

替换原来的设置按钮：

```typescript
// 在 swap-header 中，替换原来的设置按钮
<SlippageSettings value={slippage} onChange={setSlippage} />
```

---

## 5. 添加 Price Impact 显示

在代币输出面板之后，添加：

```typescript
{/* 增强信息显示 */}
{enhancedQuote && (
  <div className="enhanced-info">
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {/* Price Impact */}
      <div className="info-row">
        <Text type="secondary">价格影响</Text>
        <Text 
          strong 
          style={{ 
            color: getPriceImpactColor(enhancedQuote.priceImpact) 
          }}
        >
          {enhancedQuote.priceImpact}%
        </Text>
      </div>

      {/* 最小接收 */}
      <div className="info-row">
        <Text type="secondary">最小接收（{slippage}% 滑点）</Text>
        <Text>{formatNumber(minimumReceived)} {tokenOut?.symbol}</Text>
      </div>

      {/* 流动性深度 */}
      <div className="info-row">
        <Text type="secondary">流动性深度</Text>
        <Text 
          style={{ 
            color: getLiquidityDepthColor(enhancedQuote.liquidityDepth) 
          }}
        >
          {getLiquidityDepthText(enhancedQuote.liquidityDepth)}
        </Text>
      </div>

      {/* 警告 */}
      {enhancedQuote.recommendation?.warning && (
        <Alert
          message={enhancedQuote.recommendation.warning}
          type="warning"
          showIcon
          style={{ marginTop: 8 }}
        />
      )}
    </Space>
  </div>
)}
```

---

## 6. 修改 handleSwap 函数

改为先显示确认弹窗：

```typescript
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
```

---

## 7. 添加确认执行函数

创建实际执行交易的函数：

```typescript
const handleConfirmSwap = async () => {
  if (!tokenIn || !tokenOut || !enhancedQuote) return

  try {
    const amountInBigInt = parseUnits(amountIn, tokenIn.decimals)
    const minReceivedKey = slippage.toString() as '0.5' | '1.0' | '5.0'
    const minReceived = enhancedQuote.minimumReceived[minReceivedKey] || enhancedQuote.minimumReceived['0.5']

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
      setPriceImpact('0')
      setRate('0')
      setEnhancedQuote(null)
      
      // 刷新余额
      updateBalances()
    }
  } catch (error: any) {
    console.error('Swap failed:', error)
  }
}
```

---

## 8. 添加交易确认弹窗

在 return 的 JSX 最后添加：

```typescript
{/* 交易确认弹窗 */}
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
    priceImpact: enhancedQuote?.priceImpact || '0',
    minimumReceived,
    slippage,
    executionPrice: enhancedQuote?.executionPrice || '0',
    warning: enhancedQuote?.recommendation?.warning || null,
    liquidityDepth: enhancedQuote?.liquidityDepth || 'medium',
    gasEstimate: enhancedQuote?.gasEstimate,
  }}
/>
```

---

## 9. 添加辅助函数

在组件内部添加这些辅助函数：

```typescript
// 获取价格影响颜色
const getPriceImpactColor = (impact: string) => {
  const impactNum = parseFloat(impact)
  if (impactNum < 1) return '#52c41a' // green
  if (impactNum < 5) return '#faad14' // orange
  return '#ff4d4f' // red
}

// 获取流动性深度文本
const getLiquidityDepthText = (depth: string) => {
  const map = {
    high: '充足',
    medium: '中等',
    low: '不足',
  }
  return map[depth as keyof typeof map] || depth
}

// 获取流动性深度颜色
const getLiquidityDepthColor = (depth: string) => {
  const map = {
    high: '#52c41a',
    medium: '#faad14',
    low: '#ff4d4f',
  }
  return map[depth as keyof typeof map] || '#666'
}
```

---

## 10. 添加 CSS 样式

在 `src/pages/Swap/index.css` 中添加：

```css
.enhanced-info {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
```

---

## 完成！

按照以上步骤更新后，Swap 页面将具备：

✅ 滑点设置功能  
✅ 增强报价显示  
✅ Price Impact 颜色提示  
✅ 交易确认弹窗  
✅ 最小接收量显示  
✅ 流动性深度提示  
✅ 高风险警告

---

**注意：** 如果你想让我直接帮你更新完整的 Swap 页面文件，请告诉我！

