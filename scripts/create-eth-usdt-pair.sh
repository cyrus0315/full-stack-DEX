#!/bin/bash

# 创建 ETH/USDT 交易对的脚本
# 前提：你的账户需要有 ETH 和 USDT

set -e

echo "🚀 开始创建 ETH/USDT 交易对..."

# 获取合约地址
source ../contracts/.env.deployed

# 你的钱包地址（从 MetaMask 获取）
WALLET_ADDRESS="${1:-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266}"

echo "📋 合约地址:"
echo "  Router: $ROUTER_ADDRESS"
echo "  WETH:   $WETH_ADDRESS"
echo "  USDT:   $USDT_ADDRESS"
echo "  钱包:    $WALLET_ADDRESS"
echo ""

# 1. 先将 ETH 换成 WETH
echo "步骤 1/4: ETH → WETH (包装 ETH)..."
curl -X POST http://localhost:3002/api/v1/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenIn\": \"0x0000000000000000000000000000000000000000\",
    \"tokenOut\": \"$WETH_ADDRESS\",
    \"amountIn\": \"2000000000000000000\",
    \"amountOutMin\": \"0\",
    \"recipient\": \"$WALLET_ADDRESS\",
    \"deadline\": 9999999999
  }"
echo ""
echo "✅ 完成"
echo ""
sleep 2

# 2. WETH 换 DAI (使用现有的 DAI/WETH 交易对)
echo "步骤 2/4: WETH → DAI..."
curl -X POST http://localhost:3002/api/v1/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenIn\": \"$WETH_ADDRESS\",
    \"tokenOut\": \"$DAI_ADDRESS\",
    \"amountIn\": \"1000000000000000000\",
    \"amountOutMin\": \"0\",
    \"recipient\": \"$WALLET_ADDRESS\",
    \"deadline\": 9999999999
  }"
echo ""
echo "✅ 完成"
echo ""
sleep 2

# 3. DAI 换 USDT (使用现有的 USDT/DAI 交易对)
echo "步骤 3/4: DAI → USDT..."
curl -X POST http://localhost:3002/api/v1/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenIn\": \"$DAI_ADDRESS\",
    \"tokenOut\": \"$USDT_ADDRESS\",
    \"amountIn\": \"500000000000000000\",
    \"amountOutMin\": \"0\",
    \"recipient\": \"$WALLET_ADDRESS\",
    \"deadline\": 9999999999
  }"
echo ""
echo "✅ 完成 - 现在你有 ETH 和 USDT 了"
echo ""
sleep 2

# 4. 添加 ETH/USDT 流动性 (创建交易对)
echo "步骤 4/4: 添加 ETH/USDT 流动性 (创建交易对)..."
curl -X POST http://localhost:3002/api/v1/liquidity/add \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenA\": \"$WETH_ADDRESS\",
    \"tokenB\": \"$USDT_ADDRESS\",
    \"amountADesired\": \"500000000000000000\",
    \"amountBDesired\": \"250000\",
    \"amountAMin\": \"450000000000000000\",
    \"amountBMin\": \"225000\",
    \"to\": \"$WALLET_ADDRESS\",
    \"deadline\": 9999999999
  }"
echo ""
echo ""

echo "🎉 完成！ETH/USDT 交易对已创建！"
echo ""
echo "现在你可以："
echo "  ✅ 在 Pool 页面看到 WETH/USDT 交易对"
echo "  ✅ 在 Swap 页面直接 ETH ↔ USDT 交易"
echo ""

