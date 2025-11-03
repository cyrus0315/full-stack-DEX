// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEXPair.sol";
import "../interfaces/IDEXFactory.sol";

/**
 * @title DEXFactory
 * @author DEX Team
 * @notice DEX 工厂合约 - 负责创建和管理所有交易对
 * @dev 基于 Uniswap V2 Factory 实现，使用 CREATE2 实现确定性部署
 * 
 * ============================================
 * 这个合约做什么？
 * ============================================
 * 
 * 1. **创建交易对（Pair）**
 *    - 任何人都可以创建新的交易对
 *    - 使用 CREATE2 确保相同代币对的地址唯一
 *    - 一对代币只能创建一个交易对
 * 
 * 2. **管理交易对记录**
 *    - 记录所有已创建的交易对
 *    - 提供双向查询（tokenA-tokenB 和 tokenB-tokenA）
 *    - 维护交易对数组
 * 
 * 3. **协议费管理**
 *    - 设置协议费收取地址
 *    - 管理费用收取权限
 * 
 * ============================================
 * CREATE2 是什么？
 * ============================================
 * 
 * CREATE2 是以太坊的一个操作码，可以实现"确定性部署"：
 * 
 * **传统 CREATE：**
 * - 合约地址 = hash(sender, nonce)
 * - 地址不可预测
 * - 每次部署地址都不同
 * 
 * **CREATE2：**
 * - 合约地址 = hash(sender, salt, bytecode)
 * - 地址可预测
 * - 相同参数必然得到相同地址
 * 
 * **为什么使用 CREATE2？**
 * 1. 地址可预测 - 知道代币对就能计算出 Pair 地址
 * 2. 节省 gas - 无需存储 Pair 地址，可以直接计算
 * 3. 防止重复创建 - 相同代币对必然得到相同地址
 * 
 * **示例：**
 * ```
 * DAI-USDT Pair 地址 = hash(
 *   Factory地址,
 *   keccak256(DAI地址, USDT地址),
 *   DEXPair合约字节码
 * )
 * ```
 * 
 * ============================================
 * 交易对地址计算
 * ============================================
 * 
 * 链下可以直接计算 Pair 地址，无需查询：
 * 
 * ```javascript
 * function getPairAddress(tokenA, tokenB) {
 *   const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
 *   const salt = keccak256(['address', 'address'], [token0, token1])
 *   const bytecode = DEXPair.bytecode
 *   
 *   return getCreate2Address(
 *     factoryAddress,
 *     salt,
 *     keccak256(bytecode)
 *   )
 * }
 * ```
 * 
 * ============================================
 * 协议费机制
 * ============================================
 * 
 * **费用来源：**
 * - 每笔交易收取 0.3% 手续费
 * - 其中 0.25% 给 LP 提供者
 * - 0.05% 可选地给协议（feeTo地址）
 * 
 * **如何开启协议费：**
 * 1. feeToSetter 调用 setFeeTo(收费地址)
 * 2. 之后每次添加/移除流动性时自动铸造协议费
 * 
 * **协议费计算：**
 * - 协议费 = 1/6 * sqrt(k) 的增长
 * - k = reserve0 * reserve1
 * 
 * ============================================
 * 使用示例
 * ============================================
 * 
 * **创建交易对：**
 * ```solidity
 * address pair = factory.createPair(tokenA, tokenB);
 * ```
 * 
 * **查询交易对：**
 * ```solidity
 * address pair = factory.getPair(tokenA, tokenB);
 * // 或者
 * address pair = factory.getPair(tokenB, tokenA); // 顺序无关
 * ```
 * 
 * **获取所有交易对：**
 * ```solidity
 * uint256 length = factory.allPairsLength();
 * for (uint256 i = 0; i < length; i++) {
 *     address pair = factory.allPairs(i);
 *     // 处理交易对...
 * }
 * ```
 * 
 * ============================================
 * 安全考虑
 * ============================================
 * 
 * 1. **防止重复创建** - getPair 映射检查
 * 2. **防止零地址** - token0 != address(0)
 * 3. **防止相同代币** - tokenA != tokenB
 * 4. **权限控制** - 只有 feeToSetter 可以修改费用配置
 * 5. **地址排序** - 确保双向映射一致性
 * 
 * ============================================
 * 参考资源
 * ============================================
 * 
 * - Uniswap V2 Factory: https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Factory.sol
 * - CREATE2 详解: https://eips.ethereum.org/EIPS/eip-1014
 * - Uniswap V2 白皮书: https://uniswap.org/whitepaper.pdf
 */
contract DEXFactory is IDEXFactory {
    
    // ============================================
    // 状态变量
    // ============================================
    
    /**
     * @notice 协议费接收地址
     * @dev 如果设置为非零地址，则开启协议费收取
     *      协议费将以 LP Token 的形式铸造给此地址
     *      设置为 address(0) 则关闭协议费
     */
    address public override feeTo;
    
    /**
     * @notice 费用设置权限地址
     * @dev 只有此地址可以：
     *      1. 设置 feeTo（开启/关闭协议费）
     *      2. 转移 feeToSetter 权限
     *      
     *      通常是：
     *      - 部署时：deployer 地址
     *      - 生产环境：多签钱包或治理合约
     */
    address public override feeToSetter;
    
    /**
     * @notice 交易对映射：(tokenA => (tokenB => pair地址))
     * @dev 双向映射：
     *      - getPair[token0][token1] = pair
     *      - getPair[token1][token0] = pair
     *      
     *      这样无论用户以什么顺序查询都能找到交易对
     *      
     *      示例：
     *      ```solidity
     *      // DAI-USDT Pair
     *      getPair[DAI][USDT] == 0x123...
     *      getPair[USDT][DAI] == 0x123... // 相同地址
     *      ```
     */
    mapping(address => mapping(address => address)) public override getPair;
    
    /**
     * @notice 所有交易对的数组
     * @dev 按创建顺序存储所有交易对地址
     *      用于：
     *      - 遍历所有交易对
     *      - 获取交易对总数
     *      - 链下索引和分析
     *      
     *      注意：数组只增不减（即使交易对废弃也不删除）
     */
    address[] public override allPairs;
    
    // ============================================
    // 构造函数
    // ============================================
    
    /**
     * @notice 构造函数
     * @param _feeToSetter 初始的费用设置权限地址
     * 
     * @dev 部署后：
     *      - feeTo = address(0)（协议费关闭）
     *      - feeToSetter = _feeToSetter（通常是部署者）
     *      - allPairs = []（无交易对）
     */
    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }
    
    // ============================================
    // 外部函数 - 查询
    // ============================================
    
    /**
     * @notice 获取交易对总数
     * @return 交易对数量
     * 
     * @dev 返回 allPairs 数组的长度
     *      
     *      使用场景：
     *      - 链下遍历所有交易对
     *      - 统计 DEX 规模
     *      - 分页查询
     */
    function allPairsLength() external view override returns (uint256) {
        return allPairs.length;
    }
    
    // ============================================
    // 外部函数 - 交易对管理
    // ============================================
    
    /**
     * @notice 创建新的交易对
     * @param tokenA 第一个代币地址
     * @param tokenB 第二个代币地址
     * @return pair 新创建的交易对地址
     * 
     * @dev 创建流程：
     *      1. 验证：代币地址不同、非零、交易对不存在
     *      2. 排序：确保 token0 < token1（地址大小排序）
     *      3. 部署：使用 CREATE2 部署 DEXPair 合约
     *      4. 初始化：调用 pair.initialize(token0, token1)
     *      5. 记录：更新 getPair 映射和 allPairs 数组
     *      6. 事件：触发 PairCreated 事件
     *      
     *      为什么排序？
     *      - 确保 (DAI, USDT) 和 (USDT, DAI) 生成相同地址
     *      - 简化双向映射逻辑
     *      - 统一代币顺序
     *      
     *      为什么用 CREATE2？
     *      - 相同代币对必然生成相同地址
     *      - 防止重复创建
     *      - 地址可预测（链下可计算）
     *      
     *      注意事项：
     *      - 任何人都可以调用此函数
     *      - 创建交易对本身不需要权限
     *      - 创建后无法删除（只能废弃）
     *      
     *      使用示例：
     *      ```solidity
     *      // 创建 DAI-USDT 交易对
     *      address pair = factory.createPair(daiAddress, usdtAddress);
     *      
     *      // 查询交易对（顺序无关）
     *      address samePair = factory.getPair(daiAddress, usdtAddress);
     *      address samePair2 = factory.getPair(usdtAddress, daiAddress);
     *      // samePair == samePair2 == pair
     *      ```
     */
    function createPair(
        address tokenA,
        address tokenB
    ) external override returns (address pair) {
        // 验证 1：代币地址必须不同
        require(tokenA != tokenB, "DEXFactory: IDENTICAL_ADDRESSES");
        
        // 排序地址（token0 < token1）
        // 这确保了无论用户传入什么顺序，都会得到相同的结果
        (address token0, address token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);
        
        // 验证 2：token0 不能是零地址（排序后 token1 也必然不是零地址）
        require(token0 != address(0), "DEXFactory: ZERO_ADDRESS");
        
        // 验证 3：交易对不能已存在
        require(getPair[token0][token1] == address(0), "DEXFactory: PAIR_EXISTS");
        
        // 使用 CREATE2 创建 Pair 合约
        // CREATE2 公式：address = hash(0xFF, sender, salt, bytecode_hash)
        bytes memory bytecode = type(DEXPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            // create2(value, offset, size, salt)
            // - value: 发送的 ETH 数量（0）
            // - offset: 字节码在内存中的位置
            // - size: 字节码大小
            // - salt: 盐值（用于计算地址）
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // 初始化 Pair
        // 设置 token0 和 token1（只能初始化一次）
        DEXPair(pair).initialize(token0, token1);
        
        // 保存映射关系（双向）
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // 双向映射，方便查询
        
        // 添加到数组
        allPairs.push(pair);
        
        // 触发事件
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
    
    // ============================================
    // 外部函数 - 费用管理（仅限 feeToSetter）
    // ============================================
    
    /**
     * @notice 设置协议费接收地址
     * @param _feeTo 新的费用接收地址
     * 
     * @dev 只有 feeToSetter 可以调用
     *      
     *      设置为 address(0)：关闭协议费
     *      设置为非零地址：开启协议费
     *      
     *      协议费计算：
     *      - 在每次添加/移除流动性时触发
     *      - 铸造 LP Token 给 feeTo 地址
     *      - 数量 = 1/6 * sqrt(k) 的增长
     *      
     *      影响：
     *      - 不影响交易手续费（仍然是 0.3%）
     *      - 只影响 LP 提供者的收益分配
     *      - LP 提供者收益从 100% 变为 83.3%
     *      
     *      使用示例：
     *      ```solidity
     *      // 开启协议费
     *      factory.setFeeTo(treasuryAddress);
     *      
     *      // 关闭协议费
     *      factory.setFeeTo(address(0));
     *      ```
     */
    function setFeeTo(address _feeTo) external override {
        require(msg.sender == feeToSetter, "DEXFactory: FORBIDDEN");
        feeTo = _feeTo;
    }
    
    /**
     * @notice 转移费用设置权限
     * @param _feeToSetter 新的费用设置权限地址
     * 
     * @dev 只有当前 feeToSetter 可以调用
     *      
     *      这是一个关键的权限操作！
     *      新地址将获得：
     *      - 设置 feeTo 的权限
     *      - 再次转移 feeToSetter 的权限
     *      
     *      建议流程：
     *      1. 部署时 -> EOA 地址（方便测试）
     *      2. 测试后 -> 多签钱包（提高安全性）
     *      3. 成熟后 -> 治理合约（社区治理）
     *      
     *      警告：
     *      - 转移后无法撤回（除非新地址再转回）
     *      - 务必确认新地址正确
     *      - 建议使用多签钱包
     *      
     *      使用示例：
     *      ```solidity
     *      // 转移给多签钱包
     *      factory.setFeeToSetter(multiSigWallet);
     *      
     *      // 转移给治理合约
     *      factory.setFeeToSetter(governanceContract);
     *      ```
     */
    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, "DEXFactory: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }
}
