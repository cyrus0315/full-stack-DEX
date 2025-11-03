# 🎓 新手入门

欢迎来到 DEX 项目！本指南将帮助你快速上手。

---

## 📋 入门步骤

### 1. 快速开始（5 分钟）

阅读 [快速开始指南](./first-steps.md) 了解基本概念和快速部署。

**另见**: 根目录的 [GETTING_STARTED.md](../../GETTING_STARTED.md)

---

### 2. 安装依赖

**前置要求**:
- Node.js >= 18.0
- pnpm >= 8.0
- PostgreSQL >= 14
- Redis >= 6.0

```bash
# 安装 pnpm
npm install -g pnpm

# 克隆项目
git clone https://github.com/your-repo/dex.git
cd dex

# 安装合约依赖
cd contracts
pnpm install

# 安装后端依赖
cd ../backend/services/wallet-service
pnpm install

cd ../trading-service
pnpm install
```

---

### 3. 本地开发环境

```bash
# 1. 启动 Hardhat 本地节点
cd contracts
npx hardhat node

# 2. 部署合约（新终端）
npx hardhat run scripts/deploy.ts --network localhost

# 3. 启动 PostgreSQL 和 Redis
# 使用本地安装或 Docker

# 4. 启动 Wallet Service（新终端）
cd backend/services/wallet-service
pnpm run start:dev

# 5. 启动 Trading Service（新终端）
cd backend/services/trading-service
pnpm run start:dev
```

---

### 4. 验证安装

```bash
# 检查 Wallet Service
curl http://localhost:3001/health

# 检查 Trading Service
curl http://localhost:3002/health

# 查询代币列表
curl http://localhost:3001/token
```

---

## 📚 进阶学习

完成入门后，继续学习：

1. [架构设计](../02-architecture/) - 了解系统架构
2. [智能合约](../03-smart-contracts/) - 学习合约原理
3. [API 文档](../04-backend-api/) - 使用后端 API
4. [开发指南](../05-development/) - 参与开发

---

## ❓ 遇到问题？

查看 [问题排查](../07-troubleshooting/) 或 [提交 Issue](https://github.com/your-repo/issues)

---

**下一步**: [了解系统架构](../02-architecture/) →

