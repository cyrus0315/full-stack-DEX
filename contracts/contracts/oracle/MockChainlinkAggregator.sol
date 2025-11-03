// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockChainlinkAggregator
 * @author DEX Team
 * @notice 模拟 Chainlink 价格聚合器，用于本地开发和测试
 * @dev 实现了 Chainlink AggregatorV3Interface 的核心接口
 *      在本地 Hardhat 网络中使用，避免依赖真实的 Chainlink 网络
 *      生产环境应使用真实的 Chainlink Price Feeds
 * 
 * 功能说明：
 * 1. 模拟价格数据源
 * 2. 支持手动设置价格（测试用）
 * 3. 兼容 Chainlink 标准接口
 * 4. 可配置小数位数
 * 
 * 使用场景：
 * - 本地开发环境测试
 * - 单元测试
 * - 集成测试
 * - Demo 演示
 */
contract MockChainlinkAggregator {
    
    // ============ 状态变量 ============
    
    /**
     * @notice 当前价格（整数形式）
     * @dev 价格使用固定小数位表示
     *      例如：如果 decimals = 8，价格 100000000 = $1.00
     *           如果 decimals = 8，价格 200000000000 = $2000.00
     */
    int256 private _price;
    
    /**
     * @notice 价格的小数位数
     * @dev Chainlink USD 价格通常使用 8 位小数
     *      ETH 价格使用 18 位小数
     *      本合约默认使用 8 位小数（与 USD 价格一致）
     */
    uint8 private _decimals;
    
    /**
     * @notice 轮次 ID（用于追踪价格更新）
     * @dev 每次价格更新时递增
     */
    uint80 private _roundId;
    
    /**
     * @notice 合约所有者
     * @dev 只有所有者可以更新价格（测试用）
     */
    address public owner;
    
    // ============ 事件 ============
    
    /**
     * @notice 价格更新事件
     * @param roundId 轮次 ID
     * @param price 新价格
     * @param timestamp 更新时间戳
     */
    event PriceUpdated(
        uint80 indexed roundId,
        int256 price,
        uint256 timestamp
    );
    
    // ============ 修饰符 ============
    
    /**
     * @notice 仅所有者可调用
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    // ============ 构造函数 ============
    
    /**
     * @notice 构造函数
     * @param initialPrice 初始价格（整数形式）
     * @param decimals_ 小数位数
     * 
     * @dev 示例：
     *      DAI ($1.00) -> initialPrice = 100000000 (1 * 10^8), decimals = 8
     *      WETH ($2000.00) -> initialPrice = 200000000000 (2000 * 10^8), decimals = 8
     */
    constructor(int256 initialPrice, uint8 decimals_) {
        require(initialPrice > 0, "Price must be positive");
        require(decimals_ > 0 && decimals_ <= 18, "Invalid decimals");
        
        owner = msg.sender;
        _price = initialPrice;
        _decimals = decimals_;
        _roundId = 1;
        
        emit PriceUpdated(_roundId, _price, block.timestamp);
    }
    
    // ============ 外部函数 ============
    
    /**
     * @notice 获取小数位数
     * @return 价格的小数位数
     * 
     * @dev 符合 Chainlink AggregatorV3Interface 标准
     */
    function decimals() external view returns (uint8) {
        return _decimals;
    }
    
    /**
     * @notice 获取聚合器描述
     * @return 描述字符串
     */
    function description() external pure returns (string memory) {
        return "Mock Chainlink Aggregator for Testing";
    }
    
    /**
     * @notice 获取聚合器版本
     * @return 版本号
     */
    function version() external pure returns (uint256) {
        return 1;
    }
    
    /**
     * @notice 获取最新一轮的价格数据
     * @return roundId 轮次 ID
     * @return answer 价格（整数形式）
     * @return startedAt 轮次开始时间
     * @return updatedAt 价格更新时间
     * @return answeredInRound 价格回答的轮次
     * 
     * @dev 这是 Chainlink AggregatorV3Interface 的核心函数
     *      返回的价格需要除以 10^decimals 才是真实价格
     *      例如：answer = 100000000, decimals = 8 -> 实际价格 = $1.00
     * 
     * 使用示例：
     * ```solidity
     * (
     *     uint80 roundID,
     *     int256 price,
     *     uint256 startedAt,
     *     uint256 timeStamp,
     *     uint80 answeredInRound
     * ) = aggregator.latestRoundData();
     * 
     * uint256 realPrice = uint256(price) / (10 ** decimals);
     * ```
     */
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
            _roundId,           // 当前轮次 ID
            _price,             // 当前价格
            block.timestamp,    // 开始时间（简化为当前时间）
            block.timestamp,    // 更新时间
            _roundId            // 回答轮次（简化为当前轮次）
        );
    }
    
    /**
     * @notice 获取指定轮次的价格数据
     * @param roundId_ 轮次 ID
     * @return roundId 轮次 ID
     * @return answer 价格
     * @return startedAt 开始时间
     * @return updatedAt 更新时间
     * @return answeredInRound 回答轮次
     * 
     * @dev 简化实现：只返回当前价格
     *      真实的 Chainlink 会返回历史价格
     */
    function getRoundData(uint80 roundId_)
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
        require(roundId_ <= _roundId, "Round not complete");
        
        // 简化实现：总是返回当前价格
        return (
            roundId_,
            _price,
            block.timestamp,
            block.timestamp,
            roundId_
        );
    }
    
    // ============ 管理函数（仅用于测试）============
    
    /**
     * @notice 设置价格（仅用于测试）
     * @param price 新价格（整数形式）
     * 
     * @dev 只有合约所有者可以调用
     *      生产环境的真实 Chainlink 不提供此功能
     *      
     * 使用场景：
     * - 测试价格波动
     * - 测试价格更新
     * - 模拟市场行情
     * 
     * 示例：
     * ```javascript
     * // 设置 WETH 价格为 $2500.00
     * await aggregator.setPrice(ethers.parseUnits('2500', 8))
     * ```
     */
    function setPrice(int256 price) external onlyOwner {
        require(price > 0, "Price must be positive");
        
        _price = price;
        _roundId++;
        
        emit PriceUpdated(_roundId, _price, block.timestamp);
    }
    
    /**
     * @notice 批量更新价格（模拟真实场景）
     * @param prices 价格数组
     * @param intervals 时间间隔数组（秒）
     * 
     * @dev 用于模拟一段时间内的价格变化
     *      注意：不会实际等待，只是更新轮次数据
     */
    function setPriceHistory(
        int256[] calldata prices,
        uint256[] calldata intervals
    ) external onlyOwner {
        require(prices.length == intervals.length, "Length mismatch");
        
        for (uint256 i = 0; i < prices.length; i++) {
            require(prices[i] > 0, "Price must be positive");
            _price = prices[i];
            _roundId++;
            emit PriceUpdated(_roundId, prices[i], block.timestamp);
        }
    }
    
    /**
     * @notice 获取当前价格（便捷函数）
     * @return 当前价格
     */
    function getCurrentPrice() external view returns (int256) {
        return _price;
    }
    
    /**
     * @notice 获取当前轮次 ID
     * @return 当前轮次 ID
     */
    function getCurrentRoundId() external view returns (uint80) {
        return _roundId;
    }
    
    /**
     * @notice 转移所有权
     * @param newOwner 新所有者地址
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}

