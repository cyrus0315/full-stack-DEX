// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LimitOrderBook
 * @dev 限价单订单簿合约 - 支持目标价格的自动化交易
 * 
 * 这个合约做什么？
 * 1. 允许用户创建限价单（设定目标价格）
 * 2. 托管用户的代币，确保订单可执行
 * 3. 由 Keeper 自动监控价格并执行订单
 * 4. 支持订单取消、过期等完整生命周期管理
 * 
 * 核心概念：
 * - Maker（订单创建者）：创建限价单的用户
 * - Keeper（执行者）：自动化程序，监控并执行满足条件的订单
 * - 执行费用：用户创建订单时支付，用于激励 Keeper
 * - 代币托管：订单创建时代币转入合约，确保执行时有足够余额
 * 
 * 限价单 vs 市价单：
 * - 市价单（Swap）：立即执行，接受当前价格
 * - 限价单：等待目标价格，自动执行
 * 
 * 使用场景：
 * - 追求更好的交易价格
 * - 市场波动时的风险控制
 * - 自动化交易（无需盯盘）
 * 
 * 参考：dYdX, 1inch Limit Order Protocol
 */
contract LimitOrderBook is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============================================
    // 数据结构
    // ============================================

    /**
     * @notice 订单状态枚举
     * @dev 订单在生命周期中会经历不同的状态
     */
    enum OrderStatus {
        Active,      // 活跃订单（等待执行）
        Filled,      // 已成交（Keeper 已执行）
        Cancelled,   // 已取消（用户主动取消）
        Expired      // 已过期（超过有效期）
    }

    /**
     * @notice 订单信息
     * @dev 记录单个限价单的完整信息
     */
    struct Order {
        uint256 id;              // 订单唯一 ID（从 1 开始递增）
        address maker;           // 订单创建者地址
        address tokenIn;         // 输入代币地址（用户要卖出的代币）
        address tokenOut;        // 输出代币地址（用户要买入的代币）
        uint256 amountIn;        // 输入数量（wei 格式）
        uint256 minAmountOut;    // 最小输出数量（wei 格式）- 这个定义了目标价格
        uint256 executionPrice;  // 执行价格（amountOut * 1e18 / amountIn）
        OrderStatus status;      // 订单当前状态
        uint256 createdAt;       // 创建时间戳（区块时间）
        uint256 expiresAt;       // 过期时间戳（0 表示永不过期）
        
        // minAmountOut 解释：
        // - 这是限价单的核心参数
        // - 定义了用户期望的目标价格
        // - 例如：用 100 TokenA 换至少 200 TokenB
        //   → 目标价格：1 TokenA = 2 TokenB
        // - Keeper 只有在 当前价格 >= minAmountOut 时才会执行
        
        // executionPrice 解释：
        // - 计算公式：(minAmountOut * 1e18) / amountIn
        // - 用于显示和比较价格
        // - 放大 1e18 倍是为了保留精度
        // - 例如：(200 * 1e18) / 100 = 2 * 1e18（表示 1:2 的价格）
    }

    // ============================================
    // 状态变量
    // ============================================

    /// @notice 所有订单的存储映射：orderId => Order
    mapping(uint256 => Order) public orders;
    
    /// @notice 用户订单列表：userAddress => orderId[]
    /// @dev 用于快速查询某个用户的所有订单
    mapping(address => uint256[]) public userOrders;
    
    /// @notice 活跃订单 ID 列表（数组）
    /// @dev Keeper 通过遍历这个数组来检查哪些订单需要执行
    /// @dev 相比遍历所有订单，这个方式更高效（只遍历活跃的）
    uint256[] public activeOrderIds;
    
    /// @notice 活跃订单在数组中的索引：orderId => index
    /// @dev 用于 O(1) 时间复杂度删除数组元素（Swap-and-Pop 技巧）
    mapping(uint256 => uint256) public activeOrderIndex;
    
    /// @notice 订单 ID 计数器（自增）
    uint256 public orderIdCounter;
    
    /// @notice DEX Router 合约地址
    /// @dev 执行订单时通过 Router 进行 swap
    address public dexRouter;
    
    /// @notice Keeper 授权映射：address => bool
    /// @dev 只有被授权的 Keeper 才能执行订单
    /// @dev 防止恶意用户执行订单
    mapping(address => bool) public isKeeper;
    
    /// @notice 执行费用（单位：wei）
    /// @dev 用户创建订单时必须支付这笔费用
    /// @dev Keeper 执行订单后获得这笔费用作为奖励
    /// @dev 默认 0.001 ETH，可由 owner 调整
    uint256 public executionFee = 0.001 ether;
    
    /// @notice 订单有效期上限（默认 30 天）
    /// @dev 防止用户设置过长的有效期
    uint256 public constant MAX_ORDER_DURATION = 30 days;

    // ============================================
    // 事件
    // ============================================

    /**
     * @notice 订单创建事件
     * @dev 前端和后端监听此事件来更新订单列表
     * @param orderId 订单 ID
     * @param maker 订单创建者地址
     * @param tokenIn 输入代币地址
     * @param tokenOut 输出代币地址
     * @param amountIn 输入数量
     * @param minAmountOut 最小输出数量（目标价格）
     * @param executionPrice 计算的执行价格
     * @param expiresAt 过期时间戳
     */
    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 executionPrice,
        uint256 expiresAt
    );

    /**
     * @notice 订单成交事件
     * @dev Keeper 成功执行订单后触发
     * @param orderId 订单 ID
     * @param maker 订单创建者地址
     * @param executor Keeper 地址
     * @param amountIn 输入数量
     * @param amountOut 实际输出数量
     */
    event OrderFilled(
        uint256 indexed orderId,
        address indexed maker,
        address indexed executor,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @notice 订单取消事件
     * @dev 用户主动取消订单后触发
     * @param orderId 订单 ID
     * @param maker 订单创建者地址
     */
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed maker
    );

    /**
     * @notice 订单过期事件
     * @dev 订单超过有效期后触发
     * @param orderId 订单 ID
     * @param maker 订单创建者地址
     */
    event OrderExpired(
        uint256 indexed orderId,
        address indexed maker
    );

    /**
     * @notice Keeper 授权更新事件
     * @param keeper Keeper 地址
     * @param status 授权状态（true=授权，false=取消授权）
     */
    event KeeperUpdated(
        address indexed keeper,
        bool status
    );

    /**
     * @notice 执行费用更新事件
     * @param oldFee 旧费用
     * @param newFee 新费用
     */
    event ExecutionFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    // ============================================
    // 修饰符
    // ============================================

    /**
     * @notice Keeper 权限修饰符
     * @dev 只有被授权的 Keeper 才能调用带此修饰符的函数
     */
    modifier onlyKeeper() {
        require(isKeeper[msg.sender], "LimitOrderBook: Not authorized keeper");
        _;
    }

    // ============================================
    // 构造函数
    // ============================================

    /**
     * @notice 构造函数
     * @dev 初始化合约，设置 DEX Router 地址
     * @param _dexRouter DEX Router 合约地址
     */
    constructor(address _dexRouter) Ownable(msg.sender) {
        require(_dexRouter != address(0), "LimitOrderBook: Invalid router");
        dexRouter = _dexRouter;
    }

    // ============================================
    // 核心功能函数
    // ============================================

    /**
     * @notice 创建限价单
     * @dev 用户创建限价单，设定目标价格
     * 
     * 工作流程：
     * 1. 验证参数（代币地址、数量、费用等）
     * 2. 转移 tokenIn 到合约托管（用户需提前 approve）
     * 3. 创建订单记录
     * 4. 添加到活跃订单列表
     * 5. 触发 OrderCreated 事件
     * 
     * 代币托管说明：
     * - 为什么要托管？确保执行时有足够余额
     * - 用户必须提前调用 tokenIn.approve(limitOrderBook, amountIn)
     * - 代币会立即转移到合约，锁定直到订单执行或取消
     * 
     * 执行费用说明：
     * - 用户必须支付 executionFee（默认 0.001 ETH）
     * - 费用用于激励 Keeper 执行订单
     * - 如果订单取消或过期，费用会退回给用户
     * - 如果订单成交，费用支付给 Keeper
     * 
     * @param tokenIn 输入代币地址（用户要卖出的代币）
     * @param tokenOut 输出代币地址（用户要买入的代币）
     * @param amountIn 输入数量（wei 格式）
     * @param minAmountOut 最小输出数量（wei 格式）- 定义目标价格
     * @param duration 订单有效期（秒），0 表示永不过期
     * @return orderId 创建的订单 ID
     * 
     * 使用示例：
     * ```
     * // 用 100 TokenA 换至少 200 TokenB，24 小时有效
     * tokenA.approve(limitOrderBook, 100 * 10^18);
     * limitOrderBook.createOrder(
     *   tokenA,
     *   tokenB,
     *   100 * 10^18,
     *   200 * 10^18,
     *   86400,
     *   { value: 0.001 ether }
     * );
     * ```
     */
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 duration
    ) external payable nonReentrant returns (uint256 orderId) {
        // ① 参数验证
        require(tokenIn != address(0) && tokenOut != address(0), "LimitOrderBook: Invalid token");
        require(tokenIn != tokenOut, "LimitOrderBook: Same token");
        require(amountIn > 0, "LimitOrderBook: Zero amount");
        require(minAmountOut > 0, "LimitOrderBook: Zero min amount");
        require(msg.value >= executionFee, "LimitOrderBook: Insufficient execution fee");
        
        // 验证有效期
        if (duration > 0) {
            require(duration <= MAX_ORDER_DURATION, "LimitOrderBook: Duration too long");
        }

        // ② 转移输入代币到合约（托管）
        // 重要：用户必须提前调用 tokenIn.approve(limitOrderBook, amountIn)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // ③ 创建订单
        orderIdCounter++;  // 订单 ID 自增
        orderId = orderIdCounter;

        // 计算过期时间
        uint256 expiresAt = duration > 0 ? block.timestamp + duration : 0;
        
        // 计算执行价格（用于显示和比较）
        // 公式：(minAmountOut * 1e18) / amountIn
        // 例如：(200 * 1e18) / 100 = 2 * 1e18（表示 1 TokenA = 2 TokenB）
        uint256 executionPrice = (minAmountOut * 1e18) / amountIn;

        // 保存订单信息
        orders[orderId] = Order({
            id: orderId,
            maker: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            executionPrice: executionPrice,
            status: OrderStatus.Active,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        // ④ 添加到用户订单列表（方便查询"我的订单"）
        userOrders[msg.sender].push(orderId);

        // ⑤ 添加到活跃订单列表（方便 Keeper 遍历）
        activeOrderIndex[orderId] = activeOrderIds.length;
        activeOrderIds.push(orderId);

        // ⑥ 触发事件
        emit OrderCreated(
            orderId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            executionPrice,
            expiresAt
        );
    }

    /**
     * @notice 取消订单
     * @dev 用户主动取消自己的活跃订单
     * 
     * 工作流程：
     * 1. 验证订单所有权和状态
     * 2. 更新订单状态为 Cancelled
     * 3. 从活跃订单列表移除
     * 4. 退回托管的代币
     * 5. 退回执行费用
     * 6. 触发 OrderCancelled 事件
     * 
     * 限制：
     * - 只能取消自己创建的订单
     * - 只能取消 Active 状态的订单
     * - 已成交、已过期、已取消的订单无法再次取消
     * 
     * @param orderId 要取消的订单 ID
     * 
     * 使用示例：
     * ```
     * // 取消订单 1
     * limitOrderBook.cancelOrder(1);
     * // 结果：代币和费用退回到用户钱包
     * ```
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        
        // ① 验证
        require(order.maker == msg.sender, "LimitOrderBook: Not order maker");
        require(order.status == OrderStatus.Active, "LimitOrderBook: Order not active");

        // ② 更新订单状态
        order.status = OrderStatus.Cancelled;

        // ③ 从活跃订单列表中移除
        _removeFromActiveOrders(orderId);

        // ④ 退回输入代币
        IERC20(order.tokenIn).safeTransfer(order.maker, order.amountIn);

        // ⑤ 退回执行费用
        payable(order.maker).transfer(executionFee);

        // ⑥ 触发事件
        emit OrderCancelled(orderId, order.maker);
    }

    /**
     * @notice 执行订单（仅 Keeper 可调用）
     * @dev Keeper 在发现价格满足条件时调用此函数执行订单
     * 
     * 工作流程：
     * 1. 验证 Keeper 权限、订单状态、价格条件
     * 2. 检查订单是否过期
     * 3. 更新订单状态为 Filled
     * 4. 从活跃订单列表移除
     * 5. 通过 Router 执行 swap（或直接转账）
     * 6. 支付执行费用给 Keeper
     * 7. 触发 OrderFilled 事件
     * 
     * 价格检查：
     * - Keeper 必须传入 amountOut（当前能换到的数量）
     * - 合约验证 amountOut >= order.minAmountOut
     * - 只有满足条件才能执行，否则交易回滚
     * 
     * 执行方式：
     * - 简化版：直接转账 tokenOut 给用户
     * - 完整版：通过 Router 执行实际的 swap
     * 
     * @param orderId 要执行的订单 ID
     * @param amountOut 实际输出数量（Keeper 从 Router 获取）
     * @param path 交易路径（如 [TokenA, WETH, TokenB]）
     * 
     * 使用示例（Keeper 调用）：
     * ```
     * // 检查价格
     * uint256 amountOut = router.getAmountsOut(order.amountIn, path);
     * 
     * // 如果满足条件，执行订单
     * if (amountOut >= order.minAmountOut) {
     *   limitOrderBook.executeOrder(orderId, amountOut, path);
     * }
     * ```
     */
    function executeOrder(
        uint256 orderId,
        uint256 amountOut,
        address[] calldata path
    ) external onlyKeeper nonReentrant {
        Order storage order = orders[orderId];

        // ① 验证
        require(order.status == OrderStatus.Active, "LimitOrderBook: Order not active");
        require(path.length >= 2, "LimitOrderBook: Invalid path");
        require(path[0] == order.tokenIn, "LimitOrderBook: Invalid tokenIn");
        require(path[path.length - 1] == order.tokenOut, "LimitOrderBook: Invalid tokenOut");
        
        // 关键检查：实际输出 >= 用户要求的最小输出
        // 这是限价单的核心逻辑
        require(amountOut >= order.minAmountOut, "LimitOrderBook: Insufficient output");

        // ② 检查是否过期
        if (order.expiresAt > 0 && block.timestamp > order.expiresAt) {
            // 如果过期，标记为过期并退出
            _expireOrder(orderId);
            return;
        }

        // ③ 更新订单状态
        order.status = OrderStatus.Filled;

        // ④ 从活跃订单列表中移除
        _removeFromActiveOrders(orderId);

        // ⑤ 执行 swap
        // 方式 1（简化版）：直接转账
        // 注意：这里假设 Keeper 已经准备好了 tokenOut
        // 实际使用时应该调用 Router 执行实际的 swap
        IERC20(order.tokenOut).safeTransfer(order.maker, amountOut);
        
        // 方式 2（完整版，注释掉）：
        // IERC20(order.tokenIn).approve(dexRouter, order.amountIn);
        // IRouter(dexRouter).swapExactTokensForTokens(
        //     order.amountIn,
        //     order.minAmountOut,
        //     path,
        //     order.maker,
        //     block.timestamp
        // );

        // ⑥ 支付执行费用给 Keeper
        payable(msg.sender).transfer(executionFee);

        // ⑦ 触发事件
        emit OrderFilled(orderId, order.maker, msg.sender, order.amountIn, amountOut);
    }

    /**
     * @notice 批量执行订单
     * @dev Keeper 可以一次执行多个订单，节省 gas
     * 
     * 优势：
     * - 减少交易次数
     * - 节省 gas 成本（共享基础 gas）
     * - 提高执行效率
     * 
     * 容错处理：
     * - 使用 try-catch 处理每个订单
     * - 如果某个订单失败，跳过继续执行下一个
     * - 不会因为一个订单失败而导致整批失败
     * 
     * @param orderIds 订单 ID 数组
     * @param amountsOut 输出数量数组
     * @param paths 交易路径数组
     */
    function batchExecuteOrders(
        uint256[] calldata orderIds,
        uint256[] calldata amountsOut,
        address[][] calldata paths
    ) external onlyKeeper {
        require(
            orderIds.length == amountsOut.length && orderIds.length == paths.length,
            "LimitOrderBook: Length mismatch"
        );

        // 遍历执行每个订单
        for (uint256 i = 0; i < orderIds.length; i++) {
            try this.executeOrder(orderIds[i], amountsOut[i], paths[i]) {
                // 执行成功
            } catch {
                // 执行失败，跳过继续下一个
                continue;
            }
        }
    }

    /**
     * @notice 标记订单为已过期（公开函数）
     * @dev 任何人都可以调用此函数来标记过期的订单
     * @param orderId 订单 ID
     */
    function expireOrder(uint256 orderId) external {
        _expireOrder(orderId);
    }

    // ============================================
    // 查询函数
    // ============================================

    /**
     * @notice 获取用户的所有订单 ID
     * @param user 用户地址
     * @return 订单 ID 数组
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }

    /**
     * @notice 获取所有活跃订单 ID
     * @dev Keeper 使用此函数获取需要检查的订单列表
     * @return 活跃订单 ID 数组
     */
    function getActiveOrders() external view returns (uint256[] memory) {
        return activeOrderIds;
    }

    /**
     * @notice 获取订单详情
     * @param orderId 订单 ID
     * @return Order 订单完整信息
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /**
     * @notice 批量获取订单详情
     * @dev 一次获取多个订单的信息，减少 RPC 调用次数
     * @param orderIds 订单 ID 数组
     * @return Order[] 订单信息数组
     */
    function getOrders(uint256[] calldata orderIds) external view returns (Order[] memory) {
        Order[] memory result = new Order[](orderIds.length);
        for (uint256 i = 0; i < orderIds.length; i++) {
            result[i] = orders[orderIds[i]];
        }
        return result;
    }

    /**
     * @notice 获取活跃订单数量
     * @return 活跃订单总数
     */
    function getActiveOrderCount() external view returns (uint256) {
        return activeOrderIds.length;
    }

    // ============================================
    // 管理函数（仅 Owner）
    // ============================================

    /**
     * @notice 设置 Keeper 授权
     * @dev 只有合约 owner 可以授权或取消 Keeper
     * @param keeper Keeper 地址
     * @param status 授权状态（true=授权，false=取消授权）
     */
    function setKeeper(address keeper, bool status) external onlyOwner {
        require(keeper != address(0), "LimitOrderBook: Invalid keeper");
        isKeeper[keeper] = status;
        emit KeeperUpdated(keeper, status);
    }

    /**
     * @notice 更新执行费用
     * @dev 只有合约 owner 可以调整费用
     * @param newFee 新的执行费用（wei）
     */
    function setExecutionFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = executionFee;
        executionFee = newFee;
        emit ExecutionFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice 更新 Router 地址
     * @dev 只有合约 owner 可以更新 Router
     * @param newRouter 新的 Router 地址
     */
    function setRouter(address newRouter) external onlyOwner {
        require(newRouter != address(0), "LimitOrderBook: Invalid router");
        dexRouter = newRouter;
    }

    // ============================================
    // 内部函数
    // ============================================

    /**
     * @dev 从活跃订单列表中移除订单
     * 
     * 使用 Swap-and-Pop 技巧：
     * - 时间复杂度：O(1)
     * - 不需要移动多个元素
     * - Gas 消耗低
     * 
     * 算法：
     * 1. 找到要删除的订单在数组中的位置
     * 2. 把数组最后一个元素移到这个位置
     * 3. 删除数组最后一个元素（pop）
     * 4. 更新索引映射
     * 
     * 例子：
     * 初始：[1, 3, 5, 7, 9]，删除 5
     * → 把 9 移到 5 的位置：[1, 3, 9, 7, 9]
     * → 删除最后一个：[1, 3, 9, 7]
     * 
     * @param orderId 要移除的订单 ID
     */
    function _removeFromActiveOrders(uint256 orderId) internal {
        uint256 index = activeOrderIndex[orderId];  // 找到订单位置
        uint256 lastIndex = activeOrderIds.length - 1;  // 最后一个位置

        // 如果不是最后一个元素，执行 swap
        if (index != lastIndex) {
            uint256 lastOrderId = activeOrderIds[lastIndex];
            activeOrderIds[index] = lastOrderId;  // 把最后一个移到删除位置
            activeOrderIndex[lastOrderId] = index;  // 更新索引
        }

        // 删除最后一个元素
        activeOrderIds.pop();
        delete activeOrderIndex[orderId];
    }

    /**
     * @dev 标记订单为已过期（内部函数）
     * 
     * 工作流程：
     * 1. 验证订单状态和过期时间
     * 2. 更新订单状态为 Expired
     * 3. 从活跃订单列表移除
     * 4. 退回托管的代币
     * 5. 退回执行费用
     * 6. 触发 OrderExpired 事件
     * 
     * @param orderId 订单 ID
     */
    function _expireOrder(uint256 orderId) internal {
        Order storage order = orders[orderId];

        require(order.status == OrderStatus.Active, "LimitOrderBook: Order not active");
        require(order.expiresAt > 0 && block.timestamp > order.expiresAt, "LimitOrderBook: Not expired");

        // 更新订单状态
        order.status = OrderStatus.Expired;

        // 从活跃订单列表中移除
        _removeFromActiveOrders(orderId);

        // 退回输入代币
        IERC20(order.tokenIn).safeTransfer(order.maker, order.amountIn);

        // 退回执行费用
        payable(order.maker).transfer(executionFee);

        emit OrderExpired(orderId, order.maker);
    }

    // ============================================
    // 紧急函数（仅 Owner）
    // ============================================

    /**
     * @notice 紧急提取合约中的 ETH
     * @dev 仅在紧急情况下使用，提取所有 ETH 到 owner
     */
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /**
     * @notice 紧急提取合约中的 ERC20 代币
     * @dev 仅在紧急情况下使用
     * @param token 代币地址
     * @param amount 提取数量
     */
    function emergencyWithdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    // ============================================
    // 接收 ETH
    // ============================================

    /**
     * @notice 接收 ETH
     * @dev 允许合约接收 ETH（用于执行费用）
     */
    receive() external payable {}
}
