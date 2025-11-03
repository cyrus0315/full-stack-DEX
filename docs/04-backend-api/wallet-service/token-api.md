# Token Module 使用指南

## 概述

Token Module 提供 ERC20 代币信息的查询、缓存和管理功能。

## 主要功能

1. **代币信息查询**：从链上获取代币的 name, symbol, decimals, totalSupply
2. **多级缓存**：Redis（短期） + PostgreSQL（长期）
3. **批量查询**：支持一次性查询多个代币信息
4. **分页列表**：查询已缓存的代币列表

## API 端点

### 1. 获取单个代币信息

```bash
GET /api/v1/token/:address
```

**示例**：
```bash
curl http://localhost:3001/api/v1/token/0x6B175474E89094C44Da98b954EedeAC495271d0F
```

**响应**：
```json
{
  "address": "0x6b175474e89094c44da98b954eedeac495271d0f",
  "name": "Dai Stablecoin",
  "symbol": "DAI",
  "decimals": 18,
  "totalSupply": "5318429127871854881205891331",
  "logoUrl": null,
  "isVerified": false,
  "description": null,
  "website": null,
  "timestamp": 1234567890
}
```

### 2. 批量获取代币信息

```bash
POST /api/v1/token/batch
Content-Type: application/json
```

**请求体**：
```json
{
  "addresses": [
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  ]
}
```

**示例**：
```bash
curl -X POST http://localhost:3001/api/v1/token/batch \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    ]
  }'
```

**响应**：
```json
[
  {
    "address": "0x6b175474e89094c44da98b954eedeac495271d0f",
    "name": "Dai Stablecoin",
    "symbol": "DAI",
    "decimals": 18,
    "totalSupply": "5318429127871854881205891331",
    "timestamp": 1234567890
  },
  {
    "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "name": "USD Coin",
    "symbol": "USDC",
    "decimals": 6,
    "totalSupply": "42000000000000",
    "timestamp": 1234567890
  }
]
```

### 3. 获取代币列表（分页）

```bash
GET /api/v1/token?page=1&limit=20&search=USD&isVerified=true
```

**查询参数**：
- `page`：页码（默认 1）
- `limit`：每页数量（默认 20，最大 100）
- `search`：搜索关键词（搜索名称或符号）
- `isVerified`：只显示已验证代币（true/false）

**示例**：
```bash
curl "http://localhost:3001/api/v1/token?page=1&limit=10&search=USD"
```

**响应**：
```json
{
  "tokens": [
    {
      "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      "name": "USD Coin",
      "symbol": "USDC",
      "decimals": 6,
      "totalSupply": "42000000000000",
      "isVerified": true,
      "timestamp": 1234567890
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 4. 手动刷新代币信息

```bash
POST /api/v1/token/:address/refresh
```

强制从链上重新获取代币信息，并更新缓存。

**示例**：
```bash
curl -X POST http://localhost:3001/api/v1/token/0x6B175474E89094C44Da98b954EedeAC495271d0F/refresh
```

## 缓存策略

### 三级缓存架构

```
请求 → Redis (1小时) → PostgreSQL (永久) → 区块链
```

1. **Redis 缓存**：
   - TTL: 1 小时
   - 快速响应查询
   - Key 格式：`token:<address>`

2. **PostgreSQL 持久化**：
   - 永久存储代币元数据
   - 支持搜索和分页
   - 存储额外信息（logoUrl, description, website）

3. **区块链查询**：
   - 仅在缓存未命中时查询
   - 并行查询多个属性（name, symbol, decimals, totalSupply）
   - 查询后自动缓存

## 数据模型

### Token 实体

```typescript
{
  id: number;                  // 主键
  address: string;             // 代币合约地址（唯一）
  name: string;                // 代币名称
  symbol: string;              // 代币符号
  decimals: number;            // 代币精度
  totalSupply: string;         // 总供应量
  logoUrl: string;             // Logo URL
  isVerified: boolean;         // 是否已验证
  description: string;         // 代币描述
  website: string;             // 官网地址
  lastUpdateBlock: string;     // 最后更新区块
  createdAt: Date;             // 创建时间
  updatedAt: Date;             // 更新时间
}
```

## 性能优化

1. **并行查询**：
   - 批量查询时使用 `Promise.all` 并行执行
   - 单个代币查询时并行获取 name、symbol、decimals、totalSupply

2. **缓存预热**：
   - 可以通过批量查询常用代币来预热缓存
   - 示例：查询 DEX 上所有交易对的代币

3. **失败容错**：
   - 批量查询时单个失败不影响其他查询
   - 失败的代币会被过滤掉，返回成功的结果

## 错误处理

### 404 Not Found

代币不存在或合约无效：
```json
{
  "statusCode": 404,
  "message": "Token not found or invalid: 0x...",
  "error": "Not Found"
}
```

### 常见问题

1. **查询失败**：
   - 检查代币地址是否正确
   - 检查代币合约是否实现了 ERC20 标准
   - 检查 RPC 节点是否可用

2. **数据不一致**：
   - 使用 `/refresh` 端点手动刷新
   - 检查区块链网络是否正确

## 测试示例

### 使用本地 Hardhat 网络

```bash
# 1. 启动 Hardhat 本地节点
cd /path/to/contracts
pnpm hardhat node

# 2. 部署测试代币（假设地址为 0x5FbDB2315678afecb367f032d93F642f64180aa3）
pnpm hardhat run scripts/deploy-tokens.ts --network localhost

# 3. 查询代币信息
curl http://localhost:3001/api/v1/token/0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## Swagger 文档

启动服务后访问：
```
http://localhost:3001/api
```

可以在 Swagger UI 中测试所有 API 端点。

## 相关模块

- **Balance Module**：使用 Token Module 获取代币信息
- **Blockchain Provider**：提供区块链查询功能
- **Cache Provider**：提供 Redis 缓存功能

