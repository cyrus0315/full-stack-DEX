# 🔑 Hardhat 账户列表和使用指南

## 📋 Hardhat 默认账户私钥

Hardhat 本地网络默认提供 20 个测试账户，每个账户都有 10000 ETH。

### Account #0 (Deployer - 通常已经在用)
```
地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Account #1 ⭐ 推荐用于测试
```
地址: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
私钥: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### Account #2
```
地址: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
私钥: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

### Account #3
```
地址: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
私钥: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
```

### Account #4
```
地址: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
私钥: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a
```

---

## 🔧 使用步骤

### 1. 在 MetaMask 中导入账户

1. 打开 MetaMask
2. 点击右上角账户图标
3. 选择 "Import Account"
4. 粘贴私钥（例如 Account #1 的私钥）
5. 点击 "Import"

### 2. 添加 Hardhat 本地网络

在 MetaMask 中：
- 网络名称: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- 货币符号: `ETH`

### 3. 给账户 Mint 代币

#### 方式 A：使用脚本（推荐）

```bash
cd /Users/h15/Desktop/dex/contracts

# 给 Account #1 mint 代币
pnpm hardhat run scripts/mint-tokens-to-account.ts --network localhost

# 或者指定账户索引
ACCOUNT_INDEX=2 pnpm hardhat run scripts/mint-tokens-to-account.ts --network localhost

# 或者指定地址
TARGET_ACCOUNT=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 pnpm hardhat run scripts/mint-tokens-to-account.ts --network localhost
```

#### 方式 B：快速命令

```bash
# Account #1
pnpm hardhat run scripts/mint-tokens-to-account.ts --network localhost

# Account #2
ACCOUNT_INDEX=2 pnpm hardhat run scripts/mint-tokens-to-account.ts --network localhost

# Account #3
ACCOUNT_INDEX=3 pnpm hardhat run scripts/mint-tokens-to-account.ts --network localhost
```

---

## 📝 添加代币到 MetaMask

Mint 代币后，需要在 MetaMask 中添加代币：

1. 切换到 Hardhat Local 网络
2. 点击 "Import tokens"
3. 输入代币地址（从 .env.deployed 文件中获取）：
   - DAI
   - USDT
   - USDC

代币地址在这里：
```bash
cat /Users/h15/Desktop/dex/contracts/.env.deployed
```

---

## ✅ 验证

导入账户并 mint 代币后，你应该看到：

- ✅ ETH 余额: ~10000 ETH
- ✅ DAI 余额: 10000 DAI
- ✅ USDT 余额: 10000 USDT
- ✅ USDC 余额: 10000 USDC

现在可以用这个账户进行交易了！

---

## 🔍 查看所有账户

运行这个脚本查看所有账户详情：

```bash
cd /Users/h15/Desktop/dex/contracts
SHOW_PRIVATE_KEY=true pnpm hardhat run scripts/show-accounts.ts --network localhost
```

---

## ⚠️ 安全提醒

**这些私钥仅用于本地开发！**

- ❌ 永远不要在主网使用这些私钥
- ❌ 永远不要向这些地址发送真实资金
- ❌ 这些是公开的测试私钥，任何人都知道

**在生产环境中：**
- ✅ 使用 MetaMask 生成的账户
- ✅ 妥善保管私钥
- ✅ 使用硬件钱包
