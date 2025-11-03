# 🚀 Phase 2 功能快速测试指南

## 测试准备

### 1. 启动所有服务

```bash
# Terminal 1: PostgreSQL + Redis
# 已启动

# Terminal 2: Hardhat 节点
cd /Users/h15/Desktop/dex/contracts
npx hardhat node

# Terminal 3: Trading Service
cd /Users/h15/Desktop/dex/backend/services/trading-service
pnpm start:dev

# Terminal 4: 前端
cd /Users/h15/Desktop/dex/frontend/web-app
pnpm dev
```

---

## 测试 1: WebSocket 实时连接 ✅

**步骤：**
1. 打开浏览器：`http://localhost:5173`
2. 连接 MetaMask 钱包
3. 访问 Pool 页面
4. 打开浏览器控制台（F12）

**预期结果：**
```
Console 输出：
🔌 Connecting to WebSocket: http://localhost:3002
✅ WebSocket connected: AbCdEf...

页面显示：
右上角显示 [🟢 实时] 按钮（绿色圆点）
```

**通过标准：** ✅ 看到 "WebSocket connected" 日志

---

## 测试 2: 实时数据推送 🔄

**步骤：**
1. 打开 **两个浏览器窗口**（并排显示）
2. 两个窗口都打开 Pool 页面
3. 在 **窗口 A** 执行一笔 Swap（DAI → USDT）
4. 观察 **窗口 B**

**预期结果：**
```
窗口 A：
- 执行 Swap
- Pool 储备量变化
- 看到确认消息

窗口 B（无需操作）：
- 自动收到推送
- Pool 储备量自动更新
- Console 显示：📡 Received pool update
```

**通过标准：** ✅ 窗口 B 自动更新，无需刷新

---

## 测试 3: Liquidity 价格显示和自动计算 💎

### 3.1 测试现有池子

**步骤：**
1. 访问 Liquidity 页面
2. 选择 **DAI / USDT**（已存在的池子）
3. 等待池子信息加载

**预期结果：**
```
显示蓝色提示框：
"当前价格: 1 DAI = 1.000000 USDT
 输入一个代币数量后，系统会自动根据当前池子比例计算另一个代币的推荐数量。"
```

**步骤（续）：**
4. 在 TokenA 输入框输入：`100`
5. 观察 TokenB 输入框

**预期结果：**
```
TokenB 自动填入：100.000000
（根据当前池子 1:1 比例）
```

**步骤（续）：**
6. 修改 TokenB 为：`50`
7. 观察 TokenA 输入框

**预期结果：**
```
TokenA 自动调整为：50.000000
（保持比例一致）
```

**通过标准：** ✅ 自动计算正确，显示当前价格

---

### 3.2 测试新池子

**步骤：**
1. 在 Liquidity 页面
2. 选择 **ETH / DAI**（假设不存在）
3. 等待池子信息加载

**预期结果：**
```
显示黄色警告框：
"⚠️ 创建新池子
 ETH/DAI 交易对尚不存在，您将创建第一个流动性池！
 您可以自由设置初始价格比例。"
```

**步骤（续）：**
4. 输入任意数量（例如：1 ETH, 3000 DAI）
5. 点击"添加流动性"
6. MetaMask 确认

**预期结果：**
```
- 交易成功
- 新池子创建
- Pool 页面自动出现新的 ETH/DAI 交易对
```

**通过标准：** ✅ 新池子创建成功，显示正确提示

---

## 测试 4: 事件监听器 🎧

**步骤：**
1. 打开 Trading Service 日志
2. 执行一笔 Swap（任意交易对）
3. 等待 5-10 秒

**预期日志：**
```
[BlockchainListenerService] 📊 Processing blocks 12345 to 12346
[BlockchainListenerService] 💱 Swap: 0x123... by 0xUser...
[BlockchainListenerService] 🔄 Sync: 0x123... -> 1000000/2000000
[EventsGateway] 📡 Broadcasted swap: 0x123...
[EventsGateway] 📡 Broadcasted pool update: 0x123...
```

**通过标准：** ✅ 日志显示事件被正确监听和处理

---

## 测试 5: 定时同步任务 ⏰

**步骤：**
1. 打开 Trading Service 日志
2. 等待 30 秒
3. 观察日志输出

**预期日志：**
```
[PoolSyncSchedulerService] 🔄 Starting scheduled sync for 3 pools...
[PoolSyncSchedulerService] 📊 Pool DAI/USDT synced (1000000/2000000)
[PoolSyncSchedulerService] ✅ Sync completed: 1/3 pools updated
```

**通过标准：** ✅ 每 30 秒自动同步一次

---

## 测试 6: 手动同步 API 🔧

**步骤：**
1. 获取某个 Pool 的 ID（例如：1）
2. 执行 API 调用：

```bash
curl -X POST http://localhost:3002/api/v1/listener/resync/1
```

**预期响应：**
```json
{
  "success": true,
  "message": "Pool 1 resynced successfully"
}
```

**通过标准：** ✅ API 返回成功，Pool 数据更新

---

## 测试 7: 监听器状态查询 📊

**步骤：**
```bash
curl http://localhost:3002/api/v1/listener/status
```

**预期响应：**
```json
{
  "isRunning": true,
  "startTime": "2025-10-29T10:00:00.000Z",
  "lastEventTime": "2025-10-29T10:15:30.000Z",
  "eventsProcessed": 42,
  "errors": 0
}
```

**通过标准：** ✅ `isRunning: true` 且 `errors: 0`

---

## 测试 8: 多用户实时体验 👥

**场景：** 模拟两个用户同时使用 DEX

**步骤：**
1. 打开浏览器 A（Chrome）
2. 打开浏览器 B（Firefox 或隐身模式）
3. 两个浏览器都连接钱包并访问 Pool 页面

**操作 1：** 浏览器 A 执行 Swap
```
预期：浏览器 B 的 Pool 列表自动更新
```

**操作 2：** 浏览器 B 添加流动性
```
预期：浏览器 A 的 Pool 列表自动更新
```

**操作 3：** 同时观察两个浏览器的控制台
```
预期：都显示 WebSocket 推送消息
```

**通过标准：** ✅ 两个浏览器都能实时看到对方的操作结果

---

## 故障排除 🔧

### 问题 1: WebSocket 连接失败

**症状：** 右上角显示 [🔴 离线]

**检查：**
```bash
# 1. 检查 trading-service 是否运行
ps aux | grep trading-service

# 2. 检查端口 3002
lsof -i :3002

# 3. 查看日志
# 在 trading-service terminal 查看是否有错误
```

**解决：**
```bash
# 重启 trading-service
cd backend/services/trading-service
pnpm start:dev
```

---

### 问题 2: 事件监听器不工作

**症状：** 日志没有显示事件处理

**检查：**
```bash
# 查看监听器状态
curl http://localhost:3002/api/v1/listener/status
```

**可能原因：**
- Hardhat 节点未运行
- 合约地址配置错误
- 数据库连接失败

**解决：**
```bash
# 1. 检查 Hardhat 节点
# 应该在 http://127.0.0.1:8545 运行

# 2. 检查 .env 配置
cd backend/services/trading-service
cat .env | grep DEX_

# 3. 重启服务
pnpm start:dev
```

---

### 问题 3: Liquidity 页面不显示价格

**症状：** 没有显示"当前价格"提示框

**可能原因：**
- 池子尚不存在（正常，显示"创建新池子"）
- API 请求失败

**检查：**
```bash
# 测试 API
curl http://localhost:3002/api/v1/pool/pair/0xDAI_ADDRESS/0xUSDT_ADDRESS
```

**正常行为：**
- 现有池子：显示价格
- 新池子：显示"创建新池子"警告

---

## ✅ 测试清单

完成所有测试后，请勾选：

- [ ] WebSocket 连接成功
- [ ] 实时数据推送工作正常
- [ ] Liquidity 价格显示正确
- [ ] Liquidity 自动计算工作
- [ ] 事件监听器正常运行
- [ ] 定时同步任务执行
- [ ] 手动同步 API 可用
- [ ] 多用户实时体验正常

**全部通过 = Phase 2 功能完全可用！** 🎉

---

## 📸 截图示例

### WebSocket 连接状态
```
Pool 页面右上角：
[🟢 实时] [刷新] [添加流动性]
```

### Liquidity 价格提示
```
┌─────────────────────────────────────────────┐
│ ℹ️ 当前价格: 1 DAI = 1.000000 USDT          │
│ 输入一个代币数量后，系统会自动根据当前池子  │
│ 比例计算另一个代币的推荐数量。              │
└─────────────────────────────────────────────┘
```

### Console 日志
```
🔌 Connecting to WebSocket: http://localhost:3002
✅ WebSocket connected: AbCdEf12345
📡 Received pool update: {pairAddress: "0x123...", ...}
```

---

**测试完成后，您的 DEX 就完全可以投入使用了！** 🚀

