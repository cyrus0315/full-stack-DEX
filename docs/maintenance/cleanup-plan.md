# 🧹 代码清理计划

## 📅 日期：2025-10-30

---

## 🎯 清理目标

1. **删除废弃的交易执行代码** - 后端不应执行交易，应由前端 + MetaMask 完成
2. **删除整个 Swap 和 Liquidity 模块** - 这些功能已废弃
3. **清理未使用的依赖**
4. **重命名服务** - `trading-service` → `analytics-service`
5. **统一错误处理**
6. **完善注释和文档**

---

## 📋 废弃代码清单

### 1. **Swap Module** - 完全删除 ❌

**路径：** `backend/services/trading-service/src/modules/swap/`

**废弃原因：**
- 后端不应持有私钥或代替用户执行交易
- 交易应由用户通过 MetaMask 签名执行
- 违反去中心化原则

**废弃的功能：**
- ❌ `approve()` - 授权代币（应由前端调用 ERC20.approve）
- ❌ `swapExactIn()` - 执行交易（应由前端调用 Router.swapExactTokensForTokens）
- ❌ `swapExactOut()` - 执行交易（应由前端调用 Router.swapTokensForExactTokens）
- ❌ `getSwapStatus()` - 查询状态（已被 History 模块替代）
- ❌ `getSwapHistory()` - 查询历史（已被 History 模块替代）
- ❌ `checkApproval()` - 检查授权（前端可直接查询）

**替代方案：**
- ✅ 前端使用 `useSwap` hook 直接调用合约
- ✅ `History` 模块提供完整的历史查询功能
- ✅ `BlockchainListener` 自动记录所有交易

**删除的文件：**
```
swap/
├── swap.controller.ts          ❌ 删除
├── swap.service.ts             ❌ 删除
├── swap.module.ts              ❌ 删除
├── dto/swap.dto.ts             ❌ 删除
├── entities/swap.entity.ts     ❌ 删除（已被 history/entities/swap-history.entity.ts 替代）
└── README.md                   ❌ 删除
```

---

### 2. **Liquidity Module** - 完全删除 ❌

**路径：** `backend/services/trading-service/src/modules/liquidity/`

**废弃原因：**
- 后端不应持有私钥或代替用户执行交易
- 流动性操作应由用户通过 MetaMask 签名执行
- 违反去中心化原则

**废弃的功能：**
- ❌ `addLiquidity()` - 添加流动性（应由前端调用 Router.addLiquidity）
- ❌ `removeLiquidity()` - 移除流动性（应由前端调用 Router.removeLiquidity）
- ❌ `getLiquidityStatus()` - 查询状态（已被 History 模块替代）
- ❌ `getLiquidityHistory()` - 查询历史（已被 History 模块替代）
- ❌ `getUserPositions()` - 查询仓位（可由前端直接查询链上数据）
- ⚠️ `calculateAddLiquidity()` - 计算流动性（保留？或移到 Quote 模块？）

**替代方案：**
- ✅ 前端使用 `useLiquidity` hook 直接调用合约
- ✅ `History` 模块提供完整的历史查询功能
- ✅ `BlockchainListener` 自动记录所有流动性操作
- ✅ 前端可直接查询链上 LP Token 余额

**删除的文件：**
```
liquidity/
├── liquidity.controller.ts     ❌ 删除
├── liquidity.service.ts        ❌ 删除
├── liquidity.module.ts         ❌ 删除
├── dto/liquidity.dto.ts        ❌ 删除
├── entities/liquidity.entity.ts ❌ 删除（已被 history/entities/liquidity-history.entity.ts 替代）
└── README.md                   ❌ 删除
```

---

### 3. **Quote Module** - 保留 ✅

**路径：** `backend/services/trading-service/src/modules/quote/`

**保留原因：**
- 提供只读报价功能
- 不涉及交易执行
- 方便前端快速获取价格

**功能：**
- ✅ `getQuote()` - 获取交易报价（只读）
- ✅ `getQuoteExactOut()` - 获取精确输出报价（只读）

---

### 4. **Pool Module** - 保留并增强 ✅

**路径：** `backend/services/trading-service/src/modules/pool/`

**保留原因：**
- 核心数据管理模块
- 只读查询功能
- 提供 Pool 信息和统计

**功能：**
- ✅ `getPools()` - 查询所有池子
- ✅ `getPoolById()` - 查询单个池子
- ✅ `getPoolByTokens()` - 根据代币对查询
- ✅ `refreshPoolData()` - 从链上同步数据（只读操作）

---

### 5. **History Module** - 保留 ✅

**路径：** `backend/services/trading-service/src/modules/history/`

**保留原因：**
- Phase 3 新增功能
- 提供完整的历史查询
- 替代旧的 Swap/Liquidity 历史查询

**功能：**
- ✅ `getSwapHistory()` - 查询 Swap 历史
- ✅ `getLiquidityHistory()` - 查询流动性历史
- ✅ `getUserRecentActivity()` - 查询用户活动
- ✅ `getPoolStats()` - 查询池子统计

---

### 6. **Analytics Module** - 保留 ✅

**路径：** `backend/services/trading-service/src/modules/analytics/`

**保留原因：**
- Phase 3 新增功能
- 提供数据分析和统计
- 核心功能模块

**功能：**
- ✅ `getOverview()` - 全局概览
- ✅ `getPoolAnalytics()` - 池子分析
- ✅ `getUserStats()` - 用户统计

---

### 7. **BlockchainListener Module** - 保留 ✅

**路径：** `backend/services/trading-service/src/modules/blockchain-listener/`

**保留原因：**
- 核心功能模块
- 监听链上事件
- 自动同步数据

**功能：**
- ✅ 监听 PairCreated/Sync/Mint/Burn/Swap 事件
- ✅ 自动更新 Pool 数据
- ✅ 自动记录 History
- ✅ WebSocket 实时推送

---

## 🔄 重命名计划

### 服务名称变更

**从：** `trading-service`  
**到：** `analytics-service`

**原因：**
- 不再执行交易，主要功能是数据分析
- 名称应反映实际功能
- 更准确的语义

**需要修改的地方：**
1. 目录名：`backend/services/trading-service/` → `backend/services/analytics-service/`
2. package.json：`name: "trading-service"`
3. 环境变量：`TRADING_SERVICE_PORT` → `ANALYTICS_SERVICE_PORT`
4. 前端配置：`API_CONFIG.TRADING_SERVICE` → `API_CONFIG.ANALYTICS_SERVICE`
5. 所有文档引用

---

## 📦 依赖清理

### 可能删除的依赖

检查 `package.json`，删除以下未使用的依赖：
- ethers 相关（如果不再执行交易）
- 签名相关库
- 交易执行相关库

### 保留的核心依赖

- viem（用于只读查询）
- @nestjs/* 系列
- TypeORM
- PostgreSQL 客户端
- Redis
- Socket.IO

---

## ✅ 清理步骤

### Step 1: 删除 Swap Module ❌
```bash
rm -rf backend/services/trading-service/src/modules/swap/
```

### Step 2: 删除 Liquidity Module ❌
```bash
rm -rf backend/services/trading-service/src/modules/liquidity/
```

### Step 3: 更新 app.module.ts
- 移除 SwapModule 导入
- 移除 LiquidityModule 导入

### Step 4: 清理依赖
```bash
cd backend/services/trading-service
pnpm remove [未使用的依赖]
pnpm install
```

### Step 5: 重命名服务
```bash
mv backend/services/trading-service backend/services/analytics-service
```

### Step 6: 更新所有配置文件
- package.json
- .env
- 前端 API 配置
- 文档

### Step 7: 测试
- 启动后端服务
- 测试所有保留的 API
- 确保前端正常工作

---

## ⚠️ 注意事项

### 备份

在删除前先备份：
```bash
cp -r backend/services/trading-service backend/services/trading-service.backup
```

### 数据库

- ✅ 保留 `swap_history` 表（History 模块使用）
- ✅ 保留 `liquidity_history` 表（History 模块使用）
- ❌ 可删除 `swap` 表（如果存在）
- ❌ 可删除 `liquidity` 表（如果存在）

### 前端影响

前端不受影响，因为：
- 前端已经直接调用合约
- 前端不使用后端的交易执行功能
- 只使用 History 和 Analytics API

---

## 📊 清理后的架构

### 后端模块（最终）

```
analytics-service/
├── modules/
│   ├── pool/              ✅ 池子管理（只读）
│   ├── quote/             ✅ 报价查询（只读）
│   ├── history/           ✅ 历史记录（只读）
│   ├── analytics/         ✅ 数据分析（只读）
│   └── blockchain-listener/ ✅ 事件监听（同步数据）
├── providers/
│   └── blockchain/        ✅ 区块链只读查询
└── common/
    └── filters/           ✅ 错误处理
```

### 前端架构（不变）

```
frontend/web-app/
├── hooks/
│   ├── useSwap.ts         ✅ 直接调用合约
│   ├── useLiquidity.ts    ✅ 直接调用合约
│   └── useWallet.ts       ✅ 钱包连接
└── services/
    └── api.ts             ✅ 调用后端只读 API
```

---

## 🎯 清理收益

### 代码量减少
- **删除文件：** ~10 个文件
- **删除代码：** ~2000 行
- **简化逻辑：** 移除交易执行复杂度

### 架构优化
- ✅ 后端纯粹化（只读 API）
- ✅ 职责明确（数据分析 + 同步）
- ✅ 符合 DeFi 最佳实践
- ✅ 安全性提升（无私钥存储）

### 维护性提升
- ✅ 代码更清晰
- ✅ 功能更聚焦
- ✅ 易于理解和维护

---

**准备开始清理！** 🚀

