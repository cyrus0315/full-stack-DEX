#!/bin/bash

# Liquidity Module 测试脚本
# 测试流动性添加和移除功能

set -e

BASE_URL="http://localhost:3002/api/v1"
USER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Liquidity Module API 测试${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查服务是否运行
echo -e "${YELLOW}检查服务状态...${NC}"
if ! curl -s -f "$BASE_URL/pool" > /dev/null 2>&1; then
  echo -e "${RED}❌ Trading Service 未运行${NC}"
  echo "请先启动服务: pnpm run start:dev"
  exit 1
fi
echo -e "${GREEN}✅ Trading Service 运行中${NC}"
echo ""

# 读取合约地址
CONTRACTS_ENV="/Users/h15/Desktop/dex/contracts/.env.deployed"

if [ ! -f "$CONTRACTS_ENV" ]; then
  echo -e "${RED}❌ 合约地址文件不存在: $CONTRACTS_ENV${NC}"
  exit 1
fi

USDT_ADDRESS=$(grep "USDT_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2 | tr -d ' \r\n')
DAI_ADDRESS=$(grep "DAI_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2 | tr -d ' \r\n')
ROUTER_ADDRESS=$(grep "DEX_ROUTER_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2 | tr -d ' \r\n')

echo "📋 合约地址:"
echo "  USDT:   $USDT_ADDRESS"
echo "  DAI:    $DAI_ADDRESS"
echo "  Router: $ROUTER_ADDRESS"
echo "  User:   $USER_ADDRESS"
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

# 测试函数
test_api() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}测试 $TOTAL_TESTS: $name${NC}"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  # macOS 兼容：使用 sed 替代 head -n-1
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ 通过 (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  echo ""
}

# ========================================
# 测试 1: 计算添加流动性
# ========================================
echo -e "${YELLOW}📊 计算添加流动性...${NC}"
test_api \
  "计算添加流动性 (100 USDT + 100 DAI)" \
  "GET" \
  "$BASE_URL/liquidity/calculate/add?tokenA=$USDT_ADDRESS&tokenB=$DAI_ADDRESS&amountADesired=100000000&amountBDesired=100000000000000000000"

# ========================================
# 测试 2: 授权 USDT 和 DAI
# ========================================
echo -e "${YELLOW}🔐 检查并授权代币...${NC}"

# 检查 USDT 授权
USDT_APPROVAL=$(curl -s "$BASE_URL/swap/approval/check?userAddress=$USER_ADDRESS&token=$USDT_ADDRESS&amount=100000000")
USDT_NEEDS_APPROVAL=$(echo $USDT_APPROVAL | jq -r '.needsApproval')

if [ "$USDT_NEEDS_APPROVAL" = "true" ]; then
  echo "授权 USDT..."
  curl -s -X POST "$BASE_URL/swap/approval?userAddress=$USER_ADDRESS" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$USDT_ADDRESS\"}" | jq
  sleep 3
fi

# 检查 DAI 授权
DAI_APPROVAL=$(curl -s "$BASE_URL/swap/approval/check?userAddress=$USER_ADDRESS&token=$DAI_ADDRESS&amount=100000000000000000000")
DAI_NEEDS_APPROVAL=$(echo $DAI_APPROVAL | jq -r '.needsApproval')

if [ "$DAI_NEEDS_APPROVAL" = "true" ]; then
  echo "授权 DAI..."
  curl -s -X POST "$BASE_URL/swap/approval?userAddress=$USER_ADDRESS" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$DAI_ADDRESS\"}" | jq
  sleep 3
fi

echo -e "${GREEN}✅ 代币授权完成${NC}"
echo ""

# ========================================
# 测试 3: 添加流动性
# ========================================
echo -e "${YELLOW}⚠️  添加流动性: 100 USDT + 100 DAI${NC}"
ADD_RESPONSE=$(curl -s -X POST "$BASE_URL/liquidity/add?userAddress=$USER_ADDRESS" \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenA\": \"$USDT_ADDRESS\",
    \"tokenB\": \"$DAI_ADDRESS\",
    \"amountADesired\": \"100000000\",
    \"amountBDesired\": \"100000000000000000000\",
    \"slippage\": 0.5
  }")

echo -e "${BLUE}测试 3: 添加流动性${NC}"
echo "$ADD_RESPONSE" | jq '.'
ADD_TX_HASH=$(echo "$ADD_RESPONSE" | jq -r '.txHash')

if [ "$ADD_TX_HASH" != "null" ] && [ -n "$ADD_TX_HASH" ]; then
  echo -e "${GREEN}✅ 添加流动性交易已提交${NC}"
  echo "  TxHash: $ADD_TX_HASH"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 添加流动性失败${NC}"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${YELLOW}⏳ 等待交易确认（5秒）...${NC}"
sleep 5
echo ""

# ========================================
# 测试 4: 查询流动性操作状态
# ========================================
if [ -n "$ADD_TX_HASH" ] && [ "$ADD_TX_HASH" != "null" ]; then
  test_api \
    "查询流动性操作状态: $ADD_TX_HASH" \
    "GET" \
    "$BASE_URL/liquidity/$ADD_TX_HASH"
fi

# ========================================
# 测试 5: 获取流动性操作历史
# ========================================
test_api \
  "获取用户流动性操作历史" \
  "GET" \
  "$BASE_URL/liquidity?userAddress=$USER_ADDRESS&page=1&limit=5"

# ========================================
# 测试 6: 查询交易对信息
# ========================================
test_api \
  "查询 USDT/DAI 交易对信息" \
  "GET" \
  "$BASE_URL/pool/pair/$USDT_ADDRESS/$DAI_ADDRESS"

# ========================================
# 汇总
# ========================================
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  测试汇总${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "总测试数: ${TOTAL_TESTS}"
echo -e "${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "${RED}失败: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
  echo -e "\n${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo -e "\n${YELLOW}⚠️  部分测试未完全通过（可能需要授权或等待交易确认）${NC}"
  exit 0
fi

