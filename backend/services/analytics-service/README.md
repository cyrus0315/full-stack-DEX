# Trading Service

DEX 交易服务 - 处理流动性池管理、价格查询和交易执行

## 功能模块

### 1. Pool Module（流动性池管理）
- ✅ 获取/创建交易对池子
- ✅ 查询池子列表和详情
- ✅ 刷新池子数据（从链上同步）
- ✅ 池子统计信息

### 2. Quote Module（价格查询）
- ✅ 获取交易报价（指定输入金额）
- ✅ 获取交易报价（指定输出金额）
- ✅ 批量价格查询
- ✅ 实时价格信息

### 3. Swap Module（交易执行）
- 🔧 待实现

### 4. Liquidity Module（流动性管理）
- 🔧 待实现

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 并创建 `.env` 文件：

```bash
cp .env.example .env
```

### 3. 配置数据库

确保 PostgreSQL 已运行，并创建数据库：

```sql
CREATE DATABASE dex_trading;
```

### 4. 启动服务

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

## API 文档

启动服务后访问 Swagger 文档：

```
http://localhost:3002/api/docs
```

## 主要 API 端点

### Pool（流动性池）

- `POST /api/v1/pool` - 获取或创建池子
- `GET /api/v1/pool` - 获取池子列表
- `GET /api/v1/pool/stats` - 获取池子统计
- `GET /api/v1/pool/:id` - 获取池子详情
- `POST /api/v1/pool/:id/refresh` - 刷新池子数据
- `GET /api/v1/pool/pair/:token0/:token1` - 根据代币查询池子
- `GET /api/v1/pool/address/:pairAddress` - 根据地址查询池子

### Quote（价格查询）

- `POST /api/v1/quote` - 获取报价（指定输入金额）
- `POST /api/v1/quote/exact-out` - 获取报价（指定输出金额）
- `POST /api/v1/quote/batch` - 批量查询价格
- `GET /api/v1/quote/price/:token0/:token1` - 获取价格信息

## 技术栈

- **框架**: NestJS 10.x
- **语言**: TypeScript 5.x
- **数据库**: PostgreSQL
- **缓存**: Redis
- **区块链**: viem 2.x
- **文档**: Swagger/OpenAPI

## 项目结构

```
src/
├── common/              # 公共模块
│   └── config/          # 配置
├── providers/           # 提供者
│   ├── blockchain/      # 区块链交互
│   └── cache/           # Redis 缓存
├── modules/             # 业务模块
│   ├── pool/            # 流动性池管理
│   ├── quote/           # 价格查询
│   ├── swap/            # 交易执行（待实现）
│   └── liquidity/       # 流动性管理（待实现）
├── app.module.ts        # 主模块
└── main.ts              # 入口文件
```

## 开发指南

### 测试

```bash
# 单元测试
pnpm run test

# e2e 测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov
```

### 构建

```bash
pnpm run build
```

### Lint

```bash
pnpm run lint
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3002 |
| DATABASE_HOST | 数据库主机 | localhost |
| DATABASE_PORT | 数据库端口 | 5432 |
| DATABASE_NAME | 数据库名称 | dex_trading |
| REDIS_HOST | Redis 主机 | localhost |
| REDIS_PORT | Redis 端口 | 6379 |
| BLOCKCHAIN_RPC_URL | 区块链 RPC 地址 | http://127.0.0.1:8545 |
| DEX_FACTORY_ADDRESS | DEX Factory 合约地址 | - |
| DEX_ROUTER_ADDRESS | DEX Router 合约地址 | - |
| WETH_ADDRESS | WETH 合约地址 | - |

## License

MIT

