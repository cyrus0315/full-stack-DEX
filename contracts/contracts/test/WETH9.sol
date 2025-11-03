// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WETH9
 * @dev Wrapped Ether implementation
 * ETH 包装合约，将 ETH 转换为 ERC20 代币
 */
contract WETH9 is ERC20 {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20("Wrapped Ether", "WETH") {}

    // 接收 ETH 时自动包装
    receive() external payable {
        deposit();
    }

    // 存入 ETH，获得等量 WETH
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    // 销毁 WETH，取回 ETH
    function withdraw(uint256 wad) public {
        require(balanceOf(msg.sender) >= wad, "WETH: insufficient balance");
        _burn(msg.sender, wad);
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    // 固定 18 位小数
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}