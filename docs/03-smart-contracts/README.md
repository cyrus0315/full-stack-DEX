# 📝 智能合约文档

DEX 项目基于 **UniswapV2** 架构，实现了完整的 AMM (自动做市商) 机制。

---

## 📚 合约总览

### 核心合约 (3 个)

| 合约 | 代码行数 | 功能 | 状态 |
|------|---------|------|------|
| [DEXPair](../../contracts/contracts/core/DEXPair.sol) | ~420 | AMM 核心，恒定乘积做市 | ✅ |
| [DEXFactory](../../contracts/contracts/core/DEXFactory.sol) | ~80 | 交易对创建和管理 | ✅ |
| [DEXRouter](../../contracts/contracts/periphery/DEXRouter.sol) | ~480 | 用户交易入口，封装复杂逻辑 | ✅ |

### 库合约 (3 个)

| 库 | 功能 |
|-----|------|
| [Math.sol](../../contracts/contracts/libraries/Math.sol) | 最小值、平方根计算 |
| [UQ112x112.sol](../../contracts/contracts/libraries/UQ112x112.sol) | 固定点数运算 (价格累计) |
| [RouterLibrary.sol](../../contracts/contracts/libraries/RouterLibrary.sol) | Router 辅助函数 |

### 测试合约 (2 个)

- MockERC20 - 测试代币 (USDT, DAI)
- WETH9 - Wrapped ETH

---

## 🔍 核心功能

### 1. AMM 机制

```solidity
// 恒定乘积公式
x * y = k

// 交易公式（含 0.3% 手续费）
amountOut = (amountIn × 997 × reserveOut) / (reserveIn × 1000 + amountIn × 997)
```

**特点**:
- 无需订单簿
- 自动定价
- 永久流动性

---

### 2. 流动性管理

#### 添加流动性

```solidity
function mint(address to) external returns (uint256 liquidity) {
    // 计算 LP token 数量
    if (_totalSupply == 0) {
        liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
    } else {
        liquidity = min(
            (amount0 * _totalSupply) / _reserve0,
            (amount1 * _totalSupply) / _reserve1
        );
    }
}
```

#### 移除流动性

```solidity
function burn(address to) external returns (uint256 amount0, uint256 amount1) {
    amount0 = (liquidity * balance0) / _totalSupply;
    amount1 = (liquidity * balance1) / _totalSupply;
}
```

---

### 3. 交易功能

#### 单跳交易

```solidity
function swapExactTokensForTokens(
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
) external returns (uint256[] memory amounts);
```

#### 多跳交易

支持通过多个池子进行交易，例如：
```
USDT → WETH → DAI
```

---

### 4. 价格预言机

**TWAP (时间加权平均价格)**:

```solidity
uint256 public price0CumulativeLast;
uint256 public price1CumulativeLast;
uint32 public blockTimestampLast;

function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
    uint32 blockTimestamp = uint32(block.timestamp % 2**32);
    uint32 timeElapsed = blockTimestamp - blockTimestampLast;
    
    if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
        price0CumulativeLast += uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
        price1CumulativeLast += uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
    }
}
```

**用途**:
- 抗闪电贷攻击
- 提供可靠的链上价格
- 支持外部协议集成

---

### 5. 闪电贷 (Flash Swap)

```solidity
function swap(
    uint256 amount0Out,
    uint256 amount1Out,
    address to,
    bytes calldata data
) external {
    // 先转出代币
    if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
    if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
    
    // 回调用户合约
    if (data.length > 0) IFlashSwapCallee(to).flashSwapCall(msg.sender, amount0Out, amount1Out, data);
    
    // 验证还款（含手续费）
    require(balance0 * balance1 >= _reserve0 * _reserve1 * (1000**2) / (997**2), 'K');
}
```

---

## 🔐 安全机制

### 1. 重入保护

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DEXPair is ReentrancyGuard {
    function swap(...) external nonReentrant {
        // ...
    }
}
```

### 2. 溢出保护

Solidity 0.8.x 自动检查溢出。

### 3. MINIMUM_LIQUIDITY 锁定

```solidity
uint256 public constant MINIMUM_LIQUIDITY = 10**3;

// 首次添加流动性时，锁定 1000 LP token 到死亡地址
_mint(DEAD_ADDRESS, MINIMUM_LIQUIDITY);
```

**作用**: 防止池子被完全抽空，避免除零错误。

---

## 📖 合约详解

详细的合约分析（待创建）:

- [DEXPair 详解](./core/DEXPair.md) - AMM 核心实现
- [DEXFactory 详解](./core/DEXFactory.md) - 工厂模式和 CREATE2
- [DEXRouter 详解](./core/DEXRouter.md) - 用户交互层

---

## 🚀 部署和测试

### 本地部署

```bash
cd contracts

# 启动本地节点
npx hardhat node

# 部署合约（新终端）
npx hardhat run scripts/deploy.ts --network localhost
```

### 部署地址

部署后的合约地址保存在 `contracts/.env.deployed`

### 添加流动性

```bash
npx hardhat run scripts/add-liquidity.ts --network localhost
```

---

## 🔧 已知问题和优化

### 1. CREATE2 地址计算

**当前方案**: 使用 `Factory.getPair()` 查询地址

**优化方案**: 使用 CREATE2 预计算地址（需要正确的 init code hash）

**收益**: 节省 ~3000 gas/调用

详见: [部署问题](../07-troubleshooting/deployment-issues.md)

---

### 2. 手续费分配

**当前**: 0.3% 全部给 LP

**可优化**: 协议手续费（如 0.05% 给协议，0.25% 给 LP）

---

## 📊 Gas 消耗

| 操作 | Gas 消耗 |
|------|---------|
| 创建交易对 | ~2,500,000 |
| 添加流动性（首次） | ~150,000 |
| 添加流动性 | ~120,000 |
| 移除流动性 | ~100,000 |
| 交易（单跳） | ~110,000 |
| 交易（多跳） | ~150,000 |

---

## 🔗 相关文档

- [部署指南](../06-deployment/)
- [问题排查](../07-troubleshooting/)
- [二期规划](../08-roadmap/phase2-planning.md) - 包含 V3 升级分析

---

## 📚 学习资源

- [UniswapV2 白皮书](https://uniswap.org/whitepaper.pdf)
- [UniswapV2 源码](https://github.com/Uniswap/v2-core)
- [AMM 原理详解](../10-reference/amm-explained.md) (待创建)

---

**下一步**: [后端 API 文档](../04-backend-api/) →

