# DEX 端到端测试指南

## 📋 测试准备

### 1. 启动 Hardhat 本地节点

```bash
cd /Users/h15/Desktop/dex/contracts
npx hardhat node
```

保持此终端运行。

### 2. 启动 Wallet Service

```bash
cd /Users/h15/Desktop/dex/backend/services/wallet-service
pnpm run start:dev
```

保持此终端运行。

### 3. 启动 Trading Service

```bash
cd /Users/h15/Desktop/dex/backend/services/trading-service
pnpm run start:dev
```

保持此终端运行。

---

## 🚀 运行完整端到端测试

```bash
cd /Users/h15/Desktop/dex
./test-e2e-full.sh
```

---

## 📊 测试流程

测试脚本会自动执行以下步骤：

### 阶段 1: 环境检查
- ✅ 检查必要命令（node, pnpm, curl, jq, npx）
- ✅ 检查 Hardhat 节点状态

### 阶段 2: 检查后端服务
- ✅ Wallet Service 健康检查
- ✅ Trading Service 健康检查

### 阶段 3: 部署合约
- 检查是否已有部署的合约
- 询问是否需要重新部署
- 如果需要，执行合约部署

### 阶段 4: 测试 Wallet Service
- 查询用户 ETH 余额
- 查询 USDT 余额
- 查询 DAI 余额
- 注册监控地址

### 阶段 5: 测试 Pool & Quote 模块
- 查询所有交易对
- 获取交易报价（USDT → DAI）

### 阶段 6: 添加流动性
- 检查并授权 USDT
- 检查并授权 DAI
- 添加流动性：100 USDT + 100 DAI
- 查询用户流动性头寸

### 阶段 7: 代币交换（Swap）
- 交易 1: 10 USDT → DAI (Exact In)
- 查询交易状态
- 交易 2: DAI → 5 USDT (Exact Out)

### 阶段 8: 移除流动性
- 获取 LP 余额
- 授权 LP token
- 移除 50% 的流动性
- 验证流动性变化

### 阶段 9: 验证数据同步
- 等待 Block Scanner 同步
- 查询用户交易历史
- 查询最新代币余额

### 阶段 10: 历史记录查询
- 查询所有 Swap 记录
- 查询用户 Swap 记录
- 查询所有流动性操作
- 查询用户流动性操作

---

## 📈 测试结果

测试完成后会显示：

```
================================
  测试汇总
================================
总测试数:   25
✅ 通过:     25
❌ 失败:     0

成功率:     100.00%

╔════════════════════════════════════════════════════════╗
║  🎉 所有测试通过！DEX 端到端测试成功！           ║
╚════════════════════════════════════════════════════════╝
```

---

## 🐛 故障排查

### 问题 1: Hardhat 节点未运行
**错误**: `❌ Hardhat 节点未运行`

**解决方案**:
```bash
cd /Users/h15/Desktop/dex/contracts
npx hardhat node
```

### 问题 2: 服务未启动
**错误**: `❌ Wallet Service 未运行` 或 `❌ Trading Service 未运行`

**解决方案**:
```bash
# Wallet Service
cd /Users/h15/Desktop/dex/backend/services/wallet-service
pnpm run start:dev

# Trading Service
cd /Users/h15/Desktop/dex/backend/services/trading-service
pnpm run start:dev
```

### 问题 3: PostgreSQL 未连接
**错误**: 服务启动时数据库连接失败

**解决方案**:
```bash
# 检查 PostgreSQL 状态
brew services list

# 启动 PostgreSQL
brew services start postgresql@14

# 检查数据库是否存在
psql -U postgres -c "\l" | grep dex_wallet
psql -U postgres -c "\l" | grep dex_trading
```

### 问题 4: WebSocket 依赖未安装
**错误**: Wallet Service 启动失败，提示 WebSocket 相关错误

**解决方案**:
```bash
cd /Users/h15/Desktop/dex/backend/services/wallet-service
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### 问题 5: 测试交易失败
**错误**: 交易提交返回 null 或错误

**解决方案**:
1. 检查账户是否有足够的 ETH 和代币余额
2. 确认合约地址配置正确
3. 检查服务日志中的具体错误信息

---

## 📝 单独测试特定模块

如果只想测试特定模块，可以使用以下命令：

### 测试 Swap Module
```bash
cd /Users/h15/Desktop/dex/backend/services/trading-service
./test-swap.sh
```

### 测试 Liquidity Module
```bash
cd /Users/h15/Desktop/dex/backend/services/trading-service
./test-liquidity-full.sh
```

### 测试 Block Scanner
```bash
cd /Users/h15/Desktop/dex/backend/services/wallet-service
./test-scanner.sh
```

---

## 🎯 测试覆盖范围

### 智能合约
- ✅ Factory 合约（创建交易对）
- ✅ Pair 合约（AMM 核心逻辑）
- ✅ Router 合约（用户交互入口）
- ✅ ERC20 代币（USDT, DAI, USDC, WETH）

### Trading Service
- ✅ Pool Module（交易对管理）
- ✅ Quote Module（价格查询）
- ✅ Swap Module（代币交换）
- ✅ Liquidity Module（流动性管理）

### Wallet Service
- ✅ Balance Module（余额查询）
- ✅ Token Module（代币管理）
- ✅ Address Module（地址管理）
- ✅ Transaction Module（交易记录）
- ✅ Block Scanner（区块扫描）
- ✅ WebSocket Push（实时推送）

### 集成功能
- ✅ 合约 ↔ Trading Service
- ✅ Trading Service ↔ Wallet Service
- ✅ Block Scanner ↔ WebSocket
- ✅ 端到端交易流程

---

## 📊 性能指标

测试脚本会记录以下指标：

- API 响应时间
- 交易确认时间（约 5 秒/交易）
- Block Scanner 同步延迟（约 10 秒）
- 总测试时间（约 3-5 分钟）

---

## 🔄 持续集成

### 在 CI/CD 中运行

```bash
# 确保所有服务都在后台运行
export CI=true

# 启动 Hardhat 节点
cd contracts && npx hardhat node &

# 启动服务
cd backend/services/wallet-service && pnpm run start:dev &
cd backend/services/trading-service && pnpm run start:dev &

# 等待服务启动
sleep 30

# 运行测试
./test-e2e-full.sh
```

---

## ✅ 测试通过标准

- 所有 API 调用返回 HTTP 2xx 状态码
- 所有交易成功提交并获得 txHash
- Block Scanner 正确同步交易
- WebSocket 正常推送事件
- 余额和流动性数据一致

---

**测试时间**: 约 3-5 分钟  
**测试用例数**: 25+  
**成功率目标**: 100%

🎉 **祝测试顺利！**

