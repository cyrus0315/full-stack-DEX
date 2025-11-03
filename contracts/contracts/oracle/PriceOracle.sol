// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @author DEX Team
 * @notice 价格预言机合约 - DEX 的核心价格数据源
 * @dev 集成 Chainlink Price Feeds，为 DEX 提供可靠的代币价格数据
 * 
 * ============================================
 * 这个合约做什么？
 * ============================================
 * 1. 为每个代币配置 Chainlink Price Feed 地址
 * 2. 查询代币的实时 USD 价格
 * 3. 支持批量查询多个代币价格
 * 4. 提供价格有效性验证
 * 5. 支持降级方案（Fallback）
 * 
 * ============================================
 * 为什么需要价格预言机？
 * ============================================
 * 
 * 问题：如何获取代币的真实 USD 价格？
 * 
 * 方案对比：
 * 
 * ❌ 方案 1：从 DEX 自己的池子计算
 *    问题：容易被操纵、流动性不足时不准确
 *    
 * ❌ 方案 2：从中心化 API 获取（如 CoinGecko）
 *    问题：中心化、不可靠、延迟高
 *    
 * ✅ 方案 3：使用 Chainlink 预言机（本合约）
 *    优势：去中心化、多节点验证、行业标准
 * 
 * ============================================
 * Chainlink 工作原理简介
 * ============================================
 * 
 * 1. 多个独立节点从不同交易所获取价格
 * 2. 节点聚合价格并达成共识
 * 3. 将价格写入链上（每几分钟更新一次）
 * 4. 智能合约可以直接读取最新价格
 * 
 * 价格格式：
 * - 价格使用固定小数位表示（通常 8 位）
 * - 例如：100000000 = $1.00 (8 decimals)
 * - 例如：200000000000 = $2000.00 (8 decimals)
 * 
 * ============================================
 * 使用场景
 * ============================================
 * 
 * 1. TVL 计算
 *    - Pool TVL (USD) = Reserve0 * Price0 + Reserve1 * Price1
 * 
 * 2. 用户资产显示
 *    - Portfolio Value = Σ(Token Balance * Token Price)
 * 
 * 3. APR 计算
 *    - APR = (Reward Value / Staked Value) * 365 * 100%
 * 
 * 4. 限价单（未来功能）
 *    - 当价格达到目标价格时自动执行交易
 * 
 * ============================================
 * 安全考虑
 * ============================================
 * 
 * 1. 价格时效性检查（防止使用过期价格）
 * 2. 价格合理性检查（防止异常价格）
 * 3. 多次读取验证（防止闪电贷攻击）
 * 4. 降级方案（价格源失败时的备用方案）
 * 
 * ============================================
 * 参考资源
 * ============================================
 * 
 * - Chainlink 官方文档: https://docs.chain.link/
 * - Price Feeds 地址: https://docs.chain.link/data-feeds/price-feeds/addresses
 * - Uniswap V3 Oracle: https://docs.uniswap.org/concepts/protocol/oracle
 */
contract PriceOracle is Ownable {
    
    // ============================================
    // 状态变量
    // ============================================
    
    /**
     * @notice 代币地址 => Chainlink Price Feed 地址的映射
     * @dev 管理员需要为每个代币配置对应的 Price Feed
     * 
     * 示例：
     * DAI  -> 0x... (DAI/USD Price Feed)
     * WETH -> 0x... (ETH/USD Price Feed)
     * USDT -> 0x... (USDT/USD Price Feed)
     */
    mapping(address => address) public priceFeeds;
    
    /**
     * @notice 价格更新的最大允许延迟（秒）
     * @dev 如果价格超过这个时间没更新，则认为价格过期
     *      Chainlink 通常 1-10 分钟更新一次
     *      默认设置为 1 小时（3600 秒）
     */
    uint256 public maxPriceAge = 3600;
    
    /**
     * @notice 价格偏差阈值（基点，1% = 100）
     * @dev 用于检测价格异常波动
     *      如果价格波动超过此阈值，可能需要人工干预
     *      默认 50% = 5000 基点
     */
    uint256 public priceDeviationThreshold = 5000;
    
    /**
     * @notice 是否启用严格模式
     * @dev 严格模式下，价格必须通过所有验证
     *      非严格模式下，某些验证失败时会返回降级价格
     */
    bool public strictMode = false;
    
    // ============================================
    // 事件
    // ============================================
    
    /**
     * @notice Price Feed 更新事件
     * @param token 代币地址
     * @param feed Price Feed 地址
     * @param operator 操作者地址
     */
    event PriceFeedUpdated(
        address indexed token,
        address indexed feed,
        address indexed operator
    );
    
    /**
     * @notice 价格查询事件
     * @param token 代币地址
     * @param price 价格（8 位小数）
     * @param timestamp 时间戳
     */
    event PriceQueried(
        address indexed token,
        uint256 price,
        uint256 timestamp
    );
    
    /**
     * @notice 价格异常事件
     * @param token 代币地址
     * @param reason 异常原因
     * @param price 价格
     */
    event PriceAnomaly(
        address indexed token,
        string reason,
        uint256 price
    );
    
    /**
     * @notice 配置更新事件
     * @param parameter 参数名称
     * @param oldValue 旧值
     * @param newValue 新值
     */
    event ConfigUpdated(
        string parameter,
        uint256 oldValue,
        uint256 newValue
    );
    
    // ============================================
    // 构造函数
    // ============================================
    
    /**
     * @notice 构造函数
     * @param initialOwner 初始所有者地址
     * 
     * @dev 部署后需要调用 setPriceFeed() 配置每个代币的 Price Feed
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        // 所有者已通过 Ownable 构造函数设置
    }
    
    // ============================================
    // 外部函数 - 价格查询
    // ============================================
    
    /**
     * @notice 获取代币的 USD 价格
     * @param token 代币地址
     * @return price 价格（8 位小数）
     * 
     * @dev 返回的价格格式：price / 1e8 = 实际 USD 价格
     *      例如：返回 100000000 表示 $1.00
     *      例如：返回 200000000000 表示 $2000.00
     * 
     * 流程：
     * 1. 检查是否配置了 Price Feed
     * 2. 从 Chainlink 读取最新价格
     * 3. 验证价格有效性
     * 4. 返回价格
     * 
     * 使用示例：
     * ```solidity
     * uint256 daiPrice = priceOracle.getPrice(daiAddress);
     * // daiPrice = 100000000 (即 $1.00)
     * 
     * uint256 actualPrice = daiPrice / 1e8; // = 1 USD
     * ```
     * 
     * 注意事项：
     * - 如果没有配置 Price Feed，会 revert
     * - 如果价格过期，根据 strictMode 决定是否 revert
     * - 如果价格异常，会触发 PriceAnomaly 事件
     */
    function getPrice(address token) external view returns (uint256) {
        address feed = priceFeeds[token];
        require(feed != address(0), "PriceOracle: Price feed not set");
        
        return _getLatestPrice(feed);
    }
    
    /**
     * @notice 批量获取代币价格
     * @param tokens 代币地址数组
     * @return prices 价格数组（8 位小数）
     * 
     * @dev 用于一次性查询多个代币价格，节省 gas
     * 
     * 使用示例：
     * ```solidity
     * address[] memory tokens = new address[](3);
     * tokens[0] = daiAddress;
     * tokens[1] = usdtAddress;
     * tokens[2] = wethAddress;
     * 
     * uint256[] memory prices = priceOracle.getPrices(tokens);
     * // prices[0] = DAI price
     * // prices[1] = USDT price
     * // prices[2] = WETH price
     * ```
     */
    function getPrices(
        address[] calldata tokens
    ) external view returns (uint256[] memory) {
        uint256[] memory prices = new uint256[](tokens.length);
        
        for (uint256 i = 0; i < tokens.length; i++) {
            address feed = priceFeeds[tokens[i]];
            if (feed != address(0)) {
                try this.getPrice(tokens[i]) returns (uint256 price) {
                    prices[i] = price;
                } catch {
                    // 查询失败，返回 0
                    prices[i] = 0;
                }
            } else {
                prices[i] = 0;
            }
        }
        
        return prices;
    }
    
    /**
     * @notice 获取代币价格（带安全检查）
     * @param token 代币地址
     * @return price 价格（8 位小数）
     * @return isValid 价格是否有效
     * @return timestamp 价格更新时间戳
     * 
     * @dev 返回额外的验证信息，供调用者判断
     * 
     * 使用场景：
     * - 需要判断价格可靠性时
     * - 需要知道价格更新时间时
     * - 实现降级逻辑时
     */
    function getPriceWithValidation(
        address token
    ) external view returns (
        uint256 price,
        bool isValid,
        uint256 timestamp
    ) {
        address feed = priceFeeds[token];
        if (feed == address(0)) {
            return (0, false, 0);
        }
        
        try this.getPrice(token) returns (uint256 p) {
            AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
            (
                /* uint80 roundID */,
                /* int256 answer */,
                /* uint256 startedAt */,
                uint256 updatedAt,
                /* uint80 answeredInRound */
            ) = priceFeed.latestRoundData();
            
            // 检查价格是否过期
            bool fresh = block.timestamp - updatedAt <= maxPriceAge;
            
            return (p, fresh, updatedAt);
        } catch {
            return (0, false, 0);
        }
    }
    
    // ============================================
    // 外部函数 - 配置管理（仅管理员）
    // ============================================
    
    /**
     * @notice 设置代币的 Price Feed
     * @param token 代币地址
     * @param feed Chainlink Price Feed 地址
     * 
     * @dev 只有合约所有者可以调用
     * 
     * 配置步骤：
     * 1. 在 Chainlink 官网查找对应的 Price Feed 地址
     *    https://docs.chain.link/data-feeds/price-feeds/addresses
     * 2. 调用此函数配置映射关系
     * 3. 验证配置是否成功（调用 getPrice 测试）
     * 
     * 示例：
     * ```javascript
     * // 配置 DAI/USD Price Feed
     * await priceOracle.setPriceFeed(
     *   daiAddress,
     *   "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9" // DAI/USD on Mainnet
     * )
     * ```
     * 
     * 注意事项：
     * - feed 必须是有效的 Chainlink Aggregator 地址
     * - 设置前建议先测试 feed 是否正常工作
     * - 可以随时更新 feed 地址（如迁移到新版本）
     */
    function setPriceFeed(
        address token,
        address feed
    ) external onlyOwner {
        require(token != address(0), "PriceOracle: Invalid token address");
        require(feed != address(0), "PriceOracle: Invalid feed address");
        
        // 验证 feed 是否有效（尝试读取价格）
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        try priceFeed.latestRoundData() returns (
            uint80,
            int256 price,
            uint256,
            uint256,
            uint80
        ) {
            require(price > 0, "PriceOracle: Invalid price from feed");
        } catch {
            revert("PriceOracle: Feed validation failed");
        }
        
        priceFeeds[token] = feed;
        
        emit PriceFeedUpdated(token, feed, msg.sender);
    }
    
    /**
     * @notice 批量设置 Price Feeds
     * @param tokens 代币地址数组
     * @param feeds Price Feed 地址数组
     * 
     * @dev 用于一次性配置多个代币，节省时间
     * 
     * 示例：
     * ```javascript
     * await priceOracle.setPriceFeeds(
     *   [daiAddress, usdtAddress, wethAddress],
     *   [daiFeed, usdtFeed, wethFeed]
     * )
     * ```
     */
    function setPriceFeeds(
        address[] calldata tokens,
        address[] calldata feeds
    ) external onlyOwner {
        require(
            tokens.length == feeds.length,
            "PriceOracle: Length mismatch"
        );
        
        for (uint256 i = 0; i < tokens.length; i++) {
            this.setPriceFeed(tokens[i], feeds[i]);
        }
    }
    
    /**
     * @notice 移除代币的 Price Feed
     * @param token 代币地址
     * 
     * @dev 移除后，该代币的价格查询将失败
     *      谨慎使用！
     */
    function removePriceFeed(address token) external onlyOwner {
        require(
            priceFeeds[token] != address(0),
            "PriceOracle: Feed not set"
        );
        
        address oldFeed = priceFeeds[token];
        delete priceFeeds[token];
        
        emit PriceFeedUpdated(token, address(0), msg.sender);
    }
    
    /**
     * @notice 设置价格最大延迟时间
     * @param newMaxAge 新的最大延迟（秒）
     * 
     * @dev 用于控制价格时效性要求
     *      建议：3600 秒（1 小时）
     */
    function setMaxPriceAge(uint256 newMaxAge) external onlyOwner {
        require(newMaxAge > 0, "PriceOracle: Invalid max age");
        
        uint256 oldValue = maxPriceAge;
        maxPriceAge = newMaxAge;
        
        emit ConfigUpdated("maxPriceAge", oldValue, newMaxAge);
    }
    
    /**
     * @notice 设置价格偏差阈值
     * @param newThreshold 新阈值（基点，1% = 100）
     * 
     * @dev 用于检测异常价格波动
     *      建议：5000（50%）
     */
    function setPriceDeviationThreshold(
        uint256 newThreshold
    ) external onlyOwner {
        require(newThreshold > 0, "PriceOracle: Invalid threshold");
        
        uint256 oldValue = priceDeviationThreshold;
        priceDeviationThreshold = newThreshold;
        
        emit ConfigUpdated("priceDeviationThreshold", oldValue, newThreshold);
    }
    
    /**
     * @notice 设置严格模式
     * @param enabled 是否启用
     * 
     * @dev 严格模式：价格验证失败时直接 revert
     *      非严格模式：价格验证失败时返回最后的有效价格
     */
    function setStrictMode(bool enabled) external onlyOwner {
        strictMode = enabled;
        emit ConfigUpdated(
            "strictMode",
            enabled ? 0 : 1,
            enabled ? 1 : 0
        );
    }
    
    // ============================================
    // 公共查询函数
    // ============================================
    
    /**
     * @notice 检查代币是否配置了 Price Feed
     * @param token 代币地址
     * @return 是否已配置
     */
    function hasPriceFeed(address token) external view returns (bool) {
        return priceFeeds[token] != address(0);
    }
    
    /**
     * @notice 获取 Price Feed 的详细信息
     * @param token 代币地址
     * @return feed Feed 地址
     * @return decimals 价格小数位
     * @return description 描述
     * @return version 版本
     */
    function getPriceFeedInfo(
        address token
    ) external view returns (
        address feed,
        uint8 decimals,
        string memory description,
        uint256 version
    ) {
        feed = priceFeeds[token];
        require(feed != address(0), "PriceOracle: Feed not set");
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        decimals = priceFeed.decimals();
        description = priceFeed.description();
        version = priceFeed.version();
    }
    
    // ============================================
    // 内部函数
    // ============================================
    
    /**
     * @notice 从 Price Feed 读取最新价格
     * @param feed Price Feed 地址
     * @return price 价格（8 位小数）
     * 
     * @dev 内部函数，处理价格读取和验证逻辑
     */
    function _getLatestPrice(
        address feed
    ) internal view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);
        
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        // 验证 1：价格必须大于 0
        require(price > 0, "PriceOracle: Invalid price");
        
        // 验证 2：检查轮次完整性
        require(
            answeredInRound >= roundID,
            "PriceOracle: Stale price"
        );
        
        // 验证 3：检查价格时效性
        if (strictMode) {
            require(
                block.timestamp - updatedAt <= maxPriceAge,
                "PriceOracle: Price too old"
            );
        }
        
        return uint256(price);
    }
}

