#!/bin/bash

# Trading Service API 测试脚本

BASE_URL="http://localhost:3002/api/v1"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 Trading Service API 测试"
echo "================================"
echo ""

# 从部署文件读取地址
USDT_ADDRESS=$(grep "USDT_ADDRESS=" /Users/h15/Desktop/dex/contracts/.env.deployed | cut -d'=' -f2)
DAI_ADDRESS=$(grep "DAI_ADDRESS=" /Users/h15/Desktop/dex/contracts/.env.deployed | cut -d'=' -f2)
USDC_ADDRESS=$(grep "USDC_ADDRESS=" /Users/h15/Desktop/dex/contracts/.env.deployed | cut -d'=' -f2)

echo -e "${BLUE}使用的代币地址:${NC}"
echo "  USDT: $USDT_ADDRESS"
echo "  DAI:  $DAI_ADDRESS"
echo "  USDC: $USDC_ADDRESS"
echo ""

# ==================== 测试 1: 健康检查 ====================
echo -e "${YELLOW}[测试 1] 健康检查${NC}"
curl -s $BASE_URL/pool/stats | jq '.' && echo -e "${GREEN}✅ 通过${NC}\n" || echo -e "${RED}❌ 失败${NC}\n"

# ==================== 测试 2: 获取/创建池子 (USDT/DAI) ====================
echo -e "${YELLOW}[测试 2] 获取或创建池子 (USDT/DAI)${NC}"
POOL_RESPONSE=$(curl -s -X POST $BASE_URL/pool \
  -H "Content-Type: application/json" \
  -d "{
    \"token0Address\": \"$USDT_ADDRESS\",
    \"token1Address\": \"$DAI_ADDRESS\"
  }")

echo $POOL_RESPONSE | jq '.'

POOL_ID=$(echo $POOL_RESPONSE | jq -r '.id')
PAIR_ADDRESS=$(echo $POOL_RESPONSE | jq -r '.pairAddress')

if [ "$POOL_ID" != "null" ]; then
  echo -e "${GREEN}✅ 池子 ID: $POOL_ID${NC}"
  echo -e "${GREEN}✅ 交易对地址: $PAIR_ADDRESS${NC}\n"
else
  echo -e "${RED}❌ 创建池子失败${NC}\n"
fi

# ==================== 测试 3: 查询池子列表 ====================
echo -e "${YELLOW}[测试 3] 查询池子列表${NC}"
curl -s "$BASE_URL/pool?page=1&limit=10" | jq '.' && echo -e "${GREEN}✅ 通过${NC}\n" || echo -e "${RED}❌ 失败${NC}\n"

# ==================== 测试 4: 获取池子详情 ====================
if [ "$POOL_ID" != "null" ]; then
  echo -e "${YELLOW}[测试 4] 获取池子详情 (ID: $POOL_ID)${NC}"
  curl -s "$BASE_URL/pool/$POOL_ID" | jq '.' && echo -e "${GREEN}✅ 通过${NC}\n" || echo -e "${RED}❌ 失败${NC}\n"
fi

# ==================== 测试 5: 刷新池子数据 ====================
if [ "$POOL_ID" != "null" ]; then
  echo -e "${YELLOW}[测试 5] 刷新池子数据 (ID: $POOL_ID)${NC}"
  curl -s -X POST "$BASE_URL/pool/$POOL_ID/refresh" | jq '.' && echo -e "${GREEN}✅ 通过${NC}\n" || echo -e "${RED}❌ 失败${NC}\n"
fi

# ==================== 测试 6: 获取价格报价 (精确输入) ====================
echo -e "${YELLOW}[测试 6] 获取价格报价 - 精确输入 (100 USDT → DAI)${NC}"
QUOTE_RESPONSE=$(curl -s -X POST $BASE_URL/quote \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenIn\": \"$USDT_ADDRESS\",
    \"tokenOut\": \"$DAI_ADDRESS\",
    \"amountIn\": \"100000000\",
    \"slippage\": 0.5
  }")

echo $QUOTE_RESPONSE | jq '.'

AMOUNT_OUT=$(echo $QUOTE_RESPONSE | jq -r '.amountOut')
PRICE=$(echo $QUOTE_RESPONSE | jq -r '.price')
PRICE_IMPACT=$(echo $QUOTE_RESPONSE | jq -r '.priceImpact')

if [ "$AMOUNT_OUT" != "null" ]; then
  echo -e "${GREEN}✅ 输出金额: $AMOUNT_OUT${NC}"
  echo -e "${GREEN}✅ 价格: $PRICE${NC}"
  echo -e "${GREEN}✅ 价格影响: $PRICE_IMPACT%${NC}\n"
else
  echo -e "${RED}❌ 获取报价失败${NC}\n"
fi

# ==================== 测试 7: 获取价格报价 (精确输出) ====================
echo -e "${YELLOW}[测试 7] 获取价格报价 - 精确输出 (获得 100 DAI 需要多少 USDT)${NC}"
curl -s -X POST $BASE_URL/quote/exact-out \
  -H "Content-Type: application/json" \
  -d "{
    \"tokenIn\": \"$USDT_ADDRESS\",
    \"tokenOut\": \"$DAI_ADDRESS\",
    \"amountOut\": \"100000000000000000000\",
    \"slippage\": 0.5
  }" | jq '.' && echo -e "${GREEN}✅ 通过${NC}\n" || echo -e "${RED}❌ 失败${NC}\n"

# ==================== 测试 8: 获取价格信息 ====================
echo -e "${YELLOW}[测试 8] 获取价格信息 (USDT/DAI)${NC}"
curl -s "$BASE_URL/quote/price/$USDT_ADDRESS/$DAI_ADDRESS" | jq '.' && echo -e "${GREEN}✅ 通过${NC}\n" || echo -e "${RED}❌ 失败${NC}\n"

# ==================== 测试 9: 批量报价 ====================
echo -e "${YELLOW}[测试 9] 批量获取报价${NC}"
curl -s -X POST $BASE_URL/quote/batch \
  -H "Content-Type: application/json" \
  -d "{
    \"quotes\": [
      {
        \"tokenIn\": \"$USDT_ADDRESS\",
        \"tokenOut\": \"$DAI_ADDRESS\",
        \"amountIn\": \"100000000\",
        \"slippage\": 0.5
      },
      {
        \"tokenIn\": \"$USDT_ADDRESS\",
        \"tokenOut\": \"$USDC_ADDRESS\",
        \"amountIn\": \"50000000\",
        \"slippage\": 0.5
      }
    ]
  }" | jq '.' && echo -e "${GREEN}✅ 通过${NC}\n" || echo -e "${RED}❌ 失败${NC}\n"

# ==================== 测试 10: Swagger 文档 ====================
echo -e "${YELLOW}[测试 10] Swagger API 文档${NC}"
echo -e "${BLUE}📚 API 文档地址: http://localhost:3002/api/docs${NC}\n"

echo "================================"
echo -e "${GREEN}🎉 测试完成！${NC}"

