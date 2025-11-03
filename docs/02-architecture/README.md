# 🏗️ 架构设计

本目录包含 DEX 项目的完整架构设计文档。

---

## 📚 文档列表

### 系统架构

详见根目录的 [ARCHITECTURE.md](../../ARCHITECTURE.md) - 系统架构总览 (853 行)

包含：
- 项目整体架构
- 完成度分析
- 模块功能说明
- 数据库设计
- API 统计
- 遗漏功能分析

---

### [技术栈说明](./tech-stack.md)

完整的技术栈介绍：
- 智能合约：Solidity 0.8.20, Hardhat
- 后端框架：NestJS, TypeScript
- 数据库：PostgreSQL, Redis
- 区块链客户端：viem
- 开发工具：pnpm, TypeChain

---

### [项目结构](./project-structure.md)

代码组织结构：
```
dex/
├── contracts/          # 智能合约
├── backend/
│   └── services/
│       ├── wallet-service/    # 钱包服务
│       └── trading-service/   # 交易服务
└── docs/              # 文档
```

---

### [模块总览](./modules-overview.md)

各模块功能说明：

**智能合约层**:
- DEXPair - AMM 核心
- DEXFactory - 交易对工厂
- DEXRouter - 用户交易入口

**Wallet Service**:
- Balance Module - 余额管理
- Token Module - 代币管理
- Address Module - 地址管理
- Transaction Module - 交易监控

**Trading Service**:
- Pool Module - 流动性池管理
- Quote Module - 报价计算
- Swap Module - 代币交易
- Liquidity Module - 流动性管理

---

## 🎯 核心概念

### UniswapV2 AMM 机制

```
恒定乘积公式: x × y = k

where:
  x = Token A 储备量
  y = Token B 储备量
  k = 常数

手续费: 0.3%
```

### 流动性管理

- 添加流动性 → 获得 LP Token
- 移除流动性 → 赎回代币
- MINIMUM_LIQUIDITY 锁定机制

### 价格预言机

- TWAP (时间加权平均价格)
- UQ112x112 固定点数运算
- 抗操纵设计

---

## 📊 系统指标

```
智能合约: 5 个核心合约
后端服务: 2 个微服务
API 接口: 52 个
数据库表: 8 张
总代码量: ~15,000 行
```

---

## 🔗 相关文档

- [智能合约详解](../03-smart-contracts/)
- [后端 API 文档](../04-backend-api/)
- [部署指南](../06-deployment/)

---

**下一步**: [智能合约详解](../03-smart-contracts/) →

