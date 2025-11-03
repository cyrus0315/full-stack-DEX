# DEX 编码实施计划

## 📋 总览

本文档提供详细的、可执行的编码计划，从零开始构建DEX项目。

**总时间**: 6-9周（MVP）  
**技术栈**: Solidity + Node.js (NestJS) + React + TypeScript  
**开发模式**: 迭代开发，每个阶段都可独立测试

---

## 🎯 开发原则

1. **先核心后外围** - 先实现核心功能，再添加辅助功能
2. **先后端后前端** - 先确保业务逻辑正确，再开发界面
3. **先本地后部署** - 先在本地测试通过，再部署测试网
4. **持续测试** - 每完成一个模块就测试
5. **文档同步** - 代码和文档同步更新

---

## 📅 开发时间线

```
Week 1:   环境搭建 + 智能合约核心
Week 2:   智能合约完善 + 测试
Week 3:   后端基础架构
Week 4:   后端核心服务（钱包、交易、监听）
Week 5:   前端基础 + 钱包连接
Week 6:   前端交易功能
Week 7-8: 集成测试 + 优化
Week 9:   测试网部署 + Bug修复
```

---

## 🚀 Phase 0: 环境准备（Day 1，2-4小时）

### 目标
搭建完整的开发环境和项目结构

### 任务清单

#### 1. 系统环境检查

```bash
# 检查版本
node --version  # 应该 >= 20.0.0
pnpm --version  # 应该 >= 8.0.0
docker --version
git --version

# 如果没有安装，参考GETTING_STARTED.md
```

#### 2. 创建项目结构

```bash
cd /Users/h15/Desktop/dex

# 初始化根package.json
cat > package.json << 'EOF'
{
  "name": "dex",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "contracts",
    "backend/services/*",
    "backend/shared",
    "frontend/*"
  ],
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "turbo": "^1.11.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
EOF

# 创建pnpm workspace配置
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'contracts'
  - 'backend/services/*'
  - 'backend/shared'
  - 'frontend/web-app'
  - 'frontend/mobile-app'
  - 'frontend/admin-dashboard'
EOF

# 安装根依赖
pnpm install
```

#### 3. Git配置

```bash
# 创建.gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
*.log

# Production
dist/
build/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.DS_Store
.vscode/
.idea/

# Contracts
artifacts/
cache/
typechain-types/

# Database
*.db
*.sqlite
EOF

# 初始化git（如果还没有）
git init
git add .
git commit -m "chore: initial project setup"
```

#### 4. 启动基础服务（Docker）

```bash
cd backend

# 创建docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: dex-postgres
    environment:
      POSTGRES_DB: dex_dev
      POSTGRES_USER: dex_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dex_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: dex-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  mongodb:
    image: mongo:7-jammy
    container_name: dex-mongodb
    environment:
      MONGO_INITDB_DATABASE: dex_logs
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  postgres_data:
  redis_data:
  mongodb_data:
EOF

# 启动服务
docker-compose up -d

# 检查状态
docker-compose ps
```

**验证**: 所有服务状态为`healthy`或`running`

---

## 🔐 Phase 1: 智能合约开发（Week 1-2）

### Week 1: 核心合约

#### Day 1-2: 项目初始化和核心接口

```bash
cd contracts

# 初始化Hardhat项目
pnpm init
pnpm add --save-dev hardhat @nomicfoundation/hardhat-toolbox
pnpm add @openzeppelin/contracts

# 初始化Hardhat
npx hardhat init
# 选择: Create a TypeScript project
```

**任务1.1**: 创建核心接口

```bash
mkdir -p contracts/interfaces
```

```solidity
// contracts/interfaces/IDEXFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDEXFactory {
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256
    );

    function createPair(address tokenA, address tokenB) 
        external returns (address pair);
    
    function getPair(address tokenA, address tokenB) 
        external view returns (address pair);
    
    function allPairs(uint256) external view returns (address pair);
    function allPairsLength() external view returns (uint256);
    
    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);
    
    function setFeeTo(address) external;
    function setFeeToSetter(address) external;
}
```

```solidity
// contracts/interfaces/IDEXPair.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDEXPair {
    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (
        uint112 reserve0,
        uint112 reserve1,
        uint32 blockTimestampLast
    );
    
    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function skim(address to) external;
    function sync() external;
    
    function initialize(address, address) external;
}
```

**验证**: 合约编译成功
```bash
npx hardhat compile
```

#### Day 3-4: DEXPair合约（核心AMM逻辑）

```solidity
// contracts/core/DEXPair.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IDEXPair.sol";
import "../libraries/Math.sol";
import "../libraries/UQ112x112.sol";

contract DEXPair is ERC20, ReentrancyGuard, IDEXPair {
    using UQ112x112 for uint224;

    uint public constant MINIMUM_LIQUIDITY = 10**3;
    
    address public factory;
    address public token0;
    address public token1;
    
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;
    
    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast;
    
    constructor() ERC20("DEX LP Token", "DEX-LP") {
        factory = msg.sender;
    }
    
    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "DEXPair: FORBIDDEN");
        token0 = _token0;
        token1 = _token1;
    }
    
    function getReserves() public view returns (
        uint112 _reserve0,
        uint112 _reserve1,
        uint32 _blockTimestampLast
    ) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    function mint(address to) external nonReentrant returns (uint liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;

        uint _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min(
                amount0 * _totalSupply / _reserve0,
                amount1 * _totalSupply / _reserve1
            );
        }
        
        require(liquidity > 0, "DEXPair: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);
        
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }
    
    function burn(address to) external nonReentrant returns (uint amount0, uint amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint balance0 = IERC20(_token0).balanceOf(address(this));
        uint balance1 = IERC20(_token1).balanceOf(address(this));
        uint liquidity = balanceOf(address(this));

        uint _totalSupply = totalSupply();
        amount0 = liquidity * balance0 / _totalSupply;
        amount1 = liquidity * balance1 / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "DEXPair: INSUFFICIENT_LIQUIDITY_BURNED");
        
        _burn(address(this), liquidity);
        IERC20(_token0).transfer(to, amount0);
        IERC20(_token1).transfer(to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }
    
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to,
        bytes calldata data
    ) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "DEXPair: INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "DEXPair: INSUFFICIENT_LIQUIDITY");

        uint balance0;
        uint balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "DEXPair: INVALID_TO");
            if (amount0Out > 0) IERC20(_token0).transfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).transfer(to, amount1Out);
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "DEXPair: INSUFFICIENT_INPUT_AMOUNT");
        
        {
            uint balance0Adjusted = balance0 * 1000 - amount0In * 3;
            uint balance1Adjusted = balance1 * 1000 - amount1In * 3;
            require(
                balance0Adjusted * balance1Adjusted >= uint(_reserve0) * uint(_reserve1) * (1000**2),
                "DEXPair: K"
            );
        }

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
    
    function skim(address to) external nonReentrant {
        address _token0 = token0;
        address _token1 = token1;
        IERC20(_token0).transfer(to, IERC20(_token0).balanceOf(address(this)) - reserve0);
        IERC20(_token1).transfer(to, IERC20(_token1).balanceOf(address(this)) - reserve1);
    }
    
    function sync() external nonReentrant {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }
    
    function _update(uint balance0, uint balance1, uint112 _reserve0, uint112 _reserve1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "DEXPair: OVERFLOW");
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            price0CumulativeLast += uint(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }
}
```

**测试**: 编写单元测试
```bash
# 创建测试文件
mkdir -p test
```

```typescript
// test/DEXPair.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { DEXPair, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("DEXPair", function () {
  let pair: DEXPair;
  let token0: MockERC20;
  let token1: MockERC20;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    // 部署测试代币
    const Token = await ethers.getContractFactory("MockERC20");
    token0 = await Token.deploy("Token0", "TK0", ethers.parseEther("10000"));
    token1 = await Token.deploy("Token1", "TK1", ethers.parseEther("10000"));
    
    // 确保token0 < token1 (地址排序)
    if (token0.target > token1.target) {
      [token0, token1] = [token1, token0];
    }
    
    // 部署Pair
    const Pair = await ethers.getContractFactory("DEXPair");
    pair = await Pair.deploy();
    await pair.initialize(token0.target, token1.target);
  });

  describe("Liquidity", function () {
    it("should add liquidity correctly", async function () {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");
      
      // 转账代币到pair
      await token0.transfer(pair.target, amount0);
      await token1.transfer(pair.target, amount1);
      
      // Mint LP代币
      await expect(pair.mint(owner.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, amount0, amount1);
      
      // 检查LP余额
      const lpBalance = await pair.balanceOf(owner.address);
      expect(lpBalance).to.be.gt(0);
      
      // 检查储备量
      const reserves = await pair.getReserves();
      expect(reserves[0]).to.equal(amount0);
      expect(reserves[1]).to.equal(amount1);
    });
  });

  describe("Swap", function () {
    beforeEach(async function () {
      // 添加初始流动性
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("2000");
      
      await token0.transfer(pair.target, amount0);
      await token1.transfer(pair.target, amount1);
      await pair.mint(owner.address);
    });

    it("should swap correctly", async function () {
      const swapAmount = ethers.parseEther("10");
      
      // 转入token0
      await token0.transfer(pair.target, swapAmount);
      
      // 计算预期输出
      const reserves = await pair.getReserves();
      const amountOut = getAmountOut(swapAmount, reserves[0], reserves[1]);
      
      // 执行swap
      await pair.swap(0, amountOut, user.address, "0x");
      
      // 验证user收到token1
      const balance = await token1.balanceOf(user.address);
      expect(balance).to.be.closeTo(amountOut, ethers.parseEther("0.001"));
    });
  });
});

// 辅助函数：计算输出金额
function getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): bigint {
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  return numerator / denominator;
}
```

**运行测试**:
```bash
npx hardhat test
```

**验证**: 所有测试通过 ✅

#### Day 5: DEXFactory和Router合约

继续实现Factory和Router合约...

---

## 🔧 Phase 2: 后端基础架构（Week 3）

### Day 1: 共享库搭建

```bash
cd backend
mkdir -p shared/src/{types,utils,config,constants}

# 初始化shared包
cd shared
pnpm init

# 安装依赖
pnpm add typescript
pnpm add -D @types/node

# 配置TypeScript
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
```

**创建共享类型**:

```typescript
// shared/src/types/index.ts
export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  pair: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price: number;
  amount: number;
  filled: number;
  status: 'pending' | 'partial' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface Trade {
  id: string;
  pair: string;
  price: number;
  amount: number;
  buyOrderId: string;
  sellOrderId: string;
  timestamp: number;
}

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled';
```

### Day 2-3: User Service基础

```bash
cd backend/services
npx @nestjs/cli new user-service

cd user-service
pnpm add @nestjs/typeorm typeorm pg
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @nestjs-modules/ioredis ioredis
pnpm add bcrypt
pnpm add -D @types/bcrypt @types/passport-jwt
```

**创建核心模块结构**:

```typescript
// user-service/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## 📊 完整实施计划（详细版本请查看下方）

由于完整计划很长，我将创建一个分阶段的详细版本...

---

## ✅ 每日检查清单

### 开发前
- [ ] 拉取最新代码
- [ ] 确保Docker服务运行
- [ ] 检查依赖是否最新

### 开发中
- [ ] 每完成一个功能就提交
- [ ] 编写单元测试
- [ ] 更新相关文档

### 开发后
- [ ] 运行所有测试
- [ ] 检查代码质量
- [ ] 推送到远程仓库

---

## 🎯 下一步

**立即执行**: Phase 0 环境准备

开始时间: ___________  
预计完成: ___________  
实际完成: ___________

**准备好了吗？让我们开始！** 🚀

