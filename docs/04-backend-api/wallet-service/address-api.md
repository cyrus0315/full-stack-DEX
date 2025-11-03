# Address Module 使用指南

## 概述

Address Module 提供地址管理和监控功能，支持添加、删除、更新地址，以及查询地址余额和交易信息。

## 主要功能

1. **地址管理**：添加/删除/更新监控地址
2. **地址标签**：为地址添加标签和备注
3. **地址类型识别**：自动识别 EOA（外部账户）和 Contract（合约地址）
4. **余额监控**：实时同步地址 ETH 余额
5. **分页查询**：支持搜索、过滤、分页

## API 端点

### 1. 添加地址

```bash
POST /api/v1/address
Content-Type: application/json
```

**请求体**：
```json
{
  "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "label": "测试钱包",
  "description": "Hardhat 测试账户 #0",
  "isMonitored": true,
  "tags": ["测试", "开发"]
}
```

**示例**：
```bash
curl -X POST http://localhost:3001/api/v1/address \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "label": "测试钱包",
    "isMonitored": true
  }'
```

**响应**：
```json
{
  "id": 1,
  "address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "label": "测试钱包",
  "description": "Hardhat 测试账户 #0",
  "type": "EOA",
  "isMonitored": true,
  "ethBalance": "10000000000000000000000",
  "transactionCount": 0,
  "tags": ["测试", "开发"],
  "lastSyncAt": "2025-10-27T10:00:00.000Z",
  "createdAt": "2025-10-27T10:00:00.000Z",
  "updatedAt": "2025-10-27T10:00:00.000Z"
}
```

### 2. 批量添加地址

```bash
POST /api/v1/address/batch
Content-Type: application/json
```

**请求体**：
```json
{
  "addresses": [
    {
      "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "label": "账户 1"
    },
    {
      "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "label": "账户 2"
    }
  ]
}
```

### 3. 获取地址列表（分页）

```bash
GET /api/v1/address/list?page=1&limit=20&search=test&isMonitored=true
```

**查询参数**：
- `page`：页码（默认 1）
- `limit`：每页数量（默认 20）
- `search`：搜索关键词（搜索地址或标签）
- `isMonitored`：是否只显示监控中的地址
- `type`：地址类型（`EOA` 或 `Contract`）
- `tag`：标签过滤

**示例**：
```bash
curl "http://localhost:3001/api/v1/address/list?page=1&limit=10"
```

**响应**：
```json
{
  "addresses": [
    {
      "id": 1,
      "address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      "label": "测试钱包",
      "type": "EOA",
      "isMonitored": true,
      "ethBalance": "10000000000000000000000",
      "tags": ["测试"],
      "createdAt": "2025-10-27T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 4. 获取地址详情

```bash
GET /api/v1/address/:address
```

**示例**：
```bash
curl "http://localhost:3001/api/v1/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

**响应**：
```json
{
  "id": 1,
  "address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  "label": "测试钱包",
  "description": "Hardhat 测试账户",
  "type": "EOA",
  "isMonitored": true,
  "ethBalance": "10000000000000000000000",
  "transactionCount": 0,
  "tags": ["测试"],
  "lastSyncAt": "2025-10-27T10:00:00.000Z",
  "tokenBalances": [],
  "recentTransactions": [],
  "createdAt": "2025-10-27T10:00:00.000Z",
  "updatedAt": "2025-10-27T10:00:00.000Z"
}
```

### 5. 更新地址信息

```bash
PUT /api/v1/address/:address
Content-Type: application/json
```

**请求体**：
```json
{
  "label": "更新后的标签",
  "description": "更新后的描述",
  "isMonitored": false,
  "tags": ["新标签"]
}
```

**示例**：
```bash
curl -X PUT http://localhost:3001/api/v1/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  -H "Content-Type: application/json" \
  -d '{"label": "更新后的标签"}'
```

### 6. 删除地址

```bash
DELETE /api/v1/address/:address
```

**示例**：
```bash
curl -X DELETE "http://localhost:3001/api/v1/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

**响应**：
```
204 No Content
```

### 7. 同步地址余额

```bash
POST /api/v1/address/:address/sync
```

手动触发指定地址的余额同步。

**示例**：
```bash
curl -X POST "http://localhost:3001/api/v1/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/sync"
```

### 8. 同步所有监控地址

```bash
POST /api/v1/address/sync/all
```

批量同步所有启用监控的地址余额。

**示例**：
```bash
curl -X POST "http://localhost:3001/api/v1/address/sync/all"
```

## 数据模型

### Address 实体

```typescript
{
  id: number;                  // 主键
  address: string;             // 钱包地址（唯一，小写）
  label: string;               // 地址标签
  description: string;         // 地址备注
  type: 'EOA' | 'Contract';    // 地址类型
  isMonitored: boolean;        // 是否启用监控
  ethBalance: string;          // ETH 余额缓存
  transactionCount: number;    // 交易数量
  tags: string;                // 标签（逗号分隔）
  lastSyncAt: Date;            // 最后同步时间
  createdAt: Date;             // 创建时间
  updatedAt: Date;             // 更新时间
}
```

## 特性说明

### 1. 地址类型自动识别

添加地址时，会自动检测地址的字节码：
- **EOA**：外部账户（无字节码或字节码为 `0x`）
- **Contract**：合约地址（有字节码）

### 2. 余额自动同步

- 添加地址时自动获取初始余额
- 查询地址详情时自动刷新余额
- 支持手动触发同步
- 支持批量同步所有监控地址

### 3. 标签系统

- 支持为地址添加多个标签
- 可以通过标签进行过滤查询
- 标签用逗号分隔存储

### 4. 监控开关

- `isMonitored` 字段控制是否监控该地址
- 只有启用监控的地址会被批量同步
- 可以随时开启/关闭监控

## 使用场景

### 场景 1：添加并监控多个钱包

```bash
# 1. 批量添加地址
curl -X POST http://localhost:3001/api/v1/address/batch \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      {"address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "label": "主钱包"},
      {"address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "label": "交易钱包"}
    ]
  }'

# 2. 查询列表
curl "http://localhost:3001/api/v1/address/list"

# 3. 同步所有地址余额
curl -X POST "http://localhost:3001/api/v1/address/sync/all"
```

### 场景 2：管理合约地址

```bash
# 添加合约地址（自动识别为 Contract 类型）
curl -X POST http://localhost:3001/api/v1/address \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "label": "DEX Factory",
    "tags": ["合约", "DEX"]
  }'

# 查询所有合约地址
curl "http://localhost:3001/api/v1/address/list?type=Contract"
```

### 场景 3：按标签分类管理

```bash
# 查询带有"交易"标签的地址
curl "http://localhost:3001/api/v1/address/list?tag=交易"

# 更新地址标签
curl -X PUT http://localhost:3001/api/v1/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  -H "Content-Type: application/json" \
  -d '{"tags": ["交易", "热钱包", "主要"]}'
```

## Swagger 文档

启动服务后访问：
```
http://localhost:3001/api
```

可以在 Swagger UI 中测试所有 Address API 端点。

## 相关模块

- **Balance Module**：查询地址余额（集成在地址详情中）
- **Transaction Module**：查询地址交易记录（TODO）
- **Token Module**：查询地址代币持仓（TODO）

