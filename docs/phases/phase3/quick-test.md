# 🧪 Phase 3 快速测试指南

## ⚡ 一键测试

### 1. 启动所有服务

```bash
# 终端 1: Hardhat 节点
cd /Users/h15/Desktop/dex/contracts
npx hardhat node

# 终端 2: 后端服务
cd /Users/h15/Desktop/dex/backend/services/trading-service
pnpm run start:dev

# 终端 3: 前端服务
cd /Users/h15/Desktop/dex/frontend/web-app
pnpm run dev
```

### 2. 部署合约并添加流动性

```bash
# 终端 4: 部署脚本
cd /Users/h15/Desktop/dex/contracts

# 部署合约
npx hardhat run scripts/deploy.ts --network localhost

# Mint 代币
npx hardhat run scripts/mint-tokens.js --network localhost

# 添加流动性
npx hardhat run scripts/add-liquidity.ts --network localhost
```

### 3. 同步池子数据

```bash
cd /Users/h15/Desktop/dex
bash scripts/sync-all-pools.sh
```

### 4. 测试 API

```bash
cd /Users/h15/Desktop/dex/backend/services/trading-service
bash test-phase3-apis.sh
```

---

## 🎯 功能测试清单

### ✅ 后端 API 测试

#### 1. Analytics API

```bash
# 全局概览
curl http://localhost:3002/api/v1/analytics/overview | jq .

# 池子分析（替换 1 为实际池子ID）
curl http://localhost:3002/api/v1/analytics/pool/1 | jq .

# 用户统计（替换为实际地址）
curl "http://localhost:3002/api/v1/analytics/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" | jq .
```

**预期结果：**
- ✅ 返回 200 状态码
- ✅ 数据格式正确
- ✅ 统计数字准确

#### 2. History API

```bash
# Swap 历史
curl "http://localhost:3002/api/v1/history/swaps?limit=5" | jq .

# Liquidity 历史
curl "http://localhost:3002/api/v1/history/liquidity?limit=5" | jq .

# 用户最近活动
curl "http://localhost:3002/api/v1/history/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/recent?limit=10" | jq .

# 池子统计
curl "http://localhost:3002/api/v1/history/pool/1/stats?hours=24" | jq .
```

**预期结果：**
- ✅ 分页数据正确
- ✅ 筛选功能正常
- ✅ 时间排序正确

---

### ✅ 前端功能测试

#### 1. Pool 页面

访问：`http://localhost:3000/pool`

**测试点：**
- [ ] 全局统计卡片显示
  - 总池子数
  - 总 TVL
  - 24h 交易量
  - 24h 交易笔数
- [ ] 池子列表显示正常
- [ ] 点击池子卡片跳转到详情页
- [ ] "详情" 按钮跳转正确
- [ ] WebSocket 连接状态显示（绿点）

#### 2. Pool 详情页

访问：`http://localhost:3000/pool/1`（替换 1 为实际池子ID）

**测试点：**
- [ ] 池子信息显示正确
  - 储备量
  - 当前价格
  - 池子地址
- [ ] PoolAnalyticsCard 显示统计数据
  - 24h 交易笔数
  - 7天交易笔数
  - 流动性操作统计
- [ ] Swap 历史表格
  - 数据加载
  - 分页功能
  - 交易哈希链接
- [ ] Liquidity 历史表格
  - 数据加载
  - 类型显示（添加/移除）
  - 分页功能

#### 3. History 页面

访问：`http://localhost:3000/history`

**测试点：**
- [ ] Tabs 切换正常
  - Swap 历史标签
  - Liquidity 历史标签
- [ ] 表格数据显示
  - 时间格式正确
  - 金额显示正确
  - 交易哈希可点击
- [ ] 分页功能
  - 翻页正常
  - 每页显示数量正确
- [ ] 钱包未连接提示

---

## 🔍 数据验证

### 1. 检查数据库

```sql
-- 连接到 Postgres
psql -U your_username -d dex_db

-- 检查 Swap 历史
SELECT COUNT(*) FROM swap_history;
SELECT * FROM swap_history ORDER BY "createdAt" DESC LIMIT 5;

-- 检查 Liquidity 历史
SELECT COUNT(*) FROM liquidity_history;
SELECT * FROM liquidity_history ORDER BY "createdAt" DESC LIMIT 5;

-- 检查池子数据
SELECT id, "token0Symbol", "token1Symbol", reserve0, reserve1 FROM pool;
```

### 2. 检查 Blockchain Listener

**查看后端日志：**
```bash
# 应该看到类似的日志：
✅ Listening to events from block 123...
🎯 Captured Swap event: pool #1, user: 0xf39...
📝 Swap history recorded: ID 5
🔄 Broadcasting swap event...
```

**验证事件监听：**
1. 在前端执行一笔 Swap
2. 观察后端日志是否捕获事件
3. 检查数据库是否新增记录
4. 前端是否实时更新

---

## 🐛 常见问题排查

### 问题 1: History API 返回空数组

**原因：**数据库中没有历史记录

**解决：**
```bash
# 1. 确认 BlockchainListener 正在运行
# 查看后端日志，应该有 "Listening to events" 的日志

# 2. 执行一些交易生成历史数据
# 在前端 Swap 或添加流动性

# 3. 检查数据库
psql -U your_username -d dex_db
SELECT COUNT(*) FROM swap_history;
```

### 问题 2: Analytics 数据全是 0

**原因：**没有足够的历史数据

**解决：**
1. 确保有 Swap 历史记录
2. 确保时间筛选范围内有数据
3. 检查后端日志是否有错误

### 问题 3: Pool 详情页 404

**原因：**池子ID不存在

**解决：**
```bash
# 查看所有池子ID
curl http://localhost:3002/api/v1/pool | jq '.[] | {id, token0Symbol, token1Symbol}'
```

### 问题 4: WebSocket 未连接

**原因：**后端 WebSocket 服务未启动

**解决：**
1. 确认后端服务正常运行
2. 检查端口 3002 是否可访问
3. 查看浏览器控制台 WebSocket 错误
4. 检查 CORS 配置

---

## 📊 测试数据建议

为了全面测试 Phase 3 功能，建议生成以下数据：

### 最小测试数据
- ✅ 至少 3 个交易对
- ✅ 至少 5 笔 Swap 交易
- ✅ 至少 3 次流动性操作

### 理想测试数据
- 🎯 6-10 个交易对
- 🎯 20+ 笔 Swap 交易（不同池子）
- 🎯 10+ 次流动性操作（添加和移除）
- 🎯 多个用户地址的交易

### 如何生成测试数据

```bash
# 1. 添加流动性（已包含在 add-liquidity.ts 中）
cd /Users/h15/Desktop/dex/contracts
npx hardhat run scripts/add-liquidity.ts --network localhost

# 2. 手动执行 Swap（前端操作）
# 访问 http://localhost:3000/swap
# 连接钱包
# 执行多笔交易

# 3. 使用不同账户（可选）
# 在 MetaMask 中导入其他测试账户
# 用不同账户执行交易
```

---

## ✅ 完整测试检查表

### 后端
- [ ] History Module 运行正常
- [ ] Analytics Module 运行正常
- [ ] BlockchainListener 捕获事件
- [ ] WebSocket 实时推送
- [ ] 数据库记录正确
- [ ] API 响应速度正常

### 前端
- [ ] Pool 页面全局统计显示
- [ ] Pool 详情页路由正常
- [ ] PoolAnalyticsCard 组件显示
- [ ] History 页面功能完整
- [ ] WebSocket 实时更新
- [ ] 分页功能正常
- [ ] 筛选功能正常

### 数据
- [ ] Swap 历史记录完整
- [ ] Liquidity 历史记录完整
- [ ] 统计数据准确
- [ ] 时间戳正确
- [ ] 交易哈希正确

---

## 🎉 测试通过标准

✅ **全部通过条件：**
1. 所有 API 测试返回 200
2. 前端所有页面无报错
3. 数据库数据完整
4. WebSocket 实时更新正常
5. 用户交互流畅

---

**预计测试时间：** 15-30 分钟  
**建议测试环境：** 本地开发环境  
**前置条件：** 所有服务已启动，合约已部署

---

**如有问题，请检查：**
1. 后端日志
2. 前端控制台
3. 数据库数据
4. 网络请求（F12 Network）

