# 🔧 问题排查

常见问题和解决方案汇总。

---

## 📚 问题分类

### [部署问题](./deployment-issues.md)

智能合约部署相关问题：
- Hardhat 编译器下载失败
- 合约部署失败
- CREATE2 地址计算错误
- MINIMUM_LIQUIDITY 铸造失败

---

### 合约问题（待创建）

智能合约运行时问题：
- 交易 revert
- Gas 估算错误
- 授权失败
- 流动性计算错误

---

### 后端问题（待创建）

后端服务相关问题：
- 数据库连接失败
- Redis 连接失败
- RPC 节点错误
- TypeORM 实体错误
- viem 调用失败

---

## 🔍 快速诊断

### 1. 服务健康检查

```bash
# Hardhat 节点是否运行？
curl http://localhost:8545

# Wallet Service
curl http://localhost:3001/health

# Trading Service
curl http://localhost:3002/health

# PostgreSQL
psql -h localhost -U postgres -d dex_wallet -c "SELECT 1"

# Redis
redis-cli ping
```

---

### 2. 查看日志

```bash
# Wallet Service 日志
cd backend/services/wallet-service
pnpm run start:dev

# Trading Service 日志
cd backend/services/trading-service
pnpm run start:dev

# Hardhat 节点日志
cd contracts
npx hardhat node
```

---

### 3. 检查配置

```bash
# 合约地址配置
cat contracts/.env.deployed

# Wallet Service 配置
cat backend/services/wallet-service/.env

# Trading Service 配置
cat backend/services/trading-service/.env
```

---

## ⚠️ 常见错误

### Error 1: 端口被占用

```bash
Error: listen EADDRINUSE: address already in use :::3001

# 解决方案
lsof -i :3001
kill -9 <PID>
```

---

### Error 2: 数据库连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:5432

# 解决方案
# 1. 检查 PostgreSQL 是否运行
brew services list

# 2. 启动 PostgreSQL
brew services start postgresql@14

# 3. 创建数据库
psql -U postgres
CREATE DATABASE dex_wallet;
CREATE DATABASE dex_trading;
```

---

### Error 3: Redis 连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:6379

# 解决方案
# 1. 启动 Redis
brew services start redis

# 2. 测试连接
redis-cli ping
```

---

### Error 4: RPC 节点未运行

```
Error: could not detect network

# 解决方案
# 启动 Hardhat 本地节点
cd contracts
npx hardhat node
```

---

### Error 5: 合约未部署

```
Error: contract not deployed at address

# 解决方案
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
```

---

### Error 6: 授权失败

```
Error: ERC20: insufficient allowance

# 解决方案
# 先授权，再交易
POST /swap/approval
{
  "tokenAddress": "0x...",
  "amount": "1000000000000000000"
}
```

---

### Error 7: 滑点过大

```
Error: ROUTER: INSUFFICIENT_OUTPUT_AMOUNT

# 解决方案
# 增加滑点容忍度
{
  "slippage": 1.0  // 从 0.5% 增加到 1%
}
```

---

### Error 8: Gas 不足

```
Error: sender doesn't have enough funds to send tx

# 解决方案
# Hardhat 本地节点自动提供测试账户，检查是否使用正确的私钥
```

---

## 🐛 调试技巧

### 1. 使用 Hardhat Console

```bash
cd contracts
npx hardhat console --network localhost

# 测试合约调用
const Factory = await ethers.getContractFactory("DEXFactory");
const factory = await Factory.attach("0x...");
const pairAddress = await factory.getPair(token0, token1);
console.log(pairAddress);
```

---

### 2. 查看交易详情

```bash
# 使用 cast (foundry)
cast tx 0xTransactionHash --rpc-url http://localhost:8545

# 或在代码中
const receipt = await publicClient.getTransactionReceipt({
  hash: '0x...'
});
console.log(receipt);
```

---

### 3. 监听事件

```typescript
// 监听 Swap 事件
const logs = await publicClient.getLogs({
  address: pairAddress,
  event: parseAbiItem('event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'),
  fromBlock: 'latest',
});
```

---

## 📞 获取帮助

如果问题仍未解决：

1. 📖 查看详细文档
   - [智能合约文档](../03-smart-contracts/)
   - [后端 API 文档](../04-backend-api/)
   - [部署指南](../06-deployment/)

2. 🐛 提交 Issue
   - [GitHub Issues](https://github.com/your-repo/issues)
   - 提供错误日志
   - 描述复现步骤

3. 💬 社区讨论
   - [GitHub Discussions](https://github.com/your-repo/discussions)
   - Discord / Telegram

---

## 📝 报告 Bug

提交 Issue 时请包含：

```markdown
### 环境信息
- OS: macOS 14.x
- Node.js: 18.x
- pnpm: 8.x
- Hardhat: 2.x

### 问题描述
简短描述问题

### 复现步骤
1. 执行 xxx
2. 出现 xxx 错误

### 错误日志
```
错误日志内容
```

### 预期行为
应该如何工作

### 实际行为
实际发生了什么
```

---

**返回**: [文档首页](../README.md)

