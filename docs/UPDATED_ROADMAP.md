# 🗺️ DEX 项目更新路线图

**更新时间：** 2025-11-02  
**当前状态：** Phase 5 已完成

---

## 📅 开发计划调整

### **调整说明**

根据技术调研和项目优先级，做出以下调整：

1. ✅ **Phase 5 流动性挖矿已完成**（2025-11-02）
2. 🔄 **Phase 6 价格预言机**作为下一个重点
3. 🆕 **新增 Phase 6.5 The Graph 集成**
   - 放在价格预言机之后
   - 用于优化数据查询性能
   - 降低后端负载和成本

---

## 🎯 更新后的开发顺序

```
✅ Phase 1: 核心功能（已完成）
✅ Phase 2: 实时数据同步（已完成）
✅ Phase 3: 数据分析（已完成）
✅ Phase 4: 滑点优化（已完成）
✅ Phase 5: 流动性挖矿（已完成）
    ↓
⏳ Phase 6: 价格预言机 ← 下一个
    ↓ (3-4 天)
⏳ Phase 6.5: The Graph 集成 ← 新增
    ↓ (2-3 天)
⏳ Phase 7: 限价单
    ↓ (5-7 天)
⏳ Phase 8: 多链支持
    ↓ (3-5 天)
⏳ Phase 9: 跨链桥
    ↓ (10-15 天)
```

---

## 🆕 Phase 6.5: The Graph 集成（新增）

### **为什么新增这个阶段？**

#### 1. **优化数据查询**
- 当前：直接查询数据库或链上数据
- 优化后：通过 The Graph 快速查询索引数据
- 性能提升：查询速度提升 10-100 倍

#### 2. **降低后端负载**
- 减少数据库查询压力
- 减少链上 RPC 调用
- 降低服务器成本

#### 3. **行业标准**
- Uniswap、Aave 等都使用 The Graph
- 成熟的解决方案
- 社区支持完善

#### 4. **时机合适**
- 价格预言机完成后，数据结构稳定
- 有了 USD 价格，The Graph 数据更有价值
- 为后续多链支持做准备

---

## 📊 Phase 6.5 详细计划

### **第 1 天：Subgraph 开发**

**上午：环境准备**
- [ ] 安装 Graph CLI
  ```bash
  npm install -g @graphprotocol/graph-cli
  ```
- [ ] Fork Uniswap V2 Subgraph
  ```bash
  git clone https://github.com/Uniswap/v2-subgraph
  cd v2-subgraph
  ```
- [ ] 修改配置
  - 更新 `subgraph.yaml` 中的合约地址
  - 设置起始区块号
  - 配置网络（localhost / mainnet）

**下午：扩展 Schema**
- [ ] 添加 Farming 实体
  ```graphql
  type Farm @entity {
    id: ID!
    poolId: BigInt!
    lpToken: Bytes!
    allocPoint: BigInt!
    totalStaked: BigDecimal!
    apr: BigDecimal
    users: [UserStake!]! @derivedFrom(field: "farm")
  }
  
  type UserStake @entity {
    id: ID!
    farm: Farm!
    user: Bytes!
    amount: BigDecimal!
    rewardDebt: BigDecimal!
    pendingReward: BigDecimal
  }
  ```
- [ ] 编译 Subgraph
  ```bash
  graph codegen
  graph build
  ```

---

### **第 2 天：部署和测试**

**上午：本地测试**
- [ ] 启动本地 Graph Node（可选，用于开发测试）
- [ ] 部署到本地节点测试
- [ ] 验证数据同步

**下午：部署到 The Graph**
- [ ] 注册 The Graph Studio 账号
- [ ] 创建 Subgraph
- [ ] 部署 Subgraph
  ```bash
  graph auth --studio <DEPLOY_KEY>
  graph deploy --studio <SUBGRAPH_SLUG>
  ```
- [ ] 验证部署成功
- [ ] 测试 GraphQL 查询

---

### **第 3 天：集成和优化**

**上午：后端集成**
- [ ] 安装依赖
  ```bash
  pnpm add @apollo/client graphql
  ```
- [ ] 创建 TheGraph 模块
  ```typescript
  @Module({
    imports: [HttpModule],
    providers: [TheGraphService],
    exports: [TheGraphService],
  })
  export class TheGraphModule {}
  ```
- [ ] 实现查询接口
  ```typescript
  async getPairs(first: number = 10) {
    const query = gql`
      query {
        pairs(first: ${first}, orderBy: volumeUSD) {
          id
          token0 { symbol }
          token1 { symbol }
          reserve0
          reserve1
          volumeUSD
        }
      }
    `
    return this.queryGraph(query)
  }
  ```

**下午：前端集成**
- [ ] 安装 Apollo Client
  ```bash
  pnpm add @apollo/client graphql
  ```
- [ ] 配置 Apollo Provider
  ```typescript
  const client = new ApolloClient({
    uri: 'https://api.studio.thegraph.com/query/<SUBGRAPH>',
    cache: new InMemoryCache(),
  })
  ```
- [ ] 替换 API 调用
  ```typescript
  const { data } = useQuery(GET_PAIRS_QUERY)
  ```
- [ ] 性能对比测试

---

## 💰 成本影响分析

### **优化前（仅后端 + 数据库）**

```
后端服务器：$50-100/月
数据库：$30-50/月
RPC 调用：$0-50/月（取决于流量）
─────────────────────
总计：$80-200/月
```

### **优化后（+ The Graph）**

```
后端服务器：$30-50/月（负载降低）
数据库：$20-30/月（查询减少）
The Graph：$0-100/月（托管免费，去中心化按查询付费）
RPC 调用：$0-20/月（大幅减少）
─────────────────────
总计：$50-200/月

优势：
✅ 查询速度更快
✅ 后端负载更低
✅ 可扩展性更强
✅ 长期成本更低
```

---

## 🎯 预期收益

### **性能提升**

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| **查询延迟** | 500-2000ms | 50-200ms | **10x** |
| **数据刷新** | 30s | 实时（几秒） | **6x** |
| **并发查询** | 100/s | 1000/s | **10x** |
| **后端负载** | 高 | 低 | **-50%** |

### **开发效率**

- ✅ **GraphQL 查询灵活** - 一次查询获取所需全部数据
- ✅ **自动生成类型** - TypeScript 类型安全
- ✅ **减少后端代码** - 不需要写复杂的数据聚合逻辑
- ✅ **实时订阅** - WebSocket 自动推送（可选）

### **用户体验**

- ✅ **页面加载更快** - 数据查询延迟降低
- ✅ **数据更实时** - 几秒内同步最新区块
- ✅ **更流畅的体验** - 减少 Loading 状态

---

## 📚 技术架构变化

### **优化前架构**

```
┌─────────────┐
│  Frontend   │
└──────┬──────┘
       │ REST API
       ▼
┌─────────────────────────┐
│  Backend (NestJS)       │
│                         │
│  ├─ Pool Service        │
│  ├─ Analytics Service   │
│  └─ Blockchain Listener │
└──────┬──────────┬───────┘
       │          │
       ▼          ▼
┌──────────┐  ┌──────────┐
│   DB     │  │  Chain   │
│ (Postgres)│  │   RPC    │
└──────────┘  └──────────┘
```

### **优化后架构**

```
┌─────────────┐
│  Frontend   │
└──┬────────┬─┘
   │        │
   │ REST   │ GraphQL
   ▼        ▼
┌────────┐ ┌──────────────┐
│Backend │ │  The Graph   │ ← 新增主要数据源
│(NestJS)│ │   Subgraph   │
└───┬────┘ └──────┬───────┘
    │             │
    │             │ 索引
    ▼             ▼
┌──────┐    ┌──────────┐
│  DB  │    │  Chain   │
└──────┘    └──────────┘

优势：
• Frontend 可直接查 The Graph（降低后端负载）
• 数据查询更快（已索引）
• 后端专注业务逻辑
```

---

## 🔄 迁移策略

### **渐进式迁移（推荐）**

#### Phase 1: 并行运行（1-2 天）
```
后端 API ──┐
          ├→ 前端（同时调用两者，对比数据）
The Graph ─┘
```
- 验证数据一致性
- 性能对比测试
- 发现潜在问题

#### Phase 2: 逐步切换（3-5 天）
```
Pool 页面 → The Graph ✅
History 页面 → The Graph ✅
Farms 页面 → The Graph ✅
Analytics → The Graph ✅
```
- 一个页面一个页面切换
- 保留后端 API 作为降级方案
- 监控错误和性能

#### Phase 3: 完全迁移（1 周后）
```
所有查询 → The Graph (主)
后端 API → Fallback (备用)
```
- The Graph 失败时自动切换到后端
- 确保系统高可用

---

## ⚠️ 注意事项

### **1. The Graph 托管服务将关闭**
- 免费托管服务逐步迁移到去中心化网络
- 需要准备迁移方案：
  - 选项 A：使用去中心化网络（按查询付费 GRT）
  - 选项 B：自建 Graph 节点
  - 选项 C：使用第三方托管服务

### **2. 数据一致性**
- The Graph 数据延迟（几秒）
- 关键操作仍需查链确认
- 实现降级方案

### **3. 成本控制**
- 优化查询次数（缓存）
- 批量查询合并
- 监控使用量

---

## 🎉 总结

### **为什么在价格预言机之后做 The Graph？**

1. ✅ **数据结构稳定** - 价格预言机完成后，主要数据模型已确定
2. ✅ **价值最大化** - 有了 USD 价格，The Graph 数据展示更有意义
3. ✅ **优化时机** - 功能基本完善，是性能优化的好时机
4. ✅ **为多链准备** - The Graph 支持多链，为 Phase 8 做准备

### **预期时间线**

```
📅 2025-11-02: Phase 5 完成（流动性挖矿）✅
📅 2025-11-03-06: Phase 6 开发（价格预言机）
📅 2025-11-07-09: Phase 6.5 开发（The Graph 集成）
📅 2025-11-10-16: Phase 7 开发（限价单）
```

---

## 📖 相关文档

- [The Graph 工具调研报告](./BLOCKCHAIN_ANALYTICS_TOOLS_RESEARCH.md)
- [TODO 列表](../TODO_LIST.md)
- [下一步计划](../NEXT_STEPS.md)

---

**路线图已更新！接下来开始 Phase 6（价格预言机）开发！** 🚀

