#!/bin/bash

# Mint test tokens to default account (使用脚本内的默认地址)

cd /Users/h15/Desktop/dex/contracts

echo "🪙 Minting test tokens..."
echo "📍 Using default address from script"
echo ""

npx hardhat run scripts/mint-tokens.js --network localhost

echo ""
echo "✅ Done! Please refresh the browser page and try again!"

