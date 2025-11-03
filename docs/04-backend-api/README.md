# 🔌 后端 API 文档

DEX 后端包含两个微服务，提供 **52 个 RESTful API 接口**。

---

## 📚 服务总览

### Wallet Service (钱包服务)

**端口**: 3001  
**数据库**: PostgreSQL (dex_wallet)  
**状态**: 67% 完成

**功能**: 管理用户钱包、代币、余额和交易记录

**模块**:
- Balance Module (4 个 API)
- Token Module (6 个 API)
- Address Module (6 个 API)
- Transaction Module (8 个 API)

**总计**: 24 个 API 接口

---

### Trading Service (交易服务)

**端口**: 3002  
**数据库**: PostgreSQL (dex_trading)  
**状态**: 100% 完成 ✅

**功能**: DEX 交易、报价、流动性管理

**模块**:
- Pool Module (7 个 API)
- Quote Module (4 个 API)
- Swap Module (6 个 API)
- Liquidity Module (6 个 API)

**总计**: 28 个 API 接口

---

## 🔌 Wallet Service API

### [Balance Module](./wallet-service/balance-api.md)

余额查询和管理：

```bash
# 查询地址余额
GET /balance/:address

# 批量查询代币余额
GET /balance/:address/tokens?tokenAddresses[]=0x...&tokenAddresses[]=0x...

# 查询单个代币余额
GET /balance/:address/:tokenAddress

# 刷新余额（从链上）
POST /balance/:address/refresh
```

---

### [Token Module](./wallet-service/token-api.md)

代币信息管理：

```bash
# 代币列表
GET /token?page=1&limit=10

# 代币详情
GET /token/:address

# 添加代币
POST /token
{
  "address": "0x...",
  "autoFetch": true
}

# 更新代币信息
PUT /token/:address
{
  "name": "...",
  "symbol": "..."
}

# 刷新代币（从链上）
POST /token/:address/refresh

# 批量查询代币
POST /token/batch
{
  "addresses": ["0x...", "0x..."]
}
```

---

### [Address Module](./wallet-service/address-api.md)

地址管理：

```bash
# 地址列表
GET /address?type=EOA&page=1&limit=10

# 地址详情
GET /address/:address

# 添加地址
POST /address
{
  "address": "0x...",
  "label": "My Wallet"
}

# 更新地址
PUT /address/:address
{
  "label": "Updated Label"
}

# 删除地址
DELETE /address/:address

# 批量添加地址
POST /address/batch
{
  "addresses": [
    {"address": "0x...", "label": "Wallet 1"},
    {"address": "0x...", "label": "Wallet 2"}
  ]
}
```

---

### Transaction Module

交易监控和查询：

**核心功能**:
- 交易查询和统计
- [区块扫描器](./wallet-service/transaction-scanner.md) - 自动监听新区块 ✅
- [WebSocket 实时推送](./wallet-service/websocket-realtime.md) - 实时事件通知 ✅
  - [快速开始指南](./wallet-service/websocket-setup.md) - 安装和配置

```bash
# 交易列表
GET /transaction?page=1&limit=10

# 交易详情
GET /transaction/:hash

# 按地址查询交易
GET /transaction/address/:address?page=1&limit=10

# 添加交易记录
POST /transaction
{
  "hash": "0x...",
  "from": "0x...",
  "to": "0x..."
}

# 同步交易状态
POST /transaction/:hash/sync

# 交易统计
GET /transaction/stats/:address

# 批量查询交易
POST /transaction/batch
{
  "hashes": ["0x...", "0x..."]
}

# 最近交易
GET /transaction/recent/:address?limit=10

# 区块扫描器状态
GET /transaction/scanner/status

# 手动扫描区块
POST /transaction/scanner/scan

# 刷新监控地址
POST /transaction/scanner/refresh-addresses
```

**详细文档**: [Transaction Scanner 使用指南](./wallet-service/transaction-scanner.md)

---

## 🔌 Trading Service API

### Pool Module (待提取文档)

流动性池管理：

```bash
# 创建/获取池子
POST /pool
{
  "token0": "0x...",
  "token1": "0x..."
}

# 池子列表
GET /pool?page=1&limit=10&sortBy=tvl

# 池子统计
GET /pool/stats

# 池子详情
GET /pool/:id

# 刷新池子数据
POST /pool/:id/refresh

# 按代币对查询
GET /pool/pair/:token0/:token1

# 按地址查询
GET /pool/address/:pairAddress
```

---

### Quote Module (待提取文档)

报价计算：

```bash
# 精确输入报价
POST /quote
{
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amountIn": "1000000000000000000",
  "slippage": 0.5
}

# 精确输出报价
POST /quote/exact-out
{
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amountOut": "1000000000000000000",
  "slippage": 0.5
}

# 批量报价
POST /quote/batch
{
  "quotes": [
    {"tokenIn": "...", "tokenOut": "...", "amountIn": "..."},
    ...
  ]
}

# 价格查询
GET /quote/price/:token0/:token1
```

---

### [Swap Module](../../backend/services/trading-service/src/modules/swap/README.md)

代币交易执行（完整文档 1,285 行）：

```bash
# 检查授权
GET /swap/approval/check?tokenAddress=0x...&amount=1000

# 授权代币
POST /swap/approval
{
  "tokenAddress": "0x...",
  "amount": "1000000000000000000"
}

# 精确输入交易
POST /swap/exact-in
{
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amountIn": "1000000000000000000",
  "slippage": 0.5
}

# 精确输出交易
POST /swap/exact-out
{
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amountOut": "1000000000000000000",
  "slippage": 0.5
}

# 查询交易状态
GET /swap/:txHash

# 交易历史
GET /swap?userAddress=0x...&page=1&limit=10
```

---

### [Liquidity Module](../../backend/services/trading-service/src/modules/liquidity/README.md)

流动性管理（完整文档 1,410 行）：

```bash
# 计算添加流动性
GET /liquidity/calculate/add?tokenA=0x...&tokenB=0x...&amountADesired=1000&amountBDesired=1000&slippage=0.5

# 添加流动性
POST /liquidity/add
{
  "tokenA": "0x...",
  "tokenB": "0x...",
  "amountADesired": "1000000000000000000",
  "amountBDesired": "1000000000000000000",
  "slippage": 0.5
}

# 移除流动性
POST /liquidity/remove
{
  "tokenA": "0x...",
  "tokenB": "0x...",
  "liquidity": "100000000000000000",
  "slippage": 0.5
}

# 用户流动性头寸
GET /liquidity/positions/:address

# 查询操作状态
GET /liquidity/:txHash

# 操作历史
GET /liquidity?userAddress=0x...&page=1&limit=10
```

---

## 🔧 通用规范

### 请求格式

```typescript
// POST/PUT 请求 Body
Content-Type: application/json

{
  "field1": "value1",
  "field2": "value2"
}
```

### 响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": { ... }
}

// 错误响应
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### 分页

```typescript
// 分页参数
?page=1&limit=10

// 分页响应
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

## 🔐 认证（待实现）

当前版本无需认证，二期规划中将添加：
- API Key
- JWT Token
- Rate Limiting

---

## 🧪 测试

### Wallet Service

```bash
cd backend/services/wallet-service

# 测试 Balance API
curl http://localhost:3001/balance/0xYourAddress

# 测试 Token API
curl http://localhost:3001/token
```

### Trading Service

```bash
cd backend/services/trading-service

# 运行 Swap 测试脚本
./test-swap.sh

# 运行 Liquidity 测试脚本
./test-liquidity-full.sh
```

---

## 📊 API 统计

```
总接口数: 52 个

Wallet Service:  24 个
- Balance:       4 个
- Token:         6 个
- Address:       6 个
- Transaction:   8 个

Trading Service: 28 个
- Pool:          7 个
- Quote:         4 个
- Swap:          6 个
- Liquidity:     6 个
```

---

## 🔗 Swagger 文档

启动服务后访问：

- Wallet Service: http://localhost:3001/api
- Trading Service: http://localhost:3002/api

---

## 🐛 错误码

| 错误码 | 说明 |
|--------|------|
| `INVALID_ADDRESS` | 无效的地址格式 |
| `TOKEN_NOT_FOUND` | 代币不存在 |
| `INSUFFICIENT_BALANCE` | 余额不足 |
| `PAIR_NOT_FOUND` | 交易对不存在 |
| `SLIPPAGE_EXCEEDED` | 滑点超出限制 |
| `TRANSACTION_FAILED` | 交易失败 |

---

## 🔗 相关文档

- [开发指南](../05-development/)
- [部署指南](../06-deployment/)
- [问题排查](../07-troubleshooting/)

---

**下一步**: [开发指南](../05-development/) →

