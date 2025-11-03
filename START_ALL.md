# 🚀 DEX 项目快速启动指南

> 一站式启动所有服务，快速开始开发和测试

---

## 📋 前提条件

### 必需服务
- ✅ **PostgreSQL** 运行中（端口 5432）
- ✅ **Node.js** >= 18
- ✅ **pnpm** >= 8
- ✅ **MetaMask** 浏览器插件已安装

### 可选服务
- ⚪ **Redis** 运行中（端口 6379，用于缓存）

### 检查服务状态
```bash
# 检查 PostgreSQL
psql --version
pg_isready

# 检查 Node.js 和 pnpm
node --version
pnpm --version
```

---

## 🎬 启动步骤

### 方案 A：一键启动（推荐新手）

按照以下顺序，每个终端窗口执行一个命令：

#### Terminal 1: Hardhat 节点
```bash
cd /Users/h15/Desktop/dex/contracts
npx hardhat node
```
**状态：** 保持运行 🟢

#### Terminal 2: 部署合约（仅首次或节点重启后）
```bash
cd /Users/h15/Desktop/dex/contracts

# 1. 部署所有合约
npx hardhat run scripts/deploy.ts --network localhost

# 2. Mint 测试代币
npx hardhat run scripts/mint-tokens.js --network localhost

# 3. 添加流动性（创建 6 个交易对）
npx hardhat run scripts/add-liquidity.ts --network localhost
```
**预期输出：** ✅ 6 个交易对创建成功

#### Terminal 3: 后端服务
```bash
cd /Users/h15/Desktop/dex/backend/services/analytics-service
pnpm run start:dev
```
**状态：** 保持运行 🟢  
**预期日志：**
```
[BlockchainListenerService] 🎧 Initializing...
[BlockchainListenerService] ✅ Event listener started
[EventsGateway] 🔌 WebSocket Gateway initialized
```

#### Terminal 4: 同步池子数据
```bash
cd /Users/h15/Desktop/dex
bash scripts/sync-all-pools.sh
```
**作用：** 将链上数据同步到数据库

#### Terminal 5: 前端应用
```bash
cd /Users/h15/Desktop/dex/frontend/web-app
pnpm run dev
```
**状态：** 保持运行 🟢  
**访问：** http://localhost:3000

---

### 方案 B：脚本启动（开发者）

创建启动脚本（可选）：

```bash
#!/bin/bash
# start-all.sh

# 在不同窗口启动服务（需要 tmux）
tmux new-session -d -s dex-hardhat 'cd contracts && npx hardhat node'
sleep 5
tmux new-session -d -s dex-backend 'cd backend/services/analytics-service && pnpm run start:dev'
sleep 3
tmux new-session -d -s dex-frontend 'cd frontend/web-app && pnpm run dev'

echo "✅ 所有服务已启动！"
echo "查看服务: tmux ls"
echo "连接终端: tmux attach -t dex-hardhat"
```

---

## ✅ 验证清单

### 1. 前端验证（http://localhost:3000）

- [ ] **连接钱包**
  - 点击右上角「连接钱包」
  - MetaMask 弹出，选择账户
  - 显示账户地址和余额

- [ ] **Pool 页面** (`/pool`)
  - 显示 6 个交易对
  - 右上角显示 🟢 实时 按钮（WebSocket 已连接）
  - 全局统计数据显示
  - 可以点击池子查看详情

- [ ] **Swap 页面** (`/swap`)
  - 可以选择代币
  - 显示代币余额
  - 输入数量后显示预期输出

- [ ] **Liquidity 页面** (`/liquidity`)
  - 可以选择代币对
  - 显示建议添加比例
  - 显示当前价格

- [ ] **History 页面** (`/history`)
  - 显示交易历史（如果有）
  - 支持 Swap 和 Liquidity 筛选

### 2. 后端验证

#### Analytics Service（端口 3002）
```bash
# 测试 Pool API
curl http://localhost:3002/api/v1/pool

# 测试 Analytics API
curl http://localhost:3002/api/v1/analytics/overview

# 查看 API 文档
open http://localhost:3002/api
```

**预期：** 返回 JSON 数据，无报错

#### 检查事件监听器
```bash
# 查看后端日志，应该看到：
✅ Listening to events from block 123...
🎯 Captured event: ...
```

### 3. 合约验证

```bash
cd /Users/h15/Desktop/dex/contracts

# 检查余额
npx hardhat run scripts/check-balance.js --network localhost

# 预期输出：
# ✅ DAI: 10000
# ✅ USDT: 10000
# ✅ USDC: 10000
```

### 4. 数据库验证

```bash
# 连接数据库
psql -U your_username -d dex_db

# 检查池子数据
SELECT COUNT(*) FROM pool;
-- 预期：6 个池子

# 检查历史记录（执行交易后）
SELECT COUNT(*) FROM swap_history;
SELECT COUNT(*) FROM liquidity_history;
```

---

## 🔄 常见场景

### 场景 1: Hardhat 节点被关闭

**问题：** 节点关闭后，所有合约和数据都会丢失。

**解决：**
```bash
# 1. 重启节点
cd /Users/h15/Desktop/dex/contracts
npx hardhat node

# 2. 重新部署（在新终端）
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/mint-tokens.js --network localhost
npx hardhat run scripts/add-liquidity.ts --network localhost

# 3. 同步数据
cd /Users/h15/Desktop/dex
bash scripts/sync-all-pools.sh

# 4. 重置 MetaMask（清除 nonce）
# MetaMask 设置 -> 高级 -> 重置账户
```

### 场景 2: 前端显示 "连接失败"

**可能原因：**
- Hardhat 节点未运行
- MetaMask 网络配置错误
- 端口被占用

**解决：**
```bash
# 检查 Hardhat 节点
curl http://localhost:8545
# 预期：返回 JSON-RPC 错误（正常）

# 检查 MetaMask 网络设置：
# - 网络名称：Localhost 8545
# - RPC URL：http://localhost:8545
# - Chain ID：31337
```

### 场景 3: Pool 页面没有数据

**原因：** 数据库中没有池子数据。

**解决：**
```bash
# 同步所有池子
cd /Users/h15/Desktop/dex
bash scripts/sync-all-pools.sh

# 或者刷新单个池子
curl -X POST http://localhost:3002/api/v1/pool/1/refresh
```

### 场景 4: WebSocket 未连接（Pool 页面没有 🟢）

**原因：** 后端服务未启动或 WebSocket 端口被占用。

**检查：**
```bash
# 检查后端日志
# 应该看到：[EventsGateway] 🔌 WebSocket Gateway initialized

# 检查端口
lsof -i :3002
```

---

## 🛑 停止服务

### 方法 1: 逐个停止
```bash
# 在每个终端按 Ctrl + C
```

### 方法 2: 全部停止（使用 tmux）
```bash
# 杀死所有 tmux session
tmux kill-session -t dex-hardhat
tmux kill-session -t dex-backend
tmux kill-session -t dex-frontend
```

### 方法 3: 强制停止
```bash
# 停止所有 Node 进程（谨慎使用）
pkill -f "node"
pkill -f "hardhat"
```

---

## 📊 服务端口总览

| 服务 | 端口 | URL |
|------|------|-----|
| **Hardhat Node** | 8545 | http://localhost:8545 |
| **Analytics Service** | 3002 | http://localhost:3002 |
| **Wallet Service** | 3001 | http://localhost:3001 |
| **Frontend** | 3000 | http://localhost:3000 |
| **PostgreSQL** | 5432 | - |
| **Redis** | 6379 | - |

---

## 🧪 快速测试

启动所有服务后，快速测试功能：

```bash
# 1. 测试 API
bash scripts/test-analytics-api.sh

# 2. 测试 Swap（需要在前端执行）
# - 访问 http://localhost:3000/swap
# - 连接 MetaMask
# - 选择 DAI → USDT
# - 输入金额，执行交易

# 3. 查看历史记录
# - 访问 http://localhost:3000/history
# - 应该看到刚才的交易记录
```

---

## 📚 相关文档

- [GETTING_STARTED.md](./GETTING_STARTED.md) - 详细入门指南
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明
- [docs/guides/testing.md](./docs/guides/testing.md) - 测试指南
- [scripts/README.md](./scripts/README.md) - 脚本说明

---

## 💡 提示

### 开发建议
- 使用多个终端窗口，便于查看日志
- 使用 `tmux` 或 `screen` 管理多个终端
- 保存 Hardhat 节点的账户私钥，方便导入 MetaMask

### 故障排查
- 遇到问题先检查所有服务是否正常运行
- 查看各个服务的日志输出
- 参考 [docs/troubleshooting/](./docs/troubleshooting/) 目录

### MetaMask 配置
```
网络名称: Hardhat Local
RPC URL: http://localhost:8545
Chain ID: 31337
货币符号: ETH

测试账户私钥（Hardhat 默认账户 #0）:
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

**准备好了吗？开始启动服务！** 🚀

如有问题，查看 [docs/troubleshooting/](./docs/troubleshooting/) 或提 Issue。

---

**最后更新：** 2025-10-30  
**维护者：** DEX Team
