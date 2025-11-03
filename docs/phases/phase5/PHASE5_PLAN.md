# Phase 5: 流动性挖矿（Liquidity Mining）

> 激励用户提供流动性，构建去中心化治理体系

---

## 📋 概述

**目标**：实现完整的流动性挖矿功能，用户通过质押 LP Token 获得 DEX 治理代币奖励。

**优先级**：高 🔥

**预计时间**：3-4 天

---

## 🎯 功能需求

### 1. 智能合约（✅ 已完成）

#### 1.1 DEXToken（治理代币）
- [x] ERC20 标准代币
- [x] 可铸造（Mintable）
- [x] 最大供应量限制
- [x] 销毁功能（Burnable）
- [x] 权限控制（Ownable）

**特点**：
- 名称：DEX Token
- 符号：DEX
- 最大供应：100,000,000 DEX
- 初始供应：0（全部通过挖矿产出）

#### 1.2 MasterChef（挖矿主合约）
- [x] 多池管理
- [x] 按区块分配奖励
- [x] 权重分配系统
- [x] 累积奖励计算
- [x] 质押/提取功能
- [x] 紧急提取功能
- [x] APR 计算
- [x] 重入攻击防护
- [x] 详细中文注释

**核心功能**：
- `add()` - 添加新挖矿池
- `set()` - 调整池子权重
- `deposit()` - 质押 LP Token
- `withdraw()` - 提取 LP Token（自动领取奖励）
- `pendingReward()` - 查询待领取奖励
- `updatePool()` - 更新池子奖励
- `emergencyWithdraw()` - 紧急提取

### 2. 后端 API（🔄 待实现）

#### 2.1 Farming Module

**数据库实体**：
```typescript
@Entity('farms')
export class Farm {
  @PrimaryColumn()
  poolId: number;           // 池子 ID
  
  @Column()
  lpTokenAddress: string;   // LP Token 地址
  
  @Column()
  lpTokenSymbol: string;    // LP Token 符号（如 DAI-USDT）
  
  @Column()
  allocPoint: string;       // 分配点数
  
  @Column()
  totalStaked: string;      // 总质押量
  
  @Column()
  apr: string;              // 年化收益率
  
  @Column()
  tvl: string;              // TVL（美元）
  
  @Column()
  lastRewardBlock: string;  // 上次奖励区块
  
  @Column()
  active: boolean;          // 是否激活
  
  @Column({ type: 'timestamp' })
  updatedAt: Date;
}

@Entity('user_farms')
export class UserFarm {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column()
  userAddress: string;      // 用户地址
  
  @Column()
  poolId: number;           // 池子 ID
  
  @Column()
  stakedAmount: string;     // 已质押数量
  
  @Column()
  pendingReward: string;    // 待领取奖励
  
  @Column()
  totalEarned: string;      // 累计收益
  
  @Column({ type: 'timestamp' })
  lastActionAt: Date;       // 最后操作时间
  
  @Column({ type: 'timestamp' })
  updatedAt: Date;
}
```

**API 端点**：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/farms` | 获取所有挖矿池列表 |
| GET | `/api/v1/farms/:poolId` | 获取单个池子详情 |
| GET | `/api/v1/farms/:poolId/apy` | 获取池子 APY |
| GET | `/api/v1/farms/:poolId/stats` | 获取池子统计数据 |
| GET | `/api/v1/farms/user/:address` | 获取用户在所有池子的质押情况 |
| GET | `/api/v1/farms/:poolId/user/:address` | 获取用户在指定池子的信息 |
| GET | `/api/v1/farms/leaderboard` | 获取质押排行榜 |

**示例响应**：

```typescript
// GET /api/v1/farms
{
  "success": true,
  "data": {
    "farms": [
      {
        "poolId": 0,
        "lpToken": {
          "address": "0x...",
          "symbol": "DAI-USDT LP",
          "token0": { "symbol": "DAI", "address": "0x..." },
          "token1": { "symbol": "USDT", "address": "0x..." }
        },
        "allocPoint": "100",
        "weight": 0.40,  // 40% 的奖励分配给这个池子
        "totalStaked": "50000.0",
        "totalStakedUsd": "52000.0",
        "apr": "125.5",  // 125.5% APR
        "apy": "248.2",  // 248.2% APY（复利）
        "dailyReward": "2880",  // 每天产出 2880 DEX
        "tvl": "52000",
        "active": true
      },
      // ...更多池子
    ],
    "summary": {
      "totalPools": 3,
      "totalTvl": "150000",
      "totalAllocPoint": "260",
      "rewardPerBlock": "10",
      "dexPrice": "1.05"
    }
  }
}

// GET /api/v1/farms/user/0x123...
{
  "success": true,
  "data": {
    "userAddress": "0x123...",
    "totalStakedUsd": "5200",
    "totalPendingReward": "125.5",
    "totalEarned": "850.2",
    "farms": [
      {
        "poolId": 0,
        "lpTokenSymbol": "DAI-USDT LP",
        "stakedAmount": "1000.0",
        "stakedUsd": "1040.0",
        "pendingReward": "50.5",
        "totalEarned": "300.2",
        "apr": "125.5",
        "shareOfPool": 2.0,  // 占池子 2%
        "lastActionAt": "2025-11-01T10:30:00Z"
      }
    ]
  }
}
```

#### 2.2 事件监听

**需要监听的事件**：

```solidity
// MasterChef 事件
event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint);
event PoolUpdated(uint256 indexed pid, uint256 allocPoint);
event RewardPaid(address indexed user, uint256 amount);
```

**监听器处理**：
```typescript
// blockchain-listener.service.ts 添加
private async listenFarmingEvents() {
  // 监听 Deposit 事件
  const depositLogs = await this.publicClient.getLogs({
    address: MASTER_CHEF_ADDRESS,
    event: parseAbiItem('event Deposit(address indexed user, uint256 indexed pid, uint256 amount)'),
    fromBlock: lastBlock,
    toBlock: currentBlock
  });
  
  for (const log of depositLogs) {
    await this.handleDeposit(log);
  }
  
  // 监听 Withdraw 事件...
  // 监听其他事件...
}

private async handleDeposit(log: Log) {
  const { user, pid, amount } = log.args;
  
  // 1. 更新用户质押信息
  await this.farmingService.updateUserStake(user, pid, amount);
  
  // 2. 更新池子总质押
  await this.farmingService.updatePoolTotalStaked(pid);
  
  // 3. 广播 WebSocket 事件
  this.eventsGateway.broadcastFarmingAction({
    type: 'deposit',
    user,
    poolId: pid,
    amount: amount.toString(),
  });
}
```

#### 2.3 定时任务

```typescript
// farming-scheduler.service.ts
@Injectable()
export class FarmingSchedulerService {
  
  // 每分钟更新一次所有池子数据
  @Cron('*/1 * * * *')
  async updateAllFarms() {
    const pools = await this.farmingService.getAllPools();
    
    for (const pool of pools) {
      // 从链上读取最新数据
      const poolInfo = await this.readPoolFromChain(pool.poolId);
      
      // 更新数据库
      await this.farmingService.updatePool(pool.poolId, poolInfo);
      
      // 计算 APR
      const apr = await this.farmingService.calculateAPR(pool.poolId);
      await this.farmingService.updatePoolAPR(pool.poolId, apr);
    }
  }
  
  // 每 5 分钟更新一次所有用户的待领取奖励
  @Cron('*/5 * * * *')
  async updateUserRewards() {
    const activeUsers = await this.farmingService.getActiveUsers();
    
    for (const user of activeUsers) {
      for (const poolId of user.pools) {
        const pending = await this.readPendingReward(poolId, user.address);
        await this.farmingService.updateUserPendingReward(
          user.address,
          poolId,
          pending
        );
      }
    }
  }
  
  // 每小时记录历史数据（用于图表）
  @Cron('0 * * * *')
  async recordHistory() {
    // 记录池子 TVL 历史
    // 记录用户质押历史
    // 记录 DEX 代币价格历史
  }
}
```

### 3. 前端页面（🔄 待实现）

#### 3.1 Farms 页面（/farms）

**功能**：
- [ ] 显示所有挖矿池列表
- [ ] 每个池子显示：LP Token、APR、TVL、已质押
- [ ] 筛选：按 APR 排序、按 TVL 排序
- [ ] 搜索：按 Token 名称搜索

**设计**：
```
┌────────────────────────────────────────────────────┐
│ 🌾 流动性挖矿                                      │
├────────────────────────────────────────────────────┤
│                                                     │
│  📊 总览                                           │
│  ┌──────────────┬──────────────┬─────────────┐   │
│  │ 总 TVL       │ 我的质押     │ 待领取奖励  │   │
│  │ $150,000     │ $5,200       │ 125.5 DEX   │   │
│  └──────────────┴──────────────┴─────────────┘   │
│                                                     │
│  🔍 [搜索]  排序：[APR ▼]                         │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ 💎 DAI-USDT LP          APR: 125.5%  ⭐️    │  │
│  │ TVL: $52,000           我的质押: $1,040     │  │
│  │ [详情] [质押] [提取]                        │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ 💎 DAI-USDC LP          APR: 98.2%          │  │
│  │ TVL: $45,000           我的质押: $0         │  │
│  │ [详情] [质押] [提取]                        │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└────────────────────────────────────────────────────┘
```

#### 3.2 Farm 详情页（/farms/:poolId）

**功能**：
- [ ] 显示池子详细信息
- [ ] 显示 APR 历史图表
- [ ] 显示 TVL 历史图表
- [ ] 质押操作界面
- [ ] 提取操作界面
- [ ] 显示待领取奖励并可一键领取

#### 3.3 My Farms 页面（/farms/me）

**功能**：
- [ ] 显示用户所有质押
- [ ] 汇总统计
- [ ] 收益历史图表
- [ ] 批量领取奖励

### 4. Hooks & Services（🔄 待实现）

#### 4.1 useFarming Hook

```typescript
// src/hooks/useFarming.ts
export const useFarming = () => {
  const { writeContract } = useWriteContract();
  
  // 授权 LP Token
  const approve = async (lpToken: string, amount: bigint) => {
    return writeContract({
      address: lpToken as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [MASTER_CHEF_ADDRESS, amount],
    });
  };
  
  // 质押
  const deposit = async (poolId: number, amount: bigint) => {
    return writeContract({
      address: MASTER_CHEF_ADDRESS,
      abi: MASTER_CHEF_ABI,
      functionName: 'deposit',
      args: [poolId, amount],
    });
  };
  
  // 提取
  const withdraw = async (poolId: number, amount: bigint) => {
    return writeContract({
      address: MASTER_CHEF_ADDRESS,
      abi: MASTER_CHEF_ABI,
      functionName: 'withdraw',
      args: [poolId, amount],
    });
  };
  
  // 查询待领取奖励
  const pendingReward = async (poolId: number, user: string) => {
    // 调用合约或后端 API
  };
  
  return { approve, deposit, withdraw, pendingReward };
};
```

---

## 🔧 技术细节

### 核心算法：累积奖励份额

**问题**：如何公平地分配奖励给不同时间加入、不同质押量的用户？

**解决方案**：使用累积奖励份额（Accumulated Reward Per Share）

#### 变量定义

```solidity
struct PoolInfo {
    uint256 accRewardPerShare;  // 累积的每份额奖励（×1e12）
    uint256 lastRewardBlock;    // 上次计算奖励的区块
    uint256 allocPoint;         // 分配权重
}

struct UserInfo {
    uint256 amount;             // 用户质押量
    uint256 rewardDebt;         // 奖励债务
}
```

#### 计算公式

**1. 更新池子**（每次有人操作或定时调用）

```
新奖励 = (当前区块 - 上次区块) × 每区块奖励 × 本池权重 / 总权重

accRewardPerShare += (新奖励 × 1e12) / 池子总质押量
```

**2. 计算用户待领取**

```
待领取 = (用户质押量 × accRewardPerShare / 1e12) - rewardDebt
```

**3. 用户质押/提取时更新 rewardDebt**

```
rewardDebt = 用户质押量 × accRewardPerShare / 1e12
```

#### 为什么这样设计？

1. **Gas 效率**：不需要遍历所有用户
2. **数学准确**：自动考虑时间和比例
3. **防止作弊**：rewardDebt 防止用户领取加入前的奖励

#### 具体例子

参见：`docs/phases/phase5/FARMING_EXPLAINED.md`

---

## 📝 实施步骤

### 阶段 1: 合约开发（✅ 已完成）
- [x] DEXToken 合约
- [x] MasterChef 合约
- [x] 部署脚本
- [x] 测试脚本

### 阶段 2: 后端开发（⏳ 下一步）
- [ ] 创建 Farming Module
- [ ] 实现数据库实体
- [ ] 实现 API 端点
- [ ] 添加事件监听
- [ ] 实现定时任务
- [ ] 编写单元测试

### 阶段 3: 前端开发
- [ ] 创建 Farms 页面
- [ ] 创建 Farm 详情页
- [ ] 创建 My Farms 页面
- [ ] 实现 useFarming Hook
- [ ] 集成 WebSocket 实时更新
- [ ] UI/UX 优化

### 阶段 4: 测试与优化
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 安全审计
- [ ] 文档完善

---

## 🧪 测试计划

### 合约测试
```bash
# 部署合约
cd blockchain
npx hardhat run scripts/deploy-farming.ts --network localhost

# 测试挖矿功能
npx hardhat run scripts/test-farming.ts --network localhost
```

### 后端测试
```bash
# 测试 API
./scripts/test-phase5-api.sh
```

### 前端测试
- 手动测试所有功能
- 测试不同场景（无质押、有质押、多池子等）

---

## 📊 成功指标

- [ ] 用户可以成功质押 LP Token
- [ ] 用户可以看到实时更新的待领取奖励
- [ ] 用户可以提取 LP Token 并自动领取奖励
- [ ] APR 计算准确
- [ ] 页面加载速度 < 2 秒
- [ ] 无安全漏洞

---

## 🚀 后续优化

1. **Boosted Farming**：质押 DEX 代币提升收益
2. **Referral Program**：推荐奖励
3. **Farming Pools V2**：支持多币种奖励
4. **Auto-compound**：自动复投
5. **Lock Farming**：锁定期越长收益越高
6. **NFT Boost**：持有特定 NFT 提升收益

---

## 📚 参考资料

- [SushiSwap MasterChef](https://github.com/sushiswap/sushiswap/blob/master/contracts/MasterChef.sol)
- [PancakeSwap MasterChef V2](https://github.com/pancakeswap/pancake-smart-contracts/blob/master/projects/farms-pools/contracts/MasterChefV2.sol)
- [Uniswap V3 Staker](https://github.com/Uniswap/v3-staker)

---

**当前状态**：合约开发完成 ✅，准备开始后端开发 ⏳

