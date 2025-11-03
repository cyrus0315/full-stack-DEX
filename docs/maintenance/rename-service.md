# 🔄 服务重命名指南

## 📋 重命名：trading-service → analytics-service

---

## 🎯 为什么要重命名？

**原因：**
- 后端不再执行交易（Swap/Liquidity）
- 主要功能是数据分析和只读查询
- 名称应反映实际功能

**新定位：**
- ✅ 数据分析服务（Analytics）
- ✅ 历史记录查询
- ✅ 池子数据同步
- ✅ 实时事件监听

---

## 🚨 重要提示

**在重命名之前，请确保：**
1. ✅ 所有服务已停止
2. ✅ 已备份重要数据
3. ✅ 已提交代码到 Git

---

## 📝 重命名步骤

### Step 1: 停止所有服务

```bash
# 停止后端
# Ctrl + C 停止 trading-service

# 停止前端
# Ctrl + C 停止 frontend

# 停止 Hardhat 节点（如果在运行）
# Ctrl + C
```

### Step 2: 重命名目录

```bash
cd /Users/h15/Desktop/dex/backend/services

# 重命名目录
mv trading-service analytics-service

# 确认重命名
ls -la
```

### Step 3: 更新后端配置

#### 3.1 更新 package.json

```bash
cd /Users/h15/Desktop/dex/backend/services/analytics-service
```

编辑 `package.json`：
```json
{
  "name": "analytics-service",
  "version": "1.0.0",
  "description": "DEX Analytics and Data Service",
  ...
}
```

#### 3.2 更新 main.ts

编辑 `src/main.ts`，更新 Swagger 文档标题：
```typescript
const config = new DocumentBuilder()
  .setTitle('DEX Analytics API')
  .setDescription('DEX 数据分析和查询服务 API')
  .setVersion('1.0')
  .build();
```

#### 3.3 更新 .env（如果有特定配置）

```env
# 服务名称
SERVICE_NAME=analytics-service

# 端口（可选，保持 3002 不变）
PORT=3002
```

### Step 4: 更新前端配置

#### 4.1 更新 API 配置

编辑 `/Users/h15/Desktop/dex/frontend/web-app/src/config/api.ts`：

```typescript
export const API_CONFIG = {
  // ...其他配置
  
  // 重命名
  ANALYTICS_SERVICE: process.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1',
  
  // 可选：保留向后兼容的别名
  TRADING_SERVICE: process.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1',
}
```

#### 4.2 更新 api.ts

编辑 `/Users/h15/Desktop/dex/frontend/web-app/src/services/api.ts`：

```typescript
/**
 * Analytics Service API 客户端
 * （原 Trading Service）
 */
export const analyticsApi = createApiClient(API_CONFIG.ANALYTICS_SERVICE)

// 向后兼容别名
export const tradingApi = analyticsApi
```

**或者** 直接全局替换：
```bash
cd /Users/h15/Desktop/dex/frontend/web-app/src
# 将所有 tradingApi 替换为 analyticsApi
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/tradingApi/analyticsApi/g'
```

### Step 5: 更新文档

需要更新以下文档中的服务名称：
- `/Users/h15/Desktop/dex/README.md`
- `/Users/h15/Desktop/dex/START_ALL.md`
- `/Users/h15/Desktop/dex/QUICK_TEST_GUIDE.md`
- `/Users/h15/Desktop/dex/TODO_LIST.md`
- 所有 Phase 文档

### Step 6: 重新安装依赖（可选）

```bash
cd /Users/h15/Desktop/dex/backend/services/analytics-service
pnpm install
```

### Step 7: 重新启动服务

```bash
# 1. 启动 Hardhat 节点
cd /Users/h15/Desktop/dex/contracts
npx hardhat node

# 2. 启动后端（新名称）
cd /Users/h15/Desktop/dex/backend/services/analytics-service
pnpm run start:dev

# 3. 启动前端
cd /Users/h15/Desktop/dex/frontend/web-app
pnpm run dev
```

### Step 8: 验证

#### 8.1 检查后端

访问：`http://localhost:3002/api/v1`

应该看到服务正常运行。

#### 8.2 检查 Swagger 文档

访问：`http://localhost:3002/api`

标题应该是：**DEX Analytics API**

#### 8.3 检查前端

访问：`http://localhost:3000`

所有功能应该正常工作：
- Pool 页面
- History 页面
- Analytics 数据

---

## 🔄 Git 提交

重命名完成后，提交更改：

```bash
cd /Users/h15/Desktop/dex

# 查看更改
git status

# 添加更改
git add .

# 提交
git commit -m "refactor: rename trading-service to analytics-service

- 删除废弃的 Swap 和 Liquidity 模块
- 重命名服务以反映实际功能（数据分析）
- 更新所有配置和文档
- 清理未使用的 API 端点
"
```

---

## ⚠️ 可能的问题

### 问题 1: 后端启动失败

**检查：**
```bash
cd /Users/h15/Desktop/dex/backend/services/analytics-service
pnpm run start:dev
```

**常见原因：**
- 端口被占用（3002）
- 数据库连接失败
- 模块导入路径错误

**解决：**
- 检查错误日志
- 确认数据库正在运行
- 重新安装依赖：`pnpm install`

### 问题 2: 前端 API 调用失败

**检查：**
- 浏览器控制台是否有错误
- API URL 是否正确
- 后端服务是否运行

**解决：**
- 确认 `.env` 文件配置正确
- 重启前端服务
- 清除浏览器缓存

### 问题 3: Git 跟踪问题

**如果 Git 没有正确跟踪重命名：**

```bash
# 手动告诉 Git 这是重命名操作
git mv backend/services/trading-service backend/services/analytics-service
```

---

## 🎯 简化版（快速重命名）

如果你只想快速重命名而不改太多配置：

```bash
# 1. 停止所有服务

# 2. 重命名目录
cd /Users/h15/Desktop/dex/backend/services
mv trading-service analytics-service

# 3. 更新 package.json name 字段
# 编辑 analytics-service/package.json
# 将 "name": "trading-service" 改为 "name": "analytics-service"

# 4. 重启所有服务（路径已变）
cd /Users/h15/Desktop/dex/backend/services/analytics-service
pnpm run start:dev
```

**前端无需修改** - 只要 URL 不变（`http://localhost:3002`），前端可以继续使用 `tradingApi` 变量名。

---

## ✅ 验证清单

完成重命名后，确认以下项目：

- [ ] 目录已重命名：`backend/services/analytics-service/`
- [ ] package.json 已更新
- [ ] main.ts Swagger 标题已更新
- [ ] 后端服务启动成功
- [ ] 前端服务启动成功
- [ ] Pool 页面正常显示
- [ ] History 页面正常显示
- [ ] Analytics API 正常工作
- [ ] WebSocket 连接正常
- [ ] 数据同步正常

---

**准备好重命名了吗？跟着步骤一步步来！** 🚀

