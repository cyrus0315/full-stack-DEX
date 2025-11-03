#!/bin/bash

# Phase 5 - 流动性挖矿 API 测试脚本
# 
# 测试所有挖矿相关的 API 端点

API_BASE="http://localhost:3002/api/v1"
TEST_USER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo "╔═══════════════════════════════════════╗"
echo "║   Phase 5 - 流动性挖矿 API 测试      ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_api() {
    local test_name=$1
    local endpoint=$2
    local expected_status=${3:-200}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}测试 ${TOTAL_TESTS}: ${test_name}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo "请求: GET $endpoint"
    echo ""
    
    # 发送请求并捕获响应
    response=$(curl -s -w "\n%{http_code}" "$endpoint")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "状态码: $http_code"
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ 状态码正确${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # 美化输出 JSON
        if command -v jq &> /dev/null; then
            echo ""
            echo -e "${YELLOW}响应数据:${NC}"
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo ""
            echo "响应: $body"
        fi
    else
        echo -e "${RED}✗ 状态码错误 (期望: $expected_status, 实际: $http_code)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "响应: $body"
    fi
    
    echo ""
    sleep 0.5
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 挖矿池管理 API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 1: 获取所有挖矿池
test_api \
    "获取所有挖矿池列表" \
    "$API_BASE/farms"

# 测试 2: 获取单个池子详情
test_api \
    "获取池子 0 详情" \
    "$API_BASE/farms/0"

# 测试 3: 手动同步池子数据
test_api \
    "手动同步池子 0 数据" \
    "$API_BASE/farms/0/sync"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. 用户挖矿 API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 4: 获取用户质押信息
test_api \
    "获取用户质押信息" \
    "$API_BASE/farms/user/$TEST_USER"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. 排行榜 API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 5: 获取排行榜 (Top 10)
test_api \
    "获取排行榜 Top 10" \
    "$API_BASE/farms/leaderboard/top?limit=10"

# 测试 6: 获取排行榜 (Top 100)
test_api \
    "获取排行榜 Top 100" \
    "$API_BASE/farms/leaderboard/top?limit=100"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. 错误处理测试"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 测试 7: 不存在的池子
test_api \
    "获取不存在的池子 (应返回 404)" \
    "$API_BASE/farms/999" \
    404

# 测试 8: 无效的用户地址
test_api \
    "获取无效地址的用户信息" \
    "$API_BASE/farms/user/0xinvalid"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║          测试结果统计                 ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi

