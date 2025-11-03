# 🚀 快速添加流动性指南

## 前置条件
- ✅ MetaMask 已连接
- ✅ 已切换到 Hardhat 本地网络
- ✅ 账户里有 ETH

---

## 方法 1：通过前端操作（推荐）

### Step 1: 获取测试代币

#### 1.1 用 ETH 换 USDT
```
1. 访问 http://localhost:3000 (Swap 页面)
2. 你支付: ETH
3. 你接收: USDT
4. 输入金额: 1 ETH
5. 点击"立即交换"
6. MetaMask 确认交易
```

#### 1.2 用 ETH 换 DAI
```
1. 保持在 Swap 页面
2. 你支付: ETH
3. 你接收: DAI
4. 输入金额: 1 ETH
5. 点击"立即交换"
6. MetaMask 确认交易
```

现在你有了：
- ETH (剩余)
- USDT (~1 ETH 换的)
- DAI (~1 ETH 换的)

---

### Step 2: 添加流动性

```
1. 访问 http://localhost:3000/liquidity
2. 选择代币对:
   - 代币 A: USDT
   - 代币 B: DAI
3. 输入金额:
   - USDT: 100
   - DAI: 系统自动计算（或手动输入）
4. 查看预估信息
5. 点击"添加流动性"
6. 可能需要授权（首次使用）:
   - 第1次确认: 授权 USDT
   - 第2次确认: 授权 DAI
   - 第3次确认: 添加流动性
7. 等待交易完成 ✅
```

---

### Step 3: 查看流动性池

```
1. 访问 http://localhost:3000/pool
2. 查看你创建的交易对
3. 显示：
   - 💎 总流动性
   - 💰 储备量
   - 📊 价格
   - 📈 你的份额
```

---

## 方法 2：通过 API 测试（开发者）

如果后端服务正在运行，可以直接调用 API：

### 2.1 获取测试代币地址
```bash
# 查看部署的合约地址
cat contracts/.env.deployed
```

### 2.2 通过 API swap（需要先配置后端私钥）
```bash
# Swap ETH → USDT
curl -X POST http://localhost:3002/api/v1/swap \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "你的ETH地址",
    "tokenOut": "USDT合约地址",
    "amountIn": "1000000000000000000",
    "amountOutMin": "0",
    "recipient": "你的钱包地址",
    "deadline": 9999999999
  }'
```

### 2.3 添加流动性
```bash
curl -X POST http://localhost:3002/api/v1/liquidity/add \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": "USDT合约地址",
    "tokenB": "DAI合约地址",
    "amountADesired": "100000000000000000000",
    "amountBDesired": "100000000000000000000",
    "amountAMin": "95000000000000000000",
    "amountBMin": "95000000000000000000",
    "to": "你的钱包地址",
    "deadline": 9999999999
  }'
```

---

## 🐛 常见问题

### Q1: 交易失败 "Insufficient balance"
**A:** ETH 余额不足，确保账户有足够的 ETH

### Q2: "Insufficient allowance"
**A:** 需要先授权代币，点击按钮会自动触发授权

### Q3: 添加流动性按钮是灰色的
**A:** 检查：
- 是否已连接钱包
- 是否选择了两个代币
- 是否输入了有效金额
- 余额是否充足

### Q4: MetaMask 一直转圈
**A:** 
- 检查 Hardhat 节点是否运行
- 检查后端服务是否启动
- 查看浏览器控制台错误信息

### Q5: 看不到添加的流动性
**A:**
- 刷新 Pool 页面
- 检查交易是否成功（MetaMask → Activity）
- 查看浏览器控制台日志

---

## 📊 交易对建议

### 常见交易对
```
✅ USDT / DAI   - 稳定币对，价格稳定
✅ USDT / USDC  - 稳定币对
✅ ETH / USDT   - 主流币对
✅ ETH / DAI    - 主流币对
```

### 金额建议
```
测试环境：
- 小额测试: 10-100 单位
- 正常测试: 100-1000 单位
- 大额测试: 1000+ 单位
```

---

## 🎯 完整检查清单

### 准备阶段
- [ ] Hardhat 节点运行中 (端口 8545)
- [ ] Wallet Service 运行中 (端口 3001)
- [ ] Trading Service 运行中 (端口 3002)
- [ ] Frontend 运行中 (端口 3000)
- [ ] MetaMask 已安装并连接
- [ ] 已导入测试账户
- [ ] 账户有 ETH (至少 3 ETH)

### 操作阶段
- [ ] 用 ETH 换了 USDT
- [ ] 用 ETH 换了 DAI
- [ ] 前往 Liquidity 页面
- [ ] 选择代币对
- [ ] 输入金额
- [ ] 授权 USDT (如需要)
- [ ] 授权 DAI (如需要)
- [ ] 添加流动性
- [ ] 交易成功

### 验证阶段
- [ ] Pool 页面能看到交易对
- [ ] 显示正确的储备量
- [ ] Portfolio 能看到 LP 代币
- [ ] 交易历史有记录

---

## 💡 额外提示

### 测试账户默认余额
```
Hardhat 默认账户：
- 账户 #0: 10000 ETH
- 账户 #1: 10000 ETH
- ...
```

### 导入测试账户
```
1. 打开 MetaMask
2. 点击账户图标 → Import Account
3. 粘贴私钥（从 Hardhat 节点启动日志获取）
4. 点击 Import
```

### 查看 Hardhat 账户
```bash
# 在 contracts 目录
npx hardhat node

# 输出会显示：
# Account #0: 0xf39F... (10000 ETH)
# Private Key: 0xac09...
```

---

## 🎉 成功标志

当你看到以下内容，说明成功了：

1. **Swap 成功**
   ```
   ✅ 交易成功！
   余额已更新
   ```

2. **添加流动性成功**
   ```
   ✅ 添加流动性成功！
   LP 代币: xxx
   池份额: x.xx%
   ```

3. **Pool 页面显示**
   ```
   📦 共 X 个交易对
   
   ┌─────────────────────┐
   │ USDT / DAI          │
   │ 💰 储备量: xxx      │
   │ 📊 价格: xxx        │
   └─────────────────────┘
   ```

---

## 🔗 相关文档

- [UI_UPGRADE_SUMMARY.md](./UI_UPGRADE_SUMMARY.md) - UI 升级说明
- [QUICK_START.md](./QUICK_START.md) - 快速开始指南
- [E2E_TEST_GUIDE.md](../docs/E2E_TEST_GUIDE.md) - 端到端测试指南

---

**祝你测试顺利！** 🚀

