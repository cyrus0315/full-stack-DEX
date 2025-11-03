# Phase 4: 滑点优化和交易体验提升

> **目标：** 提供专业的交易体验，增强价格透明度和用户信心

**开始时间：** 2025-10-30  
**预计完成：** 2025-11-01  
**优先级：** 🔴 高

---

## 📋 目录

1. [功能概述](#功能概述)
2. [实施计划](#实施计划)
3. [技术方案](#技术方案)
4. [开发步骤](#开发步骤)
5. [测试验证](#测试验证)

---

## 功能概述

### 核心功能

#### 1. **增强报价 API** ⭐⭐⭐
提供完整的交易分析数据：
- Price Impact（价格影响）
- 不同滑点下的最小接收量
- 执行价格
- Gas 费用预估
- 推荐滑点设置

#### 2. **历史滑点统计** ⭐⭐
基于历史数据的统计分析：
- 24h/7d 平均滑点
- P50/P95/P99 滑点分布
- 帮助用户设置合理滑点

#### 3. **前端交易体验** ⭐⭐⭐
完整的交易流程优化：
- 滑点设置（0.5%, 1%, 5%, 自定义）
- Price Impact 显示和警告
- Minimum Received 显示
- 交易确认弹窗
- 交易进度追踪

---

## 实施计划

### Day 1: 后端开发 🔧

#### 上午 (4h)
- [ ] 扩展 Quote Service
  - [ ] 实现 Price Impact 计算
  - [ ] 实现不同滑点的 minimumReceived 计算
  - [ ] Gas 估算（从链上读取）
  - [ ] 推荐滑点逻辑
- [ ] 更新 Quote DTO
  - [ ] 新增响应字段
  - [ ] 文档注释

#### 下午 (4h)
- [ ] 创建 price_history 表和实体
- [ ] 实现 PriceHistoryService
  - [ ] 定时记录价格（每 5 分钟）
  - [ ] 滑点统计计算
- [ ] 创建 API 端点
  - [ ] GET /analytics/slippage-stats/:poolId
- [ ] 测试后端 API

### Day 2: 前端开发 🎨

#### 上午 (4h)
- [ ] 创建滑点设置组件
  - [ ] SlippageSettings.tsx
  - [ ] 快捷按钮（0.5%, 1%, 5%）
  - [ ] 自定义输入框
  - [ ] 保存到 localStorage
- [ ] 集成到 Swap 页面
  - [ ] 设置图标/按钮
  - [ ] 弹窗展示设置
- [ ] 显示 Price Impact
  - [ ] 调用增强的 Quote API
  - [ ] 颜色提示（绿/黄/红）
  - [ ] 高滑点警告

#### 下午 (4h)
- [ ] 实现交易确认弹窗
  - [ ] ConfirmSwapModal.tsx
  - [ ] 显示完整交易信息
  - [ ] 确认/取消按钮
- [ ] 交易进度追踪
  - [ ] useSwapWithProgress Hook
  - [ ] Pending/Success/Error 状态
  - [ ] Toast 通知
- [ ] 测试和优化

---

## 技术方案

### 1. Price Impact 计算

**公式：**
```typescript
// 交易前价格
const priceBefore = reserve1 / reserve0;

// 交易后储备量（考虑手续费）
const amountInWithFee = amountIn * 997;
const numerator = amountInWithFee * reserve1;
const denominator = reserve0 * 1000 + amountInWithFee;
const amountOut = numerator / denominator;

// 新的储备量
const newReserve0 = reserve0 + amountIn;
const newReserve1 = reserve1 - amountOut;

// 交易后价格
const priceAfter = newReserve1 / newReserve0;

// Price Impact
const priceImpact = ((priceAfter - priceBefore) / priceBefore) * 100;
```

### 2. Minimum Received 计算

**公式：**
```typescript
const minimumReceived = (amountOut: bigint, slippageBps: number) => {
  // slippageBps: 50 = 0.5%, 100 = 1%, 500 = 5%
  return amountOut * (10000n - BigInt(slippageBps)) / 10000n;
};

// 示例
const slippageSettings = {
  0.5: minimumReceived(amountOut, 50),
  1.0: minimumReceived(amountOut, 100),
  5.0: minimumReceived(amountOut, 500),
};
```

### 3. 推荐滑点逻辑

```typescript
const getRecommendedSlippage = (priceImpact: number, avgSlippage24h: number) => {
  if (priceImpact < 0.5) {
    return 0.5; // 低影响交易
  } else if (priceImpact < 2) {
    return 1.0; // 正常交易
  } else if (priceImpact < 5) {
    return 2.0; // 较高影响
  } else {
    return Math.max(5.0, Math.ceil(priceImpact)); // 高影响交易
  }
};
```

---

## 开发步骤

### Step 1: 后端 - 扩展 Quote API

#### 文件：`backend/services/analytics-service/src/modules/quote/quote.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { createPublicClient, http, formatUnits, parseUnits } from 'viem';

@Injectable()
export class QuoteService {
  async getEnhancedQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    userAddress?: string;
  }) {
    // 1. 获取池子信息
    const pool = await this.getPoolByTokens(params.tokenIn, params.tokenOut);
    
    // 2. 获取储备量
    const [reserve0, reserve1] = await this.getReserves(pool.pairAddress);
    
    // 3. 计算输出量
    const amountOut = this.calculateAmountOut(
      BigInt(params.amountIn),
      reserve0,
      reserve1
    );
    
    // 4. 计算 Price Impact
    const priceImpact = this.calculatePriceImpact(
      BigInt(params.amountIn),
      amountOut,
      reserve0,
      reserve1
    );
    
    // 5. 计算不同滑点下的最小接收量
    const minimumReceived = {
      '0.5': this.applySlippage(amountOut, 50),
      '1.0': this.applySlippage(amountOut, 100),
      '5.0': this.applySlippage(amountOut, 500),
    };
    
    // 6. 获取历史滑点数据
    const slippageStats = await this.getSlippageStats(pool.id);
    
    // 7. 推荐滑点
    const recommendedSlippage = this.getRecommendedSlippage(
      priceImpact,
      slippageStats.avgSlippage24h
    );
    
    // 8. Gas 估算（可选）
    const gasEstimate = await this.estimateGas(params);
    
    return {
      amountOut: amountOut.toString(),
      priceImpact: priceImpact.toFixed(2),
      executionPrice: this.calculateExecutionPrice(
        BigInt(params.amountIn),
        amountOut
      ),
      route: [pool.token0Symbol, pool.token1Symbol],
      minimumReceived,
      priceBeforeSwap: (Number(reserve1) / Number(reserve0)).toFixed(6),
      priceAfterSwap: this.calculatePriceAfter(
        BigInt(params.amountIn),
        amountOut,
        reserve0,
        reserve1
      ).toFixed(6),
      liquidityDepth: this.assessLiquidityDepth(reserve0, reserve1),
      gasEstimate: gasEstimate.toString(),
      recommendation: {
        suggestedSlippage: recommendedSlippage,
        warning: priceImpact > 5 ? 'High price impact!' : null,
      },
    };
  }
  
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserve0: bigint,
    reserve1: bigint
  ): number {
    const priceBefore = Number(reserve1) / Number(reserve0);
    
    const newReserve0 = reserve0 + amountIn;
    const newReserve1 = reserve1 - amountOut;
    const priceAfter = Number(newReserve1) / Number(newReserve0);
    
    return Math.abs(((priceAfter - priceBefore) / priceBefore) * 100);
  }
  
  private applySlippage(amount: bigint, slippageBps: number): string {
    return ((amount * (10000n - BigInt(slippageBps))) / 10000n).toString();
  }
  
  // ... 其他辅助方法
}
```

#### 更新 Controller

```typescript
// quote.controller.ts
@Post('enhanced')
async getEnhancedQuote(@Body() dto: GetQuoteDto) {
  return this.quoteService.getEnhancedQuote(dto);
}
```

---

### Step 2: 后端 - 价格历史记录

#### 创建实体

```typescript
// entities/price-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('price_history')
@Index(['poolId', 'timestamp'])
export class PriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  poolId: number;

  @Column('numeric', { precision: 78, scale: 18 })
  price: string;

  @Column('numeric', { precision: 78, scale: 18 })
  reserve0: string;

  @Column('numeric', { precision: 78, scale: 18 })
  reserve1: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @Column({ type: 'bigint' })
  blockNumber: string;
}
```

#### 定时任务

```typescript
// scheduler.service.ts
@Injectable()
export class SchedulerService {
  @Cron('*/5 * * * *') // 每 5 分钟
  async recordPrices() {
    const pools = await this.poolService.getAllPools();
    
    for (const pool of pools) {
      const [reserve0, reserve1] = await this.getReserves(pool.pairAddress);
      const price = Number(reserve1) / Number(reserve0);
      
      await this.priceHistoryRepository.save({
        poolId: pool.id,
        price: price.toString(),
        reserve0: reserve0.toString(),
        reserve1: reserve1.toString(),
        blockNumber: await this.getCurrentBlock(),
      });
    }
  }
}
```

#### 滑点统计 API

```typescript
// analytics.controller.ts
@Get('slippage-stats/:poolId')
async getSlippageStats(@Param('poolId') poolId: number) {
  return this.analyticsService.getSlippageStats(poolId);
}

// analytics.service.ts
async getSlippageStats(poolId: number) {
  const history = await this.priceHistoryRepository.find({
    where: { poolId },
    order: { timestamp: 'DESC' },
    take: 2000, // 过去约 7 天的数据
  });
  
  // 计算价格波动（作为滑点的近似）
  const priceChanges = [];
  for (let i = 1; i < history.length; i++) {
    const change = Math.abs(
      (Number(history[i].price) - Number(history[i - 1].price)) /
      Number(history[i - 1].price) * 100
    );
    priceChanges.push(change);
  }
  
  // 统计
  priceChanges.sort((a, b) => a - b);
  const avg = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const p50 = priceChanges[Math.floor(priceChanges.length * 0.5)];
  const p95 = priceChanges[Math.floor(priceChanges.length * 0.95)];
  const p99 = priceChanges[Math.floor(priceChanges.length * 0.99)];
  
  return {
    avgSlippage24h: avg.toFixed(2),
    avgSlippage7d: avg.toFixed(2),
    p50Slippage: p50.toFixed(2),
    p95Slippage: p95.toFixed(2),
    p99Slippage: p99.toFixed(2),
  };
}
```

---

### Step 3: 前端 - 滑点设置组件

#### 创建组件

```tsx
// src/components/SlippageSettings/index.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, Radio } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import './styles.css';

export const SlippageSettings: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  const [slippage, setSlippage] = useState(value);
  const [customInput, setCustomInput] = useState('');
  
  const presets = [0.5, 1.0, 5.0];
  
  useEffect(() => {
    // 从 localStorage 加载
    const saved = localStorage.getItem('slippageSetting');
    if (saved) {
      const parsed = parseFloat(saved);
      setSlippage(parsed);
      onChange(parsed);
    }
  }, []);
  
  const handleSave = () => {
    const finalValue = customInput ? parseFloat(customInput) : slippage;
    onChange(finalValue);
    localStorage.setItem('slippageSetting', finalValue.toString());
    setVisible(false);
  };
  
  return (
    <>
      <Button
        icon={<SettingOutlined />}
        onClick={() => setVisible(true)}
      >
        滑点: {value}%
      </Button>
      
      <Modal
        title="滑点容忍度设置"
        open={visible}
        onOk={handleSave}
        onCancel={() => setVisible(false)}
      >
        <div className="slippage-presets">
          {presets.map((preset) => (
            <Button
              key={preset}
              type={slippage === preset ? 'primary' : 'default'}
              onClick={() => {
                setSlippage(preset);
                setCustomInput('');
              }}
            >
              {preset}%
            </Button>
          ))}
        </div>
        
        <Input
          placeholder="自定义滑点"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          suffix="%"
          type="number"
          style={{ marginTop: 16 }}
        />
        
        <div className="slippage-warning">
          ⚠️ 滑点过低可能导致交易失败，过高可能导致价格不利
        </div>
      </Modal>
    </>
  );
};
```

---

### Step 4: 前端 - 集成到 Swap 页面

```tsx
// src/pages/Swap/index.tsx
import { SlippageSettings } from '../../components/SlippageSettings';

export const SwapPage = () => {
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<any>(null);
  
  // 获取增强报价
  const fetchQuote = async () => {
    const response = await apiService.getEnhancedQuote({
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: parseUnits(amountIn, tokenIn.decimals).toString(),
    });
    setQuote(response);
  };
  
  return (
    <div className="swap-page">
      <div className="swap-header">
        <h2>Swap</h2>
        <SlippageSettings value={slippage} onChange={setSlippage} />
      </div>
      
      {/* ... 输入框 ... */}
      
      {quote && (
        <div className="swap-details">
          <div className="price-impact">
            <span>Price Impact</span>
            <span className={getPriceImpactColor(quote.priceImpact)}>
              {quote.priceImpact}%
            </span>
          </div>
          
          <div className="minimum-received">
            <span>Minimum Received</span>
            <span>{quote.minimumReceived[slippage.toString()]}</span>
          </div>
          
          {quote.recommendation.warning && (
            <Alert type="warning" message={quote.recommendation.warning} />
          )}
        </div>
      )}
      
      <Button onClick={handleSwap}>Swap</Button>
    </div>
  );
};
```

---

## 测试验证

### 后端测试

```bash
# 测试增强报价 API
curl -X POST http://localhost:3002/api/v1/quote/enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "0x...",
    "tokenOut": "0x...",
    "amountIn": "1000000000000000000"
  }'

# 测试滑点统计 API
curl http://localhost:3002/api/v1/analytics/slippage-stats/1
```

### 前端测试

1. 打开 Swap 页面
2. 点击滑点设置按钮
3. 测试预设和自定义滑点
4. 输入交易金额，查看 Price Impact
5. 执行交易，验证最小接收量

---

## 成功标准

- [ ] 后端 API 返回完整的交易分析数据
- [ ] 滑点统计数据准确
- [ ] 前端显示 Price Impact 和颜色提示
- [ ] 滑点设置保存并生效
- [ ] 高滑点交易有明显警告
- [ ] 交易确认弹窗信息完整

---

**准备好了吗？让我们开始 Phase 4 的开发！** 🚀

