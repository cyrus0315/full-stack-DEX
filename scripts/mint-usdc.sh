#!/bin/bash

# Mint test tokens to user account

cd /Users/h15/Desktop/dex/contracts

echo "🪙 Minting test tokens to your account..."
echo "📍 Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo ""

# 使用 -- 分隔 Hardhat 参数和脚本参数
npx hardhat run scripts/mint-tokens.js --network localhost -- 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

echo ""
echo "✅ Done! Please refresh the browser page and try again!"

