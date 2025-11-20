# 🎓 The Graph Subgraph 新手详解

> 写给从未用过 The Graph 的开发者

---

## 📚 目录

1. [什么是 The Graph？](#1-什么是-the-graph)
2. [为什么需要 The Graph？](#2-为什么需要-the-graph)
3. [核心概念](#3-核心概念)
4. [我们的 Subgraph 架构](#4-我们的-subgraph-架构)
5. [工作流程详解](#5-工作流程详解)
6. [代码解读](#6-代码解读)
7. [实战示例](#7-实战示例)
8. [本地测试指南](#8-本地测试指南)
9. [生产部署](#9-生产部署)

---

## 1. 什么是 The Graph？

### 🎯 一句话总结

**The Graph = 区块链的 Google**

它能让你快速查询区块链数据，就像 Google 让你快速搜索网页一样。

### 🤔 传统方式 vs The Graph

#### 传统方式（没有 The Graph）

假设你想查询"过去 24 小时，ETH/USDT 池子的所有交易"：

```typescript
// ❌ 传统方式：慢得要命
async function getRecentSwaps() {
  const currentBlock = await provider.getBlockNumber();
  const blocks24h = 7200; // 假设 12 秒一个块
  const startBlock = currentBlock - blocks24h;
  
  const events = [];
  
  // 需要扫描 7200 个区块！
  for (let i = startBlock; i <= currentBlock; i++) {
    const blockEvents = await pairContract.queryFilter(
      pairContract.filters.Swap(),
      i,
      i
    );
    events.push(...blockEvents);
  }
  
  // 可能需要 5-10 分钟！😱
  return events;
}
```

**问题：**
- ⏰ **慢**：需要扫描数千个区块
- 💰 **贵**：每个 RPC 调用都有成本
- 🚫 **功能受限**：无法排序、分页、聚合

#### The Graph 方式

```typescript
// ✅ The Graph 方式：毫秒级
const query = `
  query GetRecentSwaps {
    swaps(
      first: 100
      orderBy: timestamp
      orderDirection: desc
      where: {
        pair: "0x..."
        timestamp_gte: ${Date.now() - 86400}
      }
    ) {
      id
      amount0In
      amount1In
      amountUSD
      timestamp
    }
  }
`;

// 0.1 秒搞定！⚡
const result = await fetch(SUBGRAPH_URL, {
  method: 'POST',
  body: JSON.stringify({ query })
});
```

**优势：**
- ⚡ **快**：毫秒级响应
- 🆓 **便宜**：查询免费
- 🎯 **强大**：支持排序、过滤、聚合、分页

---

## 2. 为什么需要 The Graph？

### 场景 1：交易历史页面

**需求：** 显示用户的交易历史（按时间倒序，分页显示）

#### 方式对比

| 特性 | 传统方式 | The Graph |
|------|---------|-----------|
| 查询速度 | 5-10 分钟 | 0.1 秒 |
| 排序 | 需要前端处理 | 直接查询 |
| 分页 | 需要全量获取 | `first: 20, skip: 20` |
| 用户体验 | ❌ 加载中... | ✅ 秒开 |

### 场景 2：排行榜

**需求：** 显示交易量最大的 10 个池子

#### 传统方式

```typescript
// ❌ 需要调用 N 次合约
const pools = await factory.allPairs(); // 假设有 100 个池子
const volumes = [];

for (const pool of pools) {
  const pairContract = new Contract(pool, ...);
  const events = await pairContract.queryFilter(...); // 慢
  const volume = calculateVolume(events); // 需要自己计算
  volumes.push({ pool, volume });
}

// 排序
volumes.sort((a, b) => b.volume - a.volume);
const top10 = volumes.slice(0, 10);
```

**耗时：** 可能需要几分钟

#### The Graph 方式

```graphql
query GetTopPools {
  pairs(
    first: 10
    orderBy: volumeUSD
    orderDirection: desc
  ) {
    id
    token0 { symbol }
    token1 { symbol }
    volumeUSD
    reserveUSD
  }
}
```

**耗时：** 0.1 秒

### 场景 3：用户仪表板

**需求：** 显示用户的完整信息
- 持有的 LP Token
- 质押的挖矿池
- 历史收益
- 待领取奖励

#### 传统方式

```typescript
// ❌ 需要多次合约调用
const lpBalance = await pairContract.balanceOf(user);
const stakedAmount = await masterChef.userInfo(poolId, user);
const pendingReward = await masterChef.pendingReward(poolId, user);

// 历史收益？需要扫描所有历史事件 😱
// 可能需要 10+ 分钟
```

#### The Graph 方式

```graphql
query GetUserDashboard($user: Bytes!) {
  userStakes(where: { user: $user }) {
    amount
    amountUSD
    pendingReward
    totalEarned
    farm {
      pair {
        token0 { symbol }
        token1 { symbol }
      }
      apr
    }
  }
}
```

**耗时：** 0.1 秒

---

## 3. 核心概念

### 3.1 Subgraph（子图）

**定义：** 一个数据索引项目

**包含：**
1. **Schema（数据模型）** - 定义存储什么数据
2. **Data Sources（数据源）** - 监听哪些合约
3. **Mappings（映射）** - 如何处理事件

**类比：**
```
Subgraph = 传统后端服务

Schema       = 数据库表结构（定义存储什么）
Data Sources = API 接口（定义监听什么）
Mappings     = 业务逻辑（定义如何处理）
```

### 3.2 Entity（实体）

**定义：** 数据库中的一张表

**示例：**

```graphql
# schema.graphql
type Pair @entity {
  id: ID!                    # 主键（交易对地址）
  token0: Token!             # 关联 Token 实体
  token1: Token!
  reserve0: BigDecimal!      # Token0 储备量
  reserve1: BigDecimal!
  volumeUSD: BigDecimal!     # 交易量（USD）
  txCount: BigInt!           # 交易笔数
}
```

**等价于 SQL：**

```sql
CREATE TABLE pairs (
  id VARCHAR PRIMARY KEY,
  token0_id VARCHAR REFERENCES tokens(id),
  token1_id VARCHAR REFERENCES tokens(id),
  reserve0 DECIMAL,
  reserve1 DECIMAL,
  volume_usd DECIMAL,
  tx_count BIGINT
);
```

### 3.3 Event Handler（事件处理器）

**定义：** 监听区块链事件，更新数据库

**示例：**

```typescript
// src/mappings/pair.ts

// 监听 Swap 事件
export function handleSwap(event: SwapEvent): void {
  // 1. 获取或创建 Swap 实体
  let swap = new Swap(event.transaction.hash.toHex() + '-' + event.logIndex.toString());
  
  // 2. 填充数据
  swap.pair = event.address.toHex();
  swap.amount0In = convertTokenToDecimal(event.params.amount0In, 18);
  swap.amount1In = convertTokenToDecimal(event.params.amount1In, 18);
  swap.timestamp = event.block.timestamp;
  
  // 3. 保存到数据库
  swap.save();
  
  // 4. 更新交易对统计
  let pair = Pair.load(event.address.toHex());
  if (pair) {
    pair.volumeUSD = pair.volumeUSD.plus(swap.amountUSD);
    pair.txCount = pair.txCount.plus(BigInt.fromI32(1));
    pair.save();
  }
}
```

**类比：**

```typescript
// 传统后端
app.post('/api/swaps', (req, res) => {
  // 1. 创建记录
  const swap = new Swap(req.body);
  
  // 2. 保存到数据库
  await swap.save();
  
  // 3. 更新统计
  await Pair.update({ id: swap.pairId }, {
    $inc: { volumeUSD: swap.amountUSD, txCount: 1 }
  });
  
  res.json(swap);
});
```

### 3.4 GraphQL Query（查询）

**定义：** 从 Subgraph 查询数据的语言

**基本语法：**

```graphql
query QueryName {
  entityName(
    first: 10              # 返回前 10 条
    skip: 20               # 跳过前 20 条（分页）
    orderBy: fieldName     # 按字段排序
    orderDirection: desc   # 降序
    where: {               # 过滤条件
      field_gt: 100        # field > 100
      field_lte: 1000      # field <= 1000
    }
  ) {
    id
    field1
    field2
    relationField {        # 关联查询
      id
      name
    }
  }
}
```

**查询操作符：**

| 操作符 | 含义 | 示例 |
|--------|------|------|
| `_gt` | 大于 | `volumeUSD_gt: "1000"` |
| `_lt` | 小于 | `timestamp_lt: 1700000000` |
| `_gte` | 大于等于 | `amount_gte: "100"` |
| `_lte` | 小于等于 | `amount_lte: "1000"` |
| `_in` | 在数组中 | `id_in: ["0x...", "0x..."]` |
| `_not` | 不等于 | `status_not: "inactive"` |
| `_contains` | 包含（字符串） | `name_contains: "ETH"` |
| `_starts_with` | 开头（字符串） | `name_starts_with: "Uni"` |

---

## 4. 我们的 Subgraph 架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                     区块链（Hardhat）                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ DEXFactory  │  │  DEXPair    │  │ MasterChef  │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │ 事件           │ 事件           │ 事件         │
│         │ PairCreated    │ Swap/Mint/Burn │ Deposit     │
│         │                │                │ Withdraw    │
└─────────┼────────────────┼────────────────┼─────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────┐
│                    The Graph Node                        │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Event Handlers (Mappings)              │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────┐ │   │
│  │  │ factory.ts  │ │   pair.ts    │ │masterchef │ │   │
│  │  │             │ │              │ │   .ts     │ │   │
│  │  │handlePair   │ │handleSwap    │ │handleDepo │ │   │
│  │  │Created      │ │handleMint    │ │sit        │ │   │
│  │  │             │ │handleBurn    │ │handleWith │ │   │
│  │  │             │ │handleSync    │ │draw       │ │   │
│  │  └─────────────┘ └──────────────┘ └───────────┘ │   │
│  └──────────────────────┬───────────────────────────┘   │
│                         │                                │
│                         ▼                                │
│  ┌──────────────────────────────────────────────────┐   │
│  │             PostgreSQL Database                   │   │
│  │                                                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │   │
│  │  │  Pairs   │ │  Swaps   │ │  Farms/UserStake │ │   │
│  │  │  Tokens  │ │  Mints   │ │  Deposits        │ │   │
│  │  │  Factory │ │  Burns   │ │  Withdrawals     │ │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │   │
│  └──────────────────────┬───────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   GraphQL API                            │
│            http://localhost:8000/subgraphs/...          │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┴────────────────┐
          │                                │
          ▼                                ▼
┌──────────────────┐           ┌────────────────────┐
│   后端服务        │           │    前端应用         │
│ (NestJS)         │           │   (React)          │
│                  │           │                    │
│ TheGraphService  │           │ Apollo Client      │
│ + REST API       │           │ + GraphQL Queries  │
└──────────────────┘           └────────────────────┘
```

### 4.2 监听的事件

#### DEXFactory（工厂合约）

```solidity
event PairCreated(
  address indexed token0,
  address indexed token1,
  address pair,
  uint256 pairCount
);
```

**作用：** 当创建新交易对时触发

**我们做什么：**
1. 创建 `Pair` 实体
2. 创建 `Token` 实体（如果不存在）
3. 更新 `Factory` 统计（pairCount++）
4. 启动动态监听该 Pair 合约

#### DEXPair（交易对合约）

```solidity
event Swap(
  address indexed sender,
  uint256 amount0In,
  uint256 amount1In,
  uint256 amount0Out,
  uint256 amount1Out,
  address indexed to
);

event Mint(
  address indexed sender,
  uint256 amount0,
  uint256 amount1
);

event Burn(
  address indexed sender,
  uint256 amount0,
  uint256 amount1,
  address indexed to
);

event Sync(uint112 reserve0, uint112 reserve1);
```

**作用：** 交易、添加流动性、移除流动性、储备量更新

**我们做什么：**
- **Swap**: 创建交易记录，更新交易量统计
- **Mint**: 创建添加流动性记录
- **Burn**: 创建移除流动性记录
- **Sync**: 更新 Pair 的储备量和价格

#### MasterChef（挖矿合约）

```solidity
event Deposit(
  address indexed user,
  uint256 indexed pid,
  uint256 amount
);

event Withdraw(
  address indexed user,
  uint256 indexed pid,
  uint256 amount
);

event PoolAdded(
  uint256 indexed pid,
  address lpToken,
  uint256 allocPoint,
  uint256 lastRewardBlock
);

event PoolUpdated(
  uint256 indexed pid,
  uint256 allocPoint
);
```

**作用：** 质押、取回、池子管理

**我们做什么：**
- **Deposit**: 创建质押记录，更新用户质押信息
- **Withdraw**: 创建取回记录，更新用户质押信息
- **PoolAdded**: 创建 Farm 实体
- **PoolUpdated**: 更新 Farm 配置

### 4.3 数据模型（Entity）

#### 核心实体关系图

```
┌─────────────┐
│   Factory   │ 1:N ┌─────────────┐
│  (工厂)     │────▶│    Pair     │ N:1
└─────────────┘     │  (交易对)    │────▶ Token (token0)
                    └───┬─────────┘ N:1
                        │ 1:N      └────▶ Token (token1)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
    ┌───────┐      ┌───────┐      ┌───────┐
    │ Swap  │      │ Mint  │      │ Burn  │
    │(交易) │      │(添加) │      │(移除) │
    └───────┘      └───────┘      └───────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                ┌──────────────┐
                │ Transaction  │
                │   (交易)      │
                └──────────────┘

┌─────────────┐
│    Farm     │ 1:1 ┌─────────────┐
│  (挖矿池)    │────▶│    Pair     │
└───┬─────────┘     └─────────────┘
    │ 1:N
    ▼
┌─────────────┐
│ UserStake   │
│(用户质押)    │
└───┬─────────┘
    │ 1:N
    ├────────┬───────────┐
    ▼        ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│Deposit  │ │Withdraw │ │RewardPaid│
└─────────┘ └─────────┘ └─────────┘
```

#### 主要实体说明

**Factory（工厂）**
- 全局统计：总交易量、总流动性、交易对数量

**Token（代币）**
- 代币信息：symbol, name, decimals
- 统计：交易量、流动性

**Pair（交易对）**
- 储备量：reserve0, reserve1
- 价格：token0Price, token1Price
- 统计：交易量、交易笔数

**Swap/Mint/Burn（事件）**
- 交易细节：数量、时间戳、发送者

**Farm（挖矿池）**
- 配置：allocPoint, lastRewardBlock
- 统计：totalStaked, apr

**UserStake（用户质押）**
- 质押信息：amount, rewardDebt
- 收益：pendingReward, totalEarned

---

## 5. 工作流程详解

### 流程 1：用户执行 Swap

```
1. 用户在前端点击 "Swap" 按钮
   ↓
2. 前端调用钱包，发送交易到区块链
   ↓
3. 区块链执行 DEXPair.swap()
   ↓
4. 合约触发 Swap 事件
   ↓
5. The Graph Node 监听到事件
   ↓
6. 执行 handleSwap() 函数
   ↓
7. 创建 Swap 实体，更新 Pair 统计
   ↓
8. 保存到 PostgreSQL
   ↓
9. GraphQL API 可以查询到最新数据
   ↓
10. 前端/后端通过 GraphQL 查询并显示
```

**代码追踪：**

```typescript
// 1. 合约触发事件
// contracts/contracts/core/DEXPair.sol
emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);

// 2. Subgraph 配置监听
// subgraph/subgraph.yaml
eventHandlers:
  - event: Swap(indexed address,uint256,uint256,uint256,uint256,indexed address)
    handler: handleSwap

// 3. Event Handler 处理
// subgraph/src/mappings/pair.ts
export function handleSwap(event: SwapEvent): void {
  // 创建 Swap 实体
  let swap = new Swap(event.transaction.hash.toHex() + '-' + event.logIndex.toString());
  swap.pair = event.address.toHex();
  swap.amount0In = convertTokenToDecimal(event.params.amount0In, 18);
  swap.amount1In = convertTokenToDecimal(event.params.amount1In, 18);
  swap.amount0Out = convertTokenToDecimal(event.params.amount0Out, 18);
  swap.amount1Out = convertTokenToDecimal(event.params.amount1Out, 18);
  swap.timestamp = event.block.timestamp;
  swap.save(); // 保存到数据库
  
  // 更新 Pair 统计
  let pair = Pair.load(event.address.toHex());
  if (pair) {
    pair.volumeUSD = pair.volumeUSD.plus(swap.amountUSD);
    pair.txCount = pair.txCount.plus(BigInt.fromI32(1));
    pair.save();
  }
}

// 4. 后端查询
// backend/services/analytics-service/src/modules/thegraph/thegraph.service.ts
async getRecentSwaps(first: number = 20): Promise<any> {
  const query = `
    query {
      swaps(first: ${first}, orderBy: timestamp, orderDirection: desc) {
        id
        amount0In
        amount1In
        amountUSD
        timestamp
      }
    }
  `;
  return this.query(query);
}

// 5. 前端显示
// frontend/web-app/src/hooks/useSwapHistory.ts
const { data } = useQuery(GET_RECENT_SWAPS);
// data.swaps 包含最新交易记录
```

### 流程 2：动态创建 Pair

```
1. 管理员调用 Factory.createPair(tokenA, tokenB)
   ↓
2. 合约触发 PairCreated 事件
   ↓
3. handlePairCreated() 执行
   ↓
4. 创建 Pair 实体、Token 实体
   ↓
5. 调用 PairTemplate.create() 启动动态监听
   ↓
6. 新创建的 Pair 合约的事件会被自动监听
```

**关键代码：**

```typescript
// subgraph/src/mappings/factory.ts
import { PairTemplate } from '../types/templates';

export function handlePairCreated(event: PairCreatedEvent): void {
  // 创建 Pair 实体
  let pair = new Pair(event.params.pair.toHex());
  pair.token0 = event.params.token0.toHex();
  pair.token1 = event.params.token1.toHex();
  pair.save();
  
  // 🔥 启动动态监听（重点）
  PairTemplate.create(event.params.pair);
  // 之后这个 Pair 的所有事件（Swap/Mint/Burn）都会被监听
}
```

---

## 6. 代码解读

### 6.1 subgraph.yaml（配置文件）

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql  # Schema 文件路径

dataSources:
  # 静态数据源：DEXFactory
  - kind: ethereum
    name: Factory
    network: localhost    # 网络名称（localhost/mainnet/polygon...）
    source:
      address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"  # 合约地址
      abi: Factory
      startBlock: 0       # 从哪个区块开始监听（优化同步速度）
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript  # 使用 AssemblyScript（TypeScript 的子集）
      entities:           # 该 mapping 会操作哪些实体
        - Factory
        - Pair
        - Token
      abis:               # 需要的 ABI 文件
        - name: Factory
          file: ./abis/DEXFactory.json
        - name: ERC20
          file: ./abis/ERC20.json
      eventHandlers:      # 事件监听器
        - event: PairCreated(indexed address,indexed address,address,uint256)
          handler: handlePairCreated  # 处理函数名
      file: ./src/mappings/factory.ts  # 处理函数所在文件

templates:
  # 动态数据源：DEXPair（通过 PairTemplate.create() 动态启动）
  - kind: ethereum
    name: Pair
    network: localhost
    source:
      abi: Pair
      # 注意：没有 address 字段，因为是动态创建的
    mapping:
      # ... 同上
      eventHandlers:
        - event: Swap(indexed address,uint256,uint256,uint256,uint256,indexed address)
          handler: handleSwap
        - event: Mint(indexed address,uint256,uint256)
          handler: handleMint
        - event: Burn(indexed address,uint256,uint256,indexed address)
          handler: handleBurn
```

**关键点：**
- **dataSources**: 静态数据源（地址固定）
- **templates**: 动态数据源（地址通过代码创建）
- **startBlock**: 优化同步速度，跳过无关区块

### 6.2 schema.graphql（数据模型）

```graphql
type Pair @entity {
  id: ID!                      # 主键（必须）
  token0: Token!               # 关联 Token 实体（! 表示必填）
  token1: Token!
  reserve0: BigDecimal!        # 数值类型
  reserve1: BigDecimal!
  totalSupply: BigDecimal!
  volumeUSD: BigDecimal!
  txCount: BigInt!
  createdAtTimestamp: BigInt!
  
  # 反向关联（不存储在数据库，通过 @derivedFrom 自动关联）
  swaps: [Swap!]! @derivedFrom(field: "pair")
  mints: [Mint!]! @derivedFrom(field: "pair")
  burns: [Burn!]! @derivedFrom(field: "pair")
}

type Swap @entity {
  id: ID!
  pair: Pair!                  # 正向关联
  amount0In: BigDecimal!
  timestamp: BigInt!
}
```

**数据类型：**
- `ID!`: 主键（字符串）
- `BigInt!`: 大整数（用于 uint256）
- `BigDecimal!`: 高精度小数（用于金额）
- `Bytes!`: 字节数组（用于地址、哈希）
- `String!`: 字符串
- `Boolean!`: 布尔值
- `[Type!]!`: 数组（! 表示非空，!]! 表示数组非空且元素非空）

**关联关系：**
- `token0: Token!`: 多对一（Pair → Token）
- `swaps: [Swap!]! @derivedFrom(field: "pair")`: 一对多（Pair → Swaps）

### 6.3 Event Handler（事件处理器）

#### 示例 1：处理 Swap 事件

```typescript
// subgraph/src/mappings/pair.ts
import { Swap as SwapEvent } from '../types/Pair/Pair';
import { Pair, Swap, Transaction } from '../types/schema';
import { BigInt } from '@graphprotocol/graph-ts';
import { convertTokenToDecimal } from '../utils/helpers';

export function handleSwap(event: SwapEvent): void {
  // 1. 加载 Pair 实体
  let pair = Pair.load(event.address.toHex());
  if (!pair) return; // 如果不存在则退出
  
  // 2. 创建 Transaction 实体（如果不存在）
  let transaction = Transaction.load(event.transaction.hash.toHex());
  if (!transaction) {
    transaction = new Transaction(event.transaction.hash.toHex());
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.save();
  }
  
  // 3. 创建 Swap 实体
  let swap = new Swap(
    event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  );
  
  // 4. 填充数据
  swap.transaction = transaction.id;
  swap.pair = pair.id;
  swap.timestamp = event.block.timestamp;
  swap.sender = event.params.sender;
  swap.to = event.params.to;
  swap.amount0In = convertTokenToDecimal(event.params.amount0In, 18);
  swap.amount1In = convertTokenToDecimal(event.params.amount1In, 18);
  swap.amount0Out = convertTokenToDecimal(event.params.amount0Out, 18);
  swap.amount1Out = convertTokenToDecimal(event.params.amount1Out, 18);
  
  // 5. 计算 USD 价值（假设 token1 是稳定币）
  swap.amountUSD = swap.amount1In.plus(swap.amount1Out);
  
  // 6. 保存 Swap 实体
  swap.save();
  
  // 7. 更新 Pair 统计
  pair.volumeUSD = pair.volumeUSD.plus(swap.amountUSD);
  pair.volumeToken0 = pair.volumeToken0.plus(swap.amount0In).plus(swap.amount0Out);
  pair.volumeToken1 = pair.volumeToken1.plus(swap.amount1In).plus(swap.amount1Out);
  pair.txCount = pair.txCount.plus(BigInt.fromI32(1));
  pair.updatedAt = event.block.timestamp;
  pair.save();
}
```

**关键 API：**
- `Entity.load(id)`: 从数据库加载实体
- `new Entity(id)`: 创建新实体
- `entity.save()`: 保存实体到数据库
- `event.params.*`: 访问事件参数
- `event.block.*`: 访问区块信息
- `event.transaction.*`: 访问交易信息

#### 示例 2：处理 PairCreated 事件

```typescript
// subgraph/src/mappings/factory.ts
import { PairCreated as PairCreatedEvent } from '../types/Factory/Factory';
import { Factory, Pair, Token } from '../types/schema';
import { PairTemplate } from '../types/templates';
import { ERC20 } from '../types/Factory/ERC20';

export function handlePairCreated(event: PairCreatedEvent): void {
  // 1. 加载或创建 Factory 实体
  let factory = Factory.load(event.address.toHex());
  if (!factory) {
    factory = new Factory(event.address.toHex());
    factory.pairCount = 0;
    factory.totalVolumeUSD = BigDecimal.fromString('0');
    // ... 初始化其他字段
  }
  
  // 2. 创建或加载 Token 实体
  let token0 = Token.load(event.params.token0.toHex());
  if (!token0) {
    token0 = new Token(event.params.token0.toHex());
    
    // 调用合约读取 Token 信息
    let erc20 = ERC20.bind(event.params.token0);
    token0.symbol = erc20.symbol();
    token0.name = erc20.name();
    token0.decimals = BigInt.fromI32(erc20.decimals());
    token0.totalSupply = erc20.totalSupply();
    
    token0.tradeVolume = BigDecimal.fromString('0');
    token0.save();
  }
  
  // 同样处理 token1...
  
  // 3. 创建 Pair 实体
  let pair = new Pair(event.params.pair.toHex());
  pair.token0 = token0.id;
  pair.token1 = token1.id;
  pair.reserve0 = BigDecimal.fromString('0');
  pair.reserve1 = BigDecimal.fromString('0');
  pair.totalSupply = BigDecimal.fromString('0');
  pair.volumeUSD = BigDecimal.fromString('0');
  pair.txCount = BigInt.fromI32(0);
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  pair.save();
  
  // 4. 🔥 启动动态监听（重点）
  PairTemplate.create(event.params.pair);
  
  // 5. 更新 Factory 统计
  factory.pairCount = factory.pairCount + 1;
  factory.save();
}
```

**重点：**
- `PairTemplate.create()`: 启动动态监听
- `ERC20.bind()`: 绑定合约，可以调用合约方法
- `erc20.symbol()`: 调用合约的 view 函数

---

## 7. 实战示例

### 示例 1：查询交易量最大的 10 个池子

```graphql
query GetTopPools {
  pairs(
    first: 10
    orderBy: volumeUSD
    orderDirection: desc
  ) {
    id
    token0 {
      symbol
      name
    }
    token1 {
      symbol
      name
    }
    reserve0
    reserve1
    reserveUSD
    volumeUSD
    txCount
  }
}
```

**后端调用：**

```typescript
// backend/services/analytics-service/src/modules/thegraph/thegraph.controller.ts
@Get('top-pools')
async getTopPools(@Query('first') first: number = 10) {
  return this.theGraphService.getTopPairs(first);
}

// thegraph.service.ts
async getTopPairs(first: number = 10): Promise<any> {
  const query = `
    query {
      pairs(first: ${first}, orderBy: volumeUSD, orderDirection: desc) {
        id
        token0 { symbol name }
        token1 { symbol name }
        reserveUSD
        volumeUSD
      }
    }
  `;
  return this.query(query);
}
```

**前端调用：**

```typescript
// frontend/web-app/src/hooks/useTopPools.ts
import { useQuery, gql } from '@apollo/client';

const GET_TOP_POOLS = gql`
  query GetTopPools {
    pairs(first: 10, orderBy: volumeUSD, orderDirection: desc) {
      id
      token0 { symbol }
      token1 { symbol }
      reserveUSD
      volumeUSD
    }
  }
`;

export const useTopPools = () => {
  const { data, loading, error } = useQuery(GET_TOP_POOLS);
  return { pools: data?.pairs, loading, error };
};

// 使用
function PoolsPage() {
  const { pools, loading } = useTopPools();
  
  if (loading) return <Spin />;
  
  return (
    <Table
      dataSource={pools}
      columns={[
        { title: 'Pair', render: (_, pool) => `${pool.token0.symbol}/${pool.token1.symbol}` },
        { title: 'TVL', dataIndex: 'reserveUSD', render: formatUSD },
        { title: 'Volume', dataIndex: 'volumeUSD', render: formatUSD },
      ]}
    />
  );
}
```

### 示例 2：查询用户的挖矿收益

```graphql
query GetUserStakes($user: Bytes!) {
  userStakes(where: { user: $user }) {
    id
    farm {
      id
      pair {
        token0 { symbol }
        token1 { symbol }
      }
      apr
    }
    amount
    amountUSD
    pendingReward
    totalEarned
    totalEarnedUSD
    lastDepositTimestamp
  }
}
```

**后端调用：**

```typescript
@Get('user-stakes/:address')
async getUserStakes(@Param('address') address: string) {
  return this.theGraphService.getUserStakes(address);
}

async getUserStakes(user: string): Promise<any> {
  const query = `
    query {
      userStakes(where: { user: "${user.toLowerCase()}" }) {
        id
        farm {
          pair {
            token0 { symbol }
            token1 { symbol }
          }
          apr
        }
        amount
        pendingReward
        totalEarned
      }
    }
  `;
  return this.query(query);
}
```

### 示例 3：分页查询交易历史

```graphql
query GetSwaps($skip: Int!, $first: Int!) {
  swaps(
    first: $first
    skip: $skip
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    pair {
      token0 { symbol }
      token1 { symbol }
    }
    amount0In
    amount1In
    amount0Out
    amount1Out
    amountUSD
    timestamp
  }
}
```

**使用：**

```typescript
// 第 1 页（前 20 条）
query({ skip: 0, first: 20 })

// 第 2 页（21-40 条）
query({ skip: 20, first: 20 })

// 第 3 页（41-60 条）
query({ skip: 40, first: 20 })
```

---

## 8. 本地测试指南

### 步骤 1：安装 Docker

```bash
# macOS
brew install docker
brew install docker-compose

# 或下载 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

### 步骤 2：启动 Graph Node

```bash
# 1. 克隆 Graph Node
git clone https://github.com/graphprotocol/graph-node.git
cd graph-node/docker

# 2. 修改配置
# 编辑 docker-compose.yml
# 找到 ethereum 配置行，修改为：
#   ethereum: 'localhost:http://host.docker.internal:8545'

# 3. 启动服务
docker-compose up
```

**启动成功后，服务监听：**
- GraphQL API: `http://localhost:8000`
- Admin API: `http://localhost:8020`
- WebSocket: `ws://localhost:8001`
- JSON-RPC (IPFS): `http://localhost:5001`

### 步骤 3：编译和部署 Subgraph

```bash
cd /Users/h15/Desktop/dex/subgraph

# 1. 安装依赖
pnpm install

# 2. 生成代码（从 schema.graphql 和 ABI 生成 TypeScript 类型）
pnpm codegen

# 3. 编译（TypeScript → WebAssembly）
pnpm build

# 4. 创建 Subgraph
pnpm create-local
# 等价于: graph create --node http://localhost:8020/ dex-subgraph

# 5. 部署 Subgraph
pnpm deploy-local
# 等价于: graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 dex-subgraph
```

### 步骤 4：测试查询

```bash
# 测试 GraphQL API
curl -X POST http://localhost:8000/subgraphs/name/dex-subgraph \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ pairs(first: 5) { id token0 { symbol } token1 { symbol } } }"
  }'
```

**或使用 GraphiQL 界面：**

打开浏览器：`http://localhost:8000/subgraphs/name/dex-subgraph`

### 步骤 5：生成测试数据

```bash
# 在另一个终端，执行交易生成事件
cd /Users/h15/Desktop/dex/contracts

# 创建交易对
npx hardhat run scripts/setup-pools.ts --network localhost

# 执行一些交易
npx hardhat run scripts/test-swap.ts --network localhost

# 添加流动性
npx hardhat run scripts/test-liquidity.ts --network localhost
```

### 步骤 6：验证数据

```graphql
# 查询 Factory
query {
  factory(id: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9") {
    pairCount
    totalVolumeUSD
    txCount
  }
}

# 查询最近交易
query {
  swaps(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    amountUSD
    timestamp
  }
}

# 查询挖矿池
query {
  farms {
    id
    totalStaked
    apr
  }
}
```

---

## 9. 生产部署

### 方案 1：The Graph 托管服务（推荐新手）

**优点：**
- 免费（有限额）
- 无需运维
- 自动扩展

**缺点：**
- 即将弃用（2023 年后逐步迁移到去中心化网络）
- 有查询限额

**步骤：**

```bash
# 1. 注册账号
# https://thegraph.com/hosted-service/

# 2. 创建 Subgraph

# 3. 获取 Access Token

# 4. 认证
graph auth --product hosted-service <ACCESS_TOKEN>

# 5. 修改 package.json
{
  "scripts": {
    "deploy": "graph deploy --product hosted-service <GITHUB_USERNAME>/dex-subgraph"
  }
}

# 6. 部署
pnpm deploy
```

### 方案 2：The Graph 去中心化网络（推荐生产）

**优点：**
- 完全去中心化
- 高可用
- 抗审查

**缺点：**
- 需要支付 GRT 代币
- 配置复杂

**步骤：**

1. 购买 GRT 代币
2. 发布 Subgraph 到 IPFS
3. 在 The Graph Network 注册
4. 质押 GRT
5. 策展者信号

**参考：** https://thegraph.com/docs/en/network/indexing/

### 方案 3：自托管 Graph Node（推荐大型项目）

**优点：**
- 完全控制
- 无限制
- 可定制

**缺点：**
- 需要运维
- 成本高

**架构：**

```
┌──────────────┐
│   Traefik    │ (负载均衡)
│   (80/443)   │
└──────┬───────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌─────┐  ┌─────┐
│Node1│  │Node2│ (Graph Node 集群)
└──┬──┘  └──┬──┘
   │        │
   └───┬────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌─────┐  ┌─────┐
│ PG  │  │IPFS │ (数据库 + 存储)
└─────┘  └─────┘
```

**配置：**

```yaml
# docker-compose.yml
version: '3'
services:
  graph-node:
    image: graphprotocol/graph-node
    ports:
      - '8000:8000'
      - '8001:8001'
      - '8020:8020'
    environment:
      postgres_host: postgres
      postgres_user: graph-node
      postgres_pass: let-me-in
      postgres_db: graph-node
      ipfs: 'ipfs:5001'
      ethereum: 'mainnet:https://eth-mainnet.alchemyapi.io/v2/<API_KEY>'
    depends_on:
      - postgres
      - ipfs
  
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: graph-node
      POSTGRES_PASSWORD: let-me-in
      POSTGRES_DB: graph-node
    volumes:
      - postgres-data:/var/lib/postgresql/data
  
  ipfs:
    image: ipfs/go-ipfs:v0.10.0
    ports:
      - '5001:5001'
    volumes:
      - ipfs-data:/data/ipfs

volumes:
  postgres-data:
  ipfs-data:
```

---

## 📝 总结

### The Graph 的核心价值

1. **快速查询** - 毫秒级响应，替代慢速的区块链扫描
2. **强大功能** - 支持排序、过滤、聚合、分页
3. **实时更新** - 自动监听事件，数据实时同步
4. **降低成本** - 减少 RPC 调用，节省 Gas

### 我们的实现

- ✅ 基于 Uniswap V2 Subgraph fork
- ✅ 扩展支持流动性挖矿（MasterChef）
- ✅ 完整的数据模型（Pairs, Tokens, Swaps, Farms）
- ✅ 后端 GraphQL 客户端（TheGraph Service）
- ✅ REST API 封装（方便前端调用）
- 🔜 前端 Apollo Client 集成（下一步）

### 下一步

1. **本地测试** - 启动 Graph Node，部署 Subgraph
2. **生成数据** - 执行交易，验证数据索引
3. **前端集成** - 安装 Apollo Client，替换 API 调用
4. **生产部署** - 部署到 The Graph 网络

---

**🎉 恭喜！你已经了解了 The Graph 的基本原理和使用方法！**

