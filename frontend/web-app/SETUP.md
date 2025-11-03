# 前端项目设置指南

## 🎉 项目已创建成功！

前端项目框架已完成初始化，现在可以开始开发了。

---

## 📦 安装依赖

```bash
cd /Users/h15/Desktop/dex/frontend/web-app
pnpm install
```

---

## 🚀 启动开发服务器

### 1. 确保后端服务运行中

**Hardhat 本地节点**:
```bash
cd /Users/h15/Desktop/dex/contracts
npx hardhat node
```

**Wallet Service**:
```bash
cd /Users/h15/Desktop/dex/backend/services/wallet-service
pnpm run start:dev
```

**Trading Service**:
```bash
cd /Users/h15/Desktop/dex/backend/services/trading-service
pnpm run start:dev
```

### 2. 启动前端

```bash
cd /Users/h15/Desktop/dex/frontend/web-app
pnpm dev
```

应用将在 **http://localhost:3000** 启动

---

## 📁 已创建的文件

### 配置文件
- ✅ `package.json` - 项目配置和依赖
- ✅ `tsconfig.json` - TypeScript 配置
- ✅ `vite.config.ts` - Vite 配置（包含代理设置）
- ✅ `.gitignore` - Git 忽略文件

### 源代码
- ✅ `src/main.tsx` - 应用入口
- ✅ `src/App.tsx` - 根组件
- ✅ `src/components/Layout/` - 布局组件
- ✅ `src/components/ConnectWallet/` - 钱包连接组件
- ✅ `src/pages/Swap/` - Swap 页面
- ✅ `src/pages/Liquidity/` - 流动性页面
- ✅ `src/pages/Pool/` - 交易对列表页面
- ✅ `src/pages/Portfolio/` - 资产页面

### 目录结构
```
src/
├── components/     # 可复用组件
├── pages/         # 页面组件
├── hooks/         # 自定义 Hooks（待创建）
├── services/      # API 服务（待创建）
├── utils/         # 工具函数（待创建）
├── types/         # TypeScript 类型（待创建）
└── config/        # 配置文件（待创建）
```

---

## 🎨 技术栈

- **React 18** + **TypeScript**
- **Vite** - 快速构建工具
- **Ant Design** - UI 组件库
- **React Router v6** - 路由管理
- **viem** + **wagmi** - 区块链交互
- **Zustand** - 状态管理
- **@tanstack/react-query** - 数据获取
- **Socket.IO Client** - WebSocket 实时通信

---

## 🎯 下一步开发计划

### Phase 1: 钱包连接 (Next)
1. 安装 wagmi 和 viem
2. 配置 WagmiConfig
3. 实现 MetaMask 连接
4. 显示钱包地址和余额

### Phase 2: Swap 交易界面
1. 代币选择器
2. 金额输入
3. 价格查询
4. 交易执行
5. 交易确认

### Phase 3: 流动性管理
1. 添加流动性界面
2. 移除流动性界面
3. LP 头寸展示
4. 收益统计

### Phase 4: 完善功能
1. 交易历史
2. 实时价格更新
3. WebSocket 集成
4. 响应式设计

---

## 🔗 API 代理配置

Vite 已配置好代理，可以直接访问后端 API：

```typescript
// 自动代理到 Wallet Service
fetch('/api/v1/balance/eth/:address')

// 自动代理到 Trading Service  
fetch('/trading/pool')
```

---

## 🐛 故障排查

### 依赖安装失败？
```bash
# 清理缓存重试
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 端口被占用？
修改 `vite.config.ts` 中的端口：
```typescript
server: {
  port: 3001, // 改为其他端口
}
```

### 后端 API 连接失败？
检查后端服务是否运行：
```bash
lsof -i :3001  # Wallet Service
lsof -i :3002  # Trading Service
```

---

## 📚 相关文档

- [Vite 文档](https://vitejs.dev/)
- [React 文档](https://react.dev/)
- [Ant Design](https://ant.design/)
- [wagmi 文档](https://wagmi.sh/)
- [viem 文档](https://viem.sh/)

---

## ✅ 准备就绪

项目初始化完成！运行以下命令开始开发：

```bash
pnpm install  # 安装依赖
pnpm dev      # 启动开发服务器
```

**Happy Coding! 🚀**

