# Phase 7: 限价单（Limit Orders）实现文档

## 📋 概述

**实施日期**: 2025-11-20  
**状态**: ✅ 开发完成，待测试部署  
**优先级**: ⭐⭐⭐ 高

Phase 7 实现了完整的限价单功能，允许用户创建、管理和自动执行限价买卖订单。

---

## 🎯 核心功能

### 1. **限价单创建**
- 用户设置目标价格
- 指定输入/输出代币和数量
- 设置订单有效期
- 支付执行费用（0.001 ETH）

### 2. **订单自动执行**
- Keeper 服务定期监控价格
- 当市场价达到目标价时自动执行
- Keeper 获得执行费用作为奖励

### 3. **订单管理**
- 查看活跃订单
- 查看历史订单（成交/取消/过期）
- 随时取消未执行订单
- 实时订单状态更新

---

## 🏗️ 技术架构

### 系统架构图

```
┌────────────────────────────────────────────────────────┐
│                     Frontend (React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Trading Page │  │ Orders Page  │  │ LimitOrder   │ │
│  │ (Market/     │  │ (Manage      │  │ Form         │ │
│  │  Limit)      │  │  Orders)     │  │ Component    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          │ wagmi/viem       │ REST API         │ wagmi/viem
          ▼                  ▼                  ▼
┌────────────────────────────────────────────────────────┐
│              Smart Contracts (Solidity)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │            LimitOrderBook Contract                │  │
│  │  - createOrder()                                  │  │
│  │  - cancelOrder()                                  │  │
│  │  - executeOrder()  (onlyKeeper)                  │  │
│  │  - Order Storage & Management                     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
          ▲                                    │
          │ Event Listening                    │ Execute Orders
          │                                    ▼
┌────────────────────────────────────────────────────────┐
│            Backend (NestJS)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ LimitOrder   │  │ Keeper       │  │ Listener     │ │
│  │ Service      │  │ Service      │  │ Service      │ │
│  │              │  │              │  │              │ │
│  │ - Query      │  │ - Monitor    │  │ - OrderCre-  │ │
│  │   Orders     │  │   Price      │  │   ated       │ │
│  │ - Statistics │  │ - Auto       │  │ - OrderFilled│ │
│  │              │  │   Execute    │  │ - OrderCan-  │ │
│  │              │  │   (每30秒)   │  │   celled     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                              │
│                          ▼                              │
│                  ┌──────────────┐                       │
│                  │  PostgreSQL  │                       │
│                  │  (Orders DB) │                       │
│                  └──────────────┘                       │
└────────────────────────────────────────────────────────┘
```

---

## 📁 项目文件结构

### 智能合约
```
contracts/
├── contracts/
│   ├── trading/
│   │   └── LimitOrderBook.sol        # 限价单订单簿合约
│   └── interfaces/
│       └── ILimitOrderBook.sol       # 限价单接口
├── scripts/
│   ├── deploy-limit-orders.ts        # 部署脚本
│   └── test-limit-orders.ts          # 测试脚本
└── deployed-limit-orders-addresses.json  # 部署地址
```

### 后端服务
```
backend/services/analytics-service/
└── src/modules/limit-order/
    ├── entities/
    │   └── limit-order.entity.ts     # 数据库实体
    ├── dto/
    │   └── limit-order.dto.ts        # API DTOs
    ├── limit-order.service.ts        # 业务逻辑
    ├── keeper.service.ts             # Keeper 自动执行
    ├── limit-order-listener.service.ts  # 事件监听
    ├── limit-order.controller.ts     # REST API
    └── limit-order.module.ts         # NestJS 模块
```

### 前端应用
```
frontend/web-app/
└── src/
    ├── hooks/
    │   └── useLimitOrders.ts         # API Hooks
    ├── components/
    │   └── LimitOrderForm/           # 限价单表单组件
    │       ├── index.tsx
    │       └── index.css
    └── pages/
        ├── Trading/                   # 交易页面 (Market/Limit)
        │   ├── index.tsx
        │   └── index.css
        └── Orders/                    # 订单管理页面
            ├── index.tsx
            └── index.css
```

---

## 📝 智能合约详解

### LimitOrderBook.sol

#### 核心数据结构

```solidity
enum OrderStatus {
    Active,      // 活跃
    Filled,      // 已成交
    Cancelled,   // 已取消
    Expired      // 已过期
}

struct Order {
    uint256 id;              // 订单 ID
    address maker;           // 创建者
    address tokenIn;         // 输入代币
    address tokenOut;        // 输出代币
    uint256 amountIn;        // 输入数量
    uint256 minAmountOut;    // 最小输出数量
    uint256 executionPrice;  // 执行价格
    OrderStatus status;      // 订单状态
    uint256 createdAt;       // 创建时间
    uint256 expiresAt;       // 过期时间
}
```

#### 核心函数

**1. createOrder** - 创建限价单
```solidity
function createOrder(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 minAmountOut,
    uint256 duration
) external payable returns (uint256 orderId)
```
- 用户必须提前 approve 代币
- 需要支付执行费用（0.001 ETH）
- 代币转移到合约托管
- 返回订单 ID

**2. cancelOrder** - 取消订单
```solidity
function cancelOrder(uint256 orderId) external
```
- 只能取消自己的活跃订单
- 退回代币和执行费用

**3. executeOrder** - 执行订单（仅 Keeper）
```solidity
function executeOrder(
    uint256 orderId,
    uint256 amountOut,
    address[] calldata path
) external onlyKeeper
```
- 检查价格是否满足条件
- 执行 swap
- 支付执行费用给 Keeper

#### 安全特性

- ✅ ReentrancyGuard - 防重入攻击
- ✅ Ownable - 权限控制
- ✅ SafeERC20 - 安全代币转移
- ✅ Keeper 授权机制
- ✅ 订单过期检查

---

## 🔧 后端服务详解

### 1. LimitOrder Service

**核心功能：**
- 订单 CRUD 操作
- 从链上同步订单
- 查询活跃/可执行订单
- 获取订单统计数据

**关键方法：**
```typescript
// 获取可执行订单（价格满足条件）
async getExecutableOrders(): Promise<LimitOrder[]>

// 从链上获取报价
async getAmountOut(tokenIn, tokenOut, amountIn): Promise<string>

// 同步订单状态
async syncOrderFromChain(orderId): Promise<LimitOrder>
```

### 2. Keeper Service

**核心功能：**
- 定期检查可执行订单（每 30 秒）
- 自动执行满足条件的订单
- 批量执行订单
- 手动执行订单（API）

**Cron 任务：**
```typescript
@Cron(CronExpression.EVERY_30_SECONDS)
async checkAndExecuteOrders()
```

**配置：**
```env
KEEPER_ENABLED=true              # 启用 Keeper
KEEPER_PRIVATE_KEY=0x...        # Keeper 私钥
LIMIT_ORDER_BOOK_ADDRESS=0x...  # 合约地址
```

### 3. LimitOrder Listener Service

**监听事件：**
- `OrderCreated` - 订单创建
- `OrderFilled` - 订单成交
- `OrderCancelled` - 订单取消
- `OrderExpired` - 订单过期

**事件处理：**
- 自动保存到数据库
- 更新订单状态
- 记录交易哈希

### 4. REST API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/limit-orders` | GET | 查询订单列表 |
| `/api/v1/limit-orders/active` | GET | 获取活跃订单 |
| `/api/v1/limit-orders/executable` | GET | 获取可执行订单 |
| `/api/v1/limit-orders/user/:address` | GET | 用户订单列表 |
| `/api/v1/limit-orders/:id` | GET | 订单详情 |
| `/api/v1/limit-orders/statistics` | GET | 订单统计 |
| `/api/v1/limit-orders/execute` | POST | 手动执行订单 |
| `/api/v1/limit-orders/keeper/status` | GET | Keeper 状态 |
| `/api/v1/limit-orders/quote` | POST | 获取报价 |

---

## 💻 前端实现详解

### 1. useLimitOrders Hook

**Hooks 列表：**
```typescript
useUserOrders(address, status?)      // 用户订单列表
useActiveOrders()                    // 活跃订单
useOrderStatistics()                 // 订单统计
useCreateLimitOrder()                // 创建订单
useCancelLimitOrder()                // 取消订单
```

**使用示例：**
```typescript
const { createOrder, isCreating } = useCreateLimitOrder();

await createOrder({
  tokenIn: '0x...',
  tokenOut: '0x...',
  amountIn: parseEther('100').toString(),
  minAmountOut: parseEther('200').toString(),
  duration: 86400, // 24 hours
});
```

### 2. LimitOrderForm 组件

**功能：**
- 输入代币和数量
- 设置目标价格
- 自动计算最小输出数量
- 选择订单有效期
- 一键创建订单

**UI 元素：**
- Amount In 输入框
- Target Price 输入框
- Min Amount Out（自动计算）
- Expiration 选择器
- Create Order 按钮

### 3. Trading Page

**Tab 切换：**
- **Market** - 即时交易（原 Swap 页面）
- **Limit** - 限价单（LimitOrderForm）

### 4. Orders Page

**订单管理：**
- **Active 标签页** - 活跃订单（可取消）
- **Filled 标签页** - 已成交订单
- **Cancelled 标签页** - 已取消订单

**功能：**
- 订单列表展示
- 实时状态更新
- 一键取消订单
- 订单详情查看

---

## 🔄 订单生命周期

```
1. 创建订单 (Active)
   ↓
   用户调用 createOrder()
   代币转移到合约
   订单保存到链上和数据库
   
2. 等待执行 (Active)
   ↓
   Keeper 定期检查价格
   市场价格未达到目标价
   
3a. 价格满足 → 自动执行 (Filled)
   ↓
   Keeper 调用 executeOrder()
   通过 Router 执行 swap
   用户收到输出代币
   Keeper 收到执行费用
   
3b. 用户取消 (Cancelled)
   ↓
   用户调用 cancelOrder()
   退回代币和执行费用
   
3c. 订单过期 (Expired)
   ↓
   过了有效期
   退回代币和执行费用
```

---

## 📊 数据库设计

### limit_orders 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 数据库主键 |
| order_id | varchar | 链上订单 ID |
| maker | varchar | 订单创建者地址 |
| token_in | varchar | 输入代币地址 |
| token_out | varchar | 输出代币地址 |
| amount_in | varchar | 输入数量（wei） |
| min_amount_out | varchar | 最小输出数量（wei） |
| execution_price | varchar | 执行价格（1e18） |
| status | enum | 订单状态 |
| created_at_block | int | 创建区块号 |
| expires_at | bigint | 过期时间戳 |
| filled_at_block | int | 成交区块号 |
| filled_amount_out | varchar | 实际输出数量 |
| executor | varchar | 执行者地址 |
| tx_hash | varchar | 创建交易哈希 |
| filled_tx_hash | varchar | 成交交易哈希 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

**索引：**
- `order_id` (UNIQUE)
- `maker`
- `status`
- `token_in`, `token_out`

---

## 🚀 部署指南

### 1. 部署智能合约

```bash
cd contracts

# 启动本地节点
npx hardhat node

# 部署限价单合约
npx hardhat run scripts/deploy-limit-orders.ts --network localhost
```

### 2. 配置后端

在 `backend/services/analytics-service/.env` 添加：

```env
# Limit Order Book
LIMIT_ORDER_BOOK_ADDRESS=0x...

# Keeper Configuration
KEEPER_ENABLED=true
KEEPER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 3. 运行迁移

数据库表会自动创建（TypeORM synchronize=true）

### 4. 启动服务

```bash
cd backend/services/analytics-service
pnpm start:dev
```

### 5. 配置前端

在 `frontend/web-app/.env` 添加：

```env
VITE_LIMIT_ORDER_BOOK_ADDRESS=0x...
```

### 6. 测试合约

```bash
cd contracts
npx hardhat run scripts/test-limit-orders.ts --network localhost
```

---

## 🧪 测试场景

### 1. 创建限价单测试

```typescript
// 1. 授权代币
await tokenA.approve(limitOrderBookAddress, amountIn);

// 2. 创建订单
const tx = await limitOrderBook.createOrder(
  tokenA.address,
  tokenB.address,
  parseEther('100'),
  parseEther('200'),
  86400, // 24 hours
  { value: executionFee }
);

// 3. 验证订单
const order = await limitOrderBook.getOrder(orderId);
expect(order.status).to.equal(0); // Active
```

### 2. Keeper 执行测试

```typescript
// 模拟价格变化
// ...

// Keeper 自动检查并执行
await keeperService.checkAndExecuteOrders();

// 验证订单已成交
const order = await limitOrderService.findOneByOrderId(orderId);
expect(order.status).to.equal(OrderStatus.FILLED);
```

### 3. 取消订单测试

```typescript
// 用户取消订单
await limitOrderBook.cancelOrder(orderId);

// 验证状态和退款
const order = await limitOrderBook.getOrder(orderId);
expect(order.status).to.equal(2); // Cancelled

const balance = await tokenA.balanceOf(maker.address);
// balance 应该增加
```

---

## ⚠️ 注意事项

### 安全性

1. **Keeper 私钥保护**
   - 生产环境使用专门的 Keeper 账户
   - 不要在代码中硬编码私钥
   - 使用环境变量或密钥管理服务

2. **执行费用**
   - 确保 Keeper 账户有足够的 ETH
   - 执行费用应该覆盖 gas 成本
   - 可以根据网络状况调整费用

3. **订单验证**
   - 检查代币地址有效性
   - 验证数量和价格合理性
   - 防止恶意订单

### 性能优化

1. **Keeper 性能**
   - 批量执行订单（最多 5 个/次）
   - 合理设置检查频率（30 秒）
   - 失败订单跳过，避免阻塞

2. **数据库查询**
   - 使用索引加速查询
   - 分页加载订单列表
   - 缓存活跃订单

3. **前端优化**
   - React Query 缓存数据
   - 订单列表虚拟滚动
   - 实时更新使用 WebSocket

---

## 📈 统计数据

### 代码规模

| 模块 | 文件数 | 代码行数 |
|------|--------|----------|
| 智能合约 | 2 | ~600 行 |
| 后端服务 | 6 | ~1,500 行 |
| 前端应用 | 6 | ~1,000 行 |
| **总计** | **14** | **~3,100 行** |

### API 端点

- **REST API**: 9 个端点
- **Contract Functions**: 10+ 个函数
- **Events**: 4 个事件

---

## ✅ 功能清单

### 已完成 ✅

- [x] **Phase 7.1 - 合约开发**
  - [x] LimitOrderBook 合约
  - [x] 订单创建/取消/执行
  - [x] Keeper 机制
  - [x] 事件定义
  - [x] 部署脚本

- [x] **Phase 7.2 - 后端开发**
  - [x] LimitOrder 模块
  - [x] Keeper 服务（自动执行）
  - [x] 事件监听器
  - [x] REST API 端点
  - [x] 数据库实体

- [x] **Phase 7.3 - 前端开发**
  - [x] useLimitOrders Hook
  - [x] LimitOrderForm 组件
  - [x] Trading 页面（Market/Limit）
  - [x] Orders 管理页面

### 待完成 ⏳

- [ ] **测试和部署**
  - [ ] 本地测试（Hardhat）
  - [ ] 集成测试
  - [ ] 生产部署

- [ ] **文档和优化**
  - [ ] API 文档补充
  - [ ] 用户指南
  - [ ] 性能优化

---

## 🔗 相关资源

### 文档
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - 系统架构文档
- [PROJECT_STATUS.md](../../PROJECT_STATUS.md) - 项目状态
- [API_REFERENCE.md](../../API_REFERENCE.md) - API 参考

### 代码
- [LimitOrderBook.sol](/contracts/contracts/trading/LimitOrderBook.sol)
- [limit-order.service.ts](/backend/services/analytics-service/src/modules/limit-order/limit-order.service.ts)
- [useLimitOrders.ts](/frontend/web-app/src/hooks/useLimitOrders.ts)

---

## 🎉 总结

Phase 7 限价单功能已全部开发完成，包括：
- ✅ 完整的智能合约实现
- ✅ 自动化的 Keeper 执行机制
- ✅ 功能完善的后端 API
- ✅ 用户友好的前端界面

**下一步：**
1. 启动本地测试环境
2. 部署合约到本地网络
3. 端到端功能测试
4. 性能和安全审计
5. 准备生产部署

---

**文档维护**: DEX Team  
**最后更新**: 2025-11-20  
**版本**: v1.0

