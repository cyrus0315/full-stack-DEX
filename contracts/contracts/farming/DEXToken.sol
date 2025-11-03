// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DEXToken
 * @dev DEX 平台治理代币 - 用于流动性挖矿奖励
 * 
 * 这是什么？
 * - 这是你的 DEX 平台发行的代币（类似 Uniswap 的 UNI，SushiSwap 的 SUSHI）
 * - 用户通过提供流动性挖矿获得这个代币作为奖励
 * - 代币持有者可以参与治理投票（未来功能）
 * 
 * 为什么需要它？
 * - 激励用户提供流动性（流动性越多，交易体验越好）
 * - 将平台价值分享给早期参与者
 * - 构建去中心化治理体系
 */
contract DEXToken is ERC20, Ownable {
    
    // ============================================
    // 状态变量
    // ============================================
    
    /// @notice 最大供应量（可选，防止无限增发）
    /// @dev 1 亿枚代币，18 位小数
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18;
    
    /// @notice 已铸造的总量
    uint256 public totalMinted;
    
    // ============================================
    // 事件
    // ============================================
    
    /// @notice 铸造代币事件
    event Minted(address indexed to, uint256 amount);
    
    /// @notice 销毁代币事件
    event Burned(address indexed from, uint256 amount);
    
    // ============================================
    // 构造函数
    // ============================================
    
    /**
     * @notice 初始化 DEX 代币
     * @dev 部署时可以选择是否预挖一部分代币（给团队、投资人等）
     * @param initialSupply 初始供应量（可以是 0，全部通过挖矿产出）
     */
    constructor(uint256 initialSupply) ERC20("DEX Token", "DEX") Ownable(msg.sender) {
        if (initialSupply > 0) {
            require(initialSupply <= MAX_SUPPLY, "DEXToken: exceeds max supply");
            _mint(msg.sender, initialSupply);
            totalMinted = initialSupply;
            emit Minted(msg.sender, initialSupply);
        }
    }
    
    // ============================================
    // 核心功能
    // ============================================
    
    /**
     * @notice 铸造新代币（只有 owner 可以调用）
     * @dev 这个函数会被 MasterChef 合约调用来发放挖矿奖励
     * 
     * 工作流程：
     * 1. 用户在 MasterChef 中质押 LP Token
     * 2. 每个区块 MasterChef 计算应得奖励
     * 3. MasterChef 调用这个 mint 函数铸造奖励代币
     * 4. 奖励代币发送给用户
     * 
     * @param to 接收者地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "DEXToken: mint to zero address");
        require(amount > 0, "DEXToken: mint amount must be > 0");
        require(totalMinted + amount <= MAX_SUPPLY, "DEXToken: exceeds max supply");
        
        _mint(to, amount);
        totalMinted += amount;
        
        emit Minted(to, amount);
    }
    
    /**
     * @notice 销毁代币（持有者自己销毁）
     * @dev 减少流通量，可能增加代币价值
     * 
     * 使用场景：
     * - 团队主动销毁未使用的代币
     * - 用户销毁代币参与某些活动
     * - 协议收益回购销毁（通缩机制）
     * 
     * @param amount 销毁数量
     */
    function burn(uint256 amount) external {
        require(amount > 0, "DEXToken: burn amount must be > 0");
        require(balanceOf(msg.sender) >= amount, "DEXToken: insufficient balance");
        
        _burn(msg.sender, amount);
        
        emit Burned(msg.sender, amount);
    }
    
    /**
     * @notice 从指定地址销毁代币（需要授权）
     * @param from 被销毁代币的地址
     * @param amount 销毁数量
     */
    function burnFrom(address from, uint256 amount) external {
        require(amount > 0, "DEXToken: burn amount must be > 0");
        
        // 检查授权额度
        uint256 currentAllowance = allowance(from, msg.sender);
        require(currentAllowance >= amount, "DEXToken: insufficient allowance");
        
        // 减少授权额度
        _approve(from, msg.sender, currentAllowance - amount);
        
        // 销毁代币
        _burn(from, amount);
        
        emit Burned(from, amount);
    }
    
    // ============================================
    // 查询函数
    // ============================================
    
    /**
     * @notice 查询剩余可铸造数量
     * @return 剩余可铸造的代币数量
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }
    
    /**
     * @notice 查询铸造进度百分比
     * @return 已铸造百分比（精度 2 位小数，例如 5000 = 50.00%）
     */
    function mintProgress() external view returns (uint256) {
        if (MAX_SUPPLY == 0) return 0;
        return (totalMinted * 10000) / MAX_SUPPLY;
    }
}

