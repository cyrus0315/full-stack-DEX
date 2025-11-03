# Phase 3 API 测试指南 📊

## 🎯 概述

Phase 3 实现了完整的历史记录和数据分析功能。本文档介绍如何测试这些 API。

---

## 🚀 快速测试

### 方法 1: 使用测试脚本（推荐）

```bash
cd /Users/h15/Desktop/dex/backend/services/trading-service

# 运行测试脚本
bash test-phase3-apis.sh
```

### 方法 2: 手动测试

使用 curl 或浏览器测试各个端点。

---

## 📋 API 端点列表

### 1. Analytics API

#### 1.1 全局概览
```bash
curl http://localhost:3002/api/v1/analytics/overview | jq .
```

**返回示例：**
```json
{
  "totalPools": 6,
  "totalTVL": "1234567890",
  "volume24h": "0",
  "transactions24h": 5,
  "topPools": [...]
}
```

#### 1.2 单个池子分析
```bash
curl http://localhost:3002/api/v1/analytics/pool/1 | jq .
```

**返回示例：**
```json
{
  "poolId": 1,
  "pairAddress": "0x...",
  "token0Symbol": "USDT",
  "token1Symbol": "DAI",
  "reserve0": "10000000",
  "reserve1": "10000000000000000000000",
  "tvl": "0",
  "volume24h": "0",
  "transactions24h": 2,
  "transactions7d": 5,
  "transactionsAll": 10,
  "liquidityAdds24h": 1,
  "liquidityRemoves24h": 0,
  "currentPrice": "1000.000000"
}
```

#### 1.3 用户统计
```bash
curl http://localhost:3002/api/v1/analytics/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | jq .
```

**返回示例：**
```json
{
  "userAddress": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "totalSwaps": 5,
  "totalSwapVolume": "0",
  "totalLiquidityAdds": 3,
  "totalLiquidityRemoves": 1,
  "activePools": [1, 2, 3],
  "lastActivityAt": "2025-10-30T10:30:00.000Z"
}
```

---

### 2. History API

#### 2.1 Swap 历史
```bash
# 所有 Swap 历史
curl "http://localhost:3002/api/v1/history/swaps?limit=10" | jq .

# 特定用户的 Swap 历史
curl "http://localhost:3002/api/v1/history/swaps?userAddress=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&limit=10" | jq .

# 特定池子的 Swap 历史
curl "http://localhost:3002/api/v1/history/swaps?poolId=1&limit=10" | jq .
```

**返回示例：**
```json
{
  "data": [
    {
      "id": 1,
      "poolId": 1,
      "pool": {
        "pairAddress": "0x...",
        "token0Symbol": "USDT",
        "token1Symbol": "DAI"
      },
      "userAddress": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      "toAddress": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      "tokenIn": "0x...",
      "tokenOut": "0x...",
      "amountIn": "10000000",
      "amountOut": "9960069",
      "transactionHash": "0x...",
      "blockNumber": "123",
      "blockTimestamp": 0,
      "createdAt": "2025-10-30T10:30:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

#### 2.2 Liquidity 历史
```bash
# 所有流动性操作历史
curl "http://localhost:3002/api/v1/history/liquidity?limit=10" | jq .

# 特定用户的流动性历史
curl "http://localhost:3002/api/v1/history/liquidity?userAddress=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&limit=10" | jq .

# 只查看添加流动性
curl "http://localhost:3002/api/v1/history/liquidity?actionType=add&limit=10" | jq .

# 只查看移除流动性
curl "http://localhost:3002/api/v1/history/liquidity?actionType=remove&limit=10" | jq .
```

**返回示例：**
```json
{
  "data": [
    {
      "id": 1,
      "poolId": 1,
      "pool": {
        "pairAddress": "0x...",
        "token0Symbol": "USDT",
        "token1Symbol": "DAI"
      },
      "actionType": "add",
      "userAddress": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      "toAddress": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      "amount0": "1000000",
      "amount1": "1000000000000000000",
      "liquidity": "0",
      "transactionHash": "0x...",
      "blockNumber": "100",
      "blockTimestamp": 0,
      "createdAt": "2025-10-30T09:00:00.000Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

#### 2.3 用户最近活动
```bash
curl "http://localhost:3002/api/v1/history/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/recent?limit=10" | jq .
```

#### 2.4 池子统计
```bash
# 24小时统计
curl "http://localhost:3002/api/v1/history/pool/1/stats?hours=24" | jq .

# 7天统计
curl "http://localhost:3002/api/v1/history/pool/1/stats?hours=168" | jq .
```

**返回示例：**
```json
{
  "poolId": 1,
  "hours": 24,
  "swapCount": 5,
  "liquidityCount": 2,
  "totalSwapVolume": "5"
}
```

---

## 🧪 测试场景

### 场景 1: 测试空数据

如果数据库是空的（没有历史记录），API 应该返回：
```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 10,
  "totalPages": 0
}
```

### 场景 2: 测试分页

```bash
# 第一页
curl "http://localhost:3002/api/v1/history/swaps?page=1&limit=5" | jq .

# 第二页
curl "http://localhost:3002/api/v1/history/swaps?page=2&limit=5" | jq .
```

### 场景 3: 测试筛选

```bash
# 按用户筛选
curl "http://localhost:3002/api/v1/history/swaps?userAddress=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" | jq .

# 按池子筛选
curl "http://localhost:3002/api/v1/history/swaps?poolId=1" | jq .

# 组合筛选
curl "http://localhost:3002/api/v1/history/swaps?userAddress=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&poolId=1" | jq .
```

---

## 📊 前端集成示例

### 在 Pool 页面显示分析数据

```typescript
import { useEffect, useState } from 'react'
import { apiService } from '../services/api'

const PoolDetail = ({ poolId }) => {
  const [analytics, setAnalytics] = useState(null)
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      const data = await apiService.getPoolAnalytics(poolId)
      setAnalytics(data)
    }
    
    fetchAnalytics()
  }, [poolId])
  
  return (
    <div>
      <h3>池子分析</h3>
      <p>24h 交易笔数: {analytics?.transactions24h}</p>
      <p>7天交易笔数: {analytics?.transactions7d}</p>
      <p>当前价格: {analytics?.currentPrice}</p>
    </div>
  )
}
```

### 在 History 页面显示用户历史

```typescript
import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import { useWallet } from '../hooks/useWallet'

const UserHistory = () => {
  const { address } = useWallet()
  const [swapHistory, setSwapHistory] = useState([])
  
  useEffect(() => {
    if (address) {
      apiService.getSwapHistory({ userAddress: address, limit: 20 })
        .then(response => setSwapHistory(response.data))
    }
  }, [address])
  
  return (
    <ul>
      {swapHistory.map(swap => (
        <li key={swap.id}>
          {swap.pool?.token0Symbol} → {swap.pool?.token1Symbol}: 
          {swap.amountIn} → {swap.amountOut}
        </li>
      ))}
    </ul>
  )
}
```

---

## 🐛 故障排除

### 问题 1: API 返回 404

**检查：**
- 后端服务是否启动
- URL 是否正确
- 端口号是否是 3002

### 问题 2: History API 返回空数组

**原因：**数据库中没有历史记录

**解决：**
1. 确保 BlockchainListener 正在运行
2. 执行一些 Swap 或添加流动性操作
3. 检查数据库表：`SELECT * FROM swap_history;`

### 问题 3: Analytics 数据全是 0

**原因：**没有历史数据来计算统计

**解决：**先生成一些交易历史，统计数据会自动计算

---

## ✅ 验证清单

- [ ] Analytics API 返回全局概览数据
- [ ] Analytics API 返回单个池子数据
- [ ] Analytics API 返回用户统计数据
- [ ] History API 返回 Swap 历史（分页正常）
- [ ] History API 返回 Liquidity 历史（分页正常）
- [ ] History API 支持按用户筛选
- [ ] History API 支持按池子筛选
- [ ] 用户最近活动 API 正常返回
- [ ] 池子统计 API 正常返回

---

**测试完成后，Phase 3 的后端功能就完全验证通过了！** 🎉

