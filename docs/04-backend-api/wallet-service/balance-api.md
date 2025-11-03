# Balance Module 使用指南

## 📖 功能概述

Balance Module 提供完整的余额查询功能，支持：
- ✅ ETH 余额查询
- ✅ ERC20 代币余额查询
- ✅ 批量余额查询
- ✅ 用户所有余额查询
- ✅ Redis 缓存优化
- ✅ 自动格式化（wei → ether）
- ✅ Swagger API 文档

---

## 🚀 快速开始

### 1. 安装依赖

\`\`\`bash
cd backend/services/wallet-service
pnpm install
\`\`\`

### 2. 配置环境变量

创建 \`.env\` 文件：

\`\`\`bash
# 复制模板
cp .env.example .env
\`\`\`

编辑 \`.env\`：

\`\`\`env
# 重要：配置你的 RPC URL
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# 数据库和 Redis
DATABASE_HOST=localhost
REDIS_HOST=localhost
\`\`\`

### 3. 启动服务

\`\`\`bash
# 启动数据库（如果使用 Docker）
cd ../../
docker-compose up -d postgres redis

# 回到项目目录
cd services/wallet-service

# 启动开发服务器
pnpm run start:dev
\`\`\`

### 4. 访问 API 文档

打开浏览器：http://localhost:3001/api/docs

---

## 📡 API 端点

### 1. 查询 ETH 余额

**请求**：
\`\`\`bash
GET /api/v1/balance/eth/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
\`\`\`

**响应**：
\`\`\`json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": "1.5",
  "decimals": 18,
  "symbol": "ETH",
  "name": "Ethereum",
  "timestamp": 1234567890
}
\`\`\`

**cURL 示例**：
\`\`\`bash
curl -X GET http://localhost:3001/api/v1/balance/eth/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
\`\`\`

---

### 2. 查询 ERC20 代币余额

**请求**：
\`\`\`bash
GET /api/v1/balance/token/{userAddress}/{tokenAddress}
\`\`\`

**示例（查询 USDT）**：
\`\`\`bash
GET /api/v1/balance/token/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/0xdAC17F958D2ee523a2206206994597C13D831ec7
\`\`\`

**响应**：
\`\`\`json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balance": "1000.50",
  "decimals": 6,
  "symbol": "USDT",
  "name": "Tether USD",
  "timestamp": 1234567890
}
\`\`\`

---

### 3. 批量查询余额

**请求**：
\`\`\`bash
POST /api/v1/balance/batch
Content-Type: application/json
\`\`\`

**请求体**：
\`\`\`json
{
  "addresses": [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "0x8765dcba4321fedcba9876543210fedcba987654"
  ],
  "tokens": [
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  ]
}
\`\`\`

**响应**：
\`\`\`json
[
  {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "token": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "balance": "1000.50",
    "decimals": 6,
    "symbol": "USDT"
  },
  {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "token": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "balance": "500.25",
    "decimals": 6,
    "symbol": "USDC"
  }
  // ... 更多结果
]
\`\`\`

**cURL 示例**：
\`\`\`bash
curl -X POST http://localhost:3001/api/v1/balance/batch \\
  -H "Content-Type: application/json" \\
  -d '{
    "addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"],
    "tokens": ["0xdAC17F958D2ee523a2206206994597C13D831ec7"]
  }'
\`\`\`

---

### 4. 查询所有余额

**请求**：
\`\`\`bash
GET /api/v1/balance/all/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
\`\`\`

**响应**：
\`\`\`json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "balances": {
    "ETH": {
      "balance": "1.5",
      "decimals": 18,
      "valueUsd": "3000.00"
    },
    "USDT": {
      "balance": "1000.50",
      "decimals": 6,
      "valueUsd": "1000.50"
    },
    "USDC": {
      "balance": "500.0",
      "decimals": 6,
      "valueUsd": "500.00"
    }
  },
  "totalValueUsd": "4500.50",
  "timestamp": 1234567890
}
\`\`\`

---

## 🔧 前端集成示例

### React + Axios

\`\`\`typescript
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';

// 查询 ETH 余额
async function getEthBalance(address: string) {
  const response = await axios.get(\`\${API_BASE}/balance/eth/\${address}\`);
  return response.data;
}

// 查询代币余额
async function getTokenBalance(address: string, tokenAddress: string) {
  const response = await axios.get(
    \`\${API_BASE}/balance/token/\${address}/\${tokenAddress}\`
  );
  return response.data;
}

// 批量查询
async function getBatchBalances(addresses: string[], tokens: string[]) {
  const response = await axios.post(\`\${API_BASE}/balance/batch\`, {
    addresses,
    tokens
  });
  return response.data;
}

// 使用示例
const balance = await getEthBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
console.log(\`ETH Balance: \${balance.balance} ETH\`);
\`\`\`

---

## ⚡ 性能优化

### 缓存策略

- **余额缓存 TTL**：10 秒
  - 原因：余额频繁变化，但不需要实时到毫秒级
  - 可通过 \`CACHE_TTL_BALANCE\` 环境变量调整

- **代币信息缓存 TTL**：1 小时
  - 原因：代币的 symbol、name、decimals 基本不变
  - 减少重复 RPC 调用

### 批量查询优化

使用批量查询接口而不是循环调用单个接口：

\`\`\`typescript
// ❌ 不推荐：循环调用
for (const token of tokens) {
  const balance = await getTokenBalance(address, token);
}

// ✅ 推荐：批量查询
const balances = await getBatchBalances([address], tokens);
\`\`\`

---

## 🐛 故障排查

### 错误：Invalid Ethereum address

**原因**：地址格式不正确

**解决**：确保地址是有效的以太坊地址（0x + 40 位十六进制字符）

\`\`\`bash
# 正确
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# 错误
742d35Cc6634C0532925a3b844Bc9e7595f0bEb  # 缺少 0x
0x742d35Cc6634  # 长度不够
\`\`\`

---

### 错误：RPC connection failed

**原因**：无法连接到以太坊节点

**解决**：
1. 检查 \`BLOCKCHAIN_RPC_URL\` 是否正确
2. 确保 API Key 有效
3. 测试 RPC 连接：

\`\`\`bash
curl -X POST https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
\`\`\`

---

### 错误：Redis connection refused

**原因**：Redis 未启动或连接配置错误

**解决**：
\`\`\`bash
# 检查 Redis 是否运行
redis-cli ping
# 应该返回 PONG

# 如果使用 Docker
docker-compose up -d redis
\`\`\`

---

## 📊 监控和日志

### 查看日志

\`\`\`bash
# 开发模式日志会实时输出
pnpm run start:dev

# 生产模式日志
pm2 logs wallet-service
\`\`\`

### 日志级别

通过 \`LOG_LEVEL\` 环境变量控制：
- \`debug\`：详细日志（开发环境）
- \`info\`：常规日志
- \`warn\`：警告信息
- \`error\`：错误信息

---

## 🧪 测试

### 单元测试

\`\`\`bash
pnpm run test
\`\`\`

### E2E 测试

\`\`\`bash
pnpm run test:e2e
\`\`\`

### 手动测试

使用 Swagger UI：http://localhost:3001/api/docs

点击 "Try it out" 即可测试所有接口。

---

## 📝 开发笔记

### 添加新的代币

编辑 \`balance.service.ts\` 中的 \`getCommonTokens()\` 方法：

\`\`\`typescript
private getCommonTokens() {
  return [
    { symbol: 'USDT', address: '0x...' },
    { symbol: 'USDC', address: '0x...' },
    { symbol: 'DAI', address: '0x...' },  // 新增
  ];
}
\`\`\`

### 集成价格 API

TODO: 集成 CoinGecko 或其他价格 API 来获取美元价值。

---

## 🎯 下一步

Balance Module 已完成！接下来可以：
1. ✅ Token Module - 代币信息管理
2. ✅ Address Module - 地址管理
3. ✅ Transaction Module - 交易监控

---

## 📚 相关文档

- [NestJS 文档](https://docs.nestjs.com/)
- [viem 文档](https://viem.sh/)
- [Alchemy API](https://docs.alchemy.com/)

