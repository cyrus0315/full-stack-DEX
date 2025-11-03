#!/bin/bash

# 给账户 mint 测试代币的脚本
# 用于测试 DEX 功能

set -e

echo "🪙 开始 mint 测试代币..."
echo ""

# 进入 contracts 目录
cd /Users/h15/Desktop/dex/contracts

# 加载环境变量（如果存在）
if [ -f .env.deployed ]; then
  source .env.deployed
fi

# 你的钱包地址（从参数获取，或使用默认的 Hardhat 账户 #0）
WALLET_ADDRESS="${1:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}"

# 运行 Hardhat 脚本
npx hardhat run scripts/mint-tokens.js --network localhost $WALLET_ADDRESS

echo ""
echo "✨ 提示: 刷新前端页面查看你的新余额！"
echo ""
