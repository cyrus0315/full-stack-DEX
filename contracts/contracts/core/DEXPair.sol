// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDEXPair.sol";
import "../interfaces/IDEXFactory.sol";
import "../libraries/Math.sol";
import "../libraries/UQ112x112.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DEXPair
 * @author DEX Team
 * @notice DEX 交易对合约 - 实现自动做市商（AMM）核心逻辑
 * @dev 基于 Uniswap V2 Pair 实现，使用恒定乘积公式（x * y = k）
 * 
 * ============================================
 * 这个合约做什么？
 * ============================================
 * 
 * 1. **流动性管理**
 *    - 添加流动性：用户存入两种代币，获得 LP Token
 *    - 移除流动性：用户销毁 LP Token，取回两种代币
 *    - LP Token：代表用户在池子中的份额
 * 
 * 2. **代币交易（Swap）**
 *    - 用户用一种代币交换另一种代币
 *    - 价格由恒定乘积公式自动决定
 *    - 每笔交易收取 0.3% 手续费
 * 
 * 3. **价格预言机**
 *    - 记录价格累积值（price0Cumulative, price1Cumulative）
 *    - 用于计算时间加权平均价格（TWAP）
 *    - 提供抗操纵的价格数据
 * 
 * 4. **闪电贷（Flash Swap）**
 *    - 先借出代币，后归还
 *    - 可用于套利、清算等场景
 *    - 必须在同一交易内完成
 * 
 * ============================================
 * 核心概念：恒定乘积公式（x * y = k）
 * ============================================
 * 
 * **基本原理：**
 * ```
 * reserve0 * reserve1 = k (常数)
 * ```
 * 
 * **交易时：**
 * ```
 * 交易前：x * y = k
 * 交易后：(x + Δx) * (y - Δy) = k
 * 
 * 解出 Δy：
 * Δy = y * k / (x + Δx)
 * ```
 * 
 * **为什么这个公式有效？**
 * 1. 自动定价：价格 = y / x，随供需自动调整
 * 2. 永远有流动性：k > 0 时总能交易
 * 3. 滑点控制：大额交易价格变化大（保护 LP）
 * 
 * **示例：**
 * ```
 * 初始状态：
 * - reserve0 = 1000 DAI
 * - reserve1 = 1000 USDT
 * - k = 1,000,000
 * - 价格 = 1 DAI = 1 USDT
 * 
 * 用户卖出 100 DAI：
 * - 新的 reserve0 = 1100 DAI
 * - 新的 reserve1 = 1,000,000 / 1100 ≈ 909.09 USDT
 * - 用户获得 = 1000 - 909.09 = 90.91 USDT
 * - 新价格 = 909.09 / 1100 ≈ 0.826 USDT per DAI
 * ```
 * 
 * ============================================
 * LP Token 机制
 * ============================================
 * 
 * **首次添加流动性：**
 * ```
 * LP = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
 * ```
 * - MINIMUM_LIQUIDITY (1000) 永久锁定，防止除零错误
 * 
 * **后续添加流动性：**
 * ```
 * LP = min(
 *   amount0 * totalSupply / reserve0,
 *   amount1 * totalSupply / reserve1
 * )
 * ```
 * - 按比例添加，避免改变价格
 * 
 * **移除流动性：**
 * ```
 * amount0 = LP * balance0 / totalSupply
 * amount1 = LP * balance1 / totalSupply
 * ```
 * - 按份额比例取回代币
 * 
 * **为什么首次用 sqrt？**
 * - 几何平均数，对两种代币公平
 * - 防止操纵（无论以什么比例添加，价值相同）
 * - 数学性质好（与 k = x * y 一致）
 * 
 * ============================================
 * 交易手续费（0.3%）
 * ============================================
 * 
 * **费用收取：**
 * ```
 * amountOut = amountIn * 997 / 1000  // 0.3% 手续费
 * ```
 * 
 * **费用分配：**
 * - 0.25% -> LP 提供者（自动积累在池子中）
 * - 0.05% -> 协议（可选，通过 feeTo 配置）
 * 
 * **LP 如何获利？**
 * - 不需要主动提取
 * - 手续费积累在 reserve 中
 * - LP Token 价值自动增长
 * 
 * **示例：**
 * ```
 * 初始：1000 DAI + 1000 USDT，总 LP = 1000
 * 交易：收取 10 DAI 手续费
 * 现在：1010 DAI + 1000 USDT，总 LP = 1000
 * 
 * LP Token 价值增长：
 * 之前：1 LP = 1 DAI + 1 USDT
 * 现在：1 LP = 1.01 DAI + 1 USDT
 * ```
 * 
 * ============================================
 * 价格预言机（TWAP）
 * ============================================
 * 
 * **原理：**
 * ```
 * price0Cumulative += (reserve1 / reserve0) * timeElapsed
 * price1Cumulative += (reserve0 / reserve1) * timeElapsed
 * ```
 * 
 * **如何使用：**
 * ```javascript
 * // 记录起始点
 * const price0Start = await pair.price0CumulativeLast()
 * const timestampStart = await getBlockTimestamp()
 * 
 * // 等待一段时间...
 * 
 * // 记录结束点
 * const price0End = await pair.price0CumulativeLast()
 * const timestampEnd = await getBlockTimestamp()
 * 
 * // 计算 TWAP
 * const timeElapsed = timestampEnd - timestampStart
 * const avgPrice = (price0End - price0Start) / timeElapsed
 * ```
 * 
 * **为什么抗操纵？**
 * - 价格操纵需要持续多个区块
 * - 成本极高（需要大量资金）
 * - 即使操纵一个区块，对 TWAP 影响很小
 * 
 * ============================================
 * 闪电贷（Flash Swap）
 * ============================================
 * 
 * **原理：**
 * 1. 先借出代币
 * 2. 回调用户合约
 * 3. 检查 k 值是否满足
 * 4. 如果不满足则回滚
 * 
 * **使用场景：**
 * - 套利：从 DEX A 借币，在 DEX B 卖出，归还
 * - 清算：借币清算，获得抵押品，归还
 * - 免本金交易：借出，操作，归还（只付手续费）
 * 
 * **安全性：**
 * - 必须在同一交易内完成
 * - k 值检查确保池子不亏损
 * - 失败自动回滚
 * 
 * ============================================
 * 重要数学概念
 * ============================================
 * 
 * **Q112.112 定点数：**
 * - Solidity 没有浮点数
 * - 用 uint224 存储定点数
 * - 精度：112 位整数 + 112 位小数
 * - 用于价格累积（避免溢出）
 * 
 * **为什么 reserve 用 uint112？**
 * - 节省 gas（打包到一个 storage slot）
 * - uint112 最大值 = 5.19e33
 * - 对于 18 位小数的代币，可存储 5.19e15 个
 * - 足够大（比 ETH 总量还多）
 * 
 * ============================================
 * 安全机制
 * ============================================
 * 
 * 1. **重入保护**
 *    - 使用 ReentrancyGuard
 *    - 防止重入攻击
 * 
 * 2. **K值检查**
 *    - 每次交易后验证 k 值
 *    - 确保池子不亏损
 * 
 * 3. **最小流动性锁定**
 *    - 首次添加流动性锁定 1000 LP
 *    - 防止除零错误和价格操纵
 * 
 * 4. **溢出保护**
 *    - reserve 限制为 uint112
 *    - 防止溢出攻击
 * 
 * ============================================
 * 参考资源
 * ============================================
 * 
 * - Uniswap V2 Core: https://github.com/Uniswap/v2-core
 * - Uniswap V2 白皮书: https://uniswap.org/whitepaper.pdf
 * - 恒定乘积详解: https://docs.uniswap.org/protocol/V2/concepts/protocol-overview/how-uniswap-works
 */
contract DEXPair is IDEXPair, ERC20, ReentrancyGuard {
    using UQ112x112 for uint224;
    
    // ============================================
    // 常量
    // ============================================
    
    /**
     * @notice 最小流动性数量
     * @dev 首次添加流动性时，永久锁定 1000 LP Token 到死地址
     *      
     *      为什么？
     *      1. 防止除零错误
     *      2. 提高首次添加流动性的成本（防止攻击）
     *      3. 确保池子永远有流动性
     *      
     *      影响：
     *      - 首次添加流动性者损失 1000 LP（价值很小）
     *      - 后续用户不受影响
     */
    uint256 public constant override MINIMUM_LIQUIDITY = 10**3;
    
    /**
     * @notice 死地址（用于锁定最小流动性）
     * @dev 0x...dead 地址，无人控制的地址
     *      锁定的 LP Token 永远无法赎回
     */
    address private constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // ============================================
    // 状态变量
    // ============================================
    
    /**
     * @notice Factory 合约地址
     * @dev 创建此 Pair 的 Factory 地址
     *      用于：
     *      - 权限验证（initialize 只能由 Factory 调用）
     *      - 查询协议费配置（feeTo）
     */
    address public override factory;
    
    /**
     * @notice 第一个代币地址（按地址大小排序后的较小者）
     * @dev token0 < token1（地址比较）
     *      例如：如果 DAI < USDT，则 token0 = DAI
     */
    address public override token0;
    
    /**
     * @notice 第二个代币地址（按地址大小排序后的较大者）
     * @dev token1 > token0（地址比较）
     */
    address public override token1;
    
    /**
     * @notice Token0 的储备量
     * @dev 使用 uint112 类型：
     *      - 最大值：5.19e33（足够大）
     *      - 与 reserve1、blockTimestampLast 打包在一个 storage slot
     *      - 节省 gas
     */
    uint112 private reserve0;
    
    /**
     * @notice Token1 的储备量
     * @dev 使用 uint112 类型，与 reserve0 同理
     */
    uint112 private reserve1;
    
    /**
     * @notice 最后更新储备量的区块时间戳
     * @dev 使用 uint32 类型（unix 时间戳对 2^32 取模）
     *      - 2^32 秒 ≈ 136 年
     *      - 2106 年后会溢出（那时我们都不在了）
     *      - 溢出是预期行为（用于计算时间差）
     */
    uint32 private blockTimestampLast;
    
    /**
     * @notice Token0 的累积价格
     * @dev 用于计算 TWAP（时间加权平均价格）
     *      
     *      公式：
     *      price0Cumulative += (reserve1 / reserve0) * timeElapsed
     *      
     *      使用 UQ112.112 定点数格式：
     *      - 避免浮点数
     *      - 高精度
     *      - 防止溢出
     *      
     *      每次交易/添加/移除流动性时更新
     */
    uint256 public override price0CumulativeLast;
    
    /**
     * @notice Token1 的累积价格
     * @dev 与 price0CumulativeLast 同理
     *      
     *      公式：
     *      price1Cumulative += (reserve0 / reserve1) * timeElapsed
     */
    uint256 public override price1CumulativeLast;
    
    /**
     * @notice 最后一次流动性事件后的 k 值
     * @dev k = reserve0 * reserve1
     *      
     *      用于：
     *      - 计算协议费
     *      - 检测 k 值增长（手续费积累）
     *      
     *      只在 mint/burn 时更新
     */
    uint256 public override kLast;
    
    // ============================================
    // 修饰符
    // ============================================
    
    /**
     * @notice 仅 Factory 可调用
     * @dev 用于 initialize 函数
     *      确保只有 Factory 可以初始化 Pair
     */
    modifier onlyFactory() {
        require(msg.sender == factory, "DEXPair: FORBIDDEN");
        _;
    }
    
    // ============================================
    // 构造函数
    // ============================================
    
    /**
     * @notice 构造函数
     * @dev 通过 Factory 的 CREATE2 调用
     *      
     *      初始化：
     *      - factory = msg.sender（Factory 地址）
     *      - ERC20: name="DEX LP Token", symbol="DEX-LP"
     *      - token0、token1 需要后续调用 initialize 设置
     */
    constructor() ERC20("DEX LP Token", "DEX-LP") {
        factory = msg.sender;
    }
    
    // ============================================
    // 外部函数 - 初始化
    // ============================================
    
    /**
     * @notice 初始化交易对
     * @param _token0 第一个代币地址
     * @param _token1 第二个代币地址
     * 
     * @dev 只能由 Factory 调用一次
     *      
     *      在 createPair 时调用：
     *      1. Factory 用 CREATE2 部署 Pair
     *      2. Factory 调用 initialize 设置 token0/token1
     *      3. Pair 准备就绪
     *      
     *      为什么分两步？
     *      - CREATE2 的 bytecode 必须固定
     *      - 构造函数参数会改变 bytecode
     *      - 分离初始化确保地址可预测
     */
    function initialize(
        address _token0,
        address _token1
    ) external override onlyFactory {
        token0 = _token0;
        token1 = _token1;
    }
    
    // ============================================
    // 外部函数 - 查询
    // ============================================
    
    /**
     * @notice 获取储备量
     * @return _reserve0 Token0 储备量
     * @return _reserve1 Token1 储备量
     * @return _blockTimestampLast 最后更新时间
     * 
     * @dev 这是最常用的查询函数
     *      
     *      用途：
     *      - 计算交易价格
     *      - 计算添加流动性所需数量
     *      - 计算 TVL
     *      - 链下分析
     *      
     *      注意：
     *      - 返回的是上次更新的值
     *      - 可能与当前余额不同（如果有人直接转账）
     */
    function getReserves() public view override returns (
        uint112 _reserve0,
        uint112 _reserve1,
        uint32 _blockTimestampLast
    ) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    // ============================================
    // 内部函数 - 核心逻辑
    // ============================================
    
    /**
     * @notice 更新储备量和价格累积值
     * @param balance0 Token0 的当前余额
     * @param balance1 Token1 的当前余额
     * @param _reserve0 Token0 的旧储备量
     * @param _reserve1 Token1 的旧储备量
     * 
     * @dev 每次 mint/burn/swap 后调用
     *      
     *      执行：
     *      1. 验证余额不溢出 uint112
     *      2. 更新价格累积值（如果时间经过且储备量非零）
     *      3. 更新储备量
     *      4. 触发 Sync 事件
     *      
     *      价格累积公式：
     *      ```
     *      price0Cumulative += (reserve1 / reserve0) * timeElapsed
     *      price1Cumulative += (reserve0 / reserve1) * timeElapsed
     *      ```
     *      
     *      为什么这样设计？
     *      - 价格操纵需要持续多个区块
     *      - 成本极高
     *      - TWAP 抗短期操纵
     */
    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        // 验证：余额必须在 uint112 范围内
        require(
            balance0 <= type(uint112).max && balance1 <= type(uint112).max,
            "DEXPair: OVERFLOW"
        );
        
        // 获取当前区块时间戳（对 2^32 取模，允许溢出）
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        
        // 计算时间间隔（uint32 减法，溢出是预期行为）
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        // 如果时间经过 且 储备量非零，更新价格累积值
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // UQ112.112 定点数除法
            // price0 = reserve1 / reserve0
            // price1 = reserve0 / reserve1
            // 乘以时间得到累积值
            price0CumulativeLast += uint256(
                UQ112x112.encode(_reserve1).uqdiv(_reserve0)
            ) * timeElapsed;
            
            price1CumulativeLast += uint256(
                UQ112x112.encode(_reserve0).uqdiv(_reserve1)
            ) * timeElapsed;
        }
        
        // 更新储备量
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        
        // 触发同步事件
        emit Sync(reserve0, reserve1);
    }
    
    /**
     * @notice 铸造协议费（如果开启）
     * @param _reserve0 Token0 储备量
     * @param _reserve1 Token1 储备量
     * @return feeOn 协议费是否开启
     * 
     * @dev 在 mint/burn 前调用
     *      
     *      协议费计算：
     *      ```
     *      rootK = sqrt(reserve0 * reserve1)
     *      rootKLast = sqrt(kLast)
     *      
     *      if (rootK > rootKLast) {
     *          liquidity = totalSupply * (rootK - rootKLast) / (rootK * 5 + rootKLast)
     *      }
     *      ```
     *      
     *      这个公式的含义：
     *      - k 增长来自交易手续费
     *      - 协议提取 1/6 的增长（其余 5/6 给 LP）
     *      - 以 LP Token 形式提取（不影响储备量）
     *      
     *      为什么是 1/6？
     *      - 交易手续费 0.3%
     *      - 协议费 = 0.3% / 6 = 0.05%
     *      - LP 费用 = 0.3% * 5/6 = 0.25%
     */
    function _mintFee(
        uint112 _reserve0,
        uint112 _reserve1
    ) private returns (bool feeOn) {
        // 从 Factory 查询 feeTo 地址
        address feeTo = IDEXFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast; // gas 优化
        
        if (feeOn) {
            if (_kLast != 0) {
                // 计算当前 k 值的平方根
                uint256 rootK = Math.sqrt(uint256(_reserve0) * _reserve1);
                // 计算上次 k 值的平方根
                uint256 rootKLast = Math.sqrt(_kLast);
                
                // 如果 k 增长了（即有交易手续费积累）
                if (rootK > rootKLast) {
                    // 计算协议费 LP 数量
                    uint256 numerator = totalSupply() * (rootK - rootKLast);
                    uint256 denominator = rootK * 5 + rootKLast;
                    uint256 liquidity = numerator / denominator;
                    
                    // 铸造给 feeTo 地址
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            // 如果协议费关闭，重置 kLast
            kLast = 0;
        }
    }
    
    // ============================================
    // 外部函数 - 流动性管理
    // ============================================
    
    /**
     * @notice 添加流动性（铸造 LP Token）
     * @param to LP Token 接收地址
     * @return liquidity 铸造的 LP Token 数量
     * 
     * @dev 低级函数，应由 Router 调用（Router 负责安全检查）
     *      
     *      调用流程：
     *      1. 用户调用 Router.addLiquidity()
     *      2. Router 转账代币到 Pair
     *      3. Router 调用 Pair.mint()
     *      4. Pair 计算并铸造 LP Token
     *      
     *      LP 计算：
     *      
     *      首次添加流动性：
     *      ```
     *      liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
     *      ```
     *      - 使用几何平均数
     *      - 锁定 1000 LP 到死地址
     *      
     *      后续添加流动性：
     *      ```
     *      liquidity = min(
     *        amount0 * totalSupply / reserve0,
     *        amount1 * totalSupply / reserve1
     *      )
     *      ```
     *      - 按比例添加
     *      - 取较小值（防止赠送）
     *      
     *      注意事项：
     *      - 不检查滑点（由 Router 检查）
     *      - 不检查授权（代币已转入）
     *      - 不验证比例（取 min 自动处理）
     */
    function mint(
        address to
    ) external override nonReentrant returns (uint256 liquidity) {
        // 获取储备量（gas 优化）
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        
        // 获取当前余额
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        
        // 计算新增数量
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;
        
        // 铸造协议费（如果开启）
        bool feeOn = _mintFee(_reserve0, _reserve1);
        
        // 获取当前 LP 总量（必须在 _mintFee 之后，因为可能铸造了协议费）
        uint256 _totalSupply = totalSupply();
        
        if (_totalSupply == 0) {
            // 首次添加流动性
            // 使用几何平均数 sqrt(x * y)
            liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            
            // 永久锁定 1000 LP 到死地址
            _mint(DEAD_ADDRESS, MINIMUM_LIQUIDITY);
        } else {
            // 后续添加流动性
            // 按比例计算，取较小值
            liquidity = Math.min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }
        
        // 验证：必须铸造正数 LP
        require(liquidity > 0, "DEXPair: INSUFFICIENT_LIQUIDITY_MINTED");
        
        // 铸造 LP Token
        _mint(to, liquidity);
        
        // 更新储备量和价格累积
        _update(balance0, balance1, _reserve0, _reserve1);
        
        // 如果协议费开启，记录新的 k 值
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        // 触发事件
        emit Mint(msg.sender, amount0, amount1);
    }
    
    /**
     * @notice 移除流动性（销毁 LP Token）
     * @param to 代币接收地址
     * @return amount0 返还的 Token0 数量
     * @return amount1 返还的 Token1 数量
     * 
     * @dev 低级函数，应由 Router 调用
     *      
     *      调用流程：
     *      1. 用户调用 Router.removeLiquidity()
     *      2. Router 转账 LP Token 到 Pair
     *      3. Router 调用 Pair.burn()
     *      4. Pair 销毁 LP，返还代币
     *      
     *      返还数量计算：
     *      ```
     *      amount0 = liquidity * balance0 / totalSupply
     *      amount1 = liquidity * balance1 / totalSupply
     *      ```
     *      
     *      为什么用 balance 而非 reserve？
     *      - balance 包含手续费积累
     *      - 按比例分配所有价值
     *      - 确保公平分配
     *      
     *      注意事项：
     *      - 不检查滑点（由 Router 检查）
     *      - LP Token 必须已转入 Pair
     *      - 可能获得比预期更多（手续费积累）
     */
    function burn(
        address to
    ) external override nonReentrant returns (uint256 amount0, uint256 amount1) {
        // 获取储备量（gas 优化）
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        
        // 获取代币地址（gas 优化）
        address _token0 = token0;
        address _token1 = token1;
        
        // 获取当前余额
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        
        // 获取 Pair 持有的 LP Token 数量
        uint256 liquidity = balanceOf(address(this));
        
        // 铸造协议费（如果开启）
        bool feeOn = _mintFee(_reserve0, _reserve1);
        
        // 获取 LP 总量（必须在 _mintFee 之后）
        uint256 _totalSupply = totalSupply();
        
        // 按比例计算返还数量
        // 使用 balance 确保手续费也按比例分配
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        
        // 验证：必须返还正数代币
        require(
            amount0 > 0 && amount1 > 0,
            "DEXPair: INSUFFICIENT_LIQUIDITY_BURNED"
        );
        
        // 销毁 LP Token
        _burn(address(this), liquidity);
        
        // 转账代币给用户
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        
        // 重新获取余额（转账后）
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        // 更新储备量和价格累积
        _update(balance0, balance1, _reserve0, _reserve1);
        
        // 如果协议费开启，记录新的 k 值
        if (feeOn) kLast = uint256(reserve0) * reserve1;
        
        // 触发事件
        emit Burn(msg.sender, amount0, amount1, to);
    }
    
    // ============================================
    // 外部函数 - 交易（Swap）
    // ============================================
    
    /**
     * @notice 代币交换
     * @param amount0Out Token0 输出数量
     * @param amount1Out Token1 输出数量
     * @param to 代币接收地址
     * @param data 闪电贷回调数据（长度为 0 则无回调）
     * 
     * @dev 低级函数，应由 Router 调用
     *      
     *      调用流程：
     *      
     *      普通交易：
     *      1. 用户调用 Router.swap()
     *      2. Router 转账输入代币到 Pair
     *      3. Router 调用 Pair.swap()
     *      4. Pair 转账输出代币给用户
     *      
     *      闪电贷：
     *      1. 用户调用 Router.flashSwap()
     *      2. Router 调用 Pair.swap(data 非空)
     *      3. Pair 先转账输出代币
     *      4. Pair 回调用户合约
     *      5. 用户合约归还代币
     *      6. Pair 检查 k 值
     *      
     *      k 值检查：
     *      ```
     *      balance0Adjusted = balance0 * 1000 - amount0In * 3
     *      balance1Adjusted = balance1 * 1000 - amount1In * 3
     *      
     *      要求：
     *      balance0Adjusted * balance1Adjusted >= reserve0 * reserve1 * 1000^2
     *      ```
     *      
     *      为什么乘 1000？
     *      - 手续费 0.3% = 3/1000
     *      - 避免浮点数
     *      - 精确计算
     *      
     *      为什么减去 amount*In * 3？
     *      - 手续费从输入中扣除
     *      - 等价于输出减少
     *      - 确保 k 值增长
     *      
     *      安全机制：
     *      - 重入保护（nonReentrant）
     *      - k 值检查（确保不亏损）
     *      - 输出验证（不超过储备量）
     *      - 地址验证（不能是代币地址）
     */
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external override nonReentrant {
        // 验证 1：至少输出一种代币
        require(
            amount0Out > 0 || amount1Out > 0,
            "DEXPair: INSUFFICIENT_OUTPUT_AMOUNT"
        );
        
        // 获取储备量
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        
        // 验证 2：输出不能超过储备量
        require(
            amount0Out < _reserve0 && amount1Out < _reserve1,
            "DEXPair: INSUFFICIENT_LIQUIDITY"
        );
        
        uint256 balance0;
        uint256 balance1;
        {
            // 使用作用域避免"栈太深"错误
            address _token0 = token0;
            address _token1 = token1;
            
            // 验证 3：接收地址不能是代币地址（防止意外销毁）
            require(to != _token0 && to != _token1, "DEXPair: INVALID_TO");
            
            // 乐观转账：先转出代币
            if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
            if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
            
            // 闪电贷回调（如果 data 非空）
            if (data.length > 0) {
                IFlashSwapCallee(to).flashSwapCall(
                    msg.sender,
                    amount0Out,
                    amount1Out,
                    data
                );
            }
            
            // 获取当前余额
            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }
        
        // 计算输入数量
        uint256 amount0In = balance0 > _reserve0 - amount0Out
            ? balance0 - (_reserve0 - amount0Out)
            : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out
            ? balance1 - (_reserve1 - amount1Out)
            : 0;
        
        // 验证 4：必须有输入
        require(
            amount0In > 0 || amount1In > 0,
            "DEXPair: INSUFFICIENT_INPUT_AMOUNT"
        );
        
        {
            // k 值检查（扣除 0.3% 手续费后）
            uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
            uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
            
            // 验证 5：k 值必须不减少（考虑手续费）
            require(
                balance0Adjusted * balance1Adjusted >= 
                uint256(_reserve0) * _reserve1 * (1000**2),
                "DEXPair: K"
            );
        }
        
        // 更新储备量和价格累积
        _update(balance0, balance1, _reserve0, _reserve1);
        
        // 触发事件
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
    
    // ============================================
    // 外部函数 - 同步和清理
    // ============================================
    
    /**
     * @notice 清理多余余额
     * @param to 接收地址
     * 
     * @dev 转出超过储备量的代币余额
     *      
     *      使用场景：
     *      - 有人直接转账代币到 Pair（不通过 mint/swap）
     *      - 清理多余余额，避免影响计算
     *      
     *      注意：
     *      - 任何人都可以调用
     *      - 转给指定地址（通常是调用者）
     *      - 不影响储备量和价格
     */
    function skim(address to) external override nonReentrant {
        address _token0 = token0; // gas 优化
        address _token1 = token1;
        
        // 转出超出储备量的部分
        _safeTransfer(
            _token0,
            to,
            IERC20(_token0).balanceOf(address(this)) - reserve0
        );
        _safeTransfer(
            _token1,
            to,
            IERC20(_token1).balanceOf(address(this)) - reserve1
        );
    }
    
    /**
     * @notice 强制同步储备量
     * 
     * @dev 将储备量同步为当前余额
     *      
     *      使用场景：
     *      - 有人直接转账大量代币到 Pair
     *      - 储备量溢出 uint112
     *      - 需要重新平衡
     *      
     *      警告：
     *      - 可能改变价格
     *      - 可能导致 LP 价值稀释
     *      - 谨慎使用
     *      
     *      建议：
     *      - 优先使用 skim
     *      - sync 作为最后手段
     */
    function sync() external override nonReentrant {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }
    
    // ============================================
    // 内部函数 - 工具
    // ============================================
    
    /**
     * @notice 安全的代币转账
     * @param token 代币地址
     * @param to 接收地址
     * @param value 转账数量
     * 
     * @dev 使用低级 call 调用 transfer
     *      
     *      为什么不用 IERC20.transfer？
     *      - 有些代币不符合标准（返回值问题）
     *      - 低级 call 更安全
     *      - 兼容性更好
     *      
     *      检查：
     *      1. call 成功
     *      2. 返回值为空 或 true
     */
    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "DEXPair: TRANSFER_FAILED"
        );
    }
}

/**
 * @title IFlashSwapCallee
 * @notice 闪电贷回调接口
 * @dev 使用闪电贷的合约必须实现此接口
 * 
 * 使用示例：
 * ```solidity
 * contract Arbitrage is IFlashSwapCallee {
 *     function flashSwapCall(
 *         address sender,
 *         uint256 amount0,
 *         uint256 amount1,
 *         bytes calldata data
 *     ) external override {
 *         // 1. 此时已收到借出的代币
 *         // 2. 执行套利操作
 *         // 3. 归还代币 + 手续费
 *         // 4. 如果归还不足，交易自动回滚
 *     }
 * }
 * ```
 */
interface IFlashSwapCallee {
    /**
     * @notice 闪电贷回调函数
     * @param sender 发起 swap 的地址
     * @param amount0 Token0 借出数量
     * @param amount1 Token1 借出数量
     * @param data 自定义数据
     * 
     * @dev 在此函数中：
     *      1. 已收到借出的代币
     *      2. 执行任意操作（套利、清算等）
     *      3. 必须归还代币 + 0.3% 手续费
     *      4. 函数返回后 Pair 会检查 k 值
     *      5. k 值不满足则整个交易回滚
     */
    function flashSwapCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
