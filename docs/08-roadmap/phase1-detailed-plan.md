# DEX 详细编码计划

## 🎯 MVP开发路线图（6-9周）

本文档提供详细的、按周划分的编码计划，每个任务都有明确的输入、输出和验证标准。

---

## 📅 Week 1: 智能合约核心（5天）

### 目标
完成核心AMM合约的开发和测试

### Day 1: 项目初始化 + 接口定义（4-6小时）

**任务**:
1. 初始化Hardhat项目
2. 配置开发环境
3. 定义核心接口

**代码清单**:
- [ ] `hardhat.config.ts` - Hardhat配置
- [ ] `contracts/interfaces/IDEXFactory.sol`
- [ ] `contracts/interfaces/IDEXPair.sol`
- [ ] `contracts/interfaces/IDEXRouter.sol`
- [ ] `contracts/libraries/Math.sol` - 数学库
- [ ] `contracts/libraries/UQ112x112.sol` - 定点数库

**验证标准**:
```bash
npx hardhat compile  # 无错误
```

### Day 2-3: DEXPair合约（10-12小时）

**任务**:
1. 实现LP代币功能（ERC20）
2. 实现mint/burn流动性
3. 实现swap功能
4. 实现价格预言机（TWAP）

**代码清单**:
- [ ] `contracts/core/DEXPair.sol`
- [ ] `test/DEXPair.test.ts`
- [ ] 测试用例覆盖率 > 90%

**关键函数**:
```solidity
function mint(address to) external returns (uint liquidity)
function burn(address to) external returns (uint amount0, uint amount1)
function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external
```

**测试场景**:
- [ ] 添加初始流动性
- [ ] 添加额外流动性
- [ ] 移除流动性
- [ ] Token0 → Token1 swap
- [ ] Token1 → Token0 swap
- [ ] 滑点保护测试
- [ ] K值恒定性测试

**验证标准**:
```bash
npx hardhat test test/DEXPair.test.ts
npx hardhat coverage  # Coverage > 90%
```

### Day 4: DEXFactory合约（4-6小时）

**任务**:
1. 实现创建交易对功能
2. 实现手续费管理
3. 编写测试

**代码清单**:
- [ ] `contracts/core/DEXFactory.sol`
- [ ] `test/DEXFactory.test.ts`

**关键函数**:
```solidity
function createPair(address tokenA, address tokenB) external returns (address pair)
function getPair(address tokenA, address tokenB) external view returns (address pair)
function setFeeTo(address _feeTo) external
```

**测试场景**:
- [ ] 创建新交易对
- [ ] 重复创建失败
- [ ] 查询交易对
- [ ] 手续费设置

**验证标准**:
```bash
npx hardhat test test/DEXFactory.test.ts  # 全部通过
```

### Day 5: DEXRouter合约（6-8小时）

**任务**:
1. 实现添加/移除流动性接口
2. 实现交换接口
3. 实现多跳交换
4. 编写测试

**代码清单**:
- [ ] `contracts/periphery/DEXRouter.sol`
- [ ] `test/DEXRouter.test.ts`

**关键函数**:
```solidity
function addLiquidity(...) external returns (uint amountA, uint amountB, uint liquidity)
function removeLiquidity(...) external returns (uint amountA, uint amountB)
function swapExactTokensForTokens(...) external returns (uint[] memory amounts)
function swapTokensForExactTokens(...) external returns (uint[] memory amounts)
```

**测试场景**:
- [ ] 添加流动性（双代币）
- [ ] 移除流动性
- [ ] 精确输入交换
- [ ] 精确输出交换
- [ ] 多跳交换（A → B → C）
- [ ] 截止时间测试
- [ ] 滑点保护测试

**验证标准**:
```bash
npx hardhat test
npx hardhat coverage  # 总覆盖率 > 95%
```

**Week 1 交付物**:
- ✅ 完整的AMM核心合约
- ✅ 测试覆盖率 > 95%
- ✅ 本地测试全部通过

---

## 📅 Week 2: 智能合约完善 + 部署（5天）

### Day 1: 测试代币和Mock合约（3-4小时）

**任务**:
1. 创建测试用ERC20代币
2. 创建Mock合约用于测试

**代码清单**:
- [ ] `contracts/test/MockERC20.sol`
- [ ] `contracts/test/WETH9.sol`

**验证标准**:
```bash
npx hardhat test  # 确保所有测试仍然通过
```

### Day 2: 本地部署脚本（4-6小时）

**任务**:
1. 编写部署脚本
2. 配置本地网络
3. 测试完整部署流程

**代码清单**:
- [ ] `scripts/deploy-local.ts`
- [ ] `scripts/utils/deploy-helpers.ts`

```typescript
// scripts/deploy-local.ts
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying DEX contracts to localhost...");
  
  // 1. 部署Factory
  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const factory = await DEXFactory.deploy(ethers.ZeroAddress);
  await factory.waitForDeployment();
  console.log("DEXFactory deployed to:", await factory.getAddress());
  
  // 2. 部署WETH
  const WETH = await ethers.getContractFactory("WETH9");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  console.log("WETH deployed to:", await weth.getAddress());
  
  // 3. 部署Router
  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  const router = await DEXRouter.deploy(
    await factory.getAddress(),
    await weth.getAddress()
  );
  await router.waitForDeployment();
  console.log("DEXRouter deployed to:", await router.getAddress());
  
  // 4. 部署测试代币
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("TokenA", "TKA", ethers.parseEther("1000000"));
  const tokenB = await MockERC20.deploy("TokenB", "TKB", ethers.parseEther("1000000"));
  await tokenA.waitForDeployment();
  await tokenB.waitForDeployment();
  console.log("TokenA deployed to:", await tokenA.getAddress());
  console.log("TokenB deployed to:", await tokenB.getAddress());
  
  // 5. 创建交易对
  await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
  const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
  console.log("Pair created at:", pairAddress);
  
  // 6. 保存部署信息
  const deploymentInfo = {
    factory: await factory.getAddress(),
    router: await router.getAddress(),
    weth: await weth.getAddress(),
    tokens: {
      tokenA: await tokenA.getAddress(),
      tokenB: await tokenB.getAddress()
    },
    pairs: {
      "TKA-TKB": pairAddress
    }
  };
  
  console.log("\nDeployment completed!");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**运行部署**:
```bash
# 终端1: 启动本地节点
npx hardhat node

# 终端2: 部署合约
npx hardhat run scripts/deploy-local.ts --network localhost
```

**验证标准**:
- [ ] Factory部署成功
- [ ] Router部署成功
- [ ] 测试代币部署成功
- [ ] 可以创建交易对

### Day 3: 测试网部署（Sepolia）（4-6小时）

**任务**:
1. 配置Sepolia网络
2. 获取测试ETH
3. 部署到Sepolia
4. 验证合约

**配置**:
```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;
```

**部署脚本**:
```typescript
// scripts/deploy-sepolia.ts
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", await ethers.provider.getBalance(deployer.address));

  // 部署逻辑...
  
  // 保存部署信息
  const deploymentInfo = { /* ... */ };
  fs.writeFileSync(
    "deployments/sepolia.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
}

main();
```

**执行部署**:
```bash
# 1. 获取测试ETH
# https://sepoliafaucet.com/

# 2. 部署
npx hardhat run scripts/deploy-sepolia.ts --network sepolia

# 3. 验证合约
npx hardhat verify --network sepolia FACTORY_ADDRESS
npx hardhat verify --network sepolia ROUTER_ADDRESS FACTORY_ADDRESS WETH_ADDRESS
```

**验证标准**:
- [ ] 合约部署成功
- [ ] Etherscan验证通过
- [ ] 保存部署地址

### Day 4-5: 集成测试 + 文档（8-10小时）

**任务**:
1. 编写端到端测试
2. 完善合约文档
3. 生成文档

**测试场景**:
```typescript
// test/integration/full-flow.test.ts
describe("Full DEX Flow", function () {
  it("should complete full liquidity and swap flow", async function () {
    // 1. 部署所有合约
    // 2. 添加流动性
    // 3. 执行多次swap
    // 4. 移除流动性
    // 5. 验证余额正确
  });
});
```

**文档生成**:
```bash
pnpm add -D solidity-docgen
npx hardhat docgen
```

**Week 2 交付物**:
- ✅ 本地部署成功
- ✅ Sepolia测试网部署成功
- ✅ 合约验证完成
- ✅ 完整的端到端测试
- ✅ 合约文档

---

## 📅 Week 3: 后端基础架构（5天）

### Day 1: Monorepo设置 + 共享库（6-8小时）

**任务**:
1. 设置pnpm workspace
2. 创建共享库
3. 定义通用类型

**目录结构**:
```
backend/
├── package.json
├── pnpm-workspace.yaml
├── shared/                  # 共享库
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── types/           # 类型定义
│       ├── utils/           # 工具函数
│       ├── config/          # 配置
│       └── constants/       # 常量
└── services/
    └── (各个微服务)
```

**共享类型**:
```typescript
// shared/src/types/order.types.ts
export interface Order {
  id: string;
  userId: string;
  pair: string;
  side: OrderSide;
  type: OrderType;
  price: string;  // 使用string避免精度问题
  amount: string;
  filled: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled';
```

**验证标准**:
```bash
cd backend/shared
pnpm build  # 成功编译
```

### Day 2: User Service基础（6-8小时）

**任务**:
1. 初始化NestJS项目
2. 配置数据库连接
3. 实现用户注册/登录

**创建项目**:
```bash
cd backend/services
npx @nestjs/cli new user-service

cd user-service
pnpm add @nestjs/typeorm typeorm pg
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @nestjs/config
pnpm add bcrypt class-validator class-transformer
```

**数据库Entity**:
```typescript
// user-service/src/user/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 42 })
  walletAddress: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ default: 'pending' })
  kycStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**认证Service**:
```typescript
// user-service/src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(walletAddress: string, email?: string) {
    const existing = await this.userRepo.findOne({ where: { walletAddress } });
    if (existing) {
      throw new Error('User already exists');
    }

    const user = this.userRepo.create({
      walletAddress: walletAddress.toLowerCase(),
      email,
    });

    await this.userRepo.save(user);

    return this.generateTokens(user);
  }

  async login(walletAddress: string) {
    const user = await this.userRepo.findOne({ where: { walletAddress: walletAddress.toLowerCase() } });
    if (!user) {
      throw new Error('User not found');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, address: user.walletAddress };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '1d' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
      },
    };
  }
}
```

**启动服务**:
```bash
pnpm start:dev
```

**测试API**:
```bash
# 注册
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234...","email":"user@example.com"}'

# 登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x1234..."}'
```

**验证标准**:
- [ ] 服务启动成功
- [ ] 可以注册新用户
- [ ] 可以登录
- [ ] JWT生成正确

### Day 3: 数据库设计 + 迁移（4-6小时）

**任务**:
1. 设计完整的数据库schema
2. 创建迁移脚本
3. 初始化数据

**数据库Schema**:
```sql
-- migrations/001_initial_schema.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255),
  kyc_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  pair VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL,
  type VARCHAR(10) NOT NULL,
  price DECIMAL(36, 18),
  amount DECIMAL(36, 18) NOT NULL,
  filled DECIMAL(36, 18) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair VARCHAR(50) NOT NULL,
  price DECIMAL(36, 18) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  buy_order_id UUID REFERENCES orders(id),
  sell_order_id UUID REFERENCES orders(id),
  tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE liquidity_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_address VARCHAR(42) UNIQUE NOT NULL,
  token0 VARCHAR(42) NOT NULL,
  token1 VARCHAR(42) NOT NULL,
  reserve0 DECIMAL(36, 18),
  reserve1 DECIMAL(36, 18),
  total_supply DECIMAL(36, 18),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_pair ON orders(pair);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_trades_pair ON trades(pair);
CREATE INDEX idx_trades_created_at ON trades(created_at);
```

**运行迁移**:
```bash
# 使用TypeORM CLI
npx typeorm migration:run
```

**验证标准**:
- [ ] 所有表创建成功
- [ ] 索引创建成功
- [ ] 外键约束正确

### Day 4-5: 配置管理 + 日志系统（6-8小时）

**任务**:
1. 设置配置管理
2. 集成日志系统
3. 配置Redis缓存

**配置管理**:
```typescript
// user-service/src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'dex_user',
    password: process.env.DB_PASSWORD || 'dev_password',
    database: process.env.DB_NAME || 'dex_dev',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: '1d',
  },
});
```

**日志系统**:
```typescript
// shared/src/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }
}
```

**Week 3 交付物**:
- ✅ Monorepo设置完成
- ✅ User Service运行
- ✅ 数据库Schema就绪
- ✅ 配置和日志系统完成

---

## 📅 Week 4: 核心后端服务（5天）

### Day 1-2: Wallet Service（10-12小时）

继续按照NODEJS_FULLSTACK.md中的代码实现...

### Day 3-4: Blockchain Listener（10-12小时）

### Day 5: Trading Service基础（6-8小时）

---

## 📅 Week 5-6: 前端开发

### Week 5: 基础框架 + 钱包连接

### Week 6: 交易界面 + 流动性管理

---

## 📅 Week 7-8: 集成与优化

### Week 7: 端到端集成测试

### Week 8: 性能优化 + Bug修复

---

## 📅 Week 9: 测试网部署

### 最终验收标准

**智能合约**:
- [ ] 部署到Sepolia测试网
- [ ] Etherscan验证通过
- [ ] 测试币可以交易

**后端服务**:
- [ ] 所有服务运行正常
- [ ] API响应时间 < 200ms
- [ ] 无内存泄漏

**前端应用**:
- [ ] 可以连接MetaMask
- [ ] 可以完成完整交易流程
- [ ] 响应式设计正常

**集成测试**:
- [ ] 端到端测试全部通过
- [ ] 压力测试通过
- [ ] 无重大Bug

---

## 🎯 快速参考

### 每日工作流程

1. **早上**（30分钟）
   - 查看昨日进度
   - 规划今日任务
   - 更新任务清单

2. **编码**（4-6小时）
   - 实现功能
   - 编写测试
   - 提交代码

3. **下午**（2-4小时）
   - 代码审查
   - 文档更新
   - 问题修复

4. **傍晚**（30分钟）
   - 运行所有测试
   - 记录进度
   - 规划明日

### 遇到问题时

1. 查阅相关文档
2. 搜索错误信息
3. 查看示例代码
4. 寻求帮助

### 关键资源

- [Solidity文档](https://docs.soliditylang.org/)
- [Hardhat文档](https://hardhat.org/docs)
- [NestJS文档](https://docs.nestjs.com/)
- [viem文档](https://viem.sh/)
- 项目文档: `docs/NODEJS_FULLSTACK.md`

---

**准备好开始了吗？从Week 1 Day 1开始！** 🚀

