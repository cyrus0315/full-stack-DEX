# PriceService 集成说明

## 概述
PriceService 提供了获取代币 USD 价格的功能，其他模块可以通过注入 PriceService 来计算 USD 价值。

## 如何在其他模块中使用

### 1. 在模块中导入 PriceModule

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { PriceModule } from '../price/price.module';

@Module({
  imports: [
    forwardRef(() => PriceModule), // 使用 forwardRef 避免循环依赖
  ],
})
export class YourModule {}
```

### 2. 在 Service 中注入 PriceService

```typescript
import { Injectable } from '@nestjs/common';
import { PriceService } from '../price/price.service';

@Injectable()
export class YourService {
  constructor(
    private readonly priceService: PriceService,
  ) {}
  
  async someMethod() {
    // 获取单个代币价格
    const price = await this.priceService.getTokenPrice('0x...');
    
    // 计算 USD 价值
    const usdValue = await this.priceService.calculateUsdValue('0x...', '100');
    
    // 计算 LP Token USD 价值
    const lpUsdValue = await this.priceService.calculateLpTokenUsdValue(
      lpTokenAddress,
      amount,
      reserve0,
      reserve1,
      totalSupply,
      token0Address,
      token1Address,
    );
  }
}
```

## API 方法

### getTokenPrice(tokenAddress: string)
获取单个代币的 USD 价格

**返回：**
```typescript
{
  tokenAddress: string;
  symbol: string;
  priceUsd: string;
  lastUpdateTime?: Date;
  isActive: boolean;
}
```

### getTokenPrices(tokenAddresses: string[])
批量获取代币价格

### getAllPrices()
获取所有代币价格

### calculateUsdValue(tokenAddress: string, amount: string)
计算代币的 USD 价值

**示例：**
```typescript
const usdValue = await priceService.calculateUsdValue(
  '0x123...', // DAI 地址
  '1000',     // 1000 DAI
);
// 返回: "1000.00" (假设 DAI = $1)
```

### calculateLpTokenUsdValue(...)
计算 LP Token 的 USD 价值

## 集成清单

### PoolService 集成
- [ ] 注入 PriceService
- [ ] 在 toDto() 中计算 liquidityUsd
- [ ] 添加 token0PriceUsd 和 token1PriceUsd 字段

### FarmingService 集成
- [ ] 注入 PriceService  
- [ ] 更新 tvl 和 totalStakedUsd 使用实际 USD 价格
- [ ] 更新 dexPrice 使用实际价格
- [ ] 计算用户质押的实际 USD 价值

### AnalyticsService 集成
- [ ] 在统计数据中添加 USD 价值
- [ ] TVL 使用实际价格计算

## 注意事项

1. **循环依赖**：使用 `forwardRef()` 避免循环依赖
2. **错误处理**：价格获取可能失败，应该有默认值
3. **缓存**：PriceService 内部已实现缓存，每 30 秒自动刷新
4. **性能**：批量查询使用 `getTokenPrices()` 而非多次调用 `getTokenPrice()`

