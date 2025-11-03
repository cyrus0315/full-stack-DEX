#!/bin/bash

# Swap Module 测试脚本
# 测试交易执行功能

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
echo -e "${BLUE}  Swap Module API 测试${NC}"
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
WETH_ADDRESS=$(grep "WETH_ADDRESS=" "$CONTRACTS_ENV" | cut -d'=' -f2 | tr -d ' \r\n')

echo "📋 合约地址:"
echo "  USDT: $USDT_ADDRESS"
echo "  DAI:  $DAI_ADDRESS"
echo "  WETH: $WETH_ADDRESS"
echo "  User: $USER_ADDRESS"
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
# 测试 1: 检查 USDT 授权状态
# ========================================
test_api \
  "检查 USDT 授权状态" \
  "GET" \
  "$BASE_URL/swap/approval/check?userAddress=$USER_ADDRESS&token=$USDT_ADDRESS&amount=100000000"

# ========================================
# 测试 2: 授权 USDT
# ========================================
echo -e "${YELLOW}⚠️  授权交易会修改链状态，需要等待确认...${NC}"
test_api \
  "授权 USDT 给 Router" \
  "POST" \
  "$BASE_URL/swap/approval?userAddress=$USER_ADDRESS" \
  "{\"token\": \"$USDT_ADDRESS\"}"

echo -e "${YELLOW}⏳ 等待授权交易确认（5秒）...${NC}"
sleep 5
echo ""

# ========================================
# 测试 3: 再次检查授权（应该已授权）
# ========================================
test_api \
  "确认 USDT 已授权" \
  "GET" \
  "$BASE_URL/swap/approval/check?userAddress=$USER_ADDRESS&token=$USDT_ADDRESS&amount=100000000"

# ========================================
# 测试 4: 精确输入交易 (Exact In)
# ========================================
echo -e "${YELLOW}⚠️  执行交易: 1 USDT → DAI${NC}"
SWAP_RESPONSE=$(curl -s -X POST "$BASE_URL/swap/exact-in?userAddress=$USER_ADDRESS" \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenIn\": \"$USDT_ADDRESS\",
    \"tokenOut\": \"$DAI_ADDRESS\",
    \"amountIn\": \"1000000\",
    \"slippage\": 0.5
  }")

echo -e "${BLUE}测试 4: 精确输入交易 (1 USDT → DAI)${NC}"
echo "$SWAP_RESPONSE" | jq '.'
TX_HASH=$(echo "$SWAP_RESPONSE" | jq -r '.txHash')

if [ "$TX_HASH" != "null" ] && [ -n "$TX_HASH" ]; then
  echo -e "${GREEN}✅ 交易已提交${NC}"
  echo "  TxHash: $TX_HASH"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 交易提交失败${NC}"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${YELLOW}⏳ 等待交易确认（5秒）...${NC}"
sleep 5
echo ""

# ========================================
# 测试 5: 查询交易状态
# ========================================
if [ -n "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
  test_api \
    "查询交易状态: $TX_HASH" \
    "GET" \
    "$BASE_URL/swap/$TX_HASH"
fi

# ========================================
# 测试 6: 查询交易历史（用户）
# ========================================
test_api \
  "查询用户交易历史" \
  "GET" \
  "$BASE_URL/swap?userAddress=$USER_ADDRESS&page=1&limit=5"

# ========================================
# 测试 7: 查询交易历史（代币过滤）
# ========================================
test_api \
  "查询 USDT 相关交易" \
  "GET" \
  "$BASE_URL/swap?tokenAddress=$USDT_ADDRESS&page=1&limit=5"

# ========================================
# 测试 8: 授权 DAI
# ========================================
test_api \
  "授权 DAI 给 Router" \
  "POST" \
  "$BASE_URL/swap/approval?userAddress=$USER_ADDRESS" \
  "{\"token\": \"$DAI_ADDRESS\"}"

echo -e "${YELLOW}⏳ 等待授权交易确认（5秒）...${NC}"
sleep 5
echo ""

# ========================================
# 测试 9: 精确输出交易 (Exact Out)
# ========================================
echo -e "${YELLOW}⚠️  执行交易: DAI → 0.5 USDT (Exact Out)${NC}"
SWAP2_RESPONSE=$(curl -s -X POST "$BASE_URL/swap/exact-out?userAddress=$USER_ADDRESS" \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenIn\": \"$DAI_ADDRESS\",
    \"tokenOut\": \"$USDT_ADDRESS\",
    \"amountOut\": \"500000\",
    \"amountInMax\": \"1000000000000000000\"
  }")

echo -e "${BLUE}测试 9: 精确输出交易 (DAI → 0.5 USDT)${NC}"
echo "$SWAP2_RESPONSE" | jq '.'
TX_HASH2=$(echo "$SWAP2_RESPONSE" | jq -r '.txHash')

if [ "$TX_HASH2" != "null" ] && [ -n "$TX_HASH2" ]; then
  echo -e "${GREEN}✅ 交易已提交${NC}"
  echo "  TxHash: $TX_HASH2"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "${RED}❌ 交易提交失败${NC}"
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

echo -e "${YELLOW}⏳ 等待交易确认（5秒）...${NC}"
sleep 5
echo ""

# ========================================
# 测试 10: 最终交易历史统计
# ========================================
test_api \
  "最终交易历史（全部）" \
  "GET" \
  "$BASE_URL/swap?page=1&limit=20"

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
  echo -e "\n${RED}⚠️  部分测试失败${NC}"
  exit 1
fi

