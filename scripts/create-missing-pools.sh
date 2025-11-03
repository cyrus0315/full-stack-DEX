#!/bin/bash

# 手动创建缺失的 Pool 记录

echo "🔄 创建缺失的 Pool..."

API_URL="http://localhost:3002/api/v1"

# 从 .env.deployed 读取地址
source /Users/h15/Desktop/dex/contracts/.env.deployed

# 创建 Pool 的函数
create_pool() {
    local token0=$1
    local token1=$2
    local name=$3
    
    echo "📝 创建 $name Pool..."
    
    response=$(curl -s -X POST "$API_URL/pool" \
        -H "Content-Type: application/json" \
        -d "{
            \"token0Address\": \"$token0\",
            \"token1Address\": \"$token1\"
        }")
    
    echo "   结果: $response"
    
    # 获取 pool ID 并刷新
    pool_id=$(echo $response | jq -r '.id // empty')
    if [ ! -z "$pool_id" ]; then
        echo "   刷新 Pool 数据..."
        curl -s -X POST "$API_URL/pool/$pool_id/refresh" > /dev/null
        echo "   ✅ $name Pool 创建并同步成功"
    else
        echo "   ⚠️  Pool 可能已存在"
    fi
    echo ""
}

# 创建所有交易对
echo ""
echo "开始创建所有交易对..."
echo ""

create_pool "$DAI_ADDRESS" "$USDC_ADDRESS" "DAI/USDC"
create_pool "$WETH_ADDRESS" "$DAI_ADDRESS" "WETH/DAI"
create_pool "$WETH_ADDRESS" "$USDT_ADDRESS" "WETH/USDT"
create_pool "$WETH_ADDRESS" "$USDC_ADDRESS" "WETH/USDC"

echo ""
echo "🎉 完成！刷新浏览器查看所有 Pool"

