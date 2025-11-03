#!/bin/bash

# Block Scanner 测试脚本

BASE_URL="http://localhost:3001/api/v1"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
PASSED=0
FAILED=0

# 打印测试标题
print_test() {
    echo -e "\n${YELLOW}=== $1 ===${NC}"
}

# 打印成功
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((PASSED++))
}

# 打印失败
print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((FAILED++))
}

# 检查响应
check_response() {
    local response=$1
    local test_name=$2
    
    if echo "$response" | jq -e . >/dev/null 2>&1; then
        print_success "$test_name"
        echo "$response" | jq '.'
        return 0
    else
        print_error "$test_name"
        echo "响应: $response"
        return 1
    fi
}

echo "================================================"
echo "   DEX Wallet Service - Block Scanner 测试"
echo "================================================"

# 检查服务是否运行
print_test "1. 检查服务健康状态"
SCANNER_STATUS=$(curl -s $BASE_URL/transaction/scanner/status)
if [ $? -eq 0 ] && echo "$SCANNER_STATUS" | jq -e . >/dev/null 2>&1; then
    print_success "服务运行正常"
else
    print_error "服务未运行，请先启动 wallet-service"
    echo "确保服务运行在 http://localhost:3001"
    exit 1
fi

# 获取扫描器状态
print_test "2. 获取区块扫描器状态"
SCANNER_STATUS=$(curl -s $BASE_URL/transaction/scanner/status)
check_response "$SCANNER_STATUS" "获取扫描器状态"

# 添加测试地址（如果还没有）
print_test "3. 添加测试地址到监控列表"
TEST_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"  # Hardhat 默认账户
ADDRESS_RESPONSE=$(curl -s -X POST $BASE_URL/address \
  -H "Content-Type: application/json" \
  -d "{
    \"address\": \"$TEST_ADDRESS\",
    \"label\": \"测试账户 (Scanner)\"
  }")
echo "$ADDRESS_RESPONSE" | jq '.' 2>/dev/null || echo "$ADDRESS_RESPONSE"

# 刷新监控地址列表
print_test "4. 刷新监控地址列表"
REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/transaction/scanner/refresh-addresses \
  -H "Content-Type: application/json")
check_response "$REFRESH_RESPONSE" "刷新监控地址"

# 获取当前区块号
print_test "5. 获取当前区块号"
CURRENT_BLOCK=$(curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | jq -r '.result')

if [ "$CURRENT_BLOCK" != "null" ] && [ -n "$CURRENT_BLOCK" ]; then
    BLOCK_NUMBER=$((16#${CURRENT_BLOCK:2}))
    print_success "当前区块号: $BLOCK_NUMBER"
else
    print_error "无法获取当前区块号"
    exit 1
fi

# 手动扫描最近10个区块
print_test "6. 手动扫描最近 10 个区块"
START_BLOCK=$((BLOCK_NUMBER - 10))
if [ $START_BLOCK -lt 0 ]; then
    START_BLOCK=0
fi

SCAN_RESPONSE=$(curl -s -X POST $BASE_URL/transaction/scanner/scan \
  -H "Content-Type: application/json" \
  -d "{
    \"startBlock\": $START_BLOCK,
    \"endBlock\": $BLOCK_NUMBER
  }")
check_response "$SCAN_RESPONSE" "扫描区块范围 $START_BLOCK-$BLOCK_NUMBER"

# 查询导入的交易
print_test "7. 查询导入的交易记录"
TX_LIST=$(curl -s "$BASE_URL/transaction?address=$TEST_ADDRESS&limit=10")
check_response "$TX_LIST" "查询交易列表"

# 获取交易统计
print_test "8. 获取交易统计"
TX_STATS=$(curl -s "$BASE_URL/transaction/stats/$TEST_ADDRESS")
check_response "$TX_STATS" "获取交易统计"

# 再次检查扫描器状态
print_test "9. 再次检查扫描器状态（应该在运行）"
SCANNER_STATUS=$(curl -s $BASE_URL/transaction/scanner/status)
check_response "$SCANNER_STATUS" "扫描器状态"

# 测试总结
echo ""
echo "================================================"
echo "                  测试总结"
echo "================================================"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo "================================================"

# 提示信息
echo ""
echo "📝 注意事项："
echo "1. 区块扫描器会自动监听新区块（每 2 秒轮询）"
echo "2. 只有监控地址列表中的地址相关交易会被导入"
echo "3. 可以通过 POST /address 添加新的监控地址"
echo "4. 可以通过 POST /transaction/scanner/refresh-addresses 刷新监控列表"
echo ""
echo "🔄 实时测试："
echo "在另一个终端执行交易："
echo "cd ../../contracts"
echo "npx hardhat run scripts/add-liquidity.ts --network localhost"
echo ""
echo "然后查询交易记录："
echo "curl 'http://localhost:3001/api/v1/transaction?address=$TEST_ADDRESS'"
echo ""
echo "💡 提示："
echo "- 所有 API 路径都需要 /api/v1 前缀"
echo "- Swagger 文档: http://localhost:3001/api/docs"
echo ""

# 返回状态码
if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi

