# DEX 项目目录结构

## 完整项目结构

```
dex/
├── README.md                           # 项目说明
├── LICENSE                             # 开源协议
├── .gitignore                          # Git忽略文件
├── .env.example                        # 环境变量示例
├── package.json                        # 根目录包管理（Monorepo）
├── pnpm-workspace.yaml                 # pnpm workspace配置
├── turbo.json                          # Turborepo配置（可选）
│
├── docs/                               # 📚 项目文档
│   ├── ARCHITECTURE.md                 # 架构设计
│   ├── TECH_STACK.md                   # 技术栈说明
│   ├── MODULES.md                      # 模块划分
│   ├── DEVELOPMENT_GUIDELINES.md       # 开发规范
│   ├── DEPLOYMENT.md                   # 部署指南
│   ├── PROJECT_ROADMAP.md              # 项目路线图
│   ├── SECURITY.md                     # 安全文档
│   ├── API_REFERENCE.md                # API文档
│   └── USER_GUIDE.md                   # 用户指南
│
├── contracts/                          # 🔐 智能合约
│   ├── hardhat.config.ts              # Hardhat配置
│   ├── foundry.toml                   # Foundry配置（可选）
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   ├── contracts/                     # 合约源代码
│   │   ├── core/                      # 核心合约
│   │   │   ├── DEXFactory.sol
│   │   │   ├── DEXPair.sol
│   │   │   └── interfaces/
│   │   │       ├── IDEXFactory.sol
│   │   │       └── IDEXPair.sol
│   │   │
│   │   ├── periphery/                 # 外围合约
│   │   │   ├── DEXRouter.sol
│   │   │   ├── Multicall.sol
│   │   │   └── interfaces/
│   │   │       └── IDEXRouter.sol
│   │   │
│   │   ├── governance/                # 治理合约
│   │   │   ├── GovernanceToken.sol
│   │   │   ├── DEXGovernor.sol
│   │   │   └── Timelock.sol
│   │   │
│   │   ├── farming/                   # 流动性挖矿
│   │   │   ├── LiquidityMining.sol
│   │   │   └── RewardDistributor.sol
│   │   │
│   │   ├── security/                  # 安全合约
│   │   │   ├── MultiSig.sol
│   │   │   ├── EmergencyStop.sol
│   │   │   └── Insurance.sol
│   │   │
│   │   ├── advanced/                  # 高级功能
│   │   │   ├── LimitOrder.sol
│   │   │   ├── Aggregator.sol
│   │   │   └── SingleSidedLiquidity.sol
│   │   │
│   │   └── libraries/                 # 库合约
│   │       ├── SafeMath.sol
│   │       ├── DEXLibrary.sol
│   │       └── TransferHelper.sol
│   │
│   ├── scripts/                       # 部署脚本
│   │   ├── deploy.ts
│   │   ├── deploy-testnet.ts
│   │   ├── deploy-mainnet.ts
│   │   ├── upgrade.ts
│   │   └── verify.ts
│   │
│   ├── test/                          # 测试文件
│   │   ├── core/
│   │   │   ├── DEXFactory.test.ts
│   │   │   └── DEXPair.test.ts
│   │   ├── periphery/
│   │   │   └── DEXRouter.test.ts
│   │   ├── governance/
│   │   └── utils/
│   │       └── fixtures.ts
│   │
│   ├── deployments/                   # 部署信息
│   │   ├── localhost/
│   │   ├── sepolia/
│   │   └── mainnet/
│   │
│   └── artifacts/                     # 编译产物（gitignore）
│
├── backend/                           # 🔧 后端服务
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   │
│   ├── api-gateway/                   # API网关
│   │   ├── kong.yml                   # Kong配置
│   │   ├── nginx.conf                 # Nginx配置（备选）
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── rate-limit.ts
│   │       └── logging.ts
│   │
│   ├── services/                      # 微服务
│   │   │
│   │   ├── user-service/              # 用户服务
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   ├── tsconfig.json
│   │   │   ├── nest-cli.json
│   │   │   ├── src/
│   │   │   │   ├── main.ts
│   │   │   │   ├── app.module.ts
│   │   │   │   ├── auth/              # 认证模块
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   └── guards/
│   │   │   │   ├── user/              # 用户管理
│   │   │   │   │   ├── user.controller.ts
│   │   │   │   │   ├── user.service.ts
│   │   │   │   │   ├── user.entity.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── kyc/               # KYC模块
│   │   │   │   │   ├── kyc.controller.ts
│   │   │   │   │   ├── kyc.service.ts
│   │   │   │   │   └── providers/
│   │   │   │   ├── rbac/              # 权限管理
│   │   │   │   ├── database/          # 数据库
│   │   │   │   │   ├── migrations/
│   │   │   │   │   └── seeds/
│   │   │   │   └── common/            # 公共模块
│   │   │   └── test/
│   │   │
│   │   ├── trading-service/           # 交易服务（Go）
│   │   │   ├── Dockerfile
│   │   │   ├── go.mod
│   │   │   ├── go.sum
│   │   │   ├── cmd/
│   │   │   │   └── server/
│   │   │   │       └── main.go
│   │   │   ├── internal/
│   │   │   │   ├── orderbook/         # 订单簿
│   │   │   │   │   ├── orderbook.go
│   │   │   │   │   ├── order.go
│   │   │   │   │   └── orderbook_test.go
│   │   │   │   ├── matching/          # 匹配引擎
│   │   │   │   │   ├── engine.go
│   │   │   │   │   └── matcher.go
│   │   │   │   ├── execution/         # 交易执行
│   │   │   │   ├── mev/               # MEV保护
│   │   │   │   ├── api/               # API handlers
│   │   │   │   └── repository/
│   │   │   ├── pkg/
│   │   │   │   └── types/
│   │   │   ├── configs/
│   │   │   │   └── config.yaml
│   │   │   └── test/
│   │   │
│   │   ├── market-data-service/       # 行情服务
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   ├── src/
│   │   │   │   ├── main.ts
│   │   │   │   ├── price/             # 价格模块
│   │   │   │   │   ├── price.gateway.ts
│   │   │   │   │   └── price.service.ts
│   │   │   │   ├── kline/             # K线模块
│   │   │   │   ├── depth/             # 深度模块
│   │   │   │   └── trades/            # 交易历史
│   │   │   └── test/
│   │   │
│   │   ├── wallet-service/            # 钱包服务（Go）
│   │   │   ├── Dockerfile
│   │   │   ├── go.mod
│   │   │   ├── cmd/
│   │   │   └── internal/
│   │   │       ├── address/           # 地址管理
│   │   │       ├── balance/           # 余额管理
│   │   │       ├── monitor/           # 交易监控
│   │   │       └── keys/              # 密钥管理
│   │   │
│   │   ├── liquidity-service/         # 流动性服务
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   └── src/
│   │   │       ├── pool/              # 池子管理
│   │   │       ├── lp-token/          # LP代币
│   │   │       └── farming/           # 挖矿
│   │   │
│   │   ├── blockchain-listener/       # 区块链监听（Go）
│   │   │   ├── Dockerfile
│   │   │   ├── go.mod
│   │   │   └── internal/
│   │   │       ├── listener/          # 事件监听
│   │   │       ├── handler/           # 事件处理
│   │   │       └── sync/              # 数据同步
│   │   │
│   │   ├── notification-service/      # 通知服务
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   └── src/
│   │   │       ├── email/
│   │   │       ├── sms/
│   │   │       ├── push/
│   │   │       └── inbox/
│   │   │
│   │   └── analytics-service/         # 分析服务（Python）
│   │       ├── Dockerfile
│   │       ├── requirements.txt
│   │       └── src/
│   │           ├── trading/
│   │           ├── user/
│   │           └── risk/
│   │
│   ├── shared/                        # 共享库
│   │   ├── types/                     # 类型定义
│   │   ├── utils/                     # 工具函数
│   │   ├── constants/                 # 常量
│   │   └── config/                    # 配置
│   │
│   └── docker-compose.yml             # 本地开发环境
│
├── frontend/                          # 🎨 前端应用
│   │
│   ├── web-app/                       # Web应用
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── .env.example
│   │   │
│   │   ├── public/                    # 静态资源
│   │   │   ├── favicon.ico
│   │   │   ├── logo.svg
│   │   │   └── images/
│   │   │
│   │   ├── src/
│   │   │   ├── main.tsx               # 入口文件
│   │   │   ├── App.tsx
│   │   │   │
│   │   │   ├── features/              # 功能模块
│   │   │   │   ├── trading/           # 交易模块
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── SwapWidget/
│   │   │   │   │   │   ├── OrderForm/
│   │   │   │   │   │   ├── TradingChart/
│   │   │   │   │   │   └── OrderBook/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── useSwap.ts
│   │   │   │   │   │   └── useOrderBook.ts
│   │   │   │   │   └── api/
│   │   │   │   │       └── trading.api.ts
│   │   │   │   │
│   │   │   │   ├── liquidity/         # 流动性模块
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── AddLiquidity/
│   │   │   │   │   │   ├── RemoveLiquidity/
│   │   │   │   │   │   └── PoolList/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   └── api/
│   │   │   │   │
│   │   │   │   ├── farming/           # 挖矿模块
│   │   │   │   ├── wallet/            # 钱包模块
│   │   │   │   ├── governance/        # 治理模块
│   │   │   │   └── user/              # 用户模块
│   │   │   │
│   │   │   ├── components/            # 通用组件
│   │   │   │   ├── ui/                # UI组件
│   │   │   │   │   ├── Button/
│   │   │   │   │   ├── Input/
│   │   │   │   │   ├── Modal/
│   │   │   │   │   └── ...
│   │   │   │   ├── Layout/
│   │   │   │   └── TokenSelector/
│   │   │   │
│   │   │   ├── hooks/                 # 通用Hooks
│   │   │   │   ├── useWallet.ts
│   │   │   │   ├── useBalance.ts
│   │   │   │   └── useContract.ts
│   │   │   │
│   │   │   ├── store/                 # 状态管理
│   │   │   │   ├── index.ts
│   │   │   │   ├── slices/
│   │   │   │   │   ├── wallet.slice.ts
│   │   │   │   │   ├── trading.slice.ts
│   │   │   │   │   └── ui.slice.ts
│   │   │   │   └── api.ts             # RTK Query
│   │   │   │
│   │   │   ├── contracts/             # 合约ABIs和地址
│   │   │   │   ├── abis/
│   │   │   │   ├── addresses.ts
│   │   │   │   └── types.ts
│   │   │   │
│   │   │   ├── utils/                 # 工具函数
│   │   │   │   ├── format.ts
│   │   │   │   ├── validation.ts
│   │   │   │   └── web3.ts
│   │   │   │
│   │   │   ├── styles/                # 样式
│   │   │   │   ├── globals.css
│   │   │   │   └── theme.ts
│   │   │   │
│   │   │   ├── types/                 # 类型定义
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── config/                # 配置
│   │   │       ├── chains.ts
│   │   │       └── constants.ts
│   │   │
│   │   └── test/                      # 测试
│   │       ├── unit/
│   │       ├── integration/
│   │       └── e2e/
│   │
│   ├── mobile-app/                    # 移动应用
│   │   ├── package.json
│   │   ├── app.json
│   │   ├── metro.config.js
│   │   ├── babel.config.js
│   │   ├── tsconfig.json
│   │   │
│   │   ├── ios/                       # iOS项目
│   │   ├── android/                   # Android项目
│   │   │
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── screens/
│   │       ├── components/
│   │       ├── navigation/
│   │       └── hooks/
│   │
│   └── admin-dashboard/               # 管理后台
│       ├── package.json
│       ├── next.config.js
│       ├── tsconfig.json
│       │
│       └── src/
│           ├── app/                   # Next.js 14 App Router
│           │   ├── layout.tsx
│           │   ├── page.tsx
│           │   ├── dashboard/
│           │   ├── users/
│           │   ├── trades/
│           │   └── settings/
│           ├── components/
│           └── lib/
│
├── infrastructure/                    # 🏗️ 基础设施
│   │
│   ├── docker/                        # Docker配置
│   │   ├── Dockerfile.node
│   │   ├── Dockerfile.go
│   │   ├── Dockerfile.python
│   │   └── docker-compose.*.yml
│   │
│   ├── kubernetes/                    # K8s配置
│   │   ├── namespaces/
│   │   ├── deployments/
│   │   │   ├── user-service.yaml
│   │   │   ├── trading-service.yaml
│   │   │   └── ...
│   │   ├── services/
│   │   ├── configmaps/
│   │   ├── secrets/
│   │   ├── ingress/
│   │   ├── network-policies/
│   │   └── helm/                      # Helm charts
│   │       └── dex/
│   │           ├── Chart.yaml
│   │           ├── values.yaml
│   │           └── templates/
│   │
│   ├── terraform/                     # IaC
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── aws/
│   │   │   ├── vpc.tf
│   │   │   ├── eks.tf
│   │   │   ├── rds.tf
│   │   │   └── s3.tf
│   │   └── modules/
│   │
│   ├── monitoring/                    # 监控配置
│   │   ├── prometheus/
│   │   │   ├── prometheus.yml
│   │   │   └── alerts.yml
│   │   ├── grafana/
│   │   │   └── dashboards/
│   │   └── elk/
│   │       ├── elasticsearch.yml
│   │       ├── logstash.conf
│   │       └── kibana.yml
│   │
│   └── database/                      # 数据库
│       ├── migrations/
│       ├── seeds/
│       └── backups/
│
├── scripts/                           # 🔨 脚本工具
│   ├── setup-dev.sh                   # 开发环境设置
│   ├── build-all.sh                   # 构建所有服务
│   ├── deploy.sh                      # 部署脚本
│   ├── backup-db.sh                   # 数据库备份
│   └── migration/                     # 数据迁移脚本
│
├── .github/                           # GitHub配置
│   ├── workflows/                     # GitHub Actions
│   │   ├── test.yml
│   │   ├── build.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
│
├── .vscode/                           # VSCode配置
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
│
└── config/                            # 配置文件
    ├── development.yaml
    ├── staging.yaml
    └── production.yaml
```

## 关键文件说明

### 根目录配置文件

#### `pnpm-workspace.yaml`
```yaml
packages:
  - 'contracts'
  - 'backend/**'
  - 'frontend/**'
```

#### `turbo.json` (可选，用于Monorepo优化)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false
    }
  }
}
```

#### `.gitignore`
```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.log

# Production
dist/
build/
.next/
out/

# Misc
.DS_Store
*.pem
.env
.env.local
.env.production

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# Contracts
artifacts/
cache/
typechain-types/

# Database
*.db
*.sqlite

# Secrets
secrets/
*.key
*.pem
```

## 快速开始命令

```bash
# 克隆仓库
git clone https://github.com/your-org/dex.git
cd dex

# 安装依赖（使用pnpm）
pnpm install

# 启动本地区块链
cd contracts
npx hardhat node

# 部署合约（新终端）
npx hardhat run scripts/deploy.ts --network localhost

# 启动后端服务（新终端）
cd backend
docker-compose up -d

# 启动前端（新终端）
cd frontend/web-app
pnpm dev

# 运行所有测试
pnpm test

# 构建所有服务
pnpm build
```

这个结构提供了一个完整、模块化、可扩展的DEX项目基础。

