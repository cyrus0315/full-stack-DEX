#!/bin/bash

# Phase 4: 滑点优化和交易体验 - API 测试脚本

BASE_URL="http://localhost:3002/api/v1"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Phase 4: 滑点优化 API 测试${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 获取代币地址（需要先从环境变量或配置文件读取）
# 这里使用示例地址，实际使用时需要替换
DAI_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
USDT_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

echo -e "${YELLOW}1. 测试基础报价 API${NC}"
echo "curl -X POST ${BASE_URL}/quote -H 'Content-Type: application/json' -d '{\"tokenIn\":\"${DAI_ADDRESS}\",\"tokenOut\":\"${USDT_ADDRESS}\",\"amountIn\":\"1000000000000000000\"}'"
echo ""
QUOTE_RESPONSE=$(curl -s -X POST "${BASE_URL}/quote" \
  -H "Content-Type: application/json" \
  -d "{\"tokenIn\":\"${DAI_ADDRESS}\",\"tokenOut\":\"${USDT_ADDRESS}\",\"amountIn\":\"1000000000000000000\"}")

if [ $? -eq 0 ] && [ -n "$QUOTE_RESPONSE" ]; then
  echo -e "${GREEN}✅ 基础报价 API 响应成功${NC}"
  echo "$QUOTE_RESPONSE" | jq '.'
else
  echo -e "${RED}❌ 基础报价 API 失败${NC}"
fi
echo ""

echo -e "${YELLOW}2. 测试增强报价 API（滑点分析）${NC}"
echo "curl -X POST ${BASE_URL}/quote/enhanced -H 'Content-Type: application/json' -d '{\"tokenIn\":\"${DAI_ADDRESS}\",\"tokenOut\":\"${USDT_ADDRESS}\",\"amountIn\":\"1000000000000000000\"}'"
echo ""
ENHANCED_QUOTE_RESPONSE=$(curl -s -X POST "${BASE_URL}/quote/enhanced" \
  -H "Content-Type: application/json" \
  -d "{\"tokenIn\":\"${DAI_ADDRESS}\",\"tokenOut\":\"${USDT_ADDRESS}\",\"amountIn\":\"1000000000000000000\"}")

if [ $? -eq 0 ] && [ -n "$ENHANCED_QUOTE_RESPONSE" ]; then
  echo -e "${GREEN}✅ 增强报价 API 响应成功${NC}"
  echo "$ENHANCED_QUOTE_RESPONSE" | jq '.'
  
  # 提取关键信息
  echo ""
  echo -e "${BLUE}关键信息：${NC}"
  echo "$ENHANCED_QUOTE_RESPONSE" | jq '{
    priceImpact: .priceImpact,
    executionPrice: .executionPrice,
    minimumReceived: .minimumReceived,
    liquidityDepth: .liquidityDepth,
    recommendation: .recommendation
  }'
else
  echo -e "${RED}❌ 增强报价 API 失败${NC}"
fi
echo ""

echo -e "${YELLOW}3. 测试滑点统计 API${NC}"
POOL_ID=1
echo "curl ${BASE_URL}/analytics/slippage-stats/${POOL_ID}"
echo ""
SLIPPAGE_STATS=$(curl -s "${BASE_URL}/analytics/slippage-stats/${POOL_ID}")

if [ $? -eq 0 ] && [ -n "$SLIPPAGE_STATS" ]; then
  echo -e "${GREEN}✅ 滑点统计 API 响应成功${NC}"
  echo "$SLIPPAGE_STATS" | jq '.'
  
  # 检查是否有数据
  AVG_24H=$(echo "$SLIPPAGE_STATS" | jq -r '.avgSlippage24h')
  if [ "$AVG_24H" != "0" ]; then
    echo -e "${GREEN}✅ 已有历史数据${NC}"
  else
    echo -e "${YELLOW}⚠️  暂无历史数据（需要等待价格记录任务运行）${NC}"
  fi
else
  echo -e "${RED}❌ 滑点统计 API 失败${NC}"
fi
echo ""

echo -e "${YELLOW}4. 测试价格信息 API${NC}"
echo "curl ${BASE_URL}/quote/price/${DAI_ADDRESS}/${USDT_ADDRESS}"
echo ""
PRICE_INFO=$(curl -s "${BASE_URL}/quote/price/${DAI_ADDRESS}/${USDT_ADDRESS}")

if [ $? -eq 0 ] && [ -n "$PRICE_INFO" ]; then
  echo -e "${GREEN}✅ 价格信息 API 响应成功${NC}"
  echo "$PRICE_INFO" | jq '.'
else
  echo -e "${RED}❌ 价格信息 API 失败${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  测试完成${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 总结
echo -e "${GREEN}✅ Phase 4 API 测试完成${NC}"
echo ""
echo -e "${YELLOW}注意事项：${NC}"
echo "1. 滑点统计需要等待定时任务记录价格历史（每5分钟）"
echo "2. 确保至少有一个活跃的交易对"
echo "3. 代币地址需要根据实际部署情况调整"
echo ""
echo -e "${BLUE}手动测试增强报价功能：${NC}"
echo "1. 访问 Swagger 文档: http://localhost:3002/api"
echo "2. 测试 POST /quote/enhanced 端点"
echo "3. 观察返回的 priceImpact, minimumReceived, recommendation 等字段"

