#!/bin/bash

# Phase 6: 价格预言机集成测试脚本

echo "========================================"
echo "🧪 Phase 6 价格预言机集成测试"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0

run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local test_name="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "[$TOTAL_TESTS] $test_name... "
    
    result=$(eval "$command" 2>/dev/null)
    
    if echo "$result" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "   Expected: $expected"
        echo "   Got: $result"
        return 1
    fi
}

echo "1️⃣ 合约部署检查"
echo "-----------------------------------"

# 检查部署文件
if [ -f "contracts/deployed-oracle-addresses.json" ]; then
    echo -e "${GREEN}✅${NC} deployed-oracle-addresses.json 存在"
    PRICE_ORACLE=$(jq -r '.contracts.PriceOracle.address' contracts/deployed-oracle-addresses.json)
    echo "   PriceOracle: $PRICE_ORACLE"
else
    echo -e "${RED}❌${NC} deployed-oracle-addresses.json 不存在"
fi

echo ""
echo "2️⃣ 后端API测试"
echo "-----------------------------------"

# 检查后端是否运行
if curl -s http://localhost:3002/api/v1/price > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} 后端服务运行中"
    
    # 测试价格API
    run_test "获取所有代币价格" \
        "curl -s http://localhost:3002/api/v1/price | jq -r '.prices | length'" \
        "[1-9]"
    
    run_test "获取WETH价格" \
        "curl -s 'http://localhost:3002/api/v1/price/0x5FbDB2315678afecb367f032d93F642f64180aa3' | jq -r '.priceUsd'" \
        "2000"
    
    run_test "获取DAI价格" \
        "curl -s 'http://localhost:3002/api/v1/price/0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' | jq -r '.priceUsd'" \
        "1"
        
else
    echo -e "${RED}❌${NC} 后端服务未运行"
    echo "   请先启动: cd backend/services/analytics-service && pnpm start:dev"
fi

echo ""
echo "3️⃣ 前端文件检查"
echo "-----------------------------------"

if [ -f "frontend/web-app/src/hooks/usePriceOracle.ts" ]; then
    echo -e "${GREEN}✅${NC} usePriceOracle Hook 已创建"
else
    echo -e "${RED}❌${NC} usePriceOracle Hook 不存在"
fi

if [ -f "frontend/web-app/src/components/PriceDisplay/index.tsx" ]; then
    echo -e "${GREEN}✅${NC} PriceDisplay 组件已创建"
else
    echo -e "${RED}❌${NC} PriceDisplay 组件不存在"
fi

echo ""
echo "4️⃣ 环境变量检查"
echo "-----------------------------------"

# 检查 .env.deployed
if grep -q "PRICE_ORACLE_ADDRESS" contracts/.env.deployed 2>/dev/null; then
    ORACLE_ADDR=$(grep "PRICE_ORACLE_ADDRESS" contracts/.env.deployed | cut -d'=' -f2)
    echo -e "${GREEN}✅${NC} contracts/.env.deployed: $ORACLE_ADDR"
else
    echo -e "${RED}❌${NC} contracts/.env.deployed 缺少 PRICE_ORACLE_ADDRESS"
fi

# 检查后端 .env
if grep -q "PRICE_ORACLE_ADDRESS" backend/services/analytics-service/.env 2>/dev/null; then
    ORACLE_ADDR=$(grep "PRICE_ORACLE_ADDRESS" backend/services/analytics-service/.env | cut -d'=' -f2)
    echo -e "${GREEN}✅${NC} 后端 .env: $ORACLE_ADDR"
else
    echo -e "${YELLOW}⚠️${NC}  后端 .env 缺少 PRICE_ORACLE_ADDRESS"
fi

echo ""
echo "========================================"
echo "📊 测试结果汇总"
echo "========================================"
echo -e "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo ""
    echo -e "${GREEN}🎉 所有测试通过！Phase 6 集成成功！${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  部分测试失败，请检查上述错误${NC}"
    exit 1
fi

