#!/bin/bash

# DEX 端到端完整测试
# 测试完整的 DEX 生命周期：部署 → 添加流动性 → 交易 → 移除流动性

set -e

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 项目根目录 (从 tests/e2e/ 向上两级)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
WALLET_SERVICE_DIR="$PROJECT_ROOT/backend/services/wallet-service"
TRADING_SERVICE_DIR="$PROJECT_ROOT/backend/services/trading-service"

# API 端点
WALLET_API="http://localhost:3001/api/v1"
TRADING_API="http://localhost:3002/api/v1"

# 测试账户
USER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# 测试统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ========================================
# 打印标题
# ========================================
print_title() {
  echo ""
  echo -e "${MAGENTA}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║${NC}  ${CYAN}$1${NC}"
  echo -e "${MAGENTA}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ========================================
# 打印阶段
# ========================================
print_stage() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ========================================
# 测试函数
# ========================================
test_api() {
  local name=$1
  local method=$2
  local url=$3
  local data=$4
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  echo -e "${CYAN}[测试 $TOTAL_TESTS] $name${NC}" >&2
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -d "$data" 2>/dev/null)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ 通过 (HTTP $http_code)${NC}" >&2
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # 显示简化的响应（如果是 JSON） - 输出到 stderr
    if echo "$body" | jq '.' > /dev/null 2>&1; then
      echo "$body" | jq -C '.' 2>/dev/null | head -20 >&2
    fi
  else
    echo -e "${RED}❌ 失败 (HTTP $http_code)${NC}" >&2
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "$body" >&2
  fi
  echo "" >&2
  
  # 只返回响应体到 stdout（供调用者捕获）
  echo "$body"
}

# ========================================
# 检查服务
# ========================================
check_service() {
  local name=$1
  local url=$2
  
  echo -e "${CYAN}检查 $name...${NC}"
  
  # 尝试访问服务，只要有响应就认为服务在运行
  response=$(curl -s -w "%{http_code}" "$url" -o /dev/null 2>&1)
  
  if [ -n "$response" ] && [ "$response" != "000" ]; then
    echo -e "${GREEN}✅ $name 运行中 (HTTP $response)${NC}"
    return 0
  else
    echo -e "${RED}❌ $name 未运行${NC}"
    return 1
  fi
}

# ========================================
# 等待服务启动
# ========================================
wait_for_service() {
  local name=$1
  local url=$2
  local max_wait=30
  local count=0
  
  echo -e "${YELLOW}等待 $name 启动...${NC}"
  
  while [ $count -lt $max_wait ]; do
    if curl -s -f "$url" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ $name 已启动${NC}"
      return 0
    fi
    sleep 2
    count=$((count + 2))
    echo -n "."
  done
  
  echo ""
  echo -e "${RED}❌ $name 启动超时${NC}"
  return 1
}

# ========================================
# 主流程开始
# ========================================
print_title "DEX 端到端完整测试"

echo -e "${CYAN}项目根目录: $PROJECT_ROOT${NC}"
echo -e "${CYAN}测试账户: $USER_ADDRESS${NC}"
echo ""

# ========================================
# 阶段 1: 环境检查
# ========================================
print_stage "阶段 1: 环境检查"

echo -e "${YELLOW}检查必要的命令...${NC}"
for cmd in node pnpm curl jq npx; do
  if command -v $cmd > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $cmd${NC}"
  else
    echo -e "${RED}❌ $cmd 未安装${NC}"
    exit 1
  fi
done
echo ""

echo -e "${YELLOW}检查 Hardhat 本地节点...${NC}"
if curl -s -X POST http://127.0.0.1:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
  > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Hardhat 节点运行中${NC}"
else
  echo -e "${RED}❌ Hardhat 节点未运行${NC}"
  echo "请在另一个终端启动: cd $CONTRACTS_DIR && npx hardhat node"
  exit 1
fi
echo ""

# ========================================
# 阶段 2: 检查后端服务
# ========================================
print_stage "阶段 2: 检查后端服务"

check_service "Wallet Service" "$WALLET_API/token" || {
  echo "请启动 Wallet Service: cd $WALLET_SERVICE_DIR && pnpm run start:dev"
  exit 1
}

check_service "Trading Service" "$TRADING_API/pool" || {
  echo "请启动 Trading Service: cd $TRADING_SERVICE_DIR && pnpm run start:dev"
  exit 1
}

echo ""

# ========================================
# 阶段 3: 部署合约
# ========================================
print_stage "阶段 3: 部署合约 (如果需要)"

if [ -f "$CONTRACTS_DIR/.env.deployed" ]; then
  echo -e "${YELLOW}检测到已部署的合约配置${NC}"
  echo -e "${CYAN}合约地址:${NC}"
  cat "$CONTRACTS_DIR/.env.deployed"
  echo ""
  read -p "是否重新部署合约？(y/N): " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}重新部署合约...${NC}"
    cd "$CONTRACTS_DIR"
    npx hardhat run scripts/deploy.ts --network localhost
    echo -e "${GREEN}✅ 合约部署完成${NC}"
  else
    echo -e "${CYAN}使用现有合约${NC}"
  fi
else
  echo -e "${YELLOW}首次部署合约...${NC}"
  cd "$CONTRACTS_DIR"
  npx hardhat run scripts/deploy.ts --network localhost
  echo -e "${GREEN}✅ 合约部署完成${NC}"
fi

echo ""

# 读取合约地址
USDT_ADDRESS=$(grep "USDT_ADDRESS=" "$CONTRACTS_DIR/.env.deployed" | cut -d'=' -f2 | tr -d ' \r\n')
DAI_ADDRESS=$(grep "DAI_ADDRESS=" "$CONTRACTS_DIR/.env.deployed" | cut -d'=' -f2 | tr -d ' \r\n')
WETH_ADDRESS=$(grep "WETH_ADDRESS=" "$CONTRACTS_DIR/.env.deployed" | cut -d'=' -f2 | tr -d ' \r\n')
FACTORY_ADDRESS=$(grep "FACTORY_ADDRESS=" "$CONTRACTS_DIR/.env.deployed" | cut -d'=' -f2 | tr -d ' \r\n')
ROUTER_ADDRESS=$(grep "ROUTER_ADDRESS=" "$CONTRACTS_DIR/.env.deployed" | cut -d'=' -f2 | tr -d ' \r\n')

echo -e "${CYAN}已部署的合约:${NC}"
echo "  Factory: $FACTORY_ADDRESS"
echo "  Router:  $ROUTER_ADDRESS"
echo "  USDT:    $USDT_ADDRESS"
echo "  DAI:     $DAI_ADDRESS"
echo "  WETH:    $WETH_ADDRESS"
echo ""

# ========================================
# 阶段 4: 测试 Wallet Service
# ========================================
print_stage "阶段 4: 测试 Wallet Service"

# 4.1 查询余额
test_api \
  "查询用户 ETH 余额" \
  "GET" \
  "$WALLET_API/balance/eth/$USER_ADDRESS" > /dev/null

# 4.2 查询代币余额
test_api \
  "查询 USDT 余额" \
  "GET" \
  "$WALLET_API/balance/token/$USER_ADDRESS/$USDT_ADDRESS" > /dev/null

test_api \
  "查询 DAI 余额" \
  "GET" \
  "$WALLET_API/balance/token/$USER_ADDRESS/$DAI_ADDRESS" > /dev/null

# 4.3 注册监控地址
test_api \
  "注册监控地址" \
  "POST" \
  "$WALLET_API/address" \
  "{\"address\": \"$USER_ADDRESS\", \"label\": \"测试账户\"}" > /dev/null

# ========================================
# 阶段 5: 测试 Trading Service - Pool & Quote
# ========================================
print_stage "阶段 5: 测试 Pool & Quote 模块"

# 5.1 查询所有交易对
test_api \
  "查询所有交易对" \
  "GET" \
  "$TRADING_API/pool" > /dev/null

# 5.2 获取交易报价
QUOTE_RESPONSE=$(test_api \
  "获取交易报价: 1 USDT → DAI" \
  "POST" \
  "$TRADING_API/quote" \
  "{
    \"tokenIn\": \"$USDT_ADDRESS\",
    \"tokenOut\": \"$DAI_ADDRESS\",
    \"amountIn\": \"1000000\"
  }")

# ========================================
# 阶段 6: 添加流动性
# ========================================
print_stage "阶段 6: 添加流动性 (USDT/DAI)"

echo -e "${YELLOW}授权代币...${NC}"

# 检查并授权 USDT
USDT_APPROVAL=$(curl -s "$TRADING_API/swap/approval/check?userAddress=$USER_ADDRESS&token=$USDT_ADDRESS&amount=100000000" 2>/dev/null)
USDT_NEEDS=$(echo "$USDT_APPROVAL" | jq -r '.needsApproval' 2>/dev/null || echo "false")

if [ "$USDT_NEEDS" = "true" ]; then
  echo "  授权 USDT..."
  curl -s -X POST "$TRADING_API/swap/approval?userAddress=$USER_ADDRESS" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$USDT_ADDRESS\"}" > /dev/null 2>&1
  sleep 3
  echo "  ✅ USDT 授权完成"
else
  echo "  ⏭️  USDT 已授权，跳过"
fi

# 检查并授权 DAI
DAI_APPROVAL=$(curl -s "$TRADING_API/swap/approval/check?userAddress=$USER_ADDRESS&token=$DAI_ADDRESS&amount=100000000000000000000" 2>/dev/null)
DAI_NEEDS=$(echo "$DAI_APPROVAL" | jq -r '.needsApproval' 2>/dev/null || echo "false")

if [ "$DAI_NEEDS" = "true" ]; then
  echo "  授权 DAI..."
  curl -s -X POST "$TRADING_API/swap/approval?userAddress=$USER_ADDRESS" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$DAI_ADDRESS\"}" > /dev/null 2>&1
  sleep 3
  echo "  ✅ DAI 授权完成"
else
  echo "  ⏭️  DAI 已授权，跳过"
fi

echo -e "${GREEN}✅ 代币授权检查完成${NC}"
echo ""

# 添加流动性
ADD_RESPONSE=$(test_api \
  "添加流动性: 100 USDT + 100 DAI" \
  "POST" \
  "$TRADING_API/liquidity/add?userAddress=$USER_ADDRESS" \
  "{
    \"tokenA\": \"$USDT_ADDRESS\",
    \"tokenB\": \"$DAI_ADDRESS\",
    \"amountADesired\": \"100000000\",
    \"amountBDesired\": \"100000000000000000000\",
    \"slippage\": 0.5
  }")

ADD_TX=$(echo "$ADD_RESPONSE" | jq -r '.txHash' 2>/dev/null || echo "")
echo -e "${CYAN}TxHash: $ADD_TX${NC}"
echo ""

sleep 5

# 验证流动性
test_api \
  "查询用户流动性头寸" \
  "GET" \
  "$TRADING_API/liquidity/positions/$USER_ADDRESS" > /dev/null

# ========================================
# 阶段 7: 代币交换
# ========================================
print_stage "阶段 7: 代币交换 (Swap)"

# 7.1 Exact In: USDT → DAI
SWAP1_RESPONSE=$(test_api \
  "交易 1: 10 USDT → DAI (Exact In)" \
  "POST" \
  "$TRADING_API/swap/exact-in?userAddress=$USER_ADDRESS" \
  "{
    \"tokenIn\": \"$USDT_ADDRESS\",
    \"tokenOut\": \"$DAI_ADDRESS\",
    \"amountIn\": \"10000000\",
    \"slippage\": 0.5
  }")

SWAP1_TX=$(echo "$SWAP1_RESPONSE" | jq -r '.txHash' 2>/dev/null || echo "")
echo -e "${CYAN}TxHash: $SWAP1_TX${NC}"
echo ""

sleep 5

# 7.2 查询交易状态
if [ -n "$SWAP1_TX" ] && [ "$SWAP1_TX" != "null" ]; then
  test_api \
    "查询交易状态" \
    "GET" \
    "$TRADING_API/swap/$SWAP1_TX" > /dev/null
fi

# 7.3 Exact Out: DAI → USDT
SWAP2_RESPONSE=$(test_api \
  "交易 2: DAI → 5 USDT (Exact Out)" \
  "POST" \
  "$TRADING_API/swap/exact-out?userAddress=$USER_ADDRESS" \
  "{
    \"tokenIn\": \"$DAI_ADDRESS\",
    \"tokenOut\": \"$USDT_ADDRESS\",
    \"amountOut\": \"5000000\",
    \"amountInMax\": \"10000000000000000000\"
  }")

SWAP2_TX=$(echo "$SWAP2_RESPONSE" | jq -r '.txHash' 2>/dev/null || echo "")
echo -e "${CYAN}TxHash: $SWAP2_TX${NC}"
echo ""

sleep 5

# ========================================
# 阶段 8: 移除流动性
# ========================================
print_stage "阶段 8: 移除流动性"

# 获取 LP 余额
POSITIONS=$(curl -s "$TRADING_API/liquidity/positions/$USER_ADDRESS" 2>/dev/null)
LP_BALANCE=$(echo "$POSITIONS" | jq -r '.[0].lpBalance // "0"' 2>/dev/null || echo "0")
PAIR_ADDRESS=$(echo "$POSITIONS" | jq -r '.[0].pairAddress // ""' 2>/dev/null || echo "")

echo "当前 LP Balance: $LP_BALANCE"
echo "Pair Address: $PAIR_ADDRESS"
echo ""

if [ "$LP_BALANCE" != "0" ] && [ -n "$PAIR_ADDRESS" ]; then
  # 移除 50% 的流动性
  REMOVE_AMOUNT=$(echo "scale=0; $LP_BALANCE / 2" | bc)
  
  # 授权 LP token
  echo -e "${YELLOW}授权 LP token...${NC}"
  curl -s -X POST "$TRADING_API/swap/approval?userAddress=$USER_ADDRESS" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$PAIR_ADDRESS\"}" > /dev/null 2>&1
  sleep 3
  echo -e "${GREEN}✅ LP token 授权完成${NC}"
  echo ""
  
  # 移除流动性
  REMOVE_RESPONSE=$(test_api \
    "移除流动性 (50%): $REMOVE_AMOUNT LP tokens" \
    "POST" \
    "$TRADING_API/liquidity/remove?userAddress=$USER_ADDRESS" \
    "{
      \"tokenA\": \"$USDT_ADDRESS\",
      \"tokenB\": \"$DAI_ADDRESS\",
      \"liquidity\": \"$REMOVE_AMOUNT\",
      \"slippage\": 0.5
    }")
  
  REMOVE_TX=$(echo "$REMOVE_RESPONSE" | jq -r '.txHash' 2>/dev/null || echo "")
  echo -e "${CYAN}TxHash: $REMOVE_TX${NC}"
  echo ""
  
  sleep 5
  
  # 再次查询头寸
  test_api \
    "验证流动性变化" \
    "GET" \
    "$TRADING_API/liquidity/positions/$USER_ADDRESS" > /dev/null
else
  echo -e "${YELLOW}⚠️  没有可用的 LP token，跳过移除流动性测试${NC}"
fi

# ========================================
# 阶段 9: 验证 Wallet Service 数据同步
# ========================================
print_stage "阶段 9: 验证数据同步 (Block Scanner)"

echo -e "${YELLOW}等待区块扫描器同步交易...${NC}"
sleep 10

# 查询交易历史
test_api \
  "查询用户交易历史" \
  "GET" \
  "$WALLET_API/transaction?address=$USER_ADDRESS&page=1&limit=10" > /dev/null

# 查询最新余额
test_api \
  "查询最新 USDT 余额" \
  "GET" \
  "$WALLET_API/balance/token/$USER_ADDRESS/$USDT_ADDRESS" > /dev/null

test_api \
  "查询最新 DAI 余额" \
  "GET" \
  "$WALLET_API/balance/token/$USER_ADDRESS/$DAI_ADDRESS" > /dev/null

# ========================================
# 阶段 10: 测试历史记录查询
# ========================================
print_stage "阶段 10: 历史记录查询"

# Swap 历史
test_api \
  "查询所有 Swap 记录" \
  "GET" \
  "$TRADING_API/swap?page=1&limit=10" > /dev/null

test_api \
  "查询用户 Swap 记录" \
  "GET" \
  "$TRADING_API/swap?userAddress=$USER_ADDRESS" > /dev/null

# Liquidity 历史
test_api \
  "查询所有流动性操作" \
  "GET" \
  "$TRADING_API/liquidity?page=1&limit=10" > /dev/null

test_api \
  "查询用户流动性操作" \
  "GET" \
  "$TRADING_API/liquidity?userAddress=$USER_ADDRESS" > /dev/null

# ========================================
# 测试汇总
# ========================================
print_stage "测试汇总"

echo -e "${CYAN}总测试数:${NC}   $TOTAL_TESTS"
echo -e "${GREEN}✅ 通过:${NC}     $PASSED_TESTS"
echo -e "${RED}❌ 失败:${NC}     $FAILED_TESTS"
echo ""

SUCCESS_RATE=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
echo -e "${CYAN}成功率:${NC}     ${SUCCESS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}  🎉 ${GREEN}所有测试通过！DEX 端到端测试成功！${NC}           ${GREEN}║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  exit 0
else
  echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║${NC}  ⚠️  ${YELLOW}部分测试失败，请检查日志${NC}                     ${YELLOW}║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
  echo ""
  exit 1
fi

