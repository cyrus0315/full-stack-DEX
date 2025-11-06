# Phase 6 - 后端集成文档

## 概述

Phase 6 Day 2 完成了价格预言机的后端集成，提供了完整的价格查询和 USD 价值计算功能。

## 架构设计

### 1. PriceService（价格服务）

**职责：**
- 从链上 PriceOracle 合约读取价格
- 缓存价格数据（数据库 + 内存）
- 定时刷新价格（每 30 秒）
- 提供价格查询 API
- 计算 USD 价值

**核心方法：**
```typescript
// 获取单个代币价格
getTokenPrice(tokenAddress: string): Promise<TokenPriceDto>

// 批量获取价格
getTokenPrices(tokenAddresses: string[]): Promise<TokenPriceDto[]>

// 获取所有价格
getAllPrices(): Promise<AllPricesResponseDto>

// 计算代币 USD 价值
calculateUsdValue(tokenAddress: string, amount: string): Promise<string>

// 计算 LP Token USD 价值
calculateLpTokenUsdValue(
  lpTokenAddress: string,
  amount: string,
  reserve0: string,
  reserve1: string,
  totalSupply: string,
  token0Address: string,
  token1Address: string,
): Promise<string>

// 定时任务：刷新所有价格
@Cron(CronExpression.EVERY_30_SECONDS)
refreshAllPrices(): Promise<void>
```

### 2. PriceController（价格 API）

**端点：**
- `GET /api/v1/price` - 获取所有代币价格
- `GET /api/v1/price/:tokenAddress` - 获取单个代币价格
- `GET /api/v1/price/:tokenAddress/value/:amount` - 计算 USD 价值
- `POST /api/v1/price/refresh` - 手动刷新价格
- `POST /api/v1/price/track` - 添加代币到价格追踪
- `DELETE /api/v1/price/cache` - 清除缓存

### 3. PoolUsdService（池子 USD 服务）

**职责：**
- 为流动性池添加 USD 价格信息
- 计算总 TVL (USD)

**核心方法：**
```typescript
// 为单个池子添加 USD 价格
enrichPoolWithUsdPrices(poolDto: PoolInfoDto): Promise<PoolInfoDto>

// 批量为池子添加 USD 价格
enrichPoolsWithUsdPrices(pools: PoolInfoDto[]): Promise<PoolInfoDto[]>

// 计算总 TVL
calculateTotalTvl(): Promise<string>
```

### 4. FarmingService 集成

**更新：**
- 注入 PriceService
- 使用实际 USD 价格计算 TVL
- 使用实际价格获取 DEX 代币价格
- 计算用户质押的实际 USD 价值

## 数据库

### TokenPrice 表

```sql
CREATE TABLE token_prices (
  token_address VARCHAR(42) PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  price_usd DECIMAL(36, 18) DEFAULT '0',
  price_feed_address VARCHAR(42),
  last_update_block BIGINT,
  last_update_time TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  decimals INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 缓存策略

### 两层缓存：

1. **数据库缓存**
   - 持久化存储
   - 每 30 秒更新一次
   - 防止链上查询过多

2. **内存缓存**
   - Map<tokenAddress, TokenPriceDto>
   - 快速访问
   - 每次数据库更新后同步

## 集成清单

### ✅ 已完成

- [x] 创建 PriceService 和 PriceController
- [x] 创建 TokenPrice Entity 和 DTO
- [x] 实现定时刷新任务（30秒）
- [x] 实现两层缓存（DB + Memory）
- [x] 创建 PoolUsdService
- [x] 更新 PoolController 使用 USD 价格
- [x] 更新 FarmingService 使用实际价格
- [x] 集成到 AppModule
- [x] 创建初始化脚本
- [x] 环境变量配置示例

### ⏳ 待完成（Day 3）

- [ ] 前端 usePriceOracle Hook
- [ ] 所有页面显示 USD 价格
- [ ] 货币切换功能（USD/Token）

## 使用方法

### 1. 配置环境变量

在 `backend/services/analytics-service/.env` 中添加：

```bash
# Price Oracle
PRICE_ORACLE_ADDRESS=<部署后的地址>

# Token Addresses
WETH_ADDRESS=0x...
USDT_ADDRESS=0x...
DAI_ADDRESS=0x...
USDC_ADDRESS=0x...
DEX_TOKEN_ADDRESS=0x...
```

### 2. 初始化价格追踪

```bash
cd backend/services/analytics-service
pnpm run init:prices
```

### 3. 启动服务

```bash
pnpm run start:dev
```

服务启动后会自动：
- 连接到 PriceOracle 合约
- 每 30 秒刷新价格
- 提供价格查询 API

## API 示例

### 获取所有价格

```bash
GET http://localhost:3001/api/v1/price

Response:
{
  "prices": [
    {
      "tokenAddress": "0x...",
      "symbol": "WETH",
      "priceUsd": "2000.00",
      "lastUpdateTime": "2024-01-01T00:00:00Z",
      "isActive": true
    },
    ...
  ],
  "lastRefreshTime": "2024-01-01T00:00:00Z",
  "totalTokens": 5
}
```

### 获取单个代币价格

```bash
GET http://localhost:3001/api/v1/price/0x...

Response:
{
  "tokenAddress": "0x...",
  "symbol": "DAI",
  "priceUsd": "1.00",
  "lastUpdateTime": "2024-01-01T00:00:00Z",
  "isActive": true
}
```

### 计算 USD 价值

```bash
GET http://localhost:3001/api/v1/price/0x.../value/1000

Response:
{
  "usdValue": "1000.00"
}
```

### 获取池子信息（含 USD）

```bash
GET http://localhost:3001/api/v1/pools/1

Response:
{
  "id": 1,
  "pairAddress": "0x...",
  "token0Symbol": "WETH",
  "token1Symbol": "USDT",
  "reserve0": "100",
  "reserve1": "200000",
  "liquidityUsd": "400000.00",  // 新增 USD 价值
  "token0PriceUsd": "2000.00",  // 新增
  "token1PriceUsd": "1.00",     // 新增
  ...
}
```

## 性能优化

1. **内存缓存**：避免频繁查询数据库
2. **批量查询**：使用 getPrices() 批量获取
3. **定时刷新**：30 秒周期，避免实时链上查询
4. **错误处理**：价格查询失败返回默认值，不影响主流程

## 注意事项

1. **循环依赖**：使用 `forwardRef()` 解决模块间循环依赖
2. **价格精度**：使用 DECIMAL(36, 18) 存储，避免精度丢失
3. **默认值**：价格查询失败时返回 "0"，确保系统稳定
4. **合约地址**：必须先部署 PriceOracle 合约并配置环境变量

## 下一步

进入 **Phase 6 Day 3**：
- 创建前端 usePriceOracle Hook
- 所有页面集成 USD 价格显示
- 实现货币切换功能

