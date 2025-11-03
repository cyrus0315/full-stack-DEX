// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // 测试用：任何人都可以铸造（生产环境要删除！）
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // 测试用：任何人都可以销毁
    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}