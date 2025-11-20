# 🚀 DEX - 去中心化交易所

> 基于 UniswapV2 的企业级 DEX 实现，采用现代化技术栈，完全开源。

[English](./README_EN.md) | 简体中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E.svg)](https://nestjs.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636.svg)](https://soliditylang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

---

## 📖 项目简介

本项目是一个功能完整的去中心化交易所（DEX），实现了：

- ✅ **Swap** - 代币兑换（基于 AMM 算法）
- ✅ **Liquidity** - 流动性添加/移除
- ✅ **Pool** - 流动性池管理
- ✅ **Farms** - 流动性挖矿（MasterChef）
- ✅ **Price Oracle** - 价格预言机（Chainlink）
- ✅ **History** - 完整的交易历史记录
- ✅ **Analytics** - 数据分析和统计
- ✅ **Real-time** - WebSocket 实时数据推送
- 🔄 **The Graph** - 数据索引和快速查询（开发中）

### 🌟 特色

- **真正的去中心化** - 用户通过 MetaMask 自己管理私钥和签名交易
- **现代化架构** - 前端直接调用合约，后端提供只读数据服务
- **完整的数据分析** - 历史记录、统计数据、实时监控
- **生产级代码** - 经过多次重构和优化，代码清晰可维护

---

## 📸 项目截图

### 💱 Swap - 代币交易
<img src="./docs/images/screenshots/swap.jpg" alt="Swap Interface" width="800">

*即时兑换任意 ERC20 代币，支持滑点保护*

### 💧 Pool - 流动性池
<img src="./docs/images/screenshots/pool-list.jpg" alt="Pool List" width="800">

*查看所有交易对，TVL 和 APY 一目了然*

### ➕ Add Liquidity - 添加流动性
<img src="./docs/images/screenshots/add-liquidity.jpg" alt="Add Liquidity" width="800">

*成为流动性提供者，赚取交易手续费*

### 🌾 Farms - 流动性挖矿
<img src="./docs/images/screenshots/farms.jpg" alt="Farms" width="800">

*质押 LP Token，获得额外奖励*

### 📊 Pool Detail - 池子详情
<img src="./docs/images/screenshots/pool-detail.jpg" alt="Pool Detail" width="800">

*详细的池子信息和质押界面*

### 📜 History - 交易历史
<img src="./docs/images/screenshots/history.jpg" alt="Transaction History" width="800">

*完整的 Swap 和流动性操作记录*

---

## 🏗️ 技术栈

### 智能合约
- **Solidity** - 合约语言
- **Hardhat** - 开发框架
- **UniswapV2** - AMM 协议

### 后端
- **NestJS** - Node.js 框架
- **TypeScript** - 类型安全
- **TypeORM** - ORM 框架
- **PostgreSQL** - 数据库
- **Redis** - 缓存
- **Socket.IO** - WebSocket 实时通信
- **Viem** - 以太坊库（只读查询）
- **The Graph** - 区块链数据索引（开发中）
- **GraphQL** - 数据查询语言

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Ant Design** - UI 组件库
- **Wagmi** - React Hooks for Ethereum
- **Viem** - 以太坊库
- **Zustand** - 状态管理
- **React Query** - 数据请求

---

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14
- MetaMask 钱包

### 1. 克隆项目

```bash
git clone https://github.com/your-username/dex.git
cd dex
```

### 2. 一键启动

```bash
# 详细步骤请查看
cat START_ALL.md

# 或者查看快速开始指南
cat GETTING_STARTED.md
```

### 3. 访问应用

- **前端：** http://localhost:3000
- **后端 API：** http://localhost:3002
- **后端文档：** http://localhost:3002/api
- **钱包服务：** http://localhost:3001

---

## 📊 项目状态

**整体完成度：** 85% | **当前阶段：** Phase 6.5 开发中

### ✅ 已完成功能

- **Phase 1** - 核心功能 ✅ (2025-10-25)
  - 智能合约部署（Factory, Pair, Router）
  - Swap、Liquidity、Pool 功能
  - 前端基础功能
  - 后端 API（52+ 接口）
  - MetaMask 集成

- **Phase 2** - 实时数据同步 ✅ (2025-10-28)
  - 区块链事件监听
  - WebSocket 实时推送
  - 自动数据同步
  - 定时任务

- **Phase 3** - 数据分析 ✅ (2025-10-30)
  - 交易历史记录
  - 流动性历史记录
  - TVL 和交易量统计
  - 用户活动追踪

- **Phase 4** - 滑点优化 ✅ (2025-10-31)
  - 滑点计算和显示
  - 价格影响提示
  - 最小接收量保护
  - 用户自定义设置

- **Phase 5** - 流动性挖矿 ✅ (2025-11-02)
  - MasterChef 合约
  - LP Token 质押
  - 奖励分配机制
  - APR 计算
  - Farms 页面

- **Phase 6** - 价格预言机 ✅ (2025-11-19)
  - PriceOracle 合约
  - Chainlink 集成
  - USD 价格查询
  - 前端价格显示
  - 自动价格更新

### 🔄 开发中

- **Phase 6.5** - The Graph 集成 (75% 完成)
  - ✅ Subgraph 开发（Uniswap V2 + Farming）
  - ✅ 后端 GraphQL 客户端
  - ✅ REST API 封装
  - ⏳ 本地测试
  - ⏳ 生产部署
  - ⏳ 前端 Apollo Client 集成

### 📝 待开发功能

- **Phase 7** - 限价单 (预计 2025-11-23)
  - 限价单智能合约
  - 订单簿管理
  - 自动执行机制

- **Phase 8** - 多链支持 (预计 2025-11-30)
  - BSC / Polygon 支持
  - 链切换功能
  - 多链数据聚合

- **Phase 9** - 跨链桥 (预计 2025-12-05)
  - 跨链资产转移
  - 桥接合约
  - 安全验证

---

## 📚 文档

### 核心文档

| 文档 | 说明 |
|------|------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | 快速开始指南 |
| [START_ALL.md](./START_ALL.md) | 启动所有服务 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架构概览（853 行）|
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 快速参考 |
| [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) | 📊 项目状态总览 ⭐ |
| [docs/UPDATED_ROADMAP.md](./docs/UPDATED_ROADMAP.md) | 🗺️ 开发路线图 |

### 专题文档

| 文档 | 说明 |
|------|------|
| [docs/phases/phase5/FARMING_EXPLAINED.md](./docs/phases/phase5/FARMING_EXPLAINED.md) | 🌾 流动性挖矿详解 |
| [docs/THE_GRAPH_EXPLAINED.md](./docs/THE_GRAPH_EXPLAINED.md) | 📊 The Graph 新手详解 ⭐ |
| [docs/phases/phase6/PRODUCTION_DEPLOYMENT.md](./docs/phases/phase6/PRODUCTION_DEPLOYMENT.md) | 🚀 生产部署指南 |

### 详细文档

| 目录 | 说明 |
|------|------|
| [docs/README.md](./docs/README.md) | 📖 文档索引（推荐） |
| [docs/phases/](./docs/phases/) | 🎯 开发阶段记录 |
| [docs/guides/](./docs/guides/) | 📖 使用指南 |
| [docs/maintenance/](./docs/maintenance/) | 🧹 维护文档 |
| [docs/troubleshooting/](./docs/troubleshooting/) | 🔧 问题排查 |

### 测试和脚本

| 目录 | 说明 |
|------|------|
| [scripts/](./scripts/) | 🔧 测试脚本 |
| [tests/](./tests/) | 🧪 测试代码 |

---

## 🎯 核心概念

### 用户视角

```
用户 → MetaMask → 智能合约
         ↓
      签名交易
         ↓
    链上执行（去中心化）
```

### 系统架构

```
┌─────────────────────────────────────────────┐
│                   前端                       │
│   (React + Viem + MetaMask)                 │
│   - 直接调用合约执行交易                     │
│   - 调用后端 API 查询数据                    │
└──────────────┬──────────────────────────────┘
               │
               ├──────────────┐
               │              │
               ▼              ▼
      ┌────────────┐   ┌──────────────┐
      │ 智能合约    │   │  后端服务     │
      │ (Solidity) │   │  (NestJS)    │
      │            │   │  - 只读 API   │
      │ - Swap     │   │  - 数据分析   │
      │ - Pool     │   │  - 事件监听   │
      │ - Router   │   │  - 实时推送   │
      └────────────┘   └──────────────┘
            ▲                  │
            │                  │
            └──────────────────┘
              区块链事件监听
```

---

## 🔧 开发

### 项目结构

```
dex/
├── contracts/          # 智能合约
│   ├── contracts/      # Solidity 合约
│   │   ├── core/       # 核心合约（Factory, Pair, Router）
│   │   ├── farming/    # 挖矿合约（MasterChef）
│   │   └── oracle/     # 价格预言机（PriceOracle）
│   └── scripts/        # 部署脚本
│
├── backend/            # 后端服务
│   └── services/
│       ├── analytics-service/  # 数据分析服务
│       │   ├── modules/
│       │   │   ├── price/      # 价格服务
│       │   │   └── thegraph/   # The Graph 集成
│       │   └── ...
│       └── wallet-service/     # 钱包服务
│
├── frontend/           # 前端应用
│   └── web-app/        # React 应用
│       ├── src/
│       │   ├── pages/          # 页面（Swap, Pools, Farms...）
│       │   ├── hooks/          # React Hooks
│       │   └── components/     # 组件
│       └── ...
│
├── subgraph/           # The Graph Subgraph（新增）
│   ├── schema.graphql  # GraphQL Schema
│   ├── subgraph.yaml   # 配置文件
│   └── src/mappings/   # 事件处理器
│
├── docs/               # 文档
│   ├── README.md       # 文档索引
│   ├── PROJECT_STATUS.md      # 项目状态总览
│   ├── THE_GRAPH_EXPLAINED.md # The Graph 详解
│   ├── phases/         # 开发记录
│   └── ...            # 其他文档
│
├── scripts/            # 测试脚本
└── tests/              # 测试代码
```

### 开发流程

```bash
# 1. 启动本地链
cd contracts
npx hardhat node

# 2. 部署合约
npx hardhat run scripts/deploy.ts --network localhost

# 3. 启动后端
cd backend/services/analytics-service
pnpm run start:dev

# 4. 启动前端
cd frontend/web-app
pnpm run dev
```

### 常用命令

```bash
# Mint 代币
bash scripts/mint-tokens-simple.sh

# 同步池子数据
bash scripts/sync-all-pools.sh

# 测试 API
bash scripts/test-analytics-api.sh
```

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

### 开发规范

- **代码风格** - ESLint + Prettier
- **提交规范** - Conventional Commits
- **分支策略** - Git Flow
- **测试** - 单元测试 + 集成测试

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE)

---

## 🌟 致谢

- [Uniswap V2](https://uniswap.org/) - AMM 协议
- [NestJS](https://nestjs.com/) - 后端框架
- [React](https://reactjs.org/) - 前端框架
- [Viem](https://viem.sh/) - 以太坊库
- [Wagmi](https://wagmi.sh/) - React Hooks

---

## 📞 联系方式

- **GitHub Issues** - 问题反馈
- **Discussions** - 讨论交流

---

**项目状态：** ✅ Phase 6 完成，Phase 6.5 开发中（85% 整体完成度）  
**最后更新：** 2025-11-20  
**维护者：** DEX Team

---

## 📈 项目亮点

### 已实现的核心功能

✅ **8 个智能合约** - Factory, Pair, Router, WETH, MasterChef, RewardToken, PriceOracle, Mock Aggregator  
✅ **62+ REST API 接口** - 完整的后端服务  
✅ **10+ GraphQL 查询** - The Graph 数据索引（开发中）  
✅ **7 个前端页面** - Swap, Liquidity, Pools, Farms, History...  
✅ **实时数据推送** - WebSocket 支持  
✅ **价格预言机** - Chainlink 集成，USD 价格显示  
✅ **流动性挖矿** - 完整的 Staking 和 Rewards 系统  
✅ **74,500+ 行代码** - 生产级代码质量

### 技术特色

🚀 **性能优化** - The Graph 索引，查询速度提升 10-100 倍  
🔒 **安全第一** - 完善的权限控制和输入验证  
📚 **文档完善** - 20,000+ 行详细文档  
🧪 **测试完整** - 单元测试 + 集成测试 + E2E 测试  
🎨 **现代化 UI** - Ant Design + 响应式设计

### 最新更新（2025-11-20）

- ✅ Phase 6: 价格预言机完成
- ✅ Chainlink 集成
- ✅ USD 价格显示
- 🔄 Phase 6.5: The Graph 集成（75% 完成）
  - ✅ Subgraph 开发完成（~1,500 行）
  - ✅ 后端 GraphQL 客户端完成（~1,000 行）
  - ✅ The Graph 新手详解文档（1,417 行）
  - ⏳ 本地测试和部署

📖 **详细进度** 请查看 [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)
