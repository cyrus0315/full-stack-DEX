# DEX 项目文档索引

> 完整、清晰、易维护的文档导航

欢迎来到 DEX 项目文档中心！本项目基于 **UniswapV2** 架构，实现了一个功能完整的去中心化交易所。

---

## 📚 文档导航

### 🎓 [01-getting-started](./01-getting-started/) - 新手入门

快速上手 DEX 项目：
- [快速开始指南](./01-getting-started/first-steps.md) - 5 分钟快速开始
- 安装指南（待创建）
- 本地开发环境搭建（待创建）

**推荐**: 新用户从这里开始！

---

### 🏗️ [02-architecture](./02-architecture/) - 架构设计

了解系统架构和技术选型：
- [技术栈说明](./02-architecture/tech-stack.md) - 完整技术栈介绍
- [项目结构](./02-architecture/project-structure.md) - 代码组织结构
- [模块总览](./02-architecture/modules-overview.md) - 各模块功能说明

**另见**: 根目录的 [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统架构总览 (853 行)

---

### 📝 [03-smart-contracts](./03-smart-contracts/) - 智能合约

智能合约开发和部署：
- 合约总览（待创建）
- DEXPair 合约详解（待创建）
- DEXFactory 合约详解（待创建）
- DEXRouter 合约详解（待创建）

**相关**: [contracts/](../contracts/) 目录包含所有合约源码

---

### 🔌 [04-backend-api](./04-backend-api/) - 后端 API

完整的 RESTful API 文档：

**Wallet Service** (钱包服务):
- [Balance API](./04-backend-api/wallet-service/balance-api.md) - 余额查询接口
- [Token API](./04-backend-api/wallet-service/token-api.md) - 代币管理接口
- [Address API](./04-backend-api/wallet-service/address-api.md) - 地址管理接口
- [Transaction Scanner](./04-backend-api/wallet-service/transaction-scanner.md) - 区块扫描器 ✅
- [WebSocket Realtime](./04-backend-api/wallet-service/websocket-realtime.md) - 实时推送 ✅
  - [快速开始](./04-backend-api/wallet-service/websocket-setup.md)

**Trading Service** (交易服务):
- Pool API（待提取）
- Quote API（待提取）
- [Swap API](../backend/services/trading-service/src/modules/swap/README.md) - 代币交易接口 (1,285 行)
- [Liquidity API](../backend/services/trading-service/src/modules/liquidity/README.md) - 流动性管理接口 (1,410 行)

**总计**: 52 个 RESTful API 接口

---

### 🛠️ [05-development](./05-development/) - 开发指南

开发者必读：
- [开发规范](./05-development/README.md) - 编码规范和开发流程 (1,057 行)
- Git 工作流（待创建）
- 测试指南（待创建）
- 调试技巧（待创建）

---

### 🚢 [06-deployment](./06-deployment/) - 部署运维

部署到各种环境：
- [部署指南](./06-deployment/README.md) - 完整部署文档 (1,134 行)
- 本地部署（待提取）
- 测试网部署（待提取）
- 主网部署（待提取）

---

### 🔧 [07-troubleshooting](./07-troubleshooting/) - 问题排查

常见问题和解决方案：
- [部署问题](./07-troubleshooting/deployment-issues.md) - 合约部署常见问题
- 合约问题（待创建）
- 后端问题（待创建）

---

### 🗺️ [08-roadmap](./08-roadmap/) - 路线图和规划

项目规划和进度：
- [路线图总览](./08-roadmap/README.md) - 完整路线图
- [一期详细计划](./08-roadmap/phase1-detailed-plan.md) - 一期开发计划
- [一期实现方案](./08-roadmap/phase1-implementation.md) - 实现细节
- [二期规划](./08-roadmap/phase2-planning.md) - 二期功能规划 (1,257 行)
- [执行摘要](./08-roadmap/executive-summary.md) - 项目概览
- [更新路线图](./UPDATED_ROADMAP.md) - 最新开发计划 ✨

**当前状态**: Phase 6 完成，Phase 6.5 开发中（75% 完成）

---

### 🔒 [09-security](./09-security/) - 安全文档

安全最佳实践：
- [安全指南](./09-security/README.md) - 完整安全文档
- 智能合约安全（待提取）
- 后端安全（待提取）
- 审计报告（待添加）

---

### 📚 [10-reference](./10-reference/) - 参考资料

学习资源和参考：
- 术语表（待创建）
- UniswapV2 学习笔记（待创建）
- AMM 原理详解（待创建）
- 外部资源链接（待创建）

---

### 🧪 [11-testing](./11-testing/) - 测试文档 ✅

测试相关文档和报告：
- [端到端测试指南](./11-testing/E2E_TEST_GUIDE.md) - 完整的 E2E 测试流程 (286 行)
- [一期完成报告](./11-testing/PHASE1_COMPLETION_REPORT.md) - 项目一期总结 (543 行)
- [Trading Service 测试报告](./11-testing/trading-service-tests.md)

**测试脚本**: 位于 [`../tests/`](../tests/) 目录
- [端到端测试](../tests/e2e/test-e2e-full.sh) - 完整流程测试 (545 行)
- [Swap 测试](../tests/unit/test-swap.sh) - Swap 模块测试
- [Liquidity 测试](../tests/unit/test-liquidity-full.sh) - Liquidity 模块测试
- [Scanner 测试](../tests/unit/test-scanner.sh) - Block Scanner 测试

---

## 🚀 快速链接

### 根目录重要文档

- [README.md](../README.md) - 项目主页
- [ARCHITECTURE.md](../ARCHITECTURE.md) - 系统架构总览 (853 行)
- [GETTING_STARTED.md](../GETTING_STARTED.md) - 快速开始
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - 常用命令速查
- [THE_GRAPH_EXPLAINED.md](./THE_GRAPH_EXPLAINED.md) - The Graph 新手详解 ✨ (1,417 行)
- [LIMIT_ORDER_EXPLAINED.md](./LIMIT_ORDER_EXPLAINED.md) - 限价单详解 ✨ **新增** (1,200+ 行)

### 代码仓库

- [Smart Contracts](../contracts/) - 智能合约源码
- [Wallet Service](../backend/services/wallet-service/) - 钱包服务
- [Trading Service](../backend/services/trading-service/) - 交易服务

---

## 📊 文档统计

```
文档总数: 40+ 个
总行数: 15,000+ 行
主要章节: 10 个
API 接口: 52 个
```

---

## 🤝 贡献文档

发现文档问题或想要改进？

1. 遵循 [文档编写规范](./DOCUMENTATION_STRUCTURE.md)
2. 保持 Markdown 格式统一
3. 更新相关链接
4. 提交 Pull Request

---

## 📝 文档维护

- **创建日期**: 2025-10-29
- **最后更新**: 2025-11-20
- **维护者**: DEX Team
- **文档结构**: v1.1

### 🆕 最新更新（2025-11-20）

#### Phase 6.5: The Graph 集成
- ✅ [The Graph 新手详解](./THE_GRAPH_EXPLAINED.md) - 从零开始理解 The Graph (1,417 行)
- ✅ [The Graph 集成文档](./phases/phase6.5/THE_GRAPH_INTEGRATION.md) - 完整集成指南 (600+ 行)
- ✅ [Subgraph README](../subgraph/README.md) - Subgraph 使用文档 (345 行)

**完成状态**: 75%（Subgraph + 后端完成，前端待集成）

#### Phase 6: 价格预言机 ✅
- ✅ [合约完成文档](./phases/phase6/CONTRACTS_COMPLETED.md)
- ✅ [后端集成文档](./phases/phase6/BACKEND_INTEGRATION.md)
- ✅ [生产部署指南](./phases/phase6/PRODUCTION_DEPLOYMENT.md)

---

## ❓ 需要帮助？

- 🐛 [报告问题](https://github.com/your-repo/issues)
- 💬 [讨论区](https://github.com/your-repo/discussions)
- 📧 联系我们: dev@dex.io

---

**开始探索**: 建议从 [🎓 新手入门](./01-getting-started/) 开始！

