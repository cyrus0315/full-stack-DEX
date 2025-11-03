# DEX 安全设计文档

## 目录
1. [安全架构](#安全架构)
2. [智能合约安全](#智能合约安全)
3. [后端安全](#后端安全)
4. [前端安全](#前端安全)
5. [基础设施安全](#基础设施安全)
6. [密钥管理](#密钥管理)
7. [应急响应](#应急响应)
8. [安全审计](#安全审计)

---

## 1. 安全架构

### 1.1 纵深防御策略

```
┌─────────────────────────────────────────────────────┐
│ Layer 7: 用户教育和意识                              │
├─────────────────────────────────────────────────────┤
│ Layer 6: 应急响应和恢复                              │
├─────────────────────────────────────────────────────┤
│ Layer 5: 审计和监控                                  │
├─────────────────────────────────────────────────────┤
│ Layer 4: 应用安全（智能合约、前后端）                 │
├─────────────────────────────────────────────────────┤
│ Layer 3: 网络安全（防火墙、DDoS防护）                │
├─────────────────────────────────────────────────────┤
│ Layer 2: 基础设施安全（Kubernetes、服务器）          │
├─────────────────────────────────────────────────────┤
│ Layer 1: 物理安全（数据中心、硬件）                  │
└─────────────────────────────────────────────────────┘
```

### 1.2 安全原则

1. **最小权限原则**: 每个组件只拥有完成其功能所需的最小权限
2. **纵深防御**: 多层安全措施，单点失败不会导致系统崩溃
3. **安全默认**: 默认配置即安全配置
4. **失败安全**: 系统失败时应保持安全状态
5. **不信任任何输入**: 验证所有外部输入
6. **审计和可追溯**: 记录所有关键操作

---

## 2. 智能合约安全

### 2.1 常见漏洞防护

#### 2.1.1 重入攻击 (Reentrancy)

**问题**: 外部合约在状态更新前重新调用函数

**防护措施**:
```solidity
// ✅ 使用ReentrancyGuard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DEXPair is ReentrancyGuard {
    function swap(
        uint amount0Out,
        uint amount1Out,
        address to
    ) external nonReentrant {
        // 交换逻辑
    }
}

// ✅ 检查-效果-交互模式
function withdraw(uint amount) external {
    // 1. 检查
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // 2. 效果（先更新状态）
    balances[msg.sender] -= amount;
    
    // 3. 交互（最后调用外部合约）
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

#### 2.1.2 整数溢出/下溢

**防护措施**:
```solidity
// ✅ Solidity 0.8+ 内置溢出检查
// 默认会在溢出时revert

// ✅ 使用unchecked时要特别小心
function calculateFee(uint amount) internal pure returns (uint) {
    unchecked {
        // 确保这里的运算不会溢出
        return amount * 3 / 1000; // 0.3%
    }
}
```

#### 2.1.3 前置交易 (Front-running)

**防护措施**:
```solidity
// ✅ 添加截止时间
function swap(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,
    address to,
    uint deadline  // 截止时间
) external ensure(deadline) returns (uint[] memory amounts) {
    // 交换逻辑
}

modifier ensure(uint deadline) {
    require(deadline >= block.timestamp, "DEXRouter: EXPIRED");
    _;
}

// ✅ 滑点保护
require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

// ✅ MEV保护 - 使用Flashbots
// 通过Flashbots RPC提交交易，避免公开内存池
```

#### 2.1.4 访问控制

**防护措施**:
```solidity
// ✅ 使用OpenZeppelin的AccessControl
import "@openzeppelin/contracts/access/AccessControl.sol";

contract DEXFactory is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }
    
    function setFeeTo(address _feeTo) external onlyRole(ADMIN_ROLE) {
        feeTo = _feeTo;
    }
    
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }
}

// ✅ 使用Ownable进行简单权限控制
import "@openzeppelin/contracts/access/Ownable.sol";

contract DEXRouter is Ownable {
    function emergencyWithdraw(address token) external onlyOwner {
        // 紧急提取
    }
}
```

### 2.2 安全最佳实践

#### 2.2.1 使用自定义错误（节省gas）

```solidity
// ✅ 自定义错误
error InsufficientLiquidity(uint256 available, uint256 required);
error InvalidAddress(address addr);
error Expired(uint256 deadline);

function swap(uint amountIn, uint deadline) external {
    if (deadline < block.timestamp) {
        revert Expired(deadline);
    }
    
    if (amountIn == 0) {
        revert InsufficientLiquidity(0, amountIn);
    }
}
```

#### 2.2.2 事件日志

```solidity
// ✅ 重要操作都记录事件
event Swap(
    address indexed sender,
    uint amount0In,
    uint amount1In,
    uint amount0Out,
    uint amount1Out,
    address indexed to
);

event LiquidityAdded(
    address indexed provider,
    uint amount0,
    uint amount1,
    uint liquidity
);

function swap(...) external {
    // 交换逻辑
    
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
}
```

#### 2.2.3 紧急暂停机制

```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract DEXRouter is Pausable, Ownable {
    // 紧急暂停
    function pause() external onlyOwner {
        _pause();
    }
    
    // 恢复
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // 关键函数添加whenNotPaused
    function swap(...) external whenNotPaused {
        // 交换逻辑
    }
}
```

#### 2.2.4 时间锁保护

```solidity
// contracts/governance/Timelock.sol
contract Timelock {
    uint public constant MINIMUM_DELAY = 2 days;
    uint public constant MAXIMUM_DELAY = 30 days;
    
    mapping(bytes32 => bool) public queuedTransactions;
    
    event QueueTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint value,
        string signature,
        bytes data,
        uint eta
    );
    
    event ExecuteTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint value,
        string signature,
        bytes data,
        uint eta
    );
    
    function queueTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public returns (bytes32) {
        require(eta >= block.timestamp + MINIMUM_DELAY, "Delay too short");
        
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = true;
        
        emit QueueTransaction(txHash, target, value, signature, data, eta);
        return txHash;
    }
    
    function executeTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public payable returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        require(queuedTransactions[txHash], "Transaction not queued");
        require(block.timestamp >= eta, "Transaction not ready");
        require(block.timestamp <= eta + GRACE_PERIOD, "Transaction expired");
        
        queuedTransactions[txHash] = false;
        
        // 执行交易
        bytes memory callData;
        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }
        
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "Transaction execution failed");
        
        emit ExecuteTransaction(txHash, target, value, signature, data, eta);
        
        return returnData;
    }
}
```

### 2.3 Gas优化（不影响安全）

```solidity
// ✅ 使用uint256而非uint8（打包除外）
uint256 public totalSupply;

// ✅ 缓存数组长度
function batchTransfer(address[] calldata recipients) external {
    uint256 length = recipients.length; // 缓存
    for (uint256 i = 0; i < length; i++) {
        // 转账逻辑
    }
}

// ✅ 使用calldata而非memory（只读数据）
function swap(address[] calldata path) external {
    // path不需要修改，使用calldata
}

// ✅ 短路逻辑
require(amount > 0 && balance >= amount, "Invalid amount");
// 如果amount <= 0，不会检查balance
```

### 2.4 升级策略

```solidity
// 使用透明代理模式
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract DEXRouterV1 is Initializable {
    // 使用initialize替代constructor
    function initialize(address _factory) public initializer {
        factory = _factory;
    }
    
    // 预留存储槽位
    uint256[50] private __gap;
}

// 升级时
contract DEXRouterV2 is DEXRouterV1 {
    // 新增功能
    function newFeature() external {
        // 实现
    }
    
    // 继续预留
    uint256[49] private __gap;
}
```

---

## 3. 后端安全

### 3.1 API安全

#### 3.1.1 认证和授权

```typescript
// JWT认证
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}
  
  async login(user: User) {
    const payload = { 
      sub: user.id, 
      address: user.walletAddress,
      roles: user.roles 
    };
    
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: '15m'  // 短期令牌
      }),
      refresh_token: this.jwtService.sign(payload, {
        expiresIn: '7d'   // 长期刷新令牌
      })
    };
  }
  
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      return this.login(payload);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

// 权限守卫
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}

// 使用
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Post('users')
  @Roles('admin')
  createUser() {
    // 只有admin角色可以访问
  }
}
```

#### 3.1.2 输入验证

```typescript
import { IsString, IsEthereumAddress, IsPositive, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class SwapDto {
  @IsEthereumAddress()
  tokenIn: string;
  
  @IsEthereumAddress()
  tokenOut: string;
  
  @IsString()
  @Transform(({ value }) => value.trim())
  amountIn: string;  // 使用string避免精度问题
  
  @IsPositive()
  @Min(0)
  @Max(50)  // 最大滑点50%
  slippage: number;
  
  @IsPositive()
  deadline: number;
}

// 在Controller中使用
@Post('swap')
@UsePipes(new ValidationPipe({ transform: true }))
async swap(@Body() swapDto: SwapDto) {
  // swapDto已验证和转换
  return this.tradingService.executeSwap(swapDto);
}
```

#### 3.1.3 SQL注入防护

```typescript
// ✅ 使用参数化查询（TypeORM）
const user = await this.userRepository.findOne({
  where: { walletAddress: address }  // 安全
});

// ✅ 查询构建器
const users = await this.userRepository
  .createQueryBuilder('user')
  .where('user.walletAddress = :address', { address })  // 参数化
  .getMany();

// ❌ 避免字符串拼接
const query = `SELECT * FROM users WHERE address = '${address}'`;  // 危险！
```

#### 3.1.4 限流和DDoS防护

```typescript
// 使用@nestjs/throttler
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,      // 时间窗口（秒）
      limit: 10,    // 最大请求数
    }),
  ],
})
export class AppModule {}

// 在控制器中使用
@Controller('swap')
@UseGuards(ThrottlerGuard)
export class SwapController {
  @Throttle(5, 60)  // 60秒内最多5次
  @Post()
  swap() {
    // 交换逻辑
  }
}

// Redis实现的分布式限流
import Redis from 'ioredis';

export class RateLimiter {
  constructor(private redis: Redis) {}
  
  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    
    return current <= limit;
  }
}
```

### 3.2 密码和敏感数据

```typescript
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ✅ 密码哈希
export class PasswordService {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
  
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

// ✅ 数据加密
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    // 从环境变量或KMS获取密钥
    this.key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  }
  
  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }
  
  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 3.3 日志和审计

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  
  async logSecurityEvent(event: SecurityEvent) {
    // 记录到数据库
    await this.auditRepository.save({
      type: event.type,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: new Date(),
      severity: event.severity
    });
    
    // 高严重性事件立即告警
    if (event.severity === 'critical' || event.severity === 'high') {
      await this.alertService.sendAlert(event);
    }
    
    // 结构化日志
    this.logger.log({
      message: 'Security event',
      ...event
    });
  }
  
  async logTransaction(tx: TransactionLog) {
    await this.transactionRepository.save({
      txHash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: tx.gasUsed,
      status: tx.status,
      timestamp: new Date()
    });
  }
}

// 使用拦截器自动记录
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}
  
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, user } = request;
    
    return next.handle().pipe(
      tap(() => {
        this.auditService.logSecurityEvent({
          type: 'api_access',
          userId: user?.id,
          ip,
          details: { method, url },
          severity: 'info'
        });
      })
    );
  }
}
```

---

## 4. 前端安全

### 4.1 XSS防护

```typescript
// ✅ React自动转义
function UserProfile({ user }) {
  return <div>{user.name}</div>;  // 自动转义
}

// ✅ DOMPurify清理HTML
import DOMPurify from 'dompurify';

function RichTextDisplay({ html }) {
  const cleanHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
  
  return <div dangerouslySetInnerHTML={{ __html: cleanHTML }} />;
}

// ✅ 验证URL
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### 4.2 CSRF防护

```typescript
// ✅ 使用SameSite Cookie
// 后端设置
res.cookie('token', jwt, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});

// ✅ CSRF Token
import { csrf } from '@/utils/csrf';

const csrfToken = csrf.generateToken();

fetch('/api/swap', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### 4.3 内容安全策略 (CSP)

```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.dex.com wss://api.dex.com https://*.infura.io;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 4.4 安全的Web3交互

```typescript
import { ethers } from 'ethers';

// ✅ 验证交易参数
function validateSwapParams(params: SwapParams): void {
  if (!ethers.isAddress(params.tokenIn)) {
    throw new Error('Invalid tokenIn address');
  }
  
  if (!ethers.isAddress(params.tokenOut)) {
    throw new Error('Invalid tokenOut address');
  }
  
  if (params.amountIn <= 0n) {
    throw new Error('Invalid amount');
  }
  
  if (params.slippage < 0 || params.slippage > 50) {
    throw new Error('Invalid slippage');
  }
}

// ✅ 估算gas并添加缓冲
async function executeSwap(params: SwapParams) {
  validateSwapParams(params);
  
  try {
    // 估算gas
    const estimatedGas = await contract.swap.estimateGas(
      params.amountIn,
      params.amountOutMin,
      params.path,
      params.to,
      params.deadline
    );
    
    // 添加20%缓冲
    const gasLimit = (estimatedGas * 120n) / 100n;
    
    // 执行交易
    const tx = await contract.swap(
      params.amountIn,
      params.amountOutMin,
      params.path,
      params.to,
      params.deadline,
      { gasLimit }
    );
    
    return tx;
  } catch (error) {
    console.error('Swap failed:', error);
    throw error;
  }
}

// ✅ 验证合约返回值
async function getAmountOut(amountIn: bigint, path: string[]) {
  const amounts = await router.getAmountsOut(amountIn, path);
  
  // 验证返回值
  if (!Array.isArray(amounts) || amounts.length !== path.length) {
    throw new Error('Invalid amounts returned');
  }
  
  return amounts;
}
```

---

## 5. 基础设施安全

### 5.1 Kubernetes安全

```yaml
# 网络策略
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dex-network-policy
  namespace: dex
spec:
  podSelector:
    matchLabels:
      app: trading-service
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: dex
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432

---
# Pod安全策略
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
    - 'persistentVolumeClaim'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

### 5.2 密钥轮换

```typescript
// AWS Secrets Manager密钥轮换
import { 
  SecretsManagerClient, 
  RotateSecretCommand 
} from "@aws-sdk/client-secrets-manager";

export class KeyRotationService {
  private client = new SecretsManagerClient({ region: 'us-east-1' });
  
  async rotateSecret(secretName: string) {
    const command = new RotateSecretCommand({
      SecretId: secretName,
      RotationLambdaARN: process.env.ROTATION_LAMBDA_ARN,
      RotationRules: {
        AutomaticallyAfterDays: 30  // 30天自动轮换
      }
    });
    
    await this.client.send(command);
  }
}
```

---

## 6. 密钥管理

### 6.1 密钥层级

```
┌─────────────────────────────────────┐
│ Root Key (HSM/KMS)                  │
│ - 离线存储                           │
│ - 多签保护                           │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│ Master Keys (KMS)                   │
│ - 热钱包主密钥                       │
│ - 数据库加密密钥                     │
│ - API密钥加密                        │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│ Operational Keys                    │
│ - 日常交易密钥                       │
│ - 服务间通信密钥                     │
│ - 会话密钥                           │
└─────────────────────────────────────┘
```

### 6.2 冷热钱包分离

```typescript
// 热钱包服务（处理小额交易）
export class HotWalletService {
  private maxBalance = ethers.parseEther('100'); // 最大余额
  private maxTxAmount = ethers.parseEther('10'); // 单笔限额
  
  async withdraw(to: string, amount: bigint) {
    // 检查限额
    if (amount > this.maxTxAmount) {
      throw new Error('Amount exceeds hot wallet limit');
    }
    
    // 检查余额
    const balance = await this.provider.getBalance(this.hotWalletAddress);
    if (balance < amount) {
      // 从冷钱包补充
      await this.requestFromColdWallet(amount);
    }
    
    // 执行交易
    const tx = await this.hotWallet.sendTransaction({
      to,
      value: amount
    });
    
    return tx;
  }
  
  async requestFromColdWallet(amount: bigint) {
    // 创建多签提案
    await this.multiSigService.createProposal({
      type: 'transfer',
      from: 'cold_wallet',
      to: this.hotWalletAddress,
      amount
    });
    
    // 需要人工审批
  }
}

// 冷钱包服务（离线存储大额资金）
export class ColdWalletService {
  // 冷钱包只能通过多签操作
  async proposeTransfer(to: string, amount: bigint) {
    const proposal = await this.multiSig.submitTransaction(
      to,
      amount,
      '0x'
    );
    
    // 需要多个签名者批准
    return proposal;
  }
}
```

---

## 7. 应急响应

### 7.1 应急响应流程

```
1. 检测 → 2. 评估 → 3. 遏制 → 4. 根除 → 5. 恢复 → 6. 总结
```

### 7.2 紧急暂停

```solidity
// 智能合约紧急暂停
contract EmergencyStop is Ownable, Pausable {
    address public emergencyCouncil;
    
    modifier onlyEmergency() {
        require(
            msg.sender == owner() || msg.sender == emergencyCouncil,
            "Not authorized"
        );
        _;
    }
    
    function emergencyPause() external onlyEmergency {
        _pause();
        emit EmergencyPause(msg.sender, block.timestamp);
    }
    
    function emergencyUnpause() external onlyOwner {
        // 只有owner可以恢复
        _unpause();
        emit EmergencyUnpause(msg.sender, block.timestamp);
    }
}
```

### 7.3 事件响应手册

```markdown
## 安全事件响应手册

### 高危事件（立即响应）

1. **智能合约被攻击**
   - [ ] 立即调用紧急暂停
   - [ ] 评估损失
   - [ ] 联系审计公司
   - [ ] 准备公告
   - [ ] 报告给安全社区

2. **私钥泄露**
   - [ ] 立即转移资金到新地址
   - [ ] 撤销相关权限
   - [ ] 评估影响范围
   - [ ] 更新所有密钥
   - [ ] 通知用户

3. **数据库被入侵**
   - [ ] 隔离受影响系统
   - [ ] 停止所有写操作
   - [ ] 从备份恢复
   - [ ] 修复漏洞
   - [ ] 审计所有访问日志

### 联系方式

- CTO: [电话]
- 安全团队: [电话/Slack]
- 审计公司: [联系方式]
- 法律顾问: [联系方式]
```

---

## 8. 安全审计

### 8.1 审计检查清单

#### 智能合约审计
- [ ] 重入攻击检查
- [ ] 整数溢出检查
- [ ] 访问控制检查
- [ ] 前置交易风险
- [ ] Gas优化
- [ ] 升级机制安全
- [ ] 事件日志完整性
- [ ] 测试覆盖率 > 95%

#### 后端审计
- [ ] SQL注入检查
- [ ] 认证授权机制
- [ ] 输入验证
- [ ] 敏感数据保护
- [ ] 日志和审计
- [ ] 依赖漏洞扫描
- [ ] API限流

#### 前端审计
- [ ] XSS防护
- [ ] CSRF防护
- [ ] CSP配置
- [ ] 安全的Web3交互
- [ ] 依赖漏洞扫描

#### 基础设施审计
- [ ] 网络隔离
- [ ] 防火墙规则
- [ ] 密钥管理
- [ ] 备份和恢复
- [ ] 监控和告警

### 8.2 持续安全

- 每季度进行渗透测试
- 每月依赖更新和扫描
- 每周安全日志review
- Bug Bounty计划
- 安全培训

---

## 附录: 安全工具清单

### 智能合约
- Slither: 静态分析
- Mythril: 安全审计
- Echidna: 模糊测试
- Manticore: 符号执行
- Certora: 形式化验证

### 后端
- OWASP ZAP: Web扫描
- Burp Suite: 渗透测试
- Snyk: 依赖扫描
- SonarQube: 代码质量

### 基础设施
- Trivy: 容器扫描
- Falco: 运行时安全
- Vault: 密钥管理
- Cloudflare: DDoS防护

