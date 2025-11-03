# 📚 参考资料

学习资源和技术参考。

---

## 📖 术语表

### AMM (Automated Market Maker)
自动做市商，无需订单簿的交易机制。

### LP (Liquidity Provider)
流动性提供者，为交易池提供资金的用户。

### LP Token
流动性凭证，代表用户在池子中的份额。

### Slippage
滑点，实际成交价格与预期价格的偏差。

### Impermanent Loss
无常损失，LP 因价格变化导致的相对损失。

### TWAP
时间加权平均价格，用于价格预言机。

### Flash Swap
闪电交易，先借后还的交易方式。

---

## 🎓 核心概念

### 1. 恒定乘积做市商 (x × y = k)

**原理**:
```
储备量乘积保持不变
x × y = k

交易前: x₁ × y₁ = k
交易后: x₂ × y₂ = k
```

**示例**:
```
池子: 1000 ETH × 2,000,000 USDT = 2,000,000,000

买入 10 ETH:
- 新的 ETH 储备: 990 ETH
- 新的 USDT 储备: 2,000,000,000 / 990 = 2,020,202 USDT
- 需支付: 2,020,202 - 2,000,000 = 20,202 USDT
- 价格: 2,020 USDT/ETH
```

---

### 2. 流动性池工作原理

**添加流动性**:
```
首次添加:
  LP tokens = sqrt(amountA × amountB) - MINIMUM_LIQUIDITY

后续添加:
  LP tokens = min(
    amountA × totalSupply / reserveA,
    amountB × totalSupply / reserveB
  )
```

**移除流动性**:
```
amountA = LP tokens × reserveA / totalSupply
amountB = LP tokens × reserveB / totalSupply
```

---

### 3. 价格影响计算

```typescript
priceImpact = (executionPrice - midPrice) / midPrice × 100%

where:
  midPrice = reserveOut / reserveIn
  executionPrice = amountOut / amountIn
```

---

### 4. 滑点保护

```solidity
// 精确输入
require(amountOut >= amountOutMin, "Slippage too high");

// 精确输出
require(amountIn <= amountInMax, "Slippage too high");
```

---

## 📚 UniswapV2 学习资源

### 官方文档
- [UniswapV2 文档](https://docs.uniswap.org/contracts/v2/overview)
- [白皮书](https://uniswap.org/whitepaper.pdf)
- [源码](https://github.com/Uniswap/v2-core)

### 教程
- [Uniswap V2 Book](https://www.rareskills.io/uniswap-v2-book)
- [Smart Contract Programmer - Uniswap V2](https://www.youtube.com/watch?v=Ui1TBPdnEJU)
- [Dapp University - Uniswap Tutorial](https://www.dappuniversity.com/articles/uniswap-tutorial)

---

## 🔧 开发工具

### Hardhat
- [Hardhat 文档](https://hardhat.org/docs)
- [Hardhat Network](https://hardhat.org/hardhat-network/docs)

### viem
- [viem 文档](https://viem.sh/)
- [viem vs ethers.js](https://viem.sh/++++++docs/ethers-migration.html)

### NestJS
- [NestJS 文档](https://docs.nestjs.com/)
- [NestJS 最佳实践](https://docs.nestjs.com/fundamentals/lifecycle-events)

### TypeORM
- [TypeORM 文档](https://typeorm.io/)
- [TypeORM 迁移](https://typeorm.io/migrations)

---

## 🌐 DeFi 生态

### 主流 DEX 对比

| DEX | 特点 | TVL |
|-----|------|-----|
| Uniswap V3 | 集中流动性 | $3B+ |
| Curve | 稳定币优化 | $2B+ |
| Balancer | 多代币池 | $1B+ |
| PancakeSwap | BSC 龙头 | $2B+ |

### AMM 变种

1. **恒定乘积** (x × y = k) - Uniswap V2
2. **恒定和** (x + y = k) - mStable
3. **混合曲线** - Curve StableSwap
4. **加权池** - Balancer
5. **集中流动性** - Uniswap V3

---

## 🔐 安全资源

### 审计公司
- [OpenZeppelin](https://www.openzeppelin.com/security-audits)
- [CertiK](https://www.certik.com/)
- [Trail of Bits](https://www.trailofbits.com/)
- [Consensys Diligence](https://consensys.net/diligence/)

### 安全工具
- [Slither](https://github.com/crytic/slither) - 静态分析
- [Mythril](https://github.com/ConsenSys/mythril) - 符号执行
- [Echidna](https://github.com/crytic/echidna) - 模糊测试

### 最佳实践
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [DeFi Security Summit](https://defisecuritysummit.org/)

---

## 📊 数据分析

### 链上数据
- [Dune Analytics](https://dune.com/)
- [The Graph](https://thegraph.com/)
- [Etherscan](https://etherscan.io/)

### DeFi 数据
- [DeFi Llama](https://defillama.com/)
- [DeFi Pulse](https://www.defipulse.com/)
- [Token Terminal](https://tokenterminal.com/)

---

## 🎥 视频教程

### Solidity
- [Solidity by Example](https://solidity-by-example.org/)
- [CryptoZombies](https://cryptozombies.io/)
- [Solidity 中文文档](https://solidity-cn.readthedocs.io/)

### DeFi
- [Finematics - DeFi Explained](https://www.youtube.com/c/Finematics)
- [Whiteboard Crypto](https://www.youtube.com/c/WhiteboardCrypto)

---

## 📖 推荐书籍

1. **Mastering Ethereum** - Andreas M. Antonopoulos
2. **How to DeFi** - CoinGecko
3. **The Infinite Machine** - Camila Russo

---

## 🔗 有用链接

### 开发社区
- [Ethereum Stack Exchange](https://ethereum.stackexchange.com/)
- [Solidity Discord](https://discord.gg/solidity)
- [DeFi Developers](https://discord.gg/defi)

### 测试网
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

### 浏览器
- [Ethereum Mainnet](https://etherscan.io/)
- [Arbitrum](https://arbiscan.io/)
- [Optimism](https://optimistic.etherscan.io/)

---

## 🆕 最新动态

### 关注项目
- [UniswapV4](https://github.com/Uniswap/v4-core) - Hooks 机制
- [LayerZero](https://layerzero.network/) - 跨链通信
- [EIP-4337](https://eips.ethereum.org/EIPS/eip-4337) - 账户抽象

---

**返回**: [文档首页](../README.md)

