# 🔧 测试脚本

本目录包含所有测试和工具脚本。

---

## 📋 脚本列表

### 🪙 代币管理

| 脚本 | 说明 | 用法 |
|------|------|------|
| `mint-tokens-simple.sh` | 简单 Mint 代币 | `bash mint-tokens-simple.sh` |
| `mint-test-tokens.sh` | Mint 测试代币 | `bash mint-test-tokens.sh` |
| `mint-usdc.sh` | Mint USDC | `bash mint-usdc.sh` |

### 💧 流动性池管理

| 脚本 | 说明 | 用法 |
|------|------|------|
| `sync-all-pools.sh` | 同步所有池子数据 | `bash sync-all-pools.sh` |
| `sync-all-pools.js` | 同步池子（Node 版本） | `node sync-all-pools.js` |
| `sync-pools.sh` | 同步池子 | `bash sync-pools.sh` |
| `create-missing-pools.sh` | 创建缺失的池子 | `bash create-missing-pools.sh` |
| `create-eth-usdt-pair.sh` | 创建 ETH/USDT 交易对 | `bash create-eth-usdt-pair.sh` |

### 🧪 测试

| 脚本 | 说明 | 用法 |
|------|------|------|
| `test-analytics-api.sh` | 测试 Analytics API | `bash test-analytics-api.sh` |

---

## 🚀 常用操作

### 1. 初始化环境（首次启动）

```bash
# 1. Mint 代币
bash scripts/mint-tokens-simple.sh

# 2. 创建所有交易对并添加流动性
cd contracts
npx hardhat run scripts/add-liquidity.ts --network localhost
cd ..

# 3. 同步池子数据到数据库
bash scripts/sync-all-pools.sh
```

### 2. 重启后同步数据

```bash
# 同步所有池子
bash scripts/sync-all-pools.sh
```

### 3. 测试 API

```bash
# 测试 Analytics API
bash scripts/test-analytics-api.sh
```

---

## 📝 脚本说明

### mint-tokens-simple.sh
- **功能：** 给默认账户 Mint 所有测试代币
- **代币：** USDT, DAI, USDC
- **数量：** 每种 10000 个
- **前置：** Hardhat 节点运行，合约已部署

### sync-all-pools.sh
- **功能：** 从链上同步所有池子数据到数据库
- **包含池子：**
  - USDT/DAI
  - USDT/USDC
  - DAI/USDC
  - WETH/DAI
  - WETH/USDT
  - WETH/USDC
- **前置：** 后端服务运行

### test-analytics-api.sh
- **功能：** 测试所有 Analytics 和 History API
- **测试内容：**
  - 全局概览
  - 池子分析
  - Swap 历史
  - Liquidity 历史
- **前置：** 后端服务运行

---

## ⚠️ 注意事项

1. **运行顺序：** 先启动 Hardhat 节点和后端，再运行脚本
2. **环境变量：** 确保 .env 文件配置正确
3. **网络：** 所有脚本默认使用 localhost 网络
4. **错误处理：** 如果脚本失败，检查服务是否正常运行

---

## 🔗 相关文档

- [START_ALL.md](../START_ALL.md) - 启动所有服务
- [docs/guides/testing.md](../docs/guides/testing.md) - 测试指南
- [docs/phases/phase3/api-test-guide.md](../docs/phases/phase3/api-test-guide.md) - API 测试详细指南

---

**维护者：** DEX Team  
**最后更新：** 2025-10-30

