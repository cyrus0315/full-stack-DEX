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

# 运行同步脚本
cd "$(dirname "$0")/.."
node scripts/sync-all-pools.js

