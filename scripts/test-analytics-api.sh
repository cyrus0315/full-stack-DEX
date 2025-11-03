#!/bin/bash

# Phase 3 API 测试脚本
# 测试 History 和 Analytics 功能

echo "🧪 Phase 3 API 测试"
echo "==================="
echo ""

BASE_URL="http://localhost:3002/api/v1"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
  local name=$1
  local endpoint=$2
  
  echo -n "📡 测试: $name ... "
  
  response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 成功${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    return 0
  else
    echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}"
    echo "$body"
    echo ""
    return 1
  fi
}

echo "=== 1. Analytics API 测试 ==="
echo ""

test_api "全局概览" "/analytics/overview"

test_api "池子 #1 分析" "/analytics/pool/1"

test_api "用户统计" "/analytics/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo ""
echo "=== 2. History API 测试 ==="
echo ""

test_api "Swap 历史" "/history/swaps?limit=5"

test_api "Liquidity 历史" "/history/liquidity?limit=5"

test_api "用户 Swap 历史" "/history/swaps?userAddress=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266&limit=5"

test_api "用户最近活动" "/history/user/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266/recent?limit=10"

test_api "池子统计" "/history/pool/1/stats?hours=24"

echo ""
echo "=== 3. Pool API 测试 ==="
echo ""

test_api "池子列表" "/pool"

test_api "池子详情" "/pool/1"

echo ""
echo "🎉 测试完成！"
echo ""
echo "💡 提示："
echo "  - 如果 History API 返回空数组，说明还没有交易记录"
echo "  - 需要先执行 Swap 或添加流动性才会有历史数据"
echo "  - Analytics 数据会根据历史记录实时计算"
echo ""

