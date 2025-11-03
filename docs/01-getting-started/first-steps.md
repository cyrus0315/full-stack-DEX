# 🚀 立即开始编码指南

## 📋 快速总览

这是一个**9周MVP开发计划**，按模块优先级划分。

```
Week 1-2: 智能合约 (Solidity)           ⚡ 最高优先级
Week 3:   后端基础架构 (NestJS)         ⚡ 高优先级
Week 4:   核心后端服务 (NestJS + viem)  ⚡ 高优先级
Week 5-6: 前端开发 (React)              ⚡ 中优先级
Week 7-8: 集成测试 + 优化                ⚡ 中优先级
Week 9:   测试网部署                     ⚡ 必须
```

---

## 🎯 开发顺序（为什么这样安排？）

### 1️⃣ 先做智能合约
**原因**: 
- 合约是整个系统的核心
- 后端和前端都依赖合约接口
- 合约部署后很难修改，必须先做好

### 2️⃣ 再做后端服务
**原因**:
- 需要监听合约事件
- 为前端提供API
- 处理业务逻辑

### 3️⃣ 最后做前端
**原因**:
- 前端只是展示层
- 依赖后端API和合约
- 可以快速迭代

---

## 📅 详细时间表

### Week 1: 智能合约核心（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1 | 项目初始化 + 接口定义 | 4-6h | 接口文件 |
| 2-3 | DEXPair合约 | 10-12h | Pair合约 + 测试 |
| 4 | DEXFactory合约 | 4-6h | Factory合约 + 测试 |
| 5 | DEXRouter合约 | 6-8h | Router合约 + 测试 |

**本周目标**: 完成核心AMM合约，测试覆盖率>95%

**验证方法**:
```bash
cd contracts
npx hardhat compile  # 无错误
npx hardhat test     # 全部通过
npx hardhat coverage # 覆盖率>95%
```

### Week 2: 合约完善 + 部署（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1 | 测试代币 + Mock合约 | 3-4h | 测试合约 |
| 2 | 本地部署脚本 | 4-6h | 部署脚本 |
| 3 | Sepolia部署 | 4-6h | 测试网合约 |
| 4-5 | 集成测试 + 文档 | 8-10h | 测试 + 文档 |

**本周目标**: 合约部署到Sepolia，验证通过

**验证方法**:
```bash
# 本地部署
npx hardhat node  # 终端1
npx hardhat run scripts/deploy-local.ts --network localhost

# Sepolia部署
npx hardhat run scripts/deploy-sepolia.ts --network sepolia
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Week 3: 后端基础（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1 | Monorepo + 共享库 | 6-8h | 项目结构 |
| 2 | User Service基础 | 6-8h | 认证服务 |
| 3 | 数据库设计 | 4-6h | Schema + 迁移 |
| 4-5 | 配置 + 日志 | 6-8h | 配置系统 |

**本周目标**: 后端架构搭建完成，User Service运行

**验证方法**:
```bash
cd backend
docker-compose up -d  # 启动数据库

cd services/user-service
pnpm start:dev  # 服务启动成功

# 测试API
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234..."}'
```

### Week 4: 核心后端服务（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1-2 | Wallet Service | 10-12h | 钱包服务 |
| 3-4 | Blockchain Listener | 10-12h | 事件监听 |
| 5 | Trading Service基础 | 6-8h | 交易服务 |

**本周目标**: 三个核心服务运行，可以监听合约事件

**验证方法**:
```bash
# Wallet Service
curl http://localhost:3001/balance/0x1234...

# Blockchain Listener
# 查看日志，应该能看到事件监听

# Trading Service
curl http://localhost:3002/orderbook/TKA-TKB
```

### Week 5: 前端基础（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1 | 项目初始化 | 4h | Vite项目 |
| 2-3 | 钱包连接 | 8-10h | 连接功能 |
| 4-5 | 基础组件库 | 8-10h | UI组件 |

**本周目标**: 可以连接MetaMask，查看余额

**验证方法**:
```bash
cd frontend/web-app
pnpm dev

# 访问 http://localhost:5173
# 点击"连接钱包"按钮
# MetaMask弹出
# 连接成功，显示地址和余额
```

### Week 6: 交易功能（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1-2 | 交换界面 | 8-10h | Swap组件 |
| 3-4 | 流动性界面 | 8-10h | Liquidity组件 |
| 5 | 集成测试 | 6h | E2E测试 |

**本周目标**: 完整的交易流程可用

**验证方法**:
1. 连接MetaMask
2. 选择代币对
3. 输入金额
4. 执行交换
5. MetaMask弹出
6. 确认交易
7. 等待确认
8. 余额更新

### Week 7: 集成测试（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1-2 | 端到端测试 | 10-12h | E2E测试套件 |
| 3-4 | 性能测试 | 8-10h | 性能报告 |
| 5 | Bug修复 | 6-8h | Bug列表 |

**本周目标**: 所有E2E测试通过

### Week 8: 优化（推荐但可选）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1-2 | 性能优化 | 10h | 优化报告 |
| 3-4 | 用户体验优化 | 10h | UX改进 |
| 5 | 安全检查 | 6h | 安全清单 |

**本周目标**: 性能提升，用户体验改善

### Week 9: 部署（必做✅）

| Day | 任务 | 时间 | 输出 |
|-----|------|------|------|
| 1-2 | 后端部署 | 10h | 服务器运行 |
| 3 | 前端部署 | 4h | 网站上线 |
| 4-5 | 测试 + 修复 | 10h | 稳定版本 |

**本周目标**: 测试网完整可用

---

## 🏃 立即开始：今天就做这些

### Step 1: 环境准备（30分钟）

```bash
# 1. 检查版本
node --version    # >= 20.0.0
pnpm --version    # >= 8.0.0
docker --version

# 2. 启动数据库
cd /Users/h15/Desktop/dex/backend
docker-compose up -d

# 3. 检查服务
docker-compose ps  # 所有服务应该running
```

### Step 2: 创建第一个合约（2-3小时）

```bash
cd /Users/h15/Desktop/dex/contracts

# 1. 初始化项目
pnpm init
pnpm add --save-dev hardhat @nomicfoundation/hardhat-toolbox
pnpm add @openzeppelin/contracts

# 2. 初始化Hardhat
npx hardhat init
# 选择: Create a TypeScript project

# 3. 创建接口文件
mkdir -p contracts/interfaces

# 4. 复制接口代码
# 从 DETAILED_CODING_PLAN.md 复制 IDEXFactory.sol

# 5. 编译
npx hardhat compile
```

### Step 3: 提交代码（10分钟）

```bash
git add .
git commit -m "feat: initialize contracts project and add core interfaces"
git push
```

---

## 📊 进度追踪

创建一个简单的追踪表格：

| Week | 模块 | 状态 | 完成日期 |
|------|------|------|---------|
| 1 | 智能合约核心 | ⬜ 待开始 | |
| 2 | 合约部署 | ⬜ 待开始 | |
| 3 | 后端基础 | ⬜ 待开始 | |
| 4 | 核心服务 | ⬜ 待开始 | |
| 5 | 前端基础 | ⬜ 待开始 | |
| 6 | 交易功能 | ⬜ 待开始 | |
| 7 | 集成测试 | ⬜ 待开始 | |
| 8 | 优化 | ⬜ 可选 | |
| 9 | 部署 | ⬜ 待开始 | |

状态图例: ⬜ 待开始 | 🟡 进行中 | ✅ 已完成

---

## 🆘 遇到问题？

### 常见问题

**Q1: 合约编译失败？**
- 检查Solidity版本（应该是0.8.20）
- 检查OpenZeppelin版本
- 查看错误信息，通常很明确

**Q2: 数据库连接失败？**
- 检查Docker服务是否运行
- 检查端口是否被占用
- 检查环境变量配置

**Q3: 前端钱包连接失败？**
- 检查MetaMask是否安装
- 检查网络是否正确（Localhost或Sepolia）
- 检查合约地址是否正确

### 获取帮助

1. **查看详细文档**:
   - [DETAILED_CODING_PLAN.md](DETAILED_CODING_PLAN.md) - 详细实现
   - [NODEJS_FULLSTACK.md](docs/NODEJS_FULLSTACK.md) - 代码示例

2. **搜索错误信息**:
   - Google搜索错误
   - 查看Hardhat/NestJS文档
   - Stack Overflow

3. **调试技巧**:
   - 使用console.log
   - 使用Hardhat console
   - 使用Chrome DevTools

---

## ✅ 每日检查清单

### 开始编码前
- [ ] 拉取最新代码
- [ ] 启动必要的服务（数据库等）
- [ ] 查看今日任务

### 编码过程中
- [ ] 每完成一个功能就提交
- [ ] 编写必要的测试
- [ ] 保持代码整洁

### 结束编码后
- [ ] 运行所有测试
- [ ] 更新进度表
- [ ] 推送代码
- [ ] 记录明日计划

---

## 🎯 核心原则

1. **先跑通，再优化** - 先让功能work，再考虑性能
2. **持续测试** - 每完成一个模块就测试
3. **及时提交** - 小步提交，便于回滚
4. **文档同步** - 代码和文档一起更新
5. **寻求帮助** - 遇到问题别死磕，查资料或问人

---

## 🚀 现在就开始！

**第一步**: 打开终端，执行：

```bash
cd /Users/h15/Desktop/dex
cd contracts
pnpm init
```

**第二步**: 开始 Week 1 Day 1 的任务！

**加油！你可以的！** 💪

---

## 📚 相关文档

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - 总体实施计划
- [DETAILED_CODING_PLAN.md](DETAILED_CODING_PLAN.md) - 详细周计划
- [NODEJS_FULLSTACK.md](docs/NODEJS_FULLSTACK.md) - Node.js实现方案
- [GETTING_STARTED.md](GETTING_STARTED.md) - 快速入门

**祝编码愉快！** 🎉

