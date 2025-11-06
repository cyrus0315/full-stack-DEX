# 生产环境部署指南 - Chainlink 价格预言机

## 📋 概览

从本地 Mock Chainlink 迁移到生产环境真实 Chainlink Price Feeds 的完整指南。

---

## 🔄 Mock vs 真实 Chainlink 对比

### 本地开发（当前）
- ✅ 使用 `MockChainlinkAggregator`
- ✅ 可以手动设置价格（方便测试）
- ✅ 完全可控
- ❌ 价格不反映真实市场

### 生产环境（目标）
- ✅ 使用真实的 Chainlink Price Feeds
- ✅ 价格来自真实市场数据
- ✅ 去中心化、可靠
- ⚠️ 需要配置正确的 Feed 地址

---

## 📍 Step 1: 获取 Chainlink Price Feed 地址

### 1.1 查询官方文档

访问 Chainlink 官方文档：
- **文档**: https://docs.chain.link/data-feeds/price-feeds/addresses
- **网络选择**: Ethereum Mainnet / Polygon / BSC / Arbitrum 等

### 1.2 常用 Price Feed 地址

#### Ethereum Mainnet

| Token Pair | Address | Decimals |
|-----------|---------|----------|
| ETH/USD | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` | 8 |
| BTC/USD | `0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c` | 8 |
| USDT/USD | `0x3E7d1eAB13ad0104d2750B8863b489D65364e32D` | 8 |
| USDC/USD | `0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6` | 8 |
| DAI/USD | `0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9` | 8 |

#### Polygon Mainnet

| Token Pair | Address | Decimals |
|-----------|---------|----------|
| MATIC/USD | `0xAB594600376Ec9fD91F8e885dADF0CE036862dE0` | 8 |
| ETH/USD | `0xF9680D99D6C9589e2a93a78A04A279e509205945` | 8 |
| USDT/USD | `0x0A6513e40db6EB1b165753AD52E80663aeA50545` | 8 |
| USDC/USD | `0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7` | 8 |

#### Arbitrum One

| Token Pair | Address | Decimals |
|-----------|---------|----------|
| ETH/USD | `0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612` | 8 |
| BTC/USD | `0x6ce185860a4963106506C203335A2910413708e9` | 8 |

> 💡 **提示**: 访问官方文档获取最新地址

---

## 📝 Step 2: 修改部署脚本

### 2.1 创建生产部署配置

创建 `scripts/deploy-oracle-production.ts`:

```typescript
/**
 * 生产环境 PriceOracle 部署脚本
 * 
 * 使用真实的 Chainlink Price Feeds
 */

import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

// 真实的 Chainlink Price Feed 地址（根据网络选择）
const CHAINLINK_FEEDS = {
  // Ethereum Mainnet
  mainnet: {
    ETH_USD: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    BTC_USD: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    USDT_USD: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    USDC_USD: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    DAI_USD: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
  },
  // Polygon Mainnet
  polygon: {
    MATIC_USD: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    ETH_USD: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    USDT_USD: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    USDC_USD: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
  },
  // Arbitrum One
  arbitrum: {
    ETH_USD: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    BTC_USD: '0x6ce185860a4963106506C203335A2910413708e9',
  },
}

async function main() {
  const network = process.env.HARDHAT_NETWORK || 'mainnet'
  console.log(`\n🚀 部署 PriceOracle 到 ${network}...\n`)

  const [deployer] = await ethers.getSigners()
  console.log('👤 部署账户:', deployer.address)

  // 1. 部署 PriceOracle
  const PriceOracle = await ethers.getContractFactory('PriceOracle')
  const oracle = await PriceOracle.deploy(deployer.address)
  await oracle.waitForDeployment()
  
  const oracleAddress = await oracle.getAddress()
  console.log('✅ PriceOracle 已部署:', oracleAddress)

  // 2. 读取已部署的代币地址
  const deployedAddressesPath = path.join(__dirname, '../deployed-addresses.json')
  const deployedAddresses = JSON.parse(fs.readFileSync(deployedAddressesPath, 'utf8'))

  // 3. 配置 Price Feeds（使用真实的 Chainlink）
  const feeds = CHAINLINK_FEEDS[network as keyof typeof CHAINLINK_FEEDS]
  
  if (!feeds) {
    throw new Error(`❌ 不支持的网络: ${network}`)
  }

  console.log('\n⚙️  配置 Price Feeds...\n')

  // WETH -> ETH/USD
  if (deployedAddresses.WETH && feeds.ETH_USD) {
    const tx = await oracle.setPriceFeed(deployedAddresses.WETH, feeds.ETH_USD)
    await tx.wait()
    console.log(`✅ WETH -> ${feeds.ETH_USD}`)
  }

  // USDT -> USDT/USD
  if (deployedAddresses.USDT && feeds.USDT_USD) {
    const tx = await oracle.setPriceFeed(deployedAddresses.USDT, feeds.USDT_USD)
    await tx.wait()
    console.log(`✅ USDT -> ${feeds.USDT_USD}`)
  }

  // USDC -> USDC/USD
  if (deployedAddresses.USDC && feeds.USDC_USD) {
    const tx = await oracle.setPriceFeed(deployedAddresses.USDC, feeds.USDC_USD)
    await tx.wait()
    console.log(`✅ USDC -> ${feeds.USDC_USD}`)
  }

  // DAI -> DAI/USD
  if (deployedAddresses.DAI && feeds.DAI_USD) {
    const tx = await oracle.setPriceFeed(deployedAddresses.DAI, feeds.DAI_USD)
    await tx.wait()
    console.log(`✅ DAI -> ${feeds.DAI_USD}`)
  }

  // 4. 验证价格读取
  console.log('\n🔍 验证价格读取...\n')
  
  if (deployedAddresses.WETH) {
    const price = await oracle.getPrice(deployedAddresses.WETH)
    const usdPrice = ethers.formatUnits(price, 8)
    console.log(`WETH 当前价格: $${usdPrice}`)
  }

  // 5. 保存配置
  const config = {
    network,
    priceOracle: oracleAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    priceFeeds: feeds,
  }

  fs.writeFileSync(
    path.join(__dirname, '../deployed-oracle-production.json'),
    JSON.stringify(config, null, 2)
  )

  console.log('\n✅ 部署完成！')
  console.log('📋 配置已保存到: deployed-oracle-production.json\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 部署失败:', error)
    process.exit(1)
  })
```

### 2.2 更新 hardhat.config.ts

添加网络配置：

```typescript
import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    // 本地开发
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    
    // Sepolia 测试网
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    
    // Ethereum 主网
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
    },
    
    // Polygon 主网
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
    },
  },
};

export default config;
```

---

## 🧪 Step 3: 测试网部署测试

### 3.1 部署到 Sepolia 测试网

```bash
# 1. 设置环境变量
export SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

# 2. 部署到 Sepolia
cd contracts
pnpm hardhat run scripts/deploy-oracle-production.ts --network sepolia

# 3. 验证合约（可选）
pnpm hardhat verify --network sepolia <ORACLE_ADDRESS> <DEPLOYER_ADDRESS>
```

### 3.2 验证价格数据

```bash
# 运行测试脚本
pnpm hardhat run scripts/test-oracle.ts --network sepolia
```

---

## 🚀 Step 4: 主网部署

### 4.1 部署前检查清单

- [ ] 确认使用正确的 Price Feed 地址
- [ ] 确认部署账户有足够的 ETH（Gas费）
- [ ] 备份私钥和助记词
- [ ] 在测试网验证过所有功能
- [ ] 准备好 Etherscan API Key（用于验证）
- [ ] 设置合适的 gas price

### 4.2 执行部署

```bash
# 1. 设置环境变量
export MAINNET_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export PRIVATE_KEY="your_private_key"
export ETHERSCAN_API_KEY="your_etherscan_key"

# 2. 部署到主网
cd contracts
pnpm hardhat run scripts/deploy-oracle-production.ts --network mainnet

# 3. 验证合约
pnpm hardhat verify --network mainnet <ORACLE_ADDRESS> <DEPLOYER_ADDRESS>
```

---

## 🔧 Step 5: 更新后端配置

### 5.1 更新 .env

```bash
# backend/services/analytics-service/.env

# 更新 RPC URL（使用主网）
BLOCKCHAIN_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BLOCKCHAIN_RPC_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BLOCKCHAIN_CHAIN_ID=1

# 更新 PriceOracle 地址
PRICE_ORACLE_ADDRESS=<刚部署的地址>

# 更新代币地址（主网地址）
WETH_ADDRESS=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
DAI_ADDRESS=0x6B175474E89094C44Da98b954EedeAC495271d0F
USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

### 5.2 更新前端配置

```bash
# frontend/web-app/.env

VITE_CHAIN_ID=1
VITE_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_PRICE_ORACLE_ADDRESS=<刚部署的地址>

# 更新代币地址（主网地址）
VITE_WETH_ADDRESS=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
VITE_USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_DAI_ADDRESS=0x6B175474E89094C44Da98b954EedeAC495271d0F
VITE_USDC_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
```

---

## ✅ Step 6: 验证和测试

### 6.1 后端测试

```bash
# 1. 启动后端
cd backend/services/analytics-service
pnpm run init:prices  # 初始化价格追踪
pnpm start:dev

# 2. 测试 API
curl http://localhost:3002/api/v1/price
# 应该返回真实的市场价格
```

### 6.2 前端测试

```bash
# 1. 启动前端
cd frontend/web-app
pnpm dev

# 2. 检查
# - Swap 页面显示真实 USD 价格
# - 价格每30秒自动更新
# - 价格反映真实市场数据
```

---

## 🎯 关键差异对比

| 项目 | Mock (本地) | 真实 Chainlink (生产) |
|-----|------------|---------------------|
| **合约** | MockChainlinkAggregator | 真实 Chainlink Aggregator |
| **价格来源** | 手动设置 | 去中心化 Oracle 网络 |
| **更新频率** | 手动触发 | 自动更新（链上） |
| **价格准确性** | 固定值 | 实时市场价格 |
| **Gas 消耗** | 本地免费 | 需要真实 ETH |
| **可靠性** | 测试用 | 生产级别 |

---

## 🔐 安全注意事项

### 1. 私钥管理
```bash
# ❌ 错误：直接在代码中
const PRIVATE_KEY = "0x123..."

# ✅ 正确：使用环境变量
const PRIVATE_KEY = process.env.PRIVATE_KEY
```

### 2. Price Feed 验证
```solidity
// 部署后务必验证
function verifyPriceFeed(address token) external view {
    require(hasPriceFeed(token), "Feed not set");
    uint256 price = getPrice(token);
    require(price > 0, "Invalid price");
}
```

### 3. 访问控制
```solidity
// 确保只有 owner 可以更新 Feed
function setPriceFeed(address token, address feed) external onlyOwner {
    // ...
}
```

---

## 📚 相关资源

- [Chainlink Price Feeds 文档](https://docs.chain.link/data-feeds/price-feeds/addresses)
- [Chainlink 网络列表](https://docs.chain.link/resources/link-token-contracts)
- [Hardhat 部署指南](https://hardhat.org/guides/deploying.html)
- [Etherscan 验证指南](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan.html)

---

## 🆘 常见问题

### Q1: 如何获取免费的 RPC URL？
**A**: 
- Alchemy: https://www.alchemy.com/
- Infura: https://infura.io/
- QuickNode: https://www.quicknode.com/

### Q2: 部署需要多少 Gas？
**A**: 
- PriceOracle 部署: ~1,500,000 gas
- 配置 Price Feed: ~50,000 gas/token
- 总计约: 0.02-0.05 ETH（取决于 gas price）

### Q3: 如何切换不同的网络？
**A**: 只需更改 `--network` 参数：
```bash
pnpm hardhat run scripts/deploy-oracle-production.ts --network polygon
```

### Q4: 价格多久更新一次？
**A**: 
- Chainlink 自动更新（通常每小时或价格变动 >0.5%）
- 后端缓存：30秒刷新一次
- 前端显示：30秒刷新一次

---

## 🎓 总结

从 Mock 到生产的迁移步骤：

1. ✅ **获取真实 Feed 地址** - 从 Chainlink 文档
2. ✅ **修改部署脚本** - 使用真实地址
3. ✅ **测试网验证** - Sepolia/Goerli
4. ✅ **主网部署** - 谨慎操作
5. ✅ **更新配置** - 后端 + 前端
6. ✅ **全面测试** - 验证功能

**迁移时间**: 约2-4小时（包括测试）

**成本估算**:
- 测试网: 免费（使用测试 ETH）
- 主网: ~0.05 ETH（Gas费）

