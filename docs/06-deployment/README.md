# DEX 部署指南

## 1. 部署架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户访问层                           │
│  Web浏览器 / 移动App / API客户端                         │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│                     CDN + WAF                            │
│  CloudFlare / AWS CloudFront + Shield                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│                   负载均衡层                              │
│  AWS ALB / Nginx / HAProxy                              │
└──────┬──────────────────────────────────────────────────┘
       │
┌──────┴─────────────────────────────────────┐
│            Kubernetes集群                   │
│  ┌─────────────────────────────────────┐  │
│  │  Frontend Pods (React App)          │  │
│  ├─────────────────────────────────────┤  │
│  │  API Gateway Pods                   │  │
│  ├─────────────────────────────────────┤  │
│  │  Backend Service Pods               │  │
│  │  - User Service                     │  │
│  │  - Trading Service                  │  │
│  │  - Market Data Service              │  │
│  │  - Wallet Service                   │  │
│  │  - Liquidity Service                │  │
│  └─────────────────────────────────────┘  │
└─────────────┬──────────────────────────────┘
              │
┌─────────────┴──────────────────────────────┐
│            数据层                            │
│  ┌──────────────┬───────────────────────┐  │
│  │ PostgreSQL   │ Redis Cluster         │  │
│  │ (Primary +   │ (缓存 + 会话)         │  │
│  │  Replicas)   │                       │  │
│  ├──────────────┼───────────────────────┤  │
│  │ TimescaleDB  │ MongoDB               │  │
│  │ (时序数据)    │ (日志)                │  │
│  └──────────────┴───────────────────────┘  │
└────────────────────────────────────────────┘
```

### 1.2 区块链节点架构

```
┌─────────────────────────────────────────┐
│        RPC负载均衡                       │
│    (多个RPC Provider)                   │
├─────────────────────────────────────────┤
│  自建节点    │  Alchemy  │  Infura     │
│  (主要)      │  (备用)   │  (备用)     │
└─────────────────────────────────────────┘
```

---

## 2. 环境准备

### 2.1 开发环境

#### 2.1.1 本地开发环境设置

**系统要求**:
```bash
OS: macOS / Linux (Ubuntu 22.04+)
CPU: 4核+
RAM: 16GB+
存储: 500GB SSD
```

**安装依赖**:

```bash
# Node.js (使用nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# pnpm (推荐)
npm install -g pnpm

# Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Foundry (Solidity开发)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Kubernetes工具
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### 2.1.2 本地开发环境启动

```bash
# 克隆仓库
git clone https://github.com/your-org/dex.git
cd dex

# 安装依赖
pnpm install

# 启动本地区块链
cd contracts
npx hardhat node

# 部署合约到本地网络
npx hardhat run scripts/deploy.ts --network localhost

# 启动后端服务（使用Docker Compose）
cd ../backend
docker-compose up -d

# 启动前端
cd ../frontend/web-app
pnpm dev
```

**docker-compose.yml示例**:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: dex_dev
      POSTGRES_USER: dex_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: dex_logs

  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092

  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

volumes:
  postgres_data:
```

### 2.2 测试环境

#### 2.2.1 测试网部署

**支持的测试网**:
- Ethereum: Sepolia
- Polygon: Mumbai
- BSC: BSC Testnet

**配置文件** (`hardhat.config.ts`):
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 11155111
    },
    mumbai: {
      url: process.env.MUMBAI_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 80001
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY!,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY!
    }
  }
};

export default config;
```

**部署脚本** (`scripts/deploy.ts`):
```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying DEX contracts...");

  // 部署Factory
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const factory = await DEXFactory.deploy(ethers.ZeroAddress);
  await factory.waitForDeployment();
  console.log("DEXFactory deployed to:", await factory.getAddress());

  // 部署Router
  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  const router = await DEXRouter.deploy(
    await factory.getAddress(),
    ethers.ZeroAddress // WETH address
  );
  await router.waitForDeployment();
  console.log("DEXRouter deployed to:", await router.getAddress());

  // 验证合约
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("Waiting for block confirmations...");
    await factory.deploymentTransaction()?.wait(6);
    
    await hre.run("verify:verify", {
      address: await factory.getAddress(),
      constructorArguments: [ethers.ZeroAddress],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**部署命令**:
```bash
# 部署到Sepolia测试网
npx hardhat run scripts/deploy.ts --network sepolia

# 验证合约
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "constructor_arg1"
```

### 2.3 生产环境

#### 2.3.1 云平台选择

**AWS架构**:
```
Region: us-east-1 (主区域)
Availability Zones: 3个AZ (高可用)

计算:
- EKS (Kubernetes)
- EC2 (区块链节点)

存储:
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis (Cluster模式)
- S3 (静态资源)

网络:
- VPC (隔离网络)
- ALB (负载均衡)
- CloudFront (CDN)
- Route 53 (DNS)

安全:
- WAF (Web应用防火墙)
- Shield (DDoS防护)
- KMS (密钥管理)
- Secrets Manager (密钥存储)
```

---

## 3. 智能合约部署

### 3.1 部署前检查

```bash
# 1. 编译合约
forge build
# 或
npx hardhat compile

# 2. 运行测试
forge test
# 或
npx hardhat test

# 3. 测试覆盖率
forge coverage

# 4. Gas报告
forge test --gas-report

# 5. 静态分析
slither .

# 6. 安全审计
# 聘请专业审计公司（CertiK, ConsenSys Diligence等）
```

### 3.2 部署流程

#### 3.2.1 部署到主网

```typescript
// scripts/mainnet-deploy.ts
import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", await ethers.provider.getBalance(deployer.address));

  // 部署参数
  const feeToSetter = process.env.FEE_TO_SETTER!;
  const wethAddress = process.env.WETH_ADDRESS!;

  // 1. 部署Factory
  const Factory = await ethers.getContractFactory("DEXFactory");
  const factory = await Factory.deploy(feeToSetter);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ Factory deployed:", factoryAddress);

  // 2. 部署Router
  const Router = await ethers.getContractFactory("DEXRouter");
  const router = await Router.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ Router deployed:", routerAddress);

  // 3. 部署Multicall
  const Multicall = await ethers.getContractFactory("Multicall");
  const multicall = await Multicall.deploy();
  await multicall.waitForDeployment();
  const multicallAddress = await multicall.getAddress();
  console.log("✅ Multicall deployed:", multicallAddress);

  // 4. 保存部署信息
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DEXFactory: {
        address: factoryAddress,
        args: [feeToSetter]
      },
      DEXRouter: {
        address: routerAddress,
        args: [factoryAddress, wethAddress]
      },
      Multicall: {
        address: multicallAddress,
        args: []
      }
    }
  };

  fs.writeFileSync(
    `deployments/${(await ethers.provider.getNetwork()).chainId}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📝 Deployment info saved");
  console.log("\n⏳ Waiting for block confirmations...");
  await factory.deploymentTransaction()?.wait(6);

  // 5. 验证合约
  console.log("\n🔍 Verifying contracts...");
  await verify(factoryAddress, [feeToSetter]);
  await verify(routerAddress, [factoryAddress, wethAddress]);
  await verify(multicallAddress, []);

  console.log("\n✅ All contracts deployed and verified!");
}

async function verify(address: string, args: any[]) {
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("Already verified:", address);
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**部署命令**:
```bash
# 设置环境变量
export PRIVATE_KEY="your_private_key"
export ETHERSCAN_API_KEY="your_api_key"
export FEE_TO_SETTER="0x..."
export WETH_ADDRESS="0x..."

# 部署到主网
npx hardhat run scripts/mainnet-deploy.ts --network mainnet
```

### 3.3 合约升级策略

使用透明代理模式（OpenZeppelin）:

```solidity
// contracts/proxy/DEXProxy.sol
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract DEXProxy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, admin_, _data) {}
}
```

**升级流程**:
```typescript
// scripts/upgrade.ts
async function upgrade() {
  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdmin.attach(PROXY_ADMIN_ADDRESS);

  const NewImplementation = await ethers.getContractFactory("DEXRouterV2");
  const newImpl = await NewImplementation.deploy();
  await newImpl.waitForDeployment();

  // 升级
  await proxyAdmin.upgrade(PROXY_ADDRESS, await newImpl.getAddress());
  console.log("Contract upgraded");
}
```

---

## 4. 后端服务部署

### 4.1 Docker镜像构建

#### 4.1.1 Node.js服务Dockerfile

```dockerfile
# backend/services/user-service/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建
RUN pnpm build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 运行
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

#### 4.1.2 Go服务Dockerfile

```dockerfile
# backend/services/trading-service/Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

# 复制go mod文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# 生产镜像
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/configs ./configs

EXPOSE 8080

CMD ["./main"]
```

### 4.2 Kubernetes部署

#### 4.2.1 Deployment配置

```yaml
# k8s/deployments/user-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: dex
  labels:
    app: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: your-registry/user-service:v1.0.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secrets
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: redis-config
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: dex
spec:
  selector:
    app: user-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

#### 4.2.2 ConfigMap和Secret

```yaml
# k8s/configmaps/app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: dex
data:
  REDIS_URL: "redis://redis-service:6379"
  KAFKA_BROKERS: "kafka-0:9092,kafka-1:9092,kafka-2:9092"
  LOG_LEVEL: "info"
---
# k8s/secrets/database-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-secrets
  namespace: dex
type: Opaque
stringData:
  url: "postgresql://user:password@postgres:5432/dex"
  username: "dex_user"
  password: "secure_password"
```

#### 4.2.3 Ingress配置

```yaml
# k8s/ingress/dex-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dex-ingress
  namespace: dex
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.dex.com
    secretName: dex-tls
  rules:
  - host: api.dex.com
    http:
      paths:
      - path: /api/v1/users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
      - path: /api/v1/trading
        pathType: Prefix
        backend:
          service:
            name: trading-service
            port:
              number: 80
```

### 4.3 数据库部署

#### 4.3.1 PostgreSQL (使用Helm)

```bash
# 添加Bitnami仓库
helm repo add bitnami https://charts.bitnami.com/bitnami

# 安装PostgreSQL
helm install postgresql bitnami/postgresql \
  --namespace dex \
  --set auth.username=dex_user \
  --set auth.password=secure_password \
  --set auth.database=dex \
  --set primary.persistence.size=100Gi \
  --set readReplicas.replicaCount=2
```

#### 4.3.2 Redis Cluster

```bash
# 安装Redis集群
helm install redis bitnami/redis-cluster \
  --namespace dex \
  --set cluster.nodes=6 \
  --set cluster.replicas=1 \
  --set persistence.size=50Gi
```

---

## 5. 前端部署

### 5.1 构建优化

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'web3-vendor': ['ethers', 'viem', 'wagmi'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### 5.2 静态资源部署

#### 5.2.1 AWS S3 + CloudFront

```bash
# 构建
cd frontend/web-app
pnpm build

# 上传到S3
aws s3 sync dist/ s3://dex-frontend-prod --delete

# 清除CloudFront缓存
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

#### 5.2.2 Nginx配置

```nginx
# nginx.conf
server {
    listen 80;
    server_name dex.com www.dex.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dex.com www.dex.com;

    ssl_certificate /etc/ssl/certs/dex.com.crt;
    ssl_certificate_key /etc/ssl/private/dex.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/dex/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;

    # SPA路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:;" always;
}
```

---

## 6. CI/CD流程

### 6.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
      
      - name: Run linter
        run: pnpm lint

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: ./backend/services/user-service
          push: true
          tags: ghcr.io/${{ github.repository }}/user-service:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name dex-prod-cluster --region us-east-1
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/user-service \
            user-service=ghcr.io/${{ github.repository }}/user-service:${{ github.sha }} \
            -n dex
          kubectl rollout status deployment/user-service -n dex
```

---

## 7. 监控和日志

### 7.1 Prometheus + Grafana

```yaml
# k8s/monitoring/prometheus-values.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
    
    serviceMonitorSelector:
      matchLabels:
        app: dex

grafana:
  adminPassword: "secure_password"
  persistence:
    enabled: true
    size: 10Gi
  
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'default'
        folder: 'DEX'
        type: file
        options:
          path: /var/lib/grafana/dashboards
```

### 7.2 ELK Stack

```yaml
# k8s/logging/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: dex-elasticsearch
  namespace: logging
spec:
  version: 8.11.0
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
```

---

## 8. 备份和灾难恢复

### 8.1 数据库备份

```bash
# PostgreSQL备份脚本
#!/bin/bash

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE="dex"

# 创建备份
pg_dump -h $DB_HOST -U $DB_USER -d $DATABASE \
  | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# 上传到S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz \
  s3://dex-backups/postgres/

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### 8.2 恢复流程

```bash
# 从备份恢复
gunzip < backup_20240101_120000.sql.gz \
  | psql -h $DB_HOST -U $DB_USER -d $DATABASE
```

---

## 9. 安全加固

### 9.1 网络安全

```yaml
# k8s/network-policies/dex-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dex-network-policy
  namespace: dex
spec:
  podSelector:
    matchLabels:
      app: user-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
```

### 9.2 密钥管理

使用AWS Secrets Manager:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getSecret(secretName: string): Promise<string> {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  
  const command = new GetSecretValueCommand({
    SecretId: secretName,
  });
  
  const response = await client.send(command);
  return response.SecretString!;
}
```

---

## 10. 运维检查清单

### 10.1 部署前检查

- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 安全审计通过
- [ ] 性能测试完成
- [ ] 备份已完成
- [ ] 回滚计划准备
- [ ] 监控配置完成
- [ ] 文档已更新

### 10.2 部署后验证

- [ ] 健康检查通过
- [ ] 核心功能测试
- [ ] 监控数据正常
- [ ] 日志无异常
- [ ] 性能指标正常
- [ ] 通知团队

### 10.3 紧急回滚

```bash
# Kubernetes回滚
kubectl rollout undo deployment/user-service -n dex

# 查看回滚历史
kubectl rollout history deployment/user-service -n dex
```

这个部署指南涵盖了DEX项目从开发到生产的完整部署流程。根据实际情况，你可能需要调整某些配置和流程。

