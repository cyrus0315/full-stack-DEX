#!/bin/bash

###############################################################################
# The Graph 集成测试脚本
# 测试 TheGraph 模块和 API 端点
###############################################################################

echo ""
echo "========================================="
echo "🧪 The Graph 集成测试"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API 基础 URL
BASE_URL="http://localhost:3002"

# 测试计数器
PASS=0
FAIL=0

# 测试函数
test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=${3:-200}
  
  echo -n "Testing: $name ... "
  
  response=$(curl -s -w "\n%{http_code}" "$url")
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
    PASS=$((PASS + 1))
    
    # 显示响应（如果有数据）
    if [ -n "$body" ]; then
      echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $http_code, expected $expected_status)"
    FAIL=$((FAIL + 1))
    echo "Response: $body"
  fi
  
  echo ""
}

# 检查后端是否运行
echo "🔍 检查后端服务状态..."
if ! curl -s "$BASE_URL/api" > /dev/null; then
  echo -e "${RED}❌ 错误: 后端服务未运行${NC}"
  echo ""
  echo "请先启动后端服务："
  echo "  cd backend/services/analytics-service"
  echo "  pnpm start:dev"
  echo ""
  exit 1
fi
echo -e "${GREEN}✓ 后端服务运行中${NC}"
echo ""

# ========================================
# 测试 TheGraph API 端点
# ========================================

echo "📊 测试 TheGraph API 端点"
echo "========================================="
echo ""

# Factory 地址
FACTORY_ADDRESS="0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9"

# 测试 1: 获取 Factory 统计
test_endpoint \
  "GET /api/v1/thegraph/factory/:address" \
  "$BASE_URL/api/v1/thegraph/factory/$FACTORY_ADDRESS"

# 测试 2: 获取所有交易对
test_endpoint \
  "GET /api/v1/thegraph/pairs" \
  "$BASE_URL/api/v1/thegraph/pairs?first=5"

# 测试 3: 获取单个交易对
PAIR_ADDRESS="0xF95e0E147a4417733e2a9D49c425b9c647Fe0652"
test_endpoint \
  "GET /api/v1/thegraph/pairs/:address" \
  "$BASE_URL/api/v1/thegraph/pairs/$PAIR_ADDRESS"

# 测试 4: 获取最近交易
test_endpoint \
  "GET /api/v1/thegraph/swaps" \
  "$BASE_URL/api/v1/thegraph/swaps?first=5"

# 测试 5: 获取添加流动性事件
test_endpoint \
  "GET /api/v1/thegraph/mints" \
  "$BASE_URL/api/v1/thegraph/mints?first=5"

# 测试 6: 获取移除流动性事件
test_endpoint \
  "GET /api/v1/thegraph/burns" \
  "$BASE_URL/api/v1/thegraph/burns?first=5"

# 测试 7: 获取所有挖矿池
test_endpoint \
  "GET /api/v1/thegraph/farms" \
  "$BASE_URL/api/v1/thegraph/farms"

# 测试 8: 获取用户质押信息
USER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
test_endpoint \
  "GET /api/v1/thegraph/user-stakes/:address" \
  "$BASE_URL/api/v1/thegraph/user-stakes/$USER_ADDRESS"

# 测试 9: 获取所有代币
test_endpoint \
  "GET /api/v1/thegraph/tokens" \
  "$BASE_URL/api/v1/thegraph/tokens?first=5"

# 测试 10: 获取单个代币
TOKEN_ADDRESS="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
test_endpoint \
  "GET /api/v1/thegraph/tokens/:address" \
  "$BASE_URL/api/v1/thegraph/tokens/$TOKEN_ADDRESS"

# ========================================
# 测试总结
# ========================================

echo ""
echo "========================================="
echo "📊 测试总结"
echo "========================================="
echo ""
echo -e "通过: ${GREEN}$PASS${NC}"
echo -e "失败: ${RED}$FAIL${NC}"
echo ""

# ========================================
# 说明
# ========================================

echo "========================================="
echo "ℹ️  说明"
echo "========================================="
echo ""
echo "当前 The Graph 状态: ${YELLOW}禁用${NC}"
echo "（.env 中 ENABLE_THE_GRAPH=false）"
echo ""
echo "预期行为："
echo "  • API 端点正常响应"
echo "  • 返回错误信息（The Graph 未启用）"
echo ""
echo "如需启用 The Graph:"
echo "  1. 启动 Graph Node (Docker)"
echo "  2. 部署 Subgraph"
echo "  3. 修改 .env: ENABLE_THE_GRAPH=true"
echo "  4. 重启后端服务"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✅ 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}❌ 部分测试失败${NC}"
  exit 1
fi

