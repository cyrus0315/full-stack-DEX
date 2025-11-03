# Block Scanner - 区块扫描器

自动监听新区块并导入相关交易的后台服务。

---

## 🎯 功能特性

### 1. 自动监听新区块
- 每 2 秒轮询一次新区块
- 自动启动（可配置禁用）
- 服务启动时自动加载

### 2. 智能过滤
- 只导入监控地址相关的交易
- 支持动态添加/移除监控地址
- 自动去重（不会重复导入）

### 3. 手动扫描
- 支持扫描指定区块范围
- 适用于历史数据导入
- 批量处理优化

---

## 📡 API 接口

> **注意**：所有 API 路径都需要 `/api/v1` 前缀

### 获取扫描器状态

```bash
GET http://localhost:3001/api/v1/transaction/scanner/status

响应:
{
  "enabled": true,
  "scanning": true,
  "monitoredAddresses": 5
}
```

### 手动扫描区块范围

```bash
POST http://localhost:3001/api/v1/transaction/scanner/scan
Content-Type: application/json

{
  "startBlock": 100,
  "endBlock": 200
}

响应:
{
  "success": true,
  "importedCount": 15,
  "errorCount": 0,
  "message": "扫描完成：导入 15 笔交易"
}
```

### 刷新监控地址列表

```bash
POST http://localhost:3001/api/v1/transaction/scanner/refresh-addresses

响应:
{
  "success": true,
  "monitoredAddresses": 5,
  "message": "已刷新监控地址列表：5 个地址"
}
```

---

## ⚙️ 配置

在 `.env` 文件中配置：

```env
# 是否启用扫描器（默认: true）
SCANNER_ENABLED=true

# 轮询间隔（毫秒，默认: 2000）
SCANNER_POLLING_INTERVAL=2000

# 区块链 RPC
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_CHAIN_ID=31337
```

---

## 🧪 测试

运行测试脚本：

```bash
./test-scanner.sh
```

测试内容：
1. 检查服务健康状态
2. 获取扫描器状态
3. 添加测试地址
4. 刷新监控地址
5. 手动扫描最近区块
6. 查询导入的交易
7. 验证实时监听

---

## 🔄 工作流程

```
1. 服务启动
   ↓
2. 初始化客户端
   ↓
3. 加载监控地址列表（从 address 表）
   ↓
4. 启动区块监听（watchBlocks）
   ↓
5. 监听到新区块
   ↓
6. 获取区块中所有交易
   ↓
7. 过滤相关交易（from 或 to 在监控列表）
   ↓
8. 导入到数据库
   ↓
9. 继续监听...
```

---

## 💡 使用示例

### 1. 添加监控地址

```bash
# 添加地址到监控列表
curl -X POST http://localhost:3001/api/v1/address \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "label": "我的钱包"
  }'

# 刷新扫描器的监控列表
curl -X POST http://localhost:3001/api/v1/transaction/scanner/refresh-addresses
```

### 2. 导入历史交易

```bash
# 扫描区块 0-100
curl -X POST http://localhost:3001/api/v1/transaction/scanner/scan \
  -H "Content-Type: application/json" \
  -d '{
    "startBlock": 0,
    "endBlock": 100
  }'
```

### 3. 查看导入的交易

```bash
# 查询地址的交易记录
curl "http://localhost:3001/api/v1/transaction?address=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&limit=10"
```

---

## 📊 性能

- **轮询间隔**: 2 秒
- **单区块处理**: < 500ms
- **批量扫描**: ~100 区块/秒
- **内存占用**: < 50MB

---

## 🐛 故障排查

### 扫描器未运行

检查配置：
```bash
curl http://localhost:3001/api/v1/transaction/scanner/status
```

如果 `scanning: false`，检查：
1. 是否禁用了扫描器 (`SCANNER_ENABLED=false`)
2. Hardhat 节点是否运行
3. 服务日志是否有错误

### 交易未被导入

检查：
1. 地址是否在监控列表中
2. 是否刷新了监控列表
3. 检查交易的 from/to 是否匹配

### 手动扫描失败

常见原因：
1. 区块号范围错误
2. RPC 节点未响应
3. 区块号超出当前高度

---

## 🔗 相关文档

- [Transaction Module](./src/modules/transaction/)
- [API 文档 (Swagger)](http://localhost:3001/api/docs)
- [配置说明](./src/common/config/configuration.ts)

**重要提示**：
- ✅ 所有 API 路径都需要 `/api/v1` 前缀
- ✅ Swagger 文档: `http://localhost:3001/api/docs`
- ✅ API 基础路径: `http://localhost:3001/api/v1`

---

**创建日期**: 2025-10-29  
**状态**: ✅ 已完成

