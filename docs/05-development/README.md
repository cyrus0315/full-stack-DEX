# DEX 开发规范指南

## 1. 代码规范

### 1.1 通用规范

#### 1.1.1 命名规范

**文件命名**:
- TypeScript/JavaScript: `camelCase.ts`, `PascalCase.tsx` (组件)
- Solidity: `PascalCase.sol`
- Go: `snake_case.go`
- 测试文件: `*.test.ts`, `*.spec.ts`, `*_test.go`

**变量命名**:
```typescript
// 常量 - 大写蛇形
const MAX_SLIPPAGE = 0.5;
const DEFAULT_DEADLINE = 300;

// 变量 - 驼峰
let userBalance = 0;
const tokenAddress = "0x...";

// 类/接口 - 帕斯卡
class TokenSwap {}
interface IRouter {}

// 私有属性 - 下划线前缀
class Wallet {
  private _privateKey: string;
}
```

**函数命名**:
```typescript
// 动词开头
function getUserBalance() {}
async function fetchPriceData() {}
function calculateSlippage() {}
function isValidAddress() {}
function hasPermission() {}
```

**Solidity命名**:
```solidity
// 状态变量 - 驼峰
uint256 public totalSupply;
address private _owner;

// 函数 - 驼峰
function addLiquidity() external {}
function _mintFee() private {}

// 事件 - 帕斯卡
event Swap(address indexed sender, uint amount0In, uint amount1In);
event LiquidityAdded(address indexed provider, uint liquidity);

// 修饰符 - 驼峰
modifier onlyOwner() {}
modifier ensure(uint deadline) {}
```

#### 1.1.2 注释规范

**TypeScript/JavaScript**:
```typescript
/**
 * 计算交换输出金额
 * @param amountIn 输入金额
 * @param reserveIn 输入储备量
 * @param reserveOut 输出储备量
 * @returns 输出金额
 */
function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  // 验证输入
  if (amountIn <= 0n) {
    throw new Error('Insufficient input amount');
  }
  
  // 计算输出金额 (x * y = k)
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  
  return numerator / denominator;
}
```

**Solidity**:
```solidity
/// @title DEX Router
/// @author DEX Team
/// @notice 路由合约，处理代币交换和流动性管理
/// @dev 基于Uniswap V2协议实现
contract DEXRouter {
    /**
     * @notice 精确输入的代币交换
     * @param amountIn 输入金额
     * @param amountOutMin 最小输出金额（滑点保护）
     * @param path 交换路径
     * @param to 接收地址
     * @param deadline 截止时间
     * @return amounts 每步交换金额数组
     */
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        // implementation
    }
}
```

**Go**:
```go
// OrderBook 管理订单簿数据结构
type OrderBook struct {
    bids *PriorityQueue  // 买单队列
    asks *PriorityQueue  // 卖单队列
    mu   sync.RWMutex    // 读写锁
}

// AddOrder 添加订单到订单簿
// 参数:
//   - order: 待添加的订单
// 返回:
//   - error: 如果添加失败则返回错误
func (ob *OrderBook) AddOrder(order *Order) error {
    // implementation
}
```

### 1.2 TypeScript/JavaScript规范

#### 1.2.1 ESLint配置

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

#### 1.2.2 代码风格

**导入顺序**:
```typescript
// 1. 外部依赖
import React from 'react';
import { useState, useEffect } from 'react';

// 2. 内部依赖
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';

// 3. 类型导入
import type { Token, SwapParams } from '@/types';

// 4. 样式
import styles from './SwapWidget.module.css';
```

**类型优先**:
```typescript
// ✅ 推荐 - 使用接口
interface User {
  id: string;
  address: string;
  balance: bigint;
}

// ✅ 使用类型别名处理联合类型
type OrderStatus = 'pending' | 'filled' | 'cancelled';

// ❌ 避免使用 any
function processData(data: any) {} // 不推荐

// ✅ 使用具体类型
function processData(data: unknown) {
  if (isValidData(data)) {
    // 类型收窄
  }
}
```

**异步处理**:
```typescript
// ✅ 使用 async/await
async function fetchUserBalance(address: string): Promise<bigint> {
  try {
    const balance = await provider.getBalance(address);
    return balance;
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    throw new Error('Balance fetch failed');
  }
}

// ✅ 错误处理
async function executeSwap(params: SwapParams) {
  try {
    const tx = await contract.swap(params);
    await tx.wait();
    return { success: true, txHash: tx.hash };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error' };
  }
}
```

### 1.3 Solidity规范

#### 1.3.1 版本和导入

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 使用命名导入
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
```

#### 1.3.2 合约结构

```solidity
contract DEXPair is ERC20, ReentrancyGuard {
    // 1. 类型声明
    using SafeMath for uint256;
    
    // 2. 状态变量
    address public factory;
    address public token0;
    address public token1;
    
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;
    
    // 3. 事件
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
    
    // 4. 错误定义（Solidity 0.8.4+）
    error InsufficientLiquidity();
    error InvalidTo();
    error InsufficientOutputAmount();
    
    // 5. 修饰符
    modifier ensure(uint deadline) {
        require(deadline >= block.timestamp, "DEXRouter: EXPIRED");
        _;
    }
    
    // 6. 构造函数
    constructor() ERC20("DEX LP Token", "DEX-LP") {
        factory = msg.sender;
    }
    
    // 7. 外部函数
    function mint(address to) external nonReentrant returns (uint liquidity) {
        // implementation
    }
    
    // 8. 公共函数
    function getReserves() public view returns (
        uint112 _reserve0,
        uint112 _reserve1,
        uint32 _blockTimestampLast
    ) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    // 9. 内部函数
    function _update(
        uint balance0,
        uint balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        // implementation
    }
    
    // 10. 私有函数
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        // implementation
    }
}
```

#### 1.3.3 安全最佳实践

```solidity
// ✅ 使用自定义错误（节省gas）
error InsufficientBalance(uint256 available, uint256 required);

function withdraw(uint256 amount) external {
    if (balances[msg.sender] < amount) {
        revert InsufficientBalance(balances[msg.sender], amount);
    }
    // ...
}

// ✅ 检查-效果-交互模式（避免重入）
function withdraw(uint256 amount) external nonReentrant {
    // 1. 检查
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 2. 效果
    balances[msg.sender] -= amount;
    
    // 3. 交互
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}

// ✅ 使用 SafeMath 或 Solidity 0.8+（内置溢出检查）
uint256 total = amount1 + amount2; // 0.8+ 自动检查溢出

// ✅ 输入验证
function swap(uint amountIn, address[] calldata path) external {
    require(amountIn > 0, "Invalid amount");
    require(path.length >= 2, "Invalid path");
    require(path[0] != path[path.length - 1], "Invalid path");
    // ...
}

// ✅ 使用修饰符进行访问控制
modifier onlyOwner() {
    require(msg.sender == owner, "Not owner");
    _;
}

// ✅ 紧急暂停机制
bool public paused;

modifier whenNotPaused() {
    require(!paused, "Paused");
    _;
}

function setPaused(bool _paused) external onlyOwner {
    paused = _paused;
}
```

### 1.4 Go规范

#### 1.4.1 项目结构

```
trading-service/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── orderbook/
│   │   ├── orderbook.go
│   │   └── orderbook_test.go
│   ├── matching/
│   │   ├── engine.go
│   │   └── engine_test.go
│   └── api/
│       ├── handler.go
│       └── handler_test.go
├── pkg/
│   └── types/
│       └── order.go
├── configs/
│   └── config.yaml
└── go.mod
```

#### 1.4.2 代码风格

```go
package orderbook

import (
    "context"
    "errors"
    "sync"
    
    "github.com/shopspring/decimal"
)

var (
    ErrInvalidPrice = errors.New("invalid price")
    ErrInvalidAmount = errors.New("invalid amount")
)

// Order 表示一个订单
type Order struct {
    ID        string          `json:"id"`
    UserID    string          `json:"user_id"`
    Side      OrderSide       `json:"side"`
    Price     decimal.Decimal `json:"price"`
    Amount    decimal.Decimal `json:"amount"`
    Filled    decimal.Decimal `json:"filled"`
    Status    OrderStatus     `json:"status"`
    CreatedAt int64           `json:"created_at"`
}

// OrderSide 订单方向
type OrderSide string

const (
    OrderSideBuy  OrderSide = "buy"
    OrderSideSell OrderSide = "sell"
)

// OrderBook 订单簿
type OrderBook struct {
    symbol string
    bids   *PriorityQueue
    asks   *PriorityQueue
    mu     sync.RWMutex
}

// NewOrderBook 创建新的订单簿
func NewOrderBook(symbol string) *OrderBook {
    return &OrderBook{
        symbol: symbol,
        bids:   NewPriorityQueue(true),  // 买单按价格降序
        asks:   NewPriorityQueue(false), // 卖单按价格升序
    }
}

// AddOrder 添加订单到订单簿
func (ob *OrderBook) AddOrder(ctx context.Context, order *Order) error {
    // 验证输入
    if err := ob.validateOrder(order); err != nil {
        return err
    }
    
    // 加锁
    ob.mu.Lock()
    defer ob.mu.Unlock()
    
    // 添加到相应队列
    if order.Side == OrderSideBuy {
        ob.bids.Push(order)
    } else {
        ob.asks.Push(order)
    }
    
    return nil
}

// validateOrder 验证订单
func (ob *OrderBook) validateOrder(order *Order) error {
    if order.Price.LessThanOrEqual(decimal.Zero) {
        return ErrInvalidPrice
    }
    if order.Amount.LessThanOrEqual(decimal.Zero) {
        return ErrInvalidAmount
    }
    return nil
}

// GetBestBid 获取最佳买价
func (ob *OrderBook) GetBestBid() (decimal.Decimal, bool) {
    ob.mu.RLock()
    defer ob.mu.RUnlock()
    
    if ob.bids.Len() == 0 {
        return decimal.Zero, false
    }
    
    order := ob.bids.Peek().(*Order)
    return order.Price, true
}
```

## 2. Git工作流

### 2.1 分支策略

```
main (生产环境)
  ↑
  release/* (预发布)
  ↑
  develop (开发主分支)
  ↑
  feature/* (功能分支)
  hotfix/* (紧急修复)
```

### 2.2 分支命名

- 功能分支: `feature/swap-interface`
- 修复分支: `fix/balance-calculation`
- 热修复: `hotfix/security-patch`
- 发布分支: `release/v1.0.0`

### 2.3 提交信息规范

使用 Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**:
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

**示例**:
```
feat(swap): add slippage protection

- Implement slippage calculation
- Add user-configurable slippage tolerance
- Display price impact warning

Closes #123
```

### 2.4 Pull Request规范

**PR标题**:
```
[Feature] Add liquidity pool management
[Fix] Resolve balance update issue
[Refactor] Optimize order matching algorithm
```

**PR描述模板**:
```markdown
## 描述
简要描述这个PR的目的

## 类型
- [ ] 新功能
- [ ] Bug修复
- [ ] 重构
- [ ] 文档更新

## 变更内容
- 变更点1
- 变更点2

## 测试
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试完成

## 截图（如适用）

## 相关Issue
Closes #123
```

## 3. 测试规范

### 3.1 测试策略

```
测试金字塔:
       /\
      /E2E\
     /------\
    /  集成  \
   /----------\
  /    单元    \
 /--------------\
```

### 3.2 单元测试

**TypeScript/Jest**:
```typescript
describe('SwapCalculator', () => {
  let calculator: SwapCalculator;
  
  beforeEach(() => {
    calculator = new SwapCalculator();
  });
  
  describe('calculateAmountOut', () => {
    it('should calculate correct output amount', () => {
      const amountIn = parseEther('1');
      const reserveIn = parseEther('1000');
      const reserveOut = parseEther('2000');
      
      const amountOut = calculator.calculateAmountOut(
        amountIn,
        reserveIn,
        reserveOut
      );
      
      expect(amountOut).toBeGreaterThan(0n);
      expect(amountOut).toBeLessThan(parseEther('2'));
    });
    
    it('should throw error for zero input', () => {
      expect(() => {
        calculator.calculateAmountOut(0n, 1000n, 2000n);
      }).toThrow('Insufficient input amount');
    });
  });
});
```

**Solidity/Hardhat**:
```typescript
describe('DEXPair', function () {
  let pair: DEXPair;
  let token0: MockERC20;
  let token1: MockERC20;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory('MockERC20');
    token0 = await Token.deploy('Token0', 'TK0', ethers.parseEther('10000'));
    token1 = await Token.deploy('Token1', 'TK1', ethers.parseEther('10000'));
    
    const Pair = await ethers.getContractFactory('DEXPair');
    pair = await Pair.deploy();
    await pair.initialize(token0.address, token1.address);
  });
  
  describe('Liquidity', function () {
    it('should add liquidity correctly', async function () {
      const amount0 = ethers.parseEther('100');
      const amount1 = ethers.parseEther('200');
      
      await token0.transfer(pair.address, amount0);
      await token1.transfer(pair.address, amount1);
      
      await expect(pair.mint(owner.address))
        .to.emit(pair, 'Mint')
        .withArgs(owner.address, amount0, amount1);
      
      expect(await pair.balanceOf(owner.address)).to.be.gt(0);
    });
  });
});
```

**Go测试**:
```go
func TestOrderBook_AddOrder(t *testing.T) {
    ob := NewOrderBook("BTC-USDT")
    
    tests := []struct {
        name    string
        order   *Order
        wantErr bool
    }{
        {
            name: "valid buy order",
            order: &Order{
                ID:     "1",
                Side:   OrderSideBuy,
                Price:  decimal.NewFromInt(50000),
                Amount: decimal.NewFromInt(1),
            },
            wantErr: false,
        },
        {
            name: "invalid price",
            order: &Order{
                ID:     "2",
                Side:   OrderSideBuy,
                Price:  decimal.Zero,
                Amount: decimal.NewFromInt(1),
            },
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ob.AddOrder(context.Background(), tt.order)
            if (err != nil) != tt.wantErr {
                t.Errorf("AddOrder() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### 3.3 集成测试

```typescript
describe('Swap Integration', () => {
  it('should complete full swap flow', async () => {
    // 1. 连接钱包
    await connectWallet();
    
    // 2. 批准代币
    await approveToken(tokenA, swapAmount);
    
    // 3. 执行交换
    const tx = await executeSwap({
      tokenIn: tokenA,
      tokenOut: tokenB,
      amountIn: swapAmount,
      slippage: 0.5
    });
    
    // 4. 等待确认
    await tx.wait();
    
    // 5. 验证余额
    const newBalance = await getBalance(tokenB);
    expect(newBalance).toBeGreaterThan(oldBalance);
  });
});
```

### 3.4 E2E测试

```typescript
// Playwright
test('user can swap tokens', async ({ page }) => {
  // 访问页面
  await page.goto('http://localhost:3000');
  
  // 连接钱包
  await page.click('[data-testid="connect-wallet"]');
  await page.click('text=MetaMask');
  
  // 选择代币
  await page.click('[data-testid="token-input"]');
  await page.fill('[data-testid="token-search"]', 'USDT');
  await page.click('text=USDT');
  
  // 输入金额
  await page.fill('[data-testid="amount-input"]', '100');
  
  // 执行交换
  await page.click('[data-testid="swap-button"]');
  await page.click('text=Confirm Swap');
  
  // 验证成功
  await expect(page.locator('text=Transaction Submitted')).toBeVisible();
});
```

### 3.5 测试覆盖率要求

- 智能合约: ≥ 95%
- 后端服务: ≥ 80%
- 前端组件: ≥ 70%

## 4. 代码审查规范

### 4.1 审查清单

**功能性**:
- [ ] 代码实现了预期功能
- [ ] 边界条件处理正确
- [ ] 错误处理完善

**安全性**:
- [ ] 输入验证
- [ ] 权限检查
- [ ] 没有安全漏洞

**性能**:
- [ ] 没有明显性能问题
- [ ] 数据库查询优化
- [ ] 缓存使用合理

**可维护性**:
- [ ] 代码清晰易读
- [ ] 注释充分
- [ ] 遵循项目规范

**测试**:
- [ ] 测试覆盖充分
- [ ] 测试用例合理
- [ ] 所有测试通过

### 4.2 审查反馈

```
✅ LGTM (Looks Good To Me)
💬 Comment - 建议性意见
⚠️ Warning - 需要注意
❌ Request Changes - 必须修改
```

## 5. 文档规范

### 5.1 API文档

使用 OpenAPI 3.0:

```yaml
openapi: 3.0.0
info:
  title: DEX API
  version: 1.0.0
paths:
  /api/v1/swap:
    post:
      summary: 执行代币交换
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                tokenIn:
                  type: string
                tokenOut:
                  type: string
                amountIn:
                  type: string
      responses:
        '200':
          description: 成功
```

### 5.2 代码文档

```typescript
/**
 * Token交换服务
 * @module SwapService
 */

/**
 * 执行代币交换
 * @param {SwapParams} params - 交换参数
 * @param {string} params.tokenIn - 输入代币地址
 * @param {string} params.tokenOut - 输出代币地址
 * @param {bigint} params.amountIn - 输入金额
 * @param {number} params.slippage - 滑点容忍度(百分比)
 * @returns {Promise<SwapResult>} 交换结果
 * @throws {InsufficientLiquidityError} 流动性不足
 * @throws {SlippageExceededError} 超过滑点限制
 * @example
 * ```typescript
 * const result = await swapService.executeSwap({
 *   tokenIn: '0x...',
 *   tokenOut: '0x...',
 *   amountIn: parseEther('100'),
 *   slippage: 0.5
 * });
 * ```
 */
export async function executeSwap(params: SwapParams): Promise<SwapResult> {
  // implementation
}
```

## 6. 性能规范

### 6.1 性能指标

**前端**:
- 首屏加载时间 < 2s
- 交互响应时间 < 100ms
- Lighthouse分数 > 90

**后端**:
- API响应时间 P95 < 200ms
- 吞吐量 > 1000 req/s
- 数据库查询 < 50ms

**智能合约**:
- Gas优化
- 批量操作
- 存储优化

### 6.2 优化策略

**前端优化**:
- 代码分割
- 懒加载
- 图片优化
- CDN加速
- 缓存策略

**后端优化**:
- 数据库索引
- 查询优化
- 缓存使用
- 连接池
- 异步处理

## 7. 安全规范

### 7.1 安全开发生命周期

```
需求分析 → 威胁建模 → 安全设计 → 安全编码 → 安全测试 → 安全部署 → 安全运维
```

### 7.2 安全检查清单

**智能合约**:
- [ ] 重入攻击防护
- [ ] 整数溢出检查
- [ ] 访问控制
- [ ] 紧急暂停机制
- [ ] 时间锁保护

**后端**:
- [ ] SQL注入防护
- [ ] XSS防护
- [ ] CSRF防护
- [ ] 认证授权
- [ ] 敏感数据加密

**前端**:
- [ ] 输入验证
- [ ] 内容安全策略(CSP)
- [ ] 安全的依赖
- [ ] HTTPS强制

## 8. 部署规范

### 8.1 环境管理

```
development (开发)
staging (测试)
production (生产)
```

### 8.2 部署检查清单

- [ ] 代码审查通过
- [ ] 所有测试通过
- [ ] 性能测试通过
- [ ] 安全审计通过
- [ ] 文档更新
- [ ] 回滚计划准备
- [ ] 监控告警配置
- [ ] 备份完成

### 8.3 发布流程

1. 创建release分支
2. 代码冻结
3. 回归测试
4. 部署到staging
5. 验收测试
6. 部署到production
7. 监控验证
8. 发布公告

## 9. 监控和日志规范

### 9.1 日志级别

```
DEBUG: 详细调试信息
INFO: 一般信息
WARN: 警告信息
ERROR: 错误信息
FATAL: 致命错误
```

### 9.2 日志格式

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "INFO",
  "service": "trading-service",
  "message": "Order executed",
  "context": {
    "orderId": "123",
    "userId": "456",
    "amount": "100"
  },
  "traceId": "abc123"
}
```

### 9.3 监控指标

**业务指标**:
- 交易量
- 活跃用户
- 成功率

**技术指标**:
- 响应时间
- 错误率
- CPU/内存使用率
- 数据库连接数

## 10. 持续改进

### 10.1 技术债务管理

定期评估和清理技术债务:
- 代码重构
- 依赖更新
- 性能优化
- 文档完善

### 10.2 知识分享

- 每周技术分享
- 文档wiki维护
- 代码审查学习
- 最佳实践总结

