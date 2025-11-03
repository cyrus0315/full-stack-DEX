# DEX Web Application

基于 React + TypeScript + Vite 构建的去中心化交易所前端应用。

---

## 🚀 快速开始

### 前置条件

- Node.js >= 18
- pnpm >= 8
- MetaMask 浏览器插件

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:3000 启动

---

## 📁 项目结构

```
src/
├── components/          # 可复用组件
│   ├── Layout/         # 页面布局
│   └── ConnectWallet/  # 钱包连接
├── pages/              # 页面组件
│   ├── Swap/          # Swap 交易
│   ├── Liquidity/     # 流动性管理
│   ├── Pool/          # 交易对列表
│   └── Portfolio/     # 资产管理
├── hooks/              # 自定义 Hooks
├── services/           # API 服务
├── utils/              # 工具函数
├── types/              # TypeScript 类型
└── config/             # 配置文件
```

---

## 🛠️ 技术栈

### 核心框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具

### UI 组件
- **Ant Design** - UI 组件库
- **Ant Design Icons** - 图标库

### 状态管理
- **Zustand** - 全局状态管理
- **@tanstack/react-query** - 服务端状态管理

### 区块链交互
- **viem** - 以太坊交互库
- **wagmi** - React Hooks for Ethereum

### 网络请求
- **Axios** - HTTP 客户端
- **Socket.IO Client** - WebSocket 实时通信

### 路由
- **React Router v6** - 路由管理

---

## 🎯 功能模块

### ✅ 已实现
- [x] 基础项目框架
- [x] 路由配置
- [x] 布局组件
- [x] 主题配置（暗色模式）

### 🚧 开发中
- [ ] 钱包连接（MetaMask）
- [ ] Swap 交易界面
- [ ] 流动性添加/移除
- [ ] 资产查询
- [ ] 交易历史
- [ ] 实时价格更新

---

## 🔧 开发指南

### 环境变量

创建 `.env` 文件：

```env
VITE_WALLET_SERVICE_URL=http://localhost:3001/api/v1
VITE_TRADING_SERVICE_URL=http://localhost:3002/api/v1
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
```

### 代理配置

Vite 已配置代理转发到后端服务：
- `/api/v1` → Wallet Service (port 3001)
- `/trading` → Trading Service (port 3002)

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

---

## 📚 相关文档

- [后端 API 文档](../../docs/04-backend-api/README.md)
- [智能合约文档](../../docs/03-smart-contracts/README.md)
- [开发指南](../../docs/05-development/README.md)

---

## 🐛 常见问题

### Q: 钱包连接失败？
**A**: 确保已安装 MetaMask 并切换到 Hardhat 本地网络（Chain ID: 31337）

### Q: 无法获取数据？
**A**: 确保后端服务已启动
```bash
# Wallet Service
cd backend/services/wallet-service && pnpm run start:dev

# Trading Service
cd backend/services/trading-service && pnpm run start:dev
```

### Q: Hardhat 节点未运行？
**A**: 启动本地节点
```bash
cd contracts && npx hardhat node
```

---

## 📝 开发计划

### Phase 1: 基础功能
- [x] 项目初始化
- [ ] 钱包连接
- [ ] 基础交易功能

### Phase 2: 核心功能
- [ ] Swap 完整实现
- [ ] 流动性管理
- [ ] 交易历史

### Phase 3: 增强功能
- [ ] 实时价格图表
- [ ] WebSocket 实时更新
- [ ] 移动端适配

---

**开发状态**: 🚧 进行中  
**最后更新**: 2025-10-29

