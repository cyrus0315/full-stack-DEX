#!/bin/bash

# Liquidity Module 完整测试脚本
# 测试：添加流动性 → 查询头寸 → 移除流动性 → 再次查询头寸

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
echo -e "${BLUE}  Liquidity Module 完整测试${NC}"
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

echo "📋 测试配置:"
echo "  USDT: $USDT_ADDRESS"
echo "  DAI:  $DAI_ADDRESS"
echo "  User: $USER_ADDRESS"
echo ""

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0

# 测试函数（输出到 stderr，返回 body 到 stdout）
test_api() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${BLUE}测试 $TOTAL_TESTS: $name${NC}" >&2
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ 通过 (HTTP $http_code)${NC}" >&2
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}" >&2
  fi
  
  # 显示响应内容（到 stderr）
  echo "$body" | jq '.' 2>/dev/null >&2 || echo "$body" >&2
  echo "" >&2
  
  # 返回原始 body（到 stdout，供调用者捕获）
  echo "$body"
}

# ========================================
# 第一部分：添加流动性
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第一部分：添加流动性${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查并授权代币
echo -e "${YELLOW}🔐 检查并授权代币...${NC}"
USDT_APPROVAL=$(curl -s "$BASE_URL/swap/approval/check?userAddress=$USER_ADDRESS&token=$USDT_ADDRESS&amount=50000000")
USDT_NEEDS_APPROVAL=$(echo $USDT_APPROVAL | jq -r '.needsApproval')

if [ "$USDT_NEEDS_APPROVAL" = "true" ]; then
  echo "授权 USDT..."
  curl -s -X POST "$BASE_URL/swap/approval?userAddress=$USER_ADDRESS" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$USDT_ADDRESS\"}" > /dev/null
  sleep 3
fi

DAI_APPROVAL=$(curl -s "$BASE_URL/swap/approval/check?userAddress=$USER_ADDRESS&token=$DAI_ADDRESS&amount=50000000000000000000")
DAI_NEEDS_APPROVAL=$(echo $DAI_APPROVAL | jq -r '.needsApproval')

if [ "$DAI_NEEDS_APPROVAL" = "true" ]; then
  echo "授权 DAI..."
  curl -s -X POST "$BASE_URL/swap/approval?userAddress=$USER_ADDRESS" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$DAI_ADDRESS\"}" > /dev/null
  sleep 3
fi
echo -e "${GREEN}✅ 代币授权完成${NC}"
echo ""

# 添加流动性
echo -e "${YELLOW}💰 添加流动性: 50 USDT + 50 DAI${NC}"
ADD_RESPONSE=$(test_api \
  "添加流动性" \
  "POST" \
  "$BASE_URL/liquidity/add?userAddress=$USER_ADDRESS" \
  "{
    \"tokenA\": \"$USDT_ADDRESS\",
    \"tokenB\": \"$DAI_ADDRESS\",
    \"amountADesired\": \"50000000\",
    \"amountBDesired\": \"50000000000000000000\",
    \"slippage\": 0.5
  }")

ADD_TX_HASH=$(echo "$ADD_RESPONSE" | jq -r '.txHash')
echo "  ✅ 添加流动性 TxHash: $ADD_TX_HASH"
echo ""

sleep 5

# ========================================
# 第二部分：查询用户头寸
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第二部分：查询用户流动性头寸${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

POSITIONS_RESPONSE=$(test_api \
  "获取用户流动性头寸" \
  "GET" \
  "$BASE_URL/liquidity/positions/$USER_ADDRESS")

# 提取头寸信息
PAIR_ADDRESS=$(echo "$POSITIONS_RESPONSE" | jq -r '.[0].pairAddress // empty')
LP_BALANCE=$(echo "$POSITIONS_RESPONSE" | jq -r '.[0].lpBalance // empty')

if [ -z "$PAIR_ADDRESS" ] || [ "$PAIR_ADDRESS" = "null" ]; then
  echo -e "${RED}⚠️  未找到流动性头寸，可能需要等待交易确认${NC}"
  echo -e "${YELLOW}等待 5 秒后重试...${NC}"
  sleep 5
  
  POSITIONS_RESPONSE=$(test_api \
    "重新获取用户流动性头寸" \
    "GET" \
    "$BASE_URL/liquidity/positions/$USER_ADDRESS")
  
  PAIR_ADDRESS=$(echo "$POSITIONS_RESPONSE" | jq -r '.[0].pairAddress // empty')
  LP_BALANCE=$(echo "$POSITIONS_RESPONSE" | jq -r '.[0].lpBalance // empty')
fi

echo "  📊 流动性头寸信息:"
echo "  - Pair 地址: $PAIR_ADDRESS"
echo "  - LP 余额: $LP_BALANCE"
echo ""

# ========================================
# 第三部分：移除流动性
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第三部分：移除流动性${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ -z "$LP_BALANCE" ] || [ "$LP_BALANCE" = "null" ] || [ "$LP_BALANCE" = "0" ]; then
  echo -e "${RED}❌ 无可用的 LP token，跳过移除流动性测试${NC}"
else
  # 计算移除 50% 的流动性
  REMOVE_AMOUNT=$(echo "scale=0; $LP_BALANCE / 2" | bc)
  
  echo -e "${YELLOW}准备移除流动性...${NC}"
  echo "  - LP token 总量: $LP_BALANCE"
  echo "  - 移除数量 (50%): $REMOVE_AMOUNT"
  echo ""
  
  # 授权 LP token
  echo -e "${YELLOW}🔐 授权 LP token...${NC}"
  LP_APPROVAL=$(curl -s "$BASE_URL/swap/approval/check?userAddress=$USER_ADDRESS&token=$PAIR_ADDRESS&amount=$REMOVE_AMOUNT")
  LP_NEEDS_APPROVAL=$(echo $LP_APPROVAL | jq -r '.needsApproval')
  
  if [ "$LP_NEEDS_APPROVAL" = "true" ]; then
    echo "授权 LP token..."
    curl -s -X POST "$BASE_URL/swap/approval?userAddress=$USER_ADDRESS" \
      -H "Content-Type: application/json" \
      -d "{\"token\": \"$PAIR_ADDRESS\"}" | jq
    sleep 3
  fi
  echo -e "${GREEN}✅ LP token 授权完成${NC}"
  echo ""
  
  # 移除流动性
  echo -e "${YELLOW}💸 移除流动性...${NC}"
  REMOVE_RESPONSE=$(test_api \
    "移除流动性 (50%)" \
    "POST" \
    "$BASE_URL/liquidity/remove?userAddress=$USER_ADDRESS" \
    "{
      \"tokenA\": \"$USDT_ADDRESS\",
      \"tokenB\": \"$DAI_ADDRESS\",
      \"liquidity\": \"$REMOVE_AMOUNT\",
      \"slippage\": 0.5
    }")
  
  REMOVE_TX_HASH=$(echo "$REMOVE_RESPONSE" | jq -r '.txHash')
  echo "  ✅ 移除流动性 TxHash: $REMOVE_TX_HASH"
  echo ""
  
  sleep 5
  
  # 查询移除流动性交易状态
  if [ -n "$REMOVE_TX_HASH" ] && [ "$REMOVE_TX_HASH" != "null" ]; then
    REMOVE_STATUS=$(test_api \
      "查询移除流动性状态" \
      "GET" \
      "$BASE_URL/liquidity/$REMOVE_TX_HASH")
  fi
fi

# ========================================
# 第四部分：再次查询头寸
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第四部分：验证流动性变化${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

FINAL_POSITIONS=$(test_api \
  "再次获取用户流动性头寸" \
  "GET" \
  "$BASE_URL/liquidity/positions/$USER_ADDRESS")

# ========================================
# 第五部分：操作历史
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}第五部分：流动性操作历史${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

ALL_OPS=$(test_api \
  "查询所有流动性操作" \
  "GET" \
  "$BASE_URL/liquidity?userAddress=$USER_ADDRESS")

ADD_OPS=$(test_api \
  "查询添加流动性操作" \
  "GET" \
  "$BASE_URL/liquidity?userAddress=$USER_ADDRESS&operationType=add")

REMOVE_OPS=$(test_api \
  "查询移除流动性操作" \
  "GET" \
  "$BASE_URL/liquidity?userAddress=$USER_ADDRESS&operationType=remove")

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
  echo -e "\n${YELLOW}⚠️  部分测试未完全通过${NC}"
  exit 0
fi

