# 🏗️ DEX 项目架构总览

> 基于 UniswapV2 的去中心化交易所 - 现代化架构实现

**项目启动**: 2025-10-28  
**当前状态**: ✅ Phase 3 完成 (核心功能 100%)  
**最后更新**: 2025-10-30

---

## 📋 目录

- [一、系统架构](#一系统架构)
- [二、核心原则](#二核心原则)
- [三、智能合约层](#三智能合约层)
- [四、后端服务层](#四后端服务层)
- [五、前端应用层](#五前端应用层)
- [六、数据流程](#六数据流程)
- [七、技术栈](#七技术栈)
- [八、项目结构](#八项目结构)

---

## 一、系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    前端应用 (React + Viem)                     │
│                                                               │
│  功能：                                                        │
│  ✅ 直接调用智能合约（Swap, Liquidity）                         │
│  ✅ 用户通过 MetaMask 签名交易                                 │
│  ✅ 查询后端 API（只读数据）                                   │
│  ✅ WebSocket 实时更新                                         │
└───────────┬──────────────────────┬──────────────────────────┘
            │                      │
            │ 直接调用              │ API 查询
            ▼                      ▼
┌───────────────────────┐  ┌───────────────────────────────┐
│   智能合约层           │  │   后端服务层                   │
│   (Solidity)          │  │   (NestJS - 只读服务)          │
│                       │  │                                │
│  ✅ DEXFactory        │  │  ✅ Analytics Service          │
│  ✅ DEXRouter         │  │     - Pool 数据查询            │
│  ✅ DEXPair           │  │     - History 历史记录          │
│  ✅ WETH9             │  │     - Analytics 数据分析       │
│  ✅ MockERC20         │  │     - Quote 价格报价           │
│                       │  │     - BlockchainListener 监听   │
│                       │  │                                │
│                       │  │  ✅ Wallet Service             │
│                       │  │     - Balance 余额查询         │
│                       │  │     - Token 代币信息           │
└───────────┬───────────┘  └──────────┬────────────────────┘
            │                         │
            │                         │ 只读查询 (Viem)
            │                         ▼
            │              ┌──────────────────────┐
            └──────────────►  Hardhat Node        │
                           │  (或其他 EVM 链)      │
                           └──────────────────────┘
                                      │
                           ┌──────────┴──────────┐
                           │                     │
                           ▼                     ▼
                    ┌────────────┐      ┌──────────────┐
                    │ PostgreSQL │      │ Redis        │
                    │ (数据库)    │      │ (缓存)       │
                    └────────────┘      └──────────────┘
```

---

## 二、核心原则

### 2.1 去中心化原则 ✅

**交易执行：**
- ✅ 用户通过 MetaMask 自己管理私钥
- ✅ 用户自己签名并提交交易
- ✅ 后端**不持有**私钥
- ✅ 后端**不执行**交易

**数据流程：**
```
用户 → MetaMask → 签名 → 智能合约 → 链上执行
                                      ↓
                              链上事件触发
                                      ↓
                        后端监听器捕获 → 记录历史
```

### 2.2 职责分离

| 层级 | 职责 | 特点 |
|------|------|------|
| **前端** | 用户交互、交易签名 | 直接调用合约 |
| **智能合约** | 交易执行、资产管理 | 去中心化、不可篡改 |
| **后端** | 数据查询、分析统计 | 只读服务、提升体验 |
| **数据库** | 历史记录、缓存 | 提高查询效率 |

---

## 三、智能合约层

### 3.1 核心合约

| 合约 | 状态 | 行数 | 功能 |
|------|------|------|------|
| **DEXPair** | ✅ | ~420 | AMM 核心，恒定乘积做市 |
| **DEXFactory** | ✅ | ~80 | 交易对创建和管理 |
| **DEXRouter** | ✅ | ~480 | 用户交易入口 |
| **MockERC20** | ✅ | ~20 | 测试代币 (USDT/DAI/USDC) |
| **WETH9** | ✅ | ~60 | Wrapped ETH |

### 3.2 核心算法

#### AMM 恒定乘积公式
```
x × y = k

其中：
x = Token A 储备量
y = Token B 储备量
k = 恒定值
```

#### 手续费机制
```
手续费: 0.3%
流动性提供者收益: 0.25%
协议费用: 0.05%
```

---

## 四、后端服务层

### 4.1 Analytics Service（分析服务）

**定位：** 只读数据服务

**模块结构：**
```
analytics-service/
├── pool/                    # 池子数据管理
│   ├── pool.service.ts      # 查询、刷新池子
│   ├── pool.controller.ts   # API 端点
│   └── pool.entity.ts       # 数据库实体
│
├── quote/                   # 价格报价
│   ├── quote.service.ts     # 报价计算
│   └── quote.controller.ts  # API 端点
│
├── history/                 # 历史记录
│   ├── history.service.ts   # 历史查询
│   ├── history.controller.ts
│   ├── swap-history.entity.ts
│   └── liquidity-history.entity.ts
│
├── analytics/               # 数据分析
│   ├── analytics.service.ts # 统计计算
│   └── analytics.controller.ts
│
└── blockchain-listener/     # 事件监听
    ├── blockchain-listener.service.ts  # 监听器
    ├── scheduler.service.ts  # 定时同步
    └── websocket.gateway.ts  # 实时推送
```

**核心功能：**

1. **Pool Module** - 池子管理
   - `GET /pool` - 查询所有池子
   - `GET /pool/:id` - 查询单个池子
   - `POST /pool/:id/refresh` - 刷新池子数据

2. **Quote Module** - 价格报价
   - `POST /quote` - 获取交易报价
   - `POST /quote/exact-out` - 精确输出报价

3. **History Module** - 历史记录
   - `GET /history/swaps` - Swap 历史
   - `GET /history/liquidity` - 流动性历史
   - `GET /history/user/:address/recent` - 用户活动

4. **Analytics Module** - 数据分析
   - `GET /analytics/overview` - 全局概览
   - `GET /analytics/pool/:id` - 池子分析
   - `GET /analytics/user/:address` - 用户统计

5. **BlockchainListener** - 事件监听
   - 监听 PairCreated、Sync、Mint、Burn、Swap 事件
   - 自动更新数据库
   - WebSocket 实时推送

### 4.2 Wallet Service（钱包服务）

**功能：**
- ✅ 余额查询
- ✅ 代币信息
- ✅ 地址管理
- ✅ 交易扫描

---

## 五、前端应用层

### 5.1 技术栈

```typescript
React 18 + TypeScript + Vite
├── UI 框架: Ant Design
├── 状态管理: Zustand
├── 数据请求: React Query + Axios
├── Web3 集成:
│   ├── wagmi (React Hooks)
│   ├── viem (以太坊库)
│   └── MetaMask (钱包)
└── 实时通信: Socket.IO Client
```

### 5.2 核心 Hooks

**useSwap** - Swap 交易
```typescript
const { swapExactTokensForTokens, checkAndApprove } = useSwap()

// 前端直接调用合约
await swapExactTokensForTokens({
  tokenIn, tokenOut, amountIn, amountOutMin, deadline
})
```

**useLiquidity** - 流动性管理
```typescript
const { addLiquidity, removeLiquidity } = useLiquidity()

// 前端直接调用合约
await addLiquidity({
  tokenA, tokenB, amountADesired, amountBDesired, deadline
})
```

**useWallet** - 钱包连接
```typescript
const { address, isConnected, connect } = useWallet()
```

**useWebSocket** - 实时更新
```typescript
const { isConnected } = usePoolWebSocket(handlePoolUpdate)
```

### 5.3 页面结构

```
前端/
├── Swap         # Swap 交易页面
├── Liquidity    # 流动性管理页面
├── Pool         # 池子列表和详情
├── History      # 交易历史
└── Portfolio    # 用户投资组合
```

---

## 六、数据流程

### 6.1 Swap 流程

```
┌─────────────────────────────────────────────┐
│  1. 用户在前端输入交易参数                    │
│     - 输入代币、输出代币、数量               │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  2. 前端调用后端 Quote API（可选）            │
│     - 获取预期输出量                         │
│     - 计算滑点                               │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  3. 前端检查并授权代币（如需要）              │
│     - ERC20.approve(router, amount)         │
│     - 用户通过 MetaMask 签名                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  4. 前端调用 Router 合约                     │
│     - Router.swapExactTokensForTokens()     │
│     - 用户通过 MetaMask 签名                 │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  5. 智能合约执行交易                         │
│     - 扣除输入代币                           │
│     - 转入输出代币                           │
│     - 触发 Swap 事件                         │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  6. 后端监听器捕获事件                       │
│     - 记录到 swap_history 表                │
│     - 更新 Pool 储备量                       │
│     - WebSocket 推送更新                     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  7. 前端实时更新                             │
│     - WebSocket 接收更新                     │
│     - 刷新余额和池子数据                     │
│     - 显示交易成功提示                       │
└─────────────────────────────────────────────┘
```

### 6.2 数据同步流程

```
链上事件触发
    ↓
BlockchainListener 监听
    ↓
┌─────────────────────┐
│ 1. 更新 Pool 表      │ (reserve0, reserve1)
│ 2. 创建 History 记录 │ (swap_history / liquidity_history)
│ 3. WebSocket 广播    │ (实时推送给前端)
└─────────────────────┘
    ↓
前端接收更新
    ↓
UI 自动刷新
```

---

## 七、技术栈

### 7.1 完整技术栈

| 层级 | 技术 |
|------|------|
| **智能合约** | Solidity 0.8.20, Hardhat, Viem |
| **后端** | NestJS, TypeScript, TypeORM |
| **数据库** | PostgreSQL, Redis |
| **前端** | React 18, TypeScript, Vite |
| **Web3** | Wagmi, Viem, MetaMask |
| **UI** | Ant Design |
| **实时通信** | Socket.IO |

### 7.2 关键依赖

```json
{
  "后端": {
    "@nestjs/core": "^10.0.0",
    "typeorm": "^0.3.0",
    "viem": "^2.0.0",
    "socket.io": "^4.0.0"
  },
  "前端": {
    "react": "^18.0.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "antd": "^5.0.0",
    "zustand": "^4.0.0"
  },
  "合约": {
    "hardhat": "^2.19.0",
    "@openzeppelin/contracts": "^5.0.0"
  }
}
```

---

## 八、项目结构

```
dex/
├── contracts/                  # 智能合约
│   ├── contracts/
│   │   ├── core/               # 核心合约
│   │   ├── periphery/          # 外围合约
│   │   └── test/               # 测试合约
│   └── scripts/                # 部署脚本
│
├── backend/services/
│   ├── analytics-service/      # 数据分析服务 ⭐
│   │   └── src/modules/
│   │       ├── pool/           # 池子管理
│   │       ├── quote/          # 价格报价
│   │       ├── history/        # 历史记录
│   │       ├── analytics/      # 数据分析
│   │       └── blockchain-listener/  # 事件监听
│   │
│   └── wallet-service/         # 钱包服务
│       └── src/modules/
│           ├── balance/        # 余额查询
│           ├── token/          # 代币信息
│           └── address/        # 地址管理
│
├── frontend/web-app/           # 前端应用
│   └── src/
│       ├── pages/              # 页面
│       ├── hooks/              # React Hooks
│       ├── services/           # API 服务
│       └── components/         # UI 组件
│
├── docs/                       # 文档
└── scripts/                    # 测试脚本
```

---

## 🎯 架构优势

### 1. **真正的去中心化** ✅
- 用户完全掌控私钥和资产
- 后端无法代替用户执行交易
- 符合 DeFi 最佳实践

### 2. **安全性** ✅
- 没有单点故障
- 私钥由用户管理
- 后端只读，降低风险

### 3. **用户体验** ✅
- 实时数据更新（WebSocket）
- 完整的历史记录
- 数据分析和统计

### 4. **可维护性** ✅
- 职责清晰
- 代码简洁
- 易于扩展

---

## 📚 相关文档

- [GETTING_STARTED.md](./GETTING_STARTED.md) - 快速开始
- [START_ALL.md](./START_ALL.md) - 启动服务
- [TODO_LIST.md](./TODO_LIST.md) - 任务清单
- [docs/INDEX.md](./docs/INDEX.md) - 文档索引

---

**架构版本：** v2.0  
**最后更新：** 2025-10-30  
**维护者：** DEX Team
