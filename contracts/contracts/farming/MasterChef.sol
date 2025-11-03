// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./DEXToken.sol";

/**
 * @title MasterChef
 * @dev 流动性挖矿主合约 - DEX 的核心激励机制
 * 
 * 这个合约做什么？
 * 1. 管理所有的挖矿池（Farm Pool）
 * 2. 用户质押 LP Token，获得 DEX 代币奖励
 * 3. 按区块自动计算和分配奖励
 * 4. 支持多个池子，每个池子有不同的奖励权重
 * 
 * 核心概念：
 * - Pool（池子）：一种 LP Token 对应一个池子
 * - allocPoint（分配点）：池子的奖励权重，分配点越高，奖励越多
 * - accRewardPerShare：累积的每份额奖励（核心计算变量）
 * - rewardDebt：奖励债务（防止重复领取和提前领取）
 * 
 * 参考：SushiSwap MasterChef
 */
contract MasterChef is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============================================
    // 数据结构
    // ============================================
    
    /**
     * @notice 用户信息
     * @dev 记录每个用户在每个池子中的质押情况
     */
    struct UserInfo {
        uint256 amount;         // 用户质押的 LP Token 数量
        uint256 rewardDebt;     // 奖励债务（用于计算待领取奖励）
        
        // rewardDebt 解释：
        // - 当用户存入或提取 LP Token 时，rewardDebt 会更新
        // - 公式：rewardDebt = amount * pool.accRewardPerShare / 1e12
        // - 待领取奖励 = (amount * accRewardPerShare / 1e12) - rewardDebt
        // 
        // 为什么需要 rewardDebt？
        // - 防止用户领取加入前的奖励
        // - 防止重复领取
        // - 记录用户的"起始点"
    }
    
    /**
     * @notice 池子信息
     * @dev 每个池子对应一种 LP Token
     */
    struct PoolInfo {
        IERC20 lpToken;           // LP Token 合约地址
        uint256 allocPoint;       // 分配点数（权重）
        uint256 lastRewardBlock;  // 上次计算奖励的区块号
        uint256 accRewardPerShare; // 累积的每份额奖励（放大 1e12 倍）
        
        // accRewardPerShare 解释：
        // - 这是一个累积值，只会增加不会减少
        // - 表示从池子创建到现在，每个 LP Token 应该获得的总奖励
        // - 放大 1e12 倍是为了保留精度（Solidity 不支持小数）
        // 
        // 例子：
        // - 初始：accRewardPerShare = 0
        // - 100 个区块后：accRewardPerShare = 5e12（表示每个 LP Token 获得 5 个 DEX）
        // - 200 个区块后：accRewardPerShare = 10e12（累积值）
    }
    
    // ============================================
    // 状态变量
    // ============================================
    
    /// @notice DEX 奖励代币合约
    DEXToken public immutable dexToken;
    
    /// @notice 每个区块产出的 DEX 代币数量
    /// @dev 例如：10 * 1e18 = 每个区块奖励 10 个 DEX
    uint256 public rewardPerBlock;
    
    /// @notice 所有池子的信息
    PoolInfo[] public poolInfo;
    
    /// @notice 用户信息：poolId => userAddress => UserInfo
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    /// @notice 总分配点数（所有池子的 allocPoint 之和）
    /// @dev 用于计算每个池子应得的奖励比例
    uint256 public totalAllocPoint = 0;
    
    /// @notice 挖矿开始区块
    uint256 public startBlock;
    
    /// @notice 挖矿结束区块（可选，0 表示永不结束）
    uint256 public endBlock;
    
    // ============================================
    // 事件
    // ============================================
    
    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint);
    event PoolUpdated(uint256 indexed pid, uint256 allocPoint);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardPerBlockUpdated(uint256 oldValue, uint256 newValue);
    
    // ============================================
    // 构造函数
    // ============================================
    
    /**
     * @notice 初始化 MasterChef
     * @param _dexToken DEX 代币合约地址
     * @param _rewardPerBlock 每区块奖励数量
     * @param _startBlock 开始区块（可以设置为未来的区块号）
     */
    constructor(
        DEXToken _dexToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock
    ) Ownable(msg.sender) {
        require(address(_dexToken) != address(0), "MasterChef: zero address");
        require(_rewardPerBlock > 0, "MasterChef: invalid reward per block");
        
        dexToken = _dexToken;
        rewardPerBlock = _rewardPerBlock;
        startBlock = _startBlock;
        endBlock = 0; // 默认永不结束
    }
    
    // ============================================
    // 管理员函数
    // ============================================
    
    /**
     * @notice 添加新的挖矿池
     * @dev 只有 owner 可以调用
     * 
     * 注意事项：
     * - 添加前建议调用 massUpdatePools() 更新所有池子
     * - 不要添加重复的 LP Token
     * 
     * @param _allocPoint 分配点数（权重）
     * @param _lpToken LP Token 合约地址
     * @param _withUpdate 是否在添加前更新所有池子
     */
    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) external onlyOwner {
        require(address(_lpToken) != address(0), "MasterChef: zero address");
        
        // 检查是否已存在
        for (uint256 i = 0; i < poolInfo.length; i++) {
            require(address(poolInfo[i].lpToken) != address(_lpToken), "MasterChef: pool exists");
        }
        
        // 先更新所有池子（可选）
        if (_withUpdate) {
            massUpdatePools();
        }
        
        // 确定开始区块
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        
        // 更新总分配点
        totalAllocPoint += _allocPoint;
        
        // 添加新池子
        poolInfo.push(PoolInfo({
            lpToken: _lpToken,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accRewardPerShare: 0
        }));
        
        emit PoolAdded(poolInfo.length - 1, address(_lpToken), _allocPoint);
    }
    
    /**
     * @notice 更新池子的分配点数
     * @dev 调整不同池子的奖励权重
     * 
     * 使用场景：
     * - 某个池子流动性太少，提高奖励吸引用户
     * - 某个池子流动性过多，降低奖励
     * - 新增热门交易对，分配更多奖励
     * 
     * @param _pid 池子 ID
     * @param _allocPoint 新的分配点数
     * @param _withUpdate 是否先更新所有池子
     */
    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external onlyOwner {
        require(_pid < poolInfo.length, "MasterChef: invalid pool id");
        
        if (_withUpdate) {
            massUpdatePools();
        }
        
        // 更新总分配点
        totalAllocPoint = totalAllocPoint - poolInfo[_pid].allocPoint + _allocPoint;
        
        // 更新池子分配点
        poolInfo[_pid].allocPoint = _allocPoint;
        
        emit PoolUpdated(_pid, _allocPoint);
    }
    
    /**
     * @notice 更新每区块奖励数量
     * @dev 可以动态调整产出速度
     * 
     * 使用场景：
     * - 早期高产出吸引用户
     * - 后期逐步降低产出（减缓通胀）
     * - 根据代币价格调整（价格高时降低产出）
     * 
     * @param _rewardPerBlock 新的每区块奖励
     */
    function updateRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        require(_rewardPerBlock > 0, "MasterChef: invalid reward");
        
        // 先更新所有池子（用旧的奖励率）
        massUpdatePools();
        
        uint256 oldReward = rewardPerBlock;
        rewardPerBlock = _rewardPerBlock;
        
        emit RewardPerBlockUpdated(oldReward, _rewardPerBlock);
    }
    
    /**
     * @notice 设置挖矿结束区块
     * @param _endBlock 结束区块号（0 表示永不结束）
     */
    function setEndBlock(uint256 _endBlock) external onlyOwner {
        require(_endBlock > block.number, "MasterChef: end block must be in future");
        endBlock = _endBlock;
    }
    
    // ============================================
    // 核心功能：更新池子
    // ============================================
    
    /**
     * @notice 更新池子的奖励变量
     * @dev 这是整个合约最核心的函数！
     * 
     * 工作流程：
     * 1. 检查是否需要更新（当前区块 > 上次更新区块）
     * 2. 如果池子为空，只更新区块号
     * 3. 计算从上次更新到现在产生的新奖励
     * 4. 铸造奖励代币到本合约
     * 5. 更新 accRewardPerShare（累积每份额奖励）
     * 6. 更新 lastRewardBlock
     * 
     * 数学公式详解：
     * 
     * Step 1: 计算新产生的奖励
     * newReward = (currentBlock - lastRewardBlock) × rewardPerBlock × allocPoint / totalAllocPoint
     * 
     * 例子：
     * - 过了 100 个区块
     * - 每区块奖励 10 个 DEX
     * - 本池 allocPoint = 30，总 allocPoint = 100
     * - newReward = 100 × 10 × 30 / 100 = 300 个 DEX
     * 
     * Step 2: 更新累积奖励
     * accRewardPerShare += (newReward × 1e12) / lpSupply
     * 
     * 例子：
     * - newReward = 300 个 DEX
     * - 池子总质押 = 1000 LP Token
     * - accRewardPerShare += 300 × 1e12 / 1000 = 0.3e12
     * - 意义：每个 LP Token 新增应得 0.3 个 DEX
     * 
     * @param _pid 池子 ID
     */
    function updatePool(uint256 _pid) public {
        require(_pid < poolInfo.length, "MasterChef: invalid pool id");
        
        PoolInfo storage pool = poolInfo[_pid];
        
        // 如果已经是最新的，不需要更新
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        
        // 获取池子中的 LP Token 总量
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        
        // 如果池子为空，只更新区块号
        if (lpSupply == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        
        // 计算需要奖励的区块数
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        
        // 如果没有需要奖励的区块（已过结束时间）
        if (multiplier == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        
        // 计算本池应得的奖励
        uint256 reward = multiplier * rewardPerBlock * pool.allocPoint / totalAllocPoint;
        
        // 铸造奖励代币到本合约
        dexToken.mint(address(this), reward);
        
        // 更新累积每份额奖励
        pool.accRewardPerShare += (reward * 1e12) / lpSupply;
        
        // 更新最后奖励区块
        pool.lastRewardBlock = block.number;
    }
    
    /**
     * @notice 批量更新所有池子
     * @dev Gas 消耗可能很大，谨慎使用
     */
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }
    
    // ============================================
    // 核心功能：质押与提取
    // ============================================
    
    /**
     * @notice 质押 LP Token
     * @dev 这是用户主要操作的函数
     * 
     * 工作流程：
     * 1. 更新池子（计算新产生的奖励）
     * 2. 如果用户已有质押，先发放之前的待领取奖励
     * 3. 转入用户的 LP Token 到本合约
     * 4. 更新用户的质押数量
     * 5. 更新用户的 rewardDebt（重要！）
     * 
     * rewardDebt 更新公式：
     * rewardDebt = amount × accRewardPerShare / 1e12
     * 
     * 为什么要更新 rewardDebt？
     * - 设置新的"基准线"
     * - 确保下次计算只计算"新增"的奖励
     * - 防止重复领取
     * 
     * @param _pid 池子 ID
     * @param _amount 质押数量
     */
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        require(_pid < poolInfo.length, "MasterChef: invalid pool id");
        require(_amount > 0, "MasterChef: amount must be > 0");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        // Step 1: 更新池子
        updatePool(_pid);
        
        // Step 2: 如果用户已有质押，发放待领取奖励
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare / 1e12) - user.rewardDebt;
            if (pending > 0) {
                safeRewardTransfer(msg.sender, pending);
                emit RewardPaid(msg.sender, pending);
            }
        }
        
        // Step 3: 转入 LP Token
        pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Step 4: 更新用户质押量
        user.amount += _amount;
        
        // Step 5: 更新 rewardDebt（关键！）
        user.rewardDebt = user.amount * pool.accRewardPerShare / 1e12;
        
        emit Deposit(msg.sender, _pid, _amount);
    }
    
    /**
     * @notice 提取 LP Token
     * @dev 同时会领取待领取的奖励
     * 
     * 工作流程：
     * 1. 更新池子
     * 2. 计算并发放待领取奖励
     * 3. 减少用户质押量
     * 4. 转回 LP Token 给用户
     * 5. 更新 rewardDebt
     * 
     * @param _pid 池子 ID
     * @param _amount 提取数量
     */
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        require(_pid < poolInfo.length, "MasterChef: invalid pool id");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        require(user.amount >= _amount, "MasterChef: insufficient balance");
        
        // Step 1: 更新池子
        updatePool(_pid);
        
        // Step 2: 发放待领取奖励
        uint256 pending = (user.amount * pool.accRewardPerShare / 1e12) - user.rewardDebt;
        if (pending > 0) {
            safeRewardTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, pending);
        }
        
        // Step 3: 减少质押量
        user.amount -= _amount;
        
        // Step 4: 转回 LP Token
        if (_amount > 0) {
            pool.lpToken.safeTransfer(msg.sender, _amount);
        }
        
        // Step 5: 更新 rewardDebt
        user.rewardDebt = user.amount * pool.accRewardPerShare / 1e12;
        
        emit Withdraw(msg.sender, _pid, _amount);
    }
    
    /**
     * @notice 紧急提取（不领取奖励）
     * @dev 仅在紧急情况下使用（例如合约有 bug）
     * 
     * 注意：
     * - 会放弃所有待领取奖励！
     * - 只取回本金（LP Token）
     * 
     * @param _pid 池子 ID
     */
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        require(_pid < poolInfo.length, "MasterChef: invalid pool id");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        uint256 amount = user.amount;
        require(amount > 0, "MasterChef: no balance");
        
        // 清空用户数据
        user.amount = 0;
        user.rewardDebt = 0;
        
        // 转回 LP Token（不计算奖励）
        pool.lpToken.safeTransfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }
    
    // ============================================
    // 辅助函数
    // ============================================
    
    /**
     * @notice 安全转账奖励代币
     * @dev 如果合约余额不足，转账可用的余额
     * 
     * 为什么需要这个函数？
     * - 防止因余额不足导致交易失败
     * - 铸造可能受到 MAX_SUPPLY 限制
     * 
     * @param _to 接收地址
     * @param _amount 转账数量
     */
    function safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 balance = dexToken.balanceOf(address(this));
        if (_amount > balance) {
            dexToken.transfer(_to, balance);
        } else {
            dexToken.transfer(_to, _amount);
        }
    }
    
    /**
     * @notice 计算奖励区块数
     * @dev 考虑结束区块
     * 
     * @param _from 起始区块
     * @param _to 结束区块
     * @return 实际需要奖励的区块数
     */
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
        if (_from >= _to) {
            return 0;
        }
        
        // 如果设置了结束区块
        if (endBlock > 0 && _to > endBlock) {
            if (_from >= endBlock) {
                return 0; // 已经过了结束区块
            } else {
                return endBlock - _from; // 只计算到结束区块
            }
        }
        
        return _to - _from;
    }
    
    // ============================================
    // 查询函数
    // ============================================
    
    /**
     * @notice 查询池子数量
     */
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }
    
    /**
     * @notice 查询用户待领取奖励
     * @dev 这是前端常用的查询函数
     * 
     * 计算公式：
     * pending = (user.amount × pool.accRewardPerShare / 1e12) - user.rewardDebt
     * 
     * 注意：
     * - 需要先模拟 updatePool 的效果
     * - 返回的是"如果现在领取"能得到的数量
     * 
     * @param _pid 池子 ID
     * @param _user 用户地址
     * @return 待领取奖励数量
     */
    function pendingReward(uint256 _pid, address _user) external view returns (uint256) {
        require(_pid < poolInfo.length, "MasterChef: invalid pool id");
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        
        uint256 accRewardPerShare = pool.accRewardPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        
        // 模拟 updatePool 的效果
        if (block.number > pool.lastRewardBlock && lpSupply > 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 reward = multiplier * rewardPerBlock * pool.allocPoint / totalAllocPoint;
            accRewardPerShare += (reward * 1e12) / lpSupply;
        }
        
        // 计算待领取奖励
        return (user.amount * accRewardPerShare / 1e12) - user.rewardDebt;
    }
    
    /**
     * @notice 查询池子的年化收益率 (APR)
     * @dev 简化计算，实际 APR 会随代币价格变化
     * 
     * @param _pid 池子 ID
     * @return APR（以 basis points 表示，10000 = 100%）
     */
    function getPoolAPR(uint256 _pid) external view returns (uint256) {
        require(_pid < poolInfo.length, "MasterChef: invalid pool id");
        
        PoolInfo storage pool = poolInfo[_pid];
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        
        if (lpSupply == 0 || totalAllocPoint == 0) {
            return 0;
        }
        
        // 简化计算：假设 1 年 = 2,102,400 个区块（每 15 秒一个区块）
        // 年奖励 = rewardPerBlock × 区块数 × allocPoint / totalAllocPoint
        uint256 yearlyReward = rewardPerBlock * 2102400 * pool.allocPoint / totalAllocPoint;
        
        // APR = (年奖励 / 总质押) × 10000
        return (yearlyReward * 10000) / lpSupply;
    }
}

