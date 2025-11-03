# DEX Wallet Service

钱包服务 - 负责地址管理、余额查询、交易监控和代币信息管理。

## 技术栈

- **框架**: NestJS 10
- **语言**: TypeScript 5
- **数据库**: PostgreSQL + TypeORM
- **缓存**: Redis
- **Web3**: viem 2.x
- **文档**: Swagger/OpenAPI

## 功能模块

### 1. 地址管理 (Address)
- 用户地址记录
- 地址标签管理
- 地址类型识别 (EOA/Contract)

### 2. 余额查询 (Balance)
- ETH 余额查询
- ERC20 代币余额查询
- 批量余额查询
- 余额缓存优化

### 3. 交易监控 (Transaction)
- 交易状态跟踪
- 交易历史记录
- 实时交易通知

### 4. 代币信息 (Token)
- 代币元数据管理
- 支持的代币列表
- 代币价格查询

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 15
- Redis >= 7
- Docker (可选)

### 安装依赖

\`\`\`bash
cd backend/services/wallet-service
pnpm install
\`\`\`

### 配置环境变量

\`\`\`bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
# - DATABASE_* : 数据库配置
# - REDIS_* : Redis 配置
# - BLOCKCHAIN_RPC_URL : 以太坊 RPC 地址 (Alchemy/Infura)
\`\`\`

### 启动数据库（使用 Docker）

\`\`\`bash
# 回到 backend 目录
cd ../../

# 启动 PostgreSQL 和 Redis
docker-compose up -d postgres redis
\`\`\`

### 运行服务

\`\`\`bash
# 开发模式（热重载）
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
\`\`\`

### 访问 API 文档

服务启动后访问：
- Swagger UI: http://localhost:3001/api/docs
- API 端点: http://localhost:3001/api/v1

## 项目结构

\`\`\`
src/
├── modules/              # 业务模块
│   ├── address/         # 地址管理
│   ├── balance/         # 余额查询
│   ├── transaction/     # 交易监控
│   └── token/           # 代币信息
├── providers/           # 基础设施
│   ├── blockchain/      # 区块链交互 (viem)
│   ├── cache/           # Redis 缓存
│   └── events/          # 事件监听
├── common/              # 共享代码
│   ├── config/          # 配置管理
│   ├── decorators/      # 装饰器
│   ├── filters/         # 异常过滤器
│   ├── guards/          # 守卫
│   └── pipes/           # 管道
├── types/               # TypeScript 类型
├── app.module.ts        # 根模块
└── main.ts              # 应用入口
\`\`\`

## API 示例

### 查询 ETH 余额

\`\`\`bash
GET /api/v1/balance/eth/0x1234...
\`\`\`

### 查询代币余额

\`\`\`bash
GET /api/v1/balance/token/0x1234.../0x5678...
\`\`\`

### 批量查询余额

\`\`\`bash
POST /api/v1/balance/batch
Content-Type: application/json

{
  "addresses": ["0x1234...", "0x5678..."],
  "tokens": ["0xUSDT...", "0xUSDC..."]
}
\`\`\`

## 开发

### 运行测试

\`\`\`bash
# 单元测试
pnpm run test

# e2e 测试
pnpm run test:e2e

# 测试覆盖率
pnpm run test:cov
\`\`\`

### 代码检查

\`\`\`bash
# ESLint
pnpm run lint

# Prettier
pnpm run format
\`\`\`

## 性能优化

### 缓存策略

- **余额缓存**: 10 秒 TTL（频繁变化）
- **代币信息缓存**: 1 小时 TTL（基本不变）
- **价格缓存**: 1 分钟 TTL（实时变化）

### 批量查询

使用 viem 的 `multicall` 功能批量查询，减少 RPC 调用次数。

### 事件监听

使用 WebSocket 连接实时监听区块链事件，避免轮询。

## 部署

### Docker 部署

\`\`\`bash
# 构建镜像
docker build -t dex-wallet-service .

# 运行容器
docker run -p 3001:3001 --env-file .env dex-wallet-service
\`\`\`

### Kubernetes 部署

参考 `k8s/` 目录下的配置文件。

## 故障排查

### 连接 PostgreSQL 失败

检查：
- DATABASE_HOST 是否正确
- PostgreSQL 是否启动
- 防火墙设置

### 连接 Redis 失败

检查：
- REDIS_HOST 是否正确
- Redis 是否启动

### RPC 调用失败

检查：
- BLOCKCHAIN_RPC_URL 是否有效
- API Key 是否配置
- 网络连接是否正常

## License

MIT

