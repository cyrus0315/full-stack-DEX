# DEX 技术栈详细说明

## 1. 前端技术栈

### 1.1 Web前端

#### 核心框架
```json
{
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0"
}
```

#### 状态管理
- **Redux Toolkit**: 全局状态管理
- **RTK Query**: API数据获取和缓存
- **Zustand**: 轻量级状态管理(可选)

#### Web3集成
- **wagmi**: React Hooks for Ethereum
- **viem**: TypeScript接口，替代ethers.js
- **RainbowKit**: 钱包连接UI组件
- **WalletConnect**: 钱包连接协议

#### UI/UX
```json
{
  "tailwindcss": "^3.4.0",
  "@radix-ui/react": "^1.0.0",
  "shadcn/ui": "latest",
  "framer-motion": "^11.0.0"
}
```

#### 图表和可视化
- **TradingView Lightweight Charts**: K线图
- **Recharts**: 数据图表
- **D3.js**: 自定义可视化

#### 表单和验证
- **React Hook Form**: 表单管理
- **Zod**: TypeScript优先的schema验证

#### 工具库
- **date-fns**: 日期处理
- **numeral**: 数字格式化
- **big.js / bignumber.js**: 大数计算
- **i18next**: 国际化

### 1.2 移动端

#### 框架
```json
{
  "react-native": "^0.73.0",
  "@react-navigation/native": "^6.1.0",
  "react-native-reanimated": "^3.6.0"
}
```

#### Web3
- **WalletConnect**: 移动钱包连接
- **@web3-react/core**: React集成
- **ethers.js**: 以太坊交互

### 1.3 管理后台

```json
{
  "next.js": "^14.0.0",
  "typescript": "^5.3.0",
  "@tanstack/react-table": "^8.11.0",
  "recharts": "^2.10.0"
}
```

## 2. 后端技术栈

### 2.1 统一使用Node.js/TypeScript ✅

**决策说明**: 
- 全栈采用Node.js/TypeScript统一技术栈
- 开发效率高，团队协作好
- 性能完全满足需求（MVP到成熟期）
- 详见 [NODEJS_VS_GO_ANALYSIS.md](./NODEJS_VS_GO_ANALYSIS.md) 和 [NODEJS_FULLSTACK.md](./NODEJS_FULLSTACK.md)

#### Node.js环境
```json
{
  "node": ">=20.0.0",
  "typescript": "^5.3.0",
  "pnpm": ">=8.0.0"
}
```

#### 核心框架
- **NestJS**: 企业级框架，用于所有微服务
- **Fastify**: 可选的高性能HTTP服务器
- **Express**: 备选轻量级方案

**NestJS核心依赖**:
```json
{
  "@nestjs/core": "^10.3.0",
  "@nestjs/common": "^10.3.0",
  "@nestjs/config": "^3.1.1",
  "@nestjs/typeorm": "^10.0.1",
  "@nestjs/microservices": "^10.3.0",
  "@nestjs/websockets": "^10.3.0",
  "@nestjs/jwt": "^10.2.0",
  "@nestjs/passport": "^10.0.3",
  "@nestjs/swagger": "^7.1.17",
  "@nestjs/bull": "^10.0.1"
}
```

#### 性能优化依赖
```json
{
  "piscina": "^4.1.0",                // Worker线程池
  "fastpriorityqueue": "^0.7.1",      // 高性能优先队列
  "@node-rs/crc32": "^1.6.0",         // Rust加速的工具
  "bull": "^4.11.5"                   // 任务队列
}
```

### 2.2 数据库

#### PostgreSQL (主数据库)
```
版本: PostgreSQL 15+
扩展:
  - TimescaleDB: 时序数据
  - PostGIS: 地理位置(如需要)
  - pg_cron: 定时任务
```

#### Redis (缓存和实时数据)
```
版本: Redis 7+
模式: 
  - 单机: 开发环境
  - 集群: 生产环境
  - Sentinel: 高可用
```

#### MongoDB (可选)
```
版本: MongoDB 7+
用途: 日志、文档存储
```

#### InfluxDB (时序数据)
```
版本: InfluxDB 2.x
用途: 交易数据、价格历史
```

### 2.3 消息队列

#### Apache Kafka
```
版本: Kafka 3.5+
用途: 
  - 事件流处理
  - 日志聚合
  - 实时数据管道
```

#### RabbitMQ
```
版本: RabbitMQ 3.12+
用途:
  - 任务队列
  - 异步处理
  - 服务解耦
```

#### Redis Pub/Sub
```
用途: 实时通知、WebSocket推送
```

### 2.4 API和通信

#### REST API
- **框架**: NestJS内置
- **文档**: Swagger/OpenAPI 3.0 (自动生成)
- **版本控制**: URI版本控制 (v1, v2)

#### GraphQL (可选)
```json
{
  "@nestjs/graphql": "^12.0.0",
  "@apollo/server": "^4.10.0",
  "graphql": "^16.8.0"
}
```

#### WebSocket
```json
{
  "@nestjs/websockets": "^10.3.0",
  "@nestjs/platform-socket.io": "^10.3.0",
  "socket.io": "^4.6.0"
}
```

#### gRPC (微服务间通信)
```json
{
  "@nestjs/microservices": "^10.3.0",
  "@grpc/grpc-js": "^1.9.0",
  "@grpc/proto-loader": "^0.7.10"
}
```

## 3. 区块链技术栈

### 3.1 智能合约

#### Solidity
```
版本: ^0.8.20
特性: 
  - 自定义错误
  - 事件索引
  - ABI编码器v2
```

#### 开发框架
```json
{
  "hardhat": "^2.19.0",
  "@nomicfoundation/hardhat-toolbox": "^4.0.0",
  "@openzeppelin/contracts": "^5.0.0",
  "@openzeppelin/contracts-upgradeable": "^5.0.0"
}
```

或

```
foundry:
  - forge: 编译和测试
  - cast: 区块链交互
  - anvil: 本地测试网
```

#### 测试工具
```json
{
  "chai": "^4.3.10",
  "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
  "ethers": "^6.9.0"
}
```

#### 安全工具
- **Slither**: 静态分析
- **Mythril**: 安全审计
- **Echidna**: 模糊测试
- **Manticore**: 符号执行

### 3.2 区块链交互

#### Node.js (所有后端服务)
```json
{
  "viem": "^2.0.0",          // 推荐：现代、高性能
  "ethers": "^6.9.0",        // 备选：成熟稳定
  "@wagmi/core": "^2.0.0",   // 多链支持
  "@alchemy/sdk": "^3.0.0"   // Alchemy集成
}
```

#### Python (可选：数据分析服务)
```python
web3.py==6.11.0        # 如需Python分析服务
brownie-eth==1.20.0    # 测试工具
```

### 3.3 区块链节点

#### 自建节点
- **Geth**: Go Ethereum客户端
- **Erigon**: 高效以太坊节点
- **Nethermind**: .NET客户端

#### 节点服务提供商
- **Alchemy**: 企业级RPC服务
- **Infura**: RPC和IPFS
- **QuickNode**: 多链支持
- **Ankr**: 去中心化RPC

### 3.4 预言机
- **Chainlink**: 价格预言机
- **Band Protocol**: 替代方案
- **Pyth Network**: 高频价格源

## 4. DevOps技术栈

### 4.1 容器化

#### Docker
```yaml
版本: Docker 24+
用途: 容器化部署
```

#### Kubernetes
```yaml
版本: K8s 1.28+
组件:
  - kubectl: 命令行工具
  - Helm: 包管理
  - Kustomize: 配置管理
```

### 4.2 CI/CD

#### GitHub Actions
```yaml
工作流:
  - 代码检查
  - 单元测试
  - 合约测试
  - 构建部署
```

#### GitLab CI
```yaml
stages:
  - test
  - build
  - deploy
```

#### Jenkins (可选)
- 企业级CI/CD
- 自托管

### 4.3 基础设施即代码

#### Terraform
```hcl
version: >= 1.6.0
providers:
  - AWS
  - GCP
  - Azure
```

#### Pulumi (可选)
- TypeScript/Python编写基础设施

### 4.4 配置管理

#### Ansible
```yaml
版本: Ansible 2.15+
用途: 服务器配置、部署
```

### 4.5 监控和日志

#### 监控栈
```yaml
Prometheus:
  版本: 2.48+
  用途: 指标收集

Grafana:
  版本: 10.2+
  用途: 可视化

Node Exporter:
  用途: 系统指标

Blackbox Exporter:
  用途: 黑盒监控
```

#### 日志栈
```yaml
Elasticsearch:
  版本: 8.11+
  
Logstash:
  版本: 8.11+
  
Kibana:
  版本: 8.11+
  
Filebeat:
  用途: 日志收集
```

#### APM
- **Datadog**: 全栈监控
- **New Relic**: 应用性能
- **Sentry**: 错误追踪

### 4.6 云服务

#### AWS服务
```
计算: EC2, ECS, EKS, Lambda
存储: S3, EBS, EFS
数据库: RDS, ElastiCache, DynamoDB
网络: VPC, CloudFront, Route53
安全: KMS, WAF, Shield
```

#### GCP服务
```
计算: Compute Engine, GKE, Cloud Run
存储: Cloud Storage, Persistent Disk
数据库: Cloud SQL, Memorystore
网络: Cloud CDN, Cloud Load Balancing
```

## 5. 安全技术栈

### 5.1 密钥管理
- **AWS KMS**: 云端密钥管理
- **HashiCorp Vault**: 企业密钥管理
- **HSM**: 硬件安全模块

### 5.2 安全工具
- **CertiK**: 智能合约审计
- **Immunefi**: Bug Bounty平台
- **Certora**: 形式化验证
- **OWASP ZAP**: Web安全扫描

### 5.3 DDoS防护
- **Cloudflare**: CDN和DDoS防护
- **AWS Shield**: DDoS防护
- **Akamai**: 企业级防护

## 6. 测试技术栈

### 6.1 单元测试
```json
{
  "jest": "^29.7.0",
  "@testing-library/react": "^14.1.0",
  "vitest": "^1.0.0"
}
```

### 6.2 E2E测试
```json
{
  "playwright": "^1.40.0",
  "cypress": "^13.6.0"
}
```

### 6.3 负载测试
- **k6**: 现代负载测试
- **Apache JMeter**: 传统工具
- **Locust**: Python负载测试

### 6.4 合约测试
- **Hardhat**: 单元测试
- **Foundry**: 快速测试
- **Echidna**: 模糊测试

## 7. 开发工具

### 7.1 代码质量
```json
{
  "eslint": "^8.55.0",
  "prettier": "^3.1.0",
  "husky": "^8.0.0",
  "lint-staged": "^15.2.0",
  "commitlint": "^18.4.0"
}
```

### 7.2 类型检查
- **TypeScript**: 静态类型
- **Zod**: 运行时验证

### 7.3 文档
- **TypeDoc**: TypeScript文档
- **Swagger**: API文档
- **Docusaurus**: 项目文档网站

### 7.4 版本控制
- **Git**: 源代码管理
- **GitHub/GitLab**: 代码托管
- **Conventional Commits**: 提交规范

## 8. 推荐技术栈组合

### 8.1 MVP阶段 (0-6个月) ✅ 当前推荐
```
前端: React + TypeScript + Vite + viem
后端: NestJS (全Node.js) + PostgreSQL + Redis
合约: Hardhat + Solidity + OpenZeppelin
部署: Docker + Docker Compose
监控: 基础监控
```

**优势**:
- ✅ 统一技术栈，开发效率最高
- ✅ 学习成本低
- ✅ 性能完全满足需求
- ✅ 快速迭代

### 8.2 成长阶段 (6-12个月)
```
前端: React + TypeScript + Next.js + wagmi
后端: NestJS微服务 (Cluster模式 + Worker Threads)
数据库: PostgreSQL + Redis Cluster + TimescaleDB
消息: Bull + Kafka
合约: Hardhat + Foundry + Solidity
部署: Kubernetes + AWS EKS
监控: Prometheus + Grafana + 基础日志
```

**优化**:
- ✅ Cluster多进程模式
- ✅ Worker Threads处理CPU密集任务
- ✅ Redis集群
- ✅ 数据库优化

### 8.3 成熟阶段 (12个月+)
```
前端: React + TypeScript + Next.js + Micro-frontend
后端: NestJS微服务 (高度优化)
     可选：交易引擎考虑Go重写
数据库: PostgreSQL + Redis Cluster + MongoDB + InfluxDB
消息: Kafka + RabbitMQ
合约: Foundry + 多重审计
部署: Kubernetes + Multi-cloud
监控: Prometheus + Grafana + ELK Stack + Sentry
安全: WAF + DDoS + 定期审计 + Bug Bounty
```

**说明**:
- 大部分服务保持Node.js
- 只在确认瓶颈后才考虑局部重写
- 优先优化Node.js性能

## 9. 开发环境要求

### 9.1 最低配置
```
CPU: 4核
RAM: 16GB
存储: 500GB SSD
网络: 稳定网络连接
```

### 9.2 推荐配置
```
CPU: 8核+
RAM: 32GB+
存储: 1TB SSD
GPU: 可选(机器学习需求)
```

### 9.3 软件要求
```
OS: macOS / Linux (Ubuntu 22.04+)
Node.js: 20+
Go: 1.21+
Docker: 24+
Git: 2.40+
```

