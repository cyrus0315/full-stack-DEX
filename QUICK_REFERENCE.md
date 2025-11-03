# 🚀 DEX 项目快速参考

> 一页了解整个项目 - 快速查找常用命令和信息

---

## 📖 这是什么？

一个**基于 UniswapV2 的去中心化交易所（DEX）**，提供：
- ✅ **Swap** - 代币兑换
- ✅ **Liquidity** - 流动性管理
- ✅ **History** - 交易历史记录
- ✅ **Analytics** - 数据分析统计
- ✅ **Real-time** - WebSocket 实时推送

### 核心特点
```
✅ 真正去中心化（用户自己管理私钥）
✅ AMM 自动做市商（恒定乘积公式）
✅ 完整数据分析（历史记录 + 统计）
✅ 实时更新（WebSocket 推送）
✅ 生产级代码（经过重构优化）
```

---

## 🏗️ 架构速览

```
前端 (React + MetaMask)
  ├─ 直接调用智能合约 → Swap/Liquidity
  └─ 调用后端 API → 查询数据

后端 (NestJS - 只读服务)
  ├─ Analytics Service → 数据分析
  ├─ Wallet Service → 钱包服务
  └─ BlockchainListener → 事件监听

智能合约 (Solidity)
  ├─ DEXFactory → 创建交易对
  ├─ DEXRouter → 交易路由
  └─ DEXPair → 流动性池
```

---

## 📊 项目状态

| 指标 | 当前状态 |
|------|----------|
| **完成度** | ✅ Phase 3 完成（核心功能 100%） |
| **代码量** | ~15,000 行 |
| **智能合约** | 5 个（核心合约） |
| **后端服务** | 2 个（analytics + wallet） |
| **前端页面** | 5 个（Swap/Liquidity/Pool/History/Portfolio） |
| **数据库表** | 4 个（pool/swap_history/liquidity_history） |

---

## 💻 技术栈

### 智能合约
```
Solidity 0.8.20
Hardhat
Viem
```

### 后端
```
NestJS + TypeScript
TypeORM + PostgreSQL
Redis（可选）
Socket.IO（WebSocket）
Viem（只读查询）
```

### 前端
```
React 18 + TypeScript
Vite
Wagmi + Viem
MetaMask
Ant Design
Zustand
```

---

## 🚀 快速启动（5 步）

```bash
# 1. 启动 Hardhat 节点
cd contracts && npx hardhat node

# 2. 部署合约 + Mint + 添加流动性
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/mint-tokens.js --network localhost
npx hardhat run scripts/add-liquidity.ts --network localhost

# 3. 启动后端
cd backend/services/analytics-service && pnpm run start:dev

# 4. 同步池子数据
cd /Users/h15/Desktop/dex && bash scripts/sync-all-pools.sh

# 5. 启动前端
cd frontend/web-app && pnpm run dev
```

**访问：** http://localhost:3000 🎉

**详细指南：** [START_ALL.md](./START_ALL.md)

---

## 📁 目录结构

```
dex/
├── contracts/              # 智能合约
│   ├── contracts/          # Solidity 合约
│   └── scripts/            # 部署脚本
│
├── backend/services/
│   ├── analytics-service/  # 数据分析服务 ⭐
│   │   ├── pool/           # 池子管理
│   │   ├── quote/          # 价格报价
│   │   ├── history/        # 历史记录
│   │   ├── analytics/      # 数据分析
│   │   └── blockchain-listener/  # 事件监听
│   │
│   └── wallet-service/     # 钱包服务
│       ├── balance/        # 余额查询
│       └── token/          # 代币信息
│
├── frontend/web-app/       # 前端应用
│   ├── pages/              # 页面组件
│   ├── hooks/              # React Hooks
│   └── services/           # API 服务
│
├── docs/                   # 文档
│   ├── INDEX.md            # 文档索引
│   ├── phases/             # 开发历史
│   ├── guides/             # 使用指南
│   └── maintenance/        # 维护文档
│
└── scripts/                # 测试脚本
```

---

## 🔧 常用命令

### 合约操作
```bash
# 部署合约
cd contracts
npx hardhat run scripts/deploy.ts --network localhost

# Mint 代币
npx hardhat run scripts/mint-tokens.js --network localhost

# 添加流动性
npx hardhat run scripts/add-liquidity.ts --network localhost

# 检查余额
npx hardhat run scripts/check-balance.js --network localhost
```

### 后端操作
```bash
# 启动 Analytics Service
cd backend/services/analytics-service
pnpm run start:dev

# 启动 Wallet Service
cd backend/services/wallet-service
pnpm run start:dev

# 查看日志
# 终端直接显示
```

### 前端操作
```bash
# 启动开发服务器
cd frontend/web-app
pnpm run dev

# 构建生产版本
pnpm run build

# 预览生产版本
pnpm run preview
```

### 测试脚本
```bash
# 同步所有池子
bash scripts/sync-all-pools.sh

# Mint 代币
bash scripts/mint-tokens-simple.sh

# 测试 Analytics API
bash scripts/test-analytics-api.sh
```

---

## 🌐 API 端点

### Analytics Service (Port 3002)

#### Pool API
```bash
GET  /api/v1/pool                    # 获取所有池子
GET  /api/v1/pool/:id                # 获取单个池子
POST /api/v1/pool/:id/refresh        # 刷新池子数据
```

#### Quote API
```bash
POST /api/v1/quote                   # 获取交易报价
POST /api/v1/quote/exact-out         # 精确输出报价
```

#### History API
```bash
GET  /api/v1/history/swaps           # Swap 历史
GET  /api/v1/history/liquidity       # 流动性历史
GET  /api/v1/history/user/:address/recent  # 用户活动
```

#### Analytics API
```bash
GET  /api/v1/analytics/overview      # 全局概览
GET  /api/v1/analytics/pool/:id      # 池子分析
GET  /api/v1/analytics/user/:address # 用户统计
```

### Wallet Service (Port 3001)
```bash
GET  /api/v1/balance/eth/:address    # ETH 余额
GET  /api/v1/balance/token/:address/:tokenAddress  # 代币余额
GET  /api/v1/token/:address          # 代币信息
```

---

## 📚 核心文档

### 新手必读（按顺序）
1. [README.md](./README.md) - 项目概述
2. [START_ALL.md](./START_ALL.md) - 启动指南
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构设计

### 开发文档
- [docs/INDEX.md](./docs/INDEX.md) - 📖 文档索引
- [docs/guides/testing.md](./docs/guides/testing.md) - 测试指南
- [docs/guides/liquidity.md](./docs/guides/liquidity.md) - 流动性指南
- [scripts/README.md](./scripts/README.md) - 脚本说明

### 开发历史
- [docs/phases/phase1/](./docs/phases/phase1/) - Phase 1 记录
- [docs/phases/phase2/](./docs/phases/phase2/) - Phase 2 记录
- [docs/phases/phase3/](./docs/phases/phase3/) - Phase 3 记录

### 维护文档
- [docs/maintenance/cleanup-report.md](./docs/maintenance/cleanup-report.md) - 代码清理
- [docs/maintenance/rename-service.md](./docs/maintenance/rename-service.md) - 服务重命名

---

## 💡 核心概念

### AMM 恒定乘积公式
```
x × y = k

x = Token A 储备量
y = Token B 储备量
k = 恒定值

特点：始终有流动性，价格自动调节
```

### 手续费机制
```
总手续费：0.3%
├─ 流动性提供者：0.25%
└─ 协议费用：0.05%
```

### 价格计算
```
价格 = reserveOut / reserveIn

交易量越大，价格影响越大（滑点）
```

---

## 🔑 MetaMask 配置

### Hardhat Local 网络
```
网络名称：Hardhat Local
RPC URL：http://localhost:8545
Chain ID：31337
货币符号：ETH
```

### 测试账户（Hardhat 默认账户 #0）
```
地址：
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

私钥：
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## 🧪 测试清单

### 前端测试
- [ ] 连接 MetaMask
- [ ] 查看 Pool 列表
- [ ] 执行 Swap 交易
- [ ] 添加流动性
- [ ] 查看 History
- [ ] 实时更新（WebSocket）

### 后端测试
- [ ] Pool API 正常
- [ ] Quote API 正常
- [ ] History API 有数据
- [ ] Analytics API 正常
- [ ] WebSocket 连接成功
- [ ] 事件监听器工作

### 合约测试
- [ ] 合约部署成功
- [ ] 代币 Mint 成功
- [ ] 交易对创建成功
- [ ] Swap 执行成功
- [ ] 流动性添加/移除成功

---

## ⚠️ 常见问题

### Q: Hardhat 节点关闭后怎么办？
**A:** 重新部署所有合约，并重置 MetaMask 账户。

### Q: Pool 页面没有数据？
**A:** 运行 `bash scripts/sync-all-pools.sh`

### Q: Swap 失败？
**A:** 检查代币余额、授权状态、滑点设置。

### Q: WebSocket 未连接？
**A:** 检查后端服务是否运行，查看日志。

### Q: MetaMask Gas 估算失败？
**A:** 重置 MetaMask 账户（设置 → 高级 → 重置账户）

**详细排查：** [docs/troubleshooting/](./docs/troubleshooting/)

---

## 🔗 有用链接

### 学习资源
- [Solidity 文档](https://docs.soliditylang.org/)
- [Uniswap V2 协议](https://docs.uniswap.org/protocol/V2/introduction)
- [Viem 文档](https://viem.sh/)
- [Wagmi 文档](https://wagmi.sh/)
- [NestJS 文档](https://docs.nestjs.com/)

### 工具
- [Remix IDE](https://remix.ethereum.org/)
- [Hardhat 文档](https://hardhat.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)

---

## 🎯 下一步

### 刚开始？
1. 📖 阅读 [README.md](./README.md)
2. 🚀 跟随 [START_ALL.md](./START_ALL.md) 启动
3. 🏗️ 了解 [ARCHITECTURE.md](./ARCHITECTURE.md)

### 已经启动？
1. 🧪 执行测试（[docs/guides/testing.md](./docs/guides/testing.md)）
2. 💻 开始开发
3. 📝 查看 [TODO_LIST.md](./TODO_LIST.md)

### 遇到问题？
1. 🔍 查看 [docs/troubleshooting/](./docs/troubleshooting/)
2. 📖 阅读相关文档
3. 🐛 提 Issue

---

## 📞 获取帮助

- **文档索引：** [docs/INDEX.md](./docs/INDEX.md)
- **问题排查：** [docs/troubleshooting/](./docs/troubleshooting/)
- **GitHub Issues：** 提交问题和建议

---

**让我们一起构建去中心化的未来！** 🚀

---

**项目状态：** ✅ Phase 3 完成  
**最后更新：** 2025-10-30  
**维护者：** DEX Team
