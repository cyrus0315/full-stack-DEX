# DEX Subgraph

The Graph 数据索引层，用于索引 DEX 合约的链上数据。

## 📋 功能特性

### ✅ 核心功能（基于 Uniswap V2）
- **Factory** - 工厂合约事件监听（PairCreated）
- **Pair** - 交易对事件监听（Swap, Mint, Burn, Sync）
- **Token** - 代币信息和统计
- **交易数据** - 完整的交易历史记录
- **流动性数据** - 添加/移除流动性记录

### ✅ 扩展功能（流动性挖矿）
- **Farm** - 挖矿池信息和统计
- **UserStake** - 用户质押信息
- **Deposit/Withdrawal** - 质押和取回历史
- **APR 计算** - 年化收益率

### ✅ 价格和 TVL
- **USD 价格计算** - 通过稳定币对计算 USD 价格
- **TVL 统计** - 总锁仓价值（以 USD 计）
- **交易量统计** - 24h 交易量、总交易量

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd subgraph
npm install
# 或
pnpm install
```

### 2. 生成代码

```bash
npm run codegen
```

### 3. 构建 Subgraph

```bash
npm run build
```

### 4. 本地部署测试

#### 启动 Graph Node（需要 Docker）

```bash
# 克隆 Graph Node
git clone https://github.com/graphprotocol/graph-node.git
cd graph-node/docker

# 修改 docker-compose.yml 中的 ethereum 配置
# ethereum: 'localhost:http://host.docker.internal:8545'

# 启动服务
docker-compose up
```

#### 部署到本地节点

```bash
# 创建 Subgraph
npm run create-local

# 部署 Subgraph
npm run deploy-local
```

### 5. 部署到 The Graph 托管服务

```bash
# 注册账号并获取 Access Token
# https://thegraph.com/hosted-service/

# 认证
graph auth --product hosted-service <ACCESS_TOKEN>

# 部署
npm run deploy
```

---

## 📊 GraphQL 查询示例

### 获取所有交易对（按交易量排序）

```graphql
query GetPairs {
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

### 获取最近的交易

```graphql
query GetRecentSwaps {
  swaps(
    first: 20
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    pair {
      token0 { symbol }
      token1 { symbol }
    }
    sender
    amount0In
    amount1In
    amount0Out
    amount1Out
    amountUSD
    timestamp
  }
}
```

### 获取所有挖矿池

```graphql
query GetFarms {
  farms(
    orderBy: totalStakedUSD
    orderDirection: desc
  ) {
    id
    lpToken
    pair {
      token0 { symbol }
      token1 { symbol }
    }
    allocPoint
    totalStaked
    totalStakedUSD
    apr
    status
  }
}
```

### 获取用户质押信息

```graphql
query GetUserStakes($user: Bytes!) {
  userStakes(
    where: { user: $user }
  ) {
    id
    farm {
      id
      pair {
        token0 { symbol }
        token1 { symbol }
      }
    }
    amount
    amountUSD
    pendingReward
    totalEarned
    totalEarnedUSD
  }
}
```

### 获取全局统计

```graphql
query GetFactory {
  factory(id: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9") {
    pairCount
    totalVolumeUSD
    totalLiquidityUSD
    txCount
  }
}
```

---

## 🔧 配置说明

### subgraph.yaml

主配置文件，定义数据源和事件处理器。

**关键配置：**
- `network`: 网络名称（localhost / mainnet / polygon 等）
- `address`: 合约地址
- `startBlock`: 起始区块号（优化同步速度）
- `abis`: ABI 文件路径
- `eventHandlers`: 事件处理器映射

### schema.graphql

GraphQL Schema 定义，定义实体结构。

**核心实体：**
- `Factory` - 工厂合约
- `Token` - 代币
- `Pair` - 交易对
- `Swap/Mint/Burn` - 交易事件
- `Farm` - 挖矿池
- `UserStake` - 用户质押

### src/mappings/

事件处理逻辑（TypeScript）。

**Mapping 文件：**
- `factory.ts` - Factory 事件处理
- `pair.ts` - Pair 事件处理
- `masterchef.ts` - MasterChef 事件处理

### src/utils/

工具函数。

- `constants.ts` - 常量定义
- `helpers.ts` - 辅助函数（价格计算、类型转换等）

---

## 📂 目录结构

```
subgraph/
├── abis/                   # ABI 文件
│   ├── DEXFactory.json
│   ├── DEXPair.json
│   ├── MasterChef.json
│   └── ERC20.json
├── src/
│   ├── mappings/           # 事件处理逻辑
│   │   ├── factory.ts
│   │   ├── pair.ts
│   │   └── masterchef.ts
│   └── utils/              # 工具函数
│       ├── constants.ts
│       └── helpers.ts
├── schema.graphql          # GraphQL Schema
├── subgraph.yaml           # 主配置文件
├── package.json
└── tsconfig.json
```

---

## 🔗 相关链接

- [The Graph 官方文档](https://thegraph.com/docs/)
- [Uniswap V2 Subgraph](https://github.com/Uniswap/v2-subgraph)
- [GraphQL 查询语法](https://graphql.org/learn/)
- [AssemblyScript 文档](https://www.assemblyscript.org/)

---

## 📝 注意事项

### 1. 网络配置

修改 `subgraph.yaml` 中的网络配置：
- 本地测试：`network: localhost`
- 主网部署：`network: mainnet`

### 2. 合约地址

确保 `subgraph.yaml` 中的合约地址正确：
- Factory: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- MasterChef: `0x4A679253410272dd5232B3Ff7cF5dbB88f295319`

### 3. 起始区块

设置合适的 `startBlock` 可以加快同步速度：
- Factory: 从部署区块开始
- MasterChef: 从部署区块开始（35）

### 4. 价格计算

价格通过稳定币对计算：
- WETH/USDT, WETH/USDC, WETH/DAI
- 确保这些池子有足够的流动性

---

## 🐛 故障排查

### Subgraph 同步失败

1. 检查合约地址是否正确
2. 检查起始区块号是否正确
3. 检查 RPC 节点是否可用
4. 查看 Graph Node 日志

### 查询返回空数据

1. 确认 Subgraph 已完成同步
2. 确认链上有相关交易
3. 检查查询语法是否正确

### 价格计算不准确

1. 确认稳定币池子有流动性
2. 检查 `getEthPriceInUSD()` 逻辑
3. 检查白名单代币配置

---

## 📮 反馈和贡献

欢迎提交 Issue 和 Pull Request！

---

**状态:** ✅ 开发完成  
**版本:** 1.0.0  
**最后更新:** 2025-11-19

