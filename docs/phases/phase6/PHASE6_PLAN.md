# Phase 6: 价格预言机集成 - 详细实施计划

**开始时间：** 2025-11-02  
**预计完成：** 2025-11-06（4天）  
**优先级：** 🔴 高

---

## 📋 目标概述

为 DEX 项目集成价格预言机，实现真实的 USD 价格显示和计算。

### 核心目标
- ✅ 所有代币显示真实 USD 价格
- ✅ TVL 计算更准确（USD 计价）
- ✅ 用户资产显示 USD 价值
- ✅ 为后续功能（限价单、多链）奠定基础

### 预期收益
- 📊 数据展示更专业（USD 价格）
- 💰 TVL 统计更准确
- 👥 用户体验提升（直观的价格显示）
- 🎯 项目可信度增强

---

## 🏗️ 技术方案

### **方案选择：分阶段实施**

#### Phase 6.1: Mock Chainlink（本地开发）✅ 推荐先做
```
本地 Hardhat 网络 → MockChainlinkAggregator → PriceOracle
```
- 用于本地开发和测试
- 快速迭代，无需真实 LINK 代币
- 完全可控的测试环境

#### Phase 6.2: 真实 Chainlink（生产环境）🎯 后续部署
```
测试网/主网 → Chainlink Price Feeds → PriceOracle
```
- 部署到测试网或主网时使用
- 真实、可靠的价格数据
- 需要 LINK 代币支付

#### Phase 6.3: 降级方案（可选）📦 备用
```
PriceOracle 失败 → DEXPair reserves 计算 → 估算价格
```
- 预言机失败时的 fallback
- 保证系统可用性

---

## 📅 4天详细计划

### **Day 1: 合约开发（Mock Chainlink）**

#### 上午：设计和准备
- [x] 学习 Chainlink Price Feeds 接口
- [ ] 设计 PriceOracle 合约架构
- [ ] 创建 MockChainlinkAggregator 合约

#### 下午：合约实现
- [ ] 实现 PriceOracle.sol
  - getPrice(token) 函数
  - 支持多个代币
  - Fallback 机制
- [ ] 实现 MockChainlinkAggregator.sol
  - 模拟 Chainlink 接口
  - setPrice() 用于测试
- [ ] 编写单元测试
- [ ] 部署脚本（deploy-oracle.ts）

**预期产出：**
```solidity
// PriceOracle.sol
contract PriceOracle {
    function getPrice(address token) external view returns (uint256);
    function setPriceFeed(address token, address feed) external;
}

// MockChainlinkAggregator.sol
contract MockChainlinkAggregator {
    function latestRoundData() external view returns (...);
    function setPrice(int256 price) external;
}
```

---

### **Day 2: 后端集成**

#### 上午：PriceOracle 服务
- [ ] 创建 PriceOracle Module
  ```
  backend/services/analytics-service/src/modules/price-oracle/
  ```
- [ ] 实现 PriceOracleService
  - getTokenPrice(address): Promise<number>
  - getAllPrices(): Promise<Map<string, number>>
  - calculateUSDValue(amount, decimals, price): string
- [ ] 配置 Redis 缓存（TTL: 1分钟）
- [ ] 定时任务：每分钟更新价格

#### 下午：扩展现有 API
- [ ] 扩展 Pool DTO
  ```typescript
  reserve0USD: string
  reserve1USD: string
  tvlUSD: string
  token0PriceUSD: string
  token1PriceUSD: string
  ```
- [ ] 扩展 Analytics API
  ```typescript
  totalTvlUSD: string
  volume24hUSD: string
  ```
- [ ] 扩展 Farming API
  ```typescript
  stakedUSD: string
  pendingRewardUSD: string
  aprUSD: string
  ```
- [ ] 创建 Price API
  - GET /api/v1/price/:token
  - GET /api/v1/price/all

**预期产出：**
```typescript
// price-oracle.service.ts
class PriceOracleService {
  async getTokenPrice(address: string): Promise<number>
  async getAllPrices(): Promise<Map<string, number>>
  calculateUSDValue(amount: string, decimals: number, price: number): string
}
```

---

### **Day 3: 前端集成**

#### 上午：基础价格显示
- [ ] 创建 usePriceOracle Hook
  ```typescript
  const { prices, getPrice, loading } = usePriceOracle()
  ```
- [ ] Pool 页面显示 USD
  - TVL (USD)
  - Reserve (USD)
  - 24h Volume (USD)
- [ ] Swap 页面显示价格
  - 每个代币的 USD 价格
  - 交易金额 USD 价值

#### 下午：完善和优化
- [ ] Farming 页面显示 USD
  - Staked (USD)
  - Pending Reward (USD)
  - TVL (USD)
- [ ] Portfolio 页面
  - 总资产 USD 价值
  - 每个代币 USD 价值
- [ ] 添加货币切换（可选）
  - Token 数量 ↔ USD 价值
  - 用户偏好设置

**预期效果：**
```tsx
// Pool 页面
<Card>
  <Statistic 
    title="TVL" 
    value={`$${formatNumber(pool.tvlUSD)}`} 
  />
  <Text>Reserve: {pool.reserve0} DAI ($1,234.56)</Text>
</Card>

// Swap 页面
<Input 
  placeholder="0.0"
  suffix={<Text type="secondary">≈ $1,234.56</Text>}
/>
```

---

### **Day 4: 测试和文档**

#### 上午：全面测试
- [ ] 单元测试
  - 合约测试（Hardhat）
  - Service 测试（Jest）
  - Hook 测试（React Testing Library）
- [ ] 集成测试
  - 合约 → 后端 → 前端 E2E
  - 价格更新流程测试
- [ ] 性能测试
  - 缓存效果测试
  - 并发查询测试

#### 下午：文档和收尾
- [ ] 创建 API 测试脚本
  ```bash
  scripts/test-phase6-price-api.sh
  ```
- [ ] 编写 Phase 6 文档
  - 技术设计文档
  - API 文档
  - 使用指南
- [ ] 完成报告
  - PHASE6_COMPLETED.md
  - 功能演示
  - 后续优化建议

---

## 🛠️ 技术实现细节

### 1. **PriceOracle 合约**

#### 接口设计
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceOracle {
    // 代币 => Chainlink Price Feed 映射
    mapping(address => address) public priceFeeds;
    
    address public owner;
    
    event PriceFeedUpdated(address indexed token, address indexed feed);
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * 设置代币的 Price Feed（仅管理员）
     */
    function setPriceFeed(
        address token, 
        address feed
    ) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(feed != address(0), "Invalid feed");
        priceFeeds[token] = feed;
        emit PriceFeedUpdated(token, feed);
    }
    
    /**
     * 获取代币价格（以 USD 计价，8位小数）
     * @return price 价格（例如：100000000 = $1.00）
     */
    function getPrice(address token) external view returns (uint256) {
        address feed = priceFeeds[token];
        require(feed != address(0), "Price feed not set");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        (
            /* uint80 roundID */,
            int256 price,
            /* uint256 startedAt */,
            /* uint256 timeStamp */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        
        require(price > 0, "Invalid price");
        
        return uint256(price);
    }
    
    /**
     * 批量获取价格
     */
    function getPrices(
        address[] calldata tokens
    ) external view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            prices[i] = this.getPrice(tokens[i]);
        }
        return prices;
    }
}
```

---

### 2. **MockChainlinkAggregator 合约**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Mock Chainlink Aggregator - 用于本地测试
 */
contract MockChainlinkAggregator {
    int256 private _price;
    uint8 private _decimals;
    
    constructor(int256 initialPrice, uint8 decimals_) {
        _price = initialPrice;
        _decimals = decimals_;
    }
    
    function decimals() external view returns (uint8) {
        return _decimals;
    }
    
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            1,
            _price,
            block.timestamp,
            block.timestamp,
            1
        );
    }
    
    /**
     * 设置价格（仅用于测试）
     */
    function setPrice(int256 price) external {
        _price = price;
    }
}
```

---

### 3. **部署脚本**

```typescript
// scripts/deploy-oracle.ts
import { ethers } from 'hardhat'

async function main() {
  console.log('📊 开始部署价格预言机...\n')

  const [deployer] = await ethers.getSigners()
  console.log('部署账户:', deployer.address)

  // 1. 部署 PriceOracle
  const PriceOracle = await ethers.getContractFactory('PriceOracle')
  const oracle = await PriceOracle.deploy()
  await oracle.waitForDeployment()
  console.log('✅ PriceOracle 部署:', await oracle.getAddress())

  // 2. 部署 Mock Aggregators（本地测试用）
  const MockAggregator = await ethers.getContractFactory('MockChainlinkAggregator')
  
  // DAI: $1.00
  const daiAggregator = await MockAggregator.deploy(
    ethers.parseUnits('1', 8), // $1.00
    8
  )
  await daiAggregator.waitForDeployment()
  console.log('✅ DAI Aggregator 部署:', await daiAggregator.getAddress())

  // USDT: $1.00
  const usdtAggregator = await MockAggregator.deploy(
    ethers.parseUnits('1', 8),
    8
  )
  await usdtAggregator.waitForDeployment()
  console.log('✅ USDT Aggregator 部署:', await usdtAggregator.getAddress())

  // USDC: $1.00
  const usdcAggregator = await MockAggregator.deploy(
    ethers.parseUnits('1', 8),
    8
  )
  await usdcAggregator.waitForDeployment()
  console.log('✅ USDC Aggregator 部署:', await usdcAggregator.getAddress())

  // WETH: $2,000.00
  const wethAggregator = await MockAggregator.deploy(
    ethers.parseUnits('2000', 8),
    8
  )
  await wethAggregator.waitForDeployment()
  console.log('✅ WETH Aggregator 部署:', await wethAggregator.getAddress())

  // 3. 配置 Price Feeds
  // 从 .env.deployed 读取代币地址
  const DAI_ADDRESS = process.env.DAI_ADDRESS
  const USDT_ADDRESS = process.env.USDT_ADDRESS
  const USDC_ADDRESS = process.env.USDC_ADDRESS
  const WETH_ADDRESS = process.env.WETH_ADDRESS

  console.log('\n配置 Price Feeds...')
  await oracle.setPriceFeed(DAI_ADDRESS, await daiAggregator.getAddress())
  await oracle.setPriceFeed(USDT_ADDRESS, await usdtAggregator.getAddress())
  await oracle.setPriceFeed(USDC_ADDRESS, await usdcAggregator.getAddress())
  await oracle.setPriceFeed(WETH_ADDRESS, await wethAggregator.getAddress())
  console.log('✅ Price Feeds 配置完成')

  // 4. 验证价格
  console.log('\n验证价格...')
  const daiPrice = await oracle.getPrice(DAI_ADDRESS)
  console.log('DAI 价格:', ethers.formatUnits(daiPrice, 8), 'USD')

  // 5. 保存地址
  const addresses = {
    priceOracle: await oracle.getAddress(),
    aggregators: {
      DAI: await daiAggregator.getAddress(),
      USDT: await usdtAggregator.getAddress(),
      USDC: await usdcAggregator.getAddress(),
      WETH: await wethAggregator.getAddress(),
    }
  }

  console.log('\n📝 保存地址到 deployed-addresses.json')
  // 保存逻辑...

  console.log('\n🎉 价格预言机部署完成！')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
```

---

### 4. **后端 Service**

```typescript
// price-oracle.service.ts
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import PriceOracleABI from './abis/PriceOracle.json'

@Injectable()
export class PriceOracleService {
  private readonly logger = new Logger(PriceOracleService.name)
  private priceCache = new Map<string, { price: number; timestamp: number }>()
  private readonly CACHE_TTL = 60 * 1000 // 1分钟
  
  private publicClient
  private oracleAddress: string

  constructor(private configService: ConfigService) {
    this.oracleAddress = this.configService.get('PRICE_ORACLE_ADDRESS')
    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http(this.configService.get('BLOCKCHAIN_RPC_URL')),
    })
  }

  /**
   * 获取代币价格（带缓存）
   */
  async getTokenPrice(tokenAddress: string): Promise<number> {
    // 检查缓存
    const cached = this.priceCache.get(tokenAddress.toLowerCase())
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price
    }

    try {
      // 从链上读取
      const priceRaw = await this.publicClient.readContract({
        address: this.oracleAddress as `0x${string}`,
        abi: PriceOracleABI,
        functionName: 'getPrice',
        args: [tokenAddress as `0x${string}`],
      })

      // Chainlink 价格是 8 位小数
      const price = Number(priceRaw) / 1e8

      // 更新缓存
      this.priceCache.set(tokenAddress.toLowerCase(), {
        price,
        timestamp: Date.now(),
      })

      return price
    } catch (error) {
      this.logger.error(`获取价格失败 ${tokenAddress}:`, error)
      
      // 返回缓存值（如果有）
      if (cached) {
        this.logger.warn('使用过期缓存')
        return cached.price
      }
      
      throw error
    }
  }

  /**
   * 获取所有代币价格
   */
  async getAllPrices(): Promise<Map<string, number>> {
    const tokens = [
      this.configService.get('DAI_ADDRESS'),
      this.configService.get('USDT_ADDRESS'),
      this.configService.get('USDC_ADDRESS'),
      this.configService.get('WETH_ADDRESS'),
    ]

    const prices = new Map<string, number>()
    
    await Promise.all(
      tokens.map(async (token) => {
        try {
          const price = await this.getTokenPrice(token)
          prices.set(token.toLowerCase(), price)
        } catch (error) {
          this.logger.error(`获取价格失败 ${token}`)
        }
      })
    )

    return prices
  }

  /**
   * 计算 USD 价值
   */
  calculateUSDValue(
    amount: string,
    decimals: number,
    priceUSD: number,
  ): string {
    const value = (parseFloat(amount) / Math.pow(10, decimals)) * priceUSD
    return value.toFixed(2)
  }

  /**
   * 定时更新价格（预热缓存）
   */
  @Cron('*/1 * * * *') // 每分钟
  async updatePrices() {
    this.logger.debug('更新价格缓存...')
    try {
      await this.getAllPrices()
      this.logger.debug('价格缓存更新完成')
    } catch (error) {
      this.logger.error('价格更新失败:', error)
    }
  }
}
```

---

### 5. **前端 Hook**

```typescript
// usePriceOracle.ts
import { useState, useEffect } from 'react'
import { apiService } from '../services/api'

interface PriceMap {
  [address: string]: number
}

export const usePriceOracle = () => {
  const [prices, setPrices] = useState<PriceMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPrices()
    
    // 每分钟刷新一次
    const interval = setInterval(loadPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadPrices = async () => {
    try {
      setLoading(true)
      const data = await apiService.getAllPrices()
      setPrices(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
      console.error('获取价格失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (tokenAddress: string): number => {
    return prices[tokenAddress.toLowerCase()] || 0
  }

  const formatUSD = (amount: number, price: number): string => {
    const usdValue = amount * price
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(usdValue)
  }

  return {
    prices,
    loading,
    error,
    getPrice,
    formatUSD,
    refresh: loadPrices,
  }
}
```

---

## 📊 预期效果示例

### Pool 页面
```tsx
Before: TVL: 2,469,135.78 LP
After:  TVL: 2,469,135.78 LP ($2,469,135.78)
        Reserve: 1.2M DAI ($1.2M) | 1.2M USDT ($1.2M)
```

### Swap 页面
```tsx
From: 100 DAI ($100.00)
 ↓
To:   99.5 USDT ($99.50)

Price: 1 DAI = $1.00
```

### Farming 页面
```tsx
Your Staked: 1000 LP ($2,000.00)
Pending Reward: 50 DEX ($5.00)
APR: 150% ($3,000 yearly)
```

---

## ✅ 验收标准

### 功能性
- [ ] 所有代币都能获取 USD 价格
- [ ] Pool 页面显示 TVL (USD)
- [ ] Swap 页面显示代币价格
- [ ] Farming 页面显示 USD 价值
- [ ] Portfolio 显示总资产 USD 价值

### 性能
- [ ] 价格查询延迟 < 100ms（缓存命中）
- [ ] 价格查询延迟 < 500ms（缓存未命中）
- [ ] 缓存命中率 > 95%

### 可靠性
- [ ] 预言机失败时有降级方案
- [ ] 缓存过期时有 fallback
- [ ] 错误日志完整

---

## 🎯 下一步（Phase 6.5）

Phase 6 完成后，立即开始 Phase 6.5（The Graph 集成）：
- 进一步优化数据查询
- 降低后端负载
- 提升查询性能 10x

---

## 📚 参考资源

- [Chainlink Price Feeds](https://docs.chain.link/data-feeds/price-feeds)
- [Chainlink Contract Addresses](https://docs.chain.link/data-feeds/price-feeds/addresses)
- [Using Data Feeds](https://docs.chain.link/data-feeds/using-data-feeds)

---

**准备好了！立即开始 Day 1 的合约开发！** 🚀

