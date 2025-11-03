#!/bin/bash

# 同步所有链上的 Pool 到数据库

echo "🔍 检查服务状态..."

# 检查后端服务是否运行
if ! curl -s http://localhost:3002/health > /dev/null 2>&1; then
  echo "❌ Trading Service 未运行！"
  echo "   请先启动: cd backend/services/trading-service && pnpm run start:dev"
  exit 1
fi

echo "✅ Trading Service 运行中"

# 检查 Hardhat 节点是否运行
if ! curl -s -X POST http://127.0.0.1:8545 -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
  echo "❌ Hardhat 节点未运行！"
  echo "   请先启动: cd contracts && npx hardhat node"
  exit 1
fi

echo "✅ Hardhat 节点运行中"
echo ""
echo "🚀 开始同步所有交易对到数据库..."
echo ""

# 已知的交易对（所有 6 个）
declare -a pairs=(
  "USDT/DAI:0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512:0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  "USDT/USDC:0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512:0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  "DAI/USDC:0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0:0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  "WETH/DAI:0x5FbDB2315678afecb367f032d93F642f64180aa3:0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  "WETH/USDT:0x5FbDB2315678afecb367f032d93F642f64180aa3:0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  "WETH/USDC:0x5FbDB2315678afecb367f032d93F642f64180aa3:0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
)

success=0
failed=0

for pair in "${pairs[@]}"; do
  IFS=':' read -r name token0 token1 <<< "$pair"
  
  echo "📝 处理交易对: $name..."
  echo "   Token0: $token0"
  echo "   Token1: $token1"
  
  # 调用后端 API 创建/获取 Pool
  response=$(curl -s -X POST http://localhost:3002/api/v1/pool \
    -H "Content-Type: application/json" \
    -d "{\"token0Address\":\"$token0\",\"token1Address\":\"$token1\"}")
  
  if [ $? -eq 0 ]; then
    pairAddress=$(echo $response | grep -o '"pairAddress":"[^"]*"' | cut -d'"' -f4)
    poolId=$(echo $response | grep -o '"id":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$pairAddress" ]; then
      echo "✅ Pool 已创建/更新: $pairAddress"
      
      # 刷新 Pool 数据
      if [ -n "$poolId" ]; then
        curl -s -X POST "http://localhost:3002/api/v1/pool/$poolId/refresh" > /dev/null
        echo "✅ Pool 数据已刷新"
      fi
      
      ((success++))
    else
      echo "❌ 创建失败: $response"
      ((failed++))
    fi
  else
    echo "❌ API 调用失败"
    ((failed++))
  fi
  
  echo ""
  sleep 1
done

echo "=========================================="
echo "📊 同步完成！"
echo "✅ 成功: $success"
echo "❌ 失败: $failed"
echo "=========================================="
echo ""

if [ $failed -gt 0 ]; then
  echo "⚠️  有失败的交易对，请检查："
  echo "   1. 后端服务是否正常运行"
  echo "   2. Hardhat 节点是否正常运行"
  echo "   3. 合约地址是否正确"
  echo ""
  exit 1
fi

echo "🎉 所有交易对已同步到数据库！"
echo "现在可以在前端 Pool 页面看到它们了。"
echo ""

