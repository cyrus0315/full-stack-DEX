// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILimitOrderBook
 * @notice 限价单订单簿接口
 */
interface ILimitOrderBook {
    // 订单状态枚举
    enum OrderStatus {
        Active,
        Filled,
        Cancelled,
        Expired
    }

    // 订单结构
    struct Order {
        uint256 id;
        address maker;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint256 executionPrice;
        OrderStatus status;
        uint256 createdAt;
        uint256 expiresAt;
    }

    // 事件
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

    event OrderFilled(
        uint256 indexed orderId,
        address indexed maker,
        address indexed executor,
        uint256 amountIn,
        uint256 amountOut
    );

    event OrderCancelled(uint256 indexed orderId, address indexed maker);
    event OrderExpired(uint256 indexed orderId, address indexed maker);

    // 函数
    function createOrder(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint256 duration
    ) external payable returns (uint256 orderId);

    function cancelOrder(uint256 orderId) external;

    function executeOrder(
        uint256 orderId,
        uint256 amountOut,
        address[] calldata path
    ) external;

    function getOrder(uint256 orderId) external view returns (Order memory);
    function getUserOrders(address user) external view returns (uint256[] memory);
    function getActiveOrders() external view returns (uint256[] memory);
}

