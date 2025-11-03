# DEX 前端使用指南

## 🎉 **项目已完成！**

前端核心功能已全部实现，可以开始使用了。

---

## ✅ **已完成的功能**

### 1. 💰 **钱包连接** ✅
- [x] MetaMask 钱包连接
- [x] 账户地址显示
- [x] ETH 余额查询
- [x] 网络切换（Hardhat 本地网络）
- [x] 断开连接
- [x] 地址复制

### 2. 🔄 **Swap 交易** ✅
- [x] 代币选择（支持 USDT, DAI, WETH）
- [x] 金额输入验证
- [x] 实时价格查询（500ms 防抖）
- [x] 交易执行
- [x] 滑点保护（0.5%）
- [x] 价格影响显示
- [x] 兑换率计算
- [x] 代币互换按钮

### 3. 💧 **流动性管理** ✅
- [x] 添加流动性表单
- [x] 双代币输入
- [x] LP 代币预估
- [x] 池子份额计算
- [x] 移除流动性占位（UI 已完成）

### 4. 🏊 **流动性池** ✅
- [x] 交易对列表展示
- [x] 储备量显示
- [x] 价格信息
- [x] 统计信息
- [x] 刷新功能

### 5. 💼 **资产管理** ✅
- [x] 总资产概览
- [x] ETH 余额
- [x] 代币余额列表
- [x] 交易历史
- [x] 交易状态显示
- [x] 时间戳格式化

### 6. 🎨 **UI/UX** ✅
- [x] 暗色主题
- [x] 玻璃拟态设计
- [x] 响应式布局（桌面端）
- [x] 平滑动画效果
- [x] Loading 状态
- [x] 错误提示
- [x] 成功反馈

---

## 📦 **待完成功能**

### Phase 2 功能
- [ ] WebSocket 实时更新（行情推送）
- [ ] 移动端适配（响应式设计优化）
- [ ] 移除流动性功能实现
- [ ] 前端端到端测试
- [ ] 价格图表（TradingView）
- [ ] 多语言支持

---

## 🚀 **快速开始**

### 前置条件

1. **启动后端服务**

```bash
# Terminal 1: Hardhat 本地节点
cd contracts
npx hardhat node

# Terminal 2: Wallet Service
cd backend/services/wallet-service
pnpm run start:dev

# Terminal 3: Trading Service
cd backend/services/trading-service
pnpm run start:dev
```

2. **部署合约（如果还没部署）**

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/deploy-test-tokens.ts --network localhost
```

### 启动前端

```bash
cd frontend/web-app
pnpm dev
```

访问：**http://localhost:3000**

---

## 🎯 **使用流程**

### 1. 连接钱包

1. 点击右上角 "Connect Wallet" 按钮
2. MetaMask 会弹出连接请求
3. 选择账户并确认
4. 连接成功后，按钮会显示你的地址

### 2. 切换到 Hardhat 网络

如果你看到红色的按钮，说明不在 Hardhat 网络：

1. 点击钱包地址按钮
2. 选择 "切换到 Hardhat"
3. MetaMask 会自动添加并切换网络

### 3. 执行 Swap 交易

1. 进入 **Swap** 页面
2. 选择输入代币（如 USDT）
3. 输入金额（如 100）
4. 选择输出代币（如 DAI）
5. 系统自动计算输出金额
6. 查看兑换率和价格影响
7. 点击 "交换" 按钮
8. MetaMask 确认交易
9. 等待交易完成

### 4. 添加流动性

1. 进入 **Liquidity** 页面
2. 选择 **添加流动性** 标签
3. 选择代币 A（如 USDT）
4. 输入数量（如 1000）
5. 选择代币 B（如 DAI）
6. 输入数量（如 1000）
7. 查看 LP 代币和池子份额
8. 点击 "添加流动性"
9. 确认交易

### 5. 查看交易对

1. 进入 **Pool** 页面
2. 查看所有流动性池
3. 查看储备量和价格
4. 点击 "刷新" 更新数据

### 6. 查看资产

1. 进入 **Portfolio** 页面
2. 查看总资产价值
3. 查看各代币余额
4. 查看交易历史
5. 点击 "刷新" 更新数据

---

## 🔧 **配置说明**

### 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# API URLs
VITE_WALLET_SERVICE_URL=http://localhost:3001/api/v1
VITE_TRADING_SERVICE_URL=http://localhost:3002/api/v1

# Blockchain
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545

# Contract Addresses（部署后从 contracts/.env.deployed 复制）
VITE_FACTORY_ADDRESS=0x...
VITE_ROUTER_ADDRESS=0x...
VITE_USDT_ADDRESS=0x...
VITE_DAI_ADDRESS=0x...
VITE_WETH_ADDRESS=0x...
```

### 更新合约地址

部署合约后，需要更新前端的合约地址：

```bash
# 查看部署的合约地址
cat contracts/.env.deployed

# 复制地址到 frontend/web-app/.env
```

---

## 📂 **项目结构**

```
frontend/web-app/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Layout/         # 页面布局
│   │   ├── ConnectWallet/  # 钱包连接
│   │   └── TokenSelect/    # 代币选择器
│   │
│   ├── pages/              # 页面组件
│   │   ├── Swap/          # Swap 交易页
│   │   ├── Liquidity/     # 流动性管理页
│   │   ├── Pool/          # 交易对列表页
│   │   └── Portfolio/     # 资产管理页
│   │
│   ├── hooks/              # 自定义 Hooks
│   │   └── useWallet.ts   # 钱包 Hook
│   │
│   ├── services/           # API 服务
│   │   └── api.ts         # API 客户端
│   │
│   ├── config/             # 配置文件
│   │   ├── chains.ts      # 链配置
│   │   ├── wagmi.ts       # Wagmi 配置
│   │   ├── contracts.ts   # 合约地址
│   │   ├── api.ts         # API 端点
│   │   └── tokens.ts      # 代币列表
│   │
│   ├── store/              # 状态管理
│   │   └── wallet.ts      # 钱包状态
│   │
│   ├── types/              # TypeScript 类型
│   │   └── index.ts       # 全局类型
│   │
│   ├── utils/              # 工具函数
│   │   └── format.ts      # 格式化工具
│   │
│   ├── App.tsx            # 根组件
│   └── main.tsx           # 入口文件
│
├── package.json           # 依赖配置
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TS 配置
└── README.md             # 项目文档
```

---

## 🎨 **技术栈**

### 核心框架
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具（超快！）

### UI 组件
- **Ant Design 5** - UI 组件库（暗色主题）
- **Ant Design Icons** - 图标库

### 区块链交互
- **wagmi 2.x** - React Hooks for Ethereum
- **viem 2.x** - 轻量级以太坊库

### 状态管理
- **Zustand** - 全局状态管理（简单易用）
- **React Query** - 服务端状态管理

### 网络请求
- **Axios** - HTTP 客户端
- **Socket.IO Client** - WebSocket（待集成）

---

## 🐛 **常见问题**

### Q1: MetaMask 没有弹出连接请求？
**A**: 检查浏览器是否安装了 MetaMask 插件，刷新页面重试。

### Q2: 交易一直 pending？
**A**: 检查 Hardhat 节点是否正常运行，查看控制台错误信息。

### Q3: 代币余额显示为 0？
**A**: 确保账户有足够的测试代币，可以运行 `deploy-test-tokens.ts` 脚本。

### Q4: 报价查询失败？
**A**: 检查后端服务是否运行，确保交易对已创建并添加了流动性。

### Q5: 无法切换到 Hardhat 网络？
**A**: 手动在 MetaMask 中添加网络：
- 网络名称：Hardhat Local
- RPC URL：http://127.0.0.1:8545
- 链 ID：31337
- 货币符号：ETH

### Q6: 前端无法连接后端？
**A**: 检查 Vite 代理配置和后端服务端口，确保：
- Wallet Service 运行在 3001 端口
- Trading Service 运行在 3002 端口

---

## 📊 **性能优化**

### 已实现的优化
- ✅ 防抖处理（价格查询 500ms）
- ✅ 懒加载（代码分割）
- ✅ Memo 优化（防止不必要的重渲染）
- ✅ 虚拟滚动准备（列表数据）

### 待优化
- [ ] 图片懒加载
- [ ] Service Worker（PWA）
- [ ] Bundle 分析和优化

---

## 🎯 **下一步计划**

### 短期（1-2天）
1. 实现 WebSocket 实时更新
2. 完善移动端适配
3. 添加前端测试

### 中期（3-7天）
1. 实现移除流动性
2. 添加价格图表
3. 优化用户体验

### 长期（1-2周）
1. 多语言支持
2. 主题切换（亮/暗）
3. 高级功能（限价单等）

---

## 🎉 **总结**

前端核心功能已全部完成！现在你可以：
- ✅ 连接 MetaMask 钱包
- ✅ 执行代币交换
- ✅ 添加流动性
- ✅ 查看交易对信息
- ✅ 管理个人资产
- ✅ 查看交易历史

**开始体验吧！🚀**

---

**开发时间**: 2025-10-29  
**版本**: v1.0.0  
**状态**: ✅ 可用

