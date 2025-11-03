const axios = require('axios');

/**
 * 同步所有链上的 Pool 到数据库
 * 
 * 这个脚本会：
 * 1. 从 Factory 合约获取所有交易对
 * 2. 对每个交易对调用后端 API 创建/更新记录
 */

const TRADING_SERVICE_URL = 'http://localhost:3002/api/v1';

// 已知的交易对（从部署脚本获取）
const KNOWN_PAIRS = [
  {
    token0: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // USDT
    token1: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // DAI
    name: 'USDT/DAI'
  },
  {
    token0: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', // USDT
    token1: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // USDC
    name: 'USDT/USDC'
  },
  {
    token0: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // DAI
    token1: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // WETH
    name: 'DAI/WETH'
  }
];

async function syncPool(pair) {
  try {
    console.log(`\n📝 处理交易对: ${pair.name}...`);
    console.log(`   Token0: ${pair.token0}`);
    console.log(`   Token1: ${pair.token1}`);
    
    // 调用后端 API 创建/获取 Pool
    const response = await axios.post(`${TRADING_SERVICE_URL}/pool`, {
      token0Address: pair.token0,
      token1Address: pair.token1,
    });
    
    console.log(`✅ Pool 已创建/更新:`, response.data.pairAddress);
    
    // 刷新 Pool 数据（从链上同步最新储备量）
    if (response.data.id) {
      await axios.post(`${TRADING_SERVICE_URL}/pool/${response.data.id}/refresh`);
      console.log(`✅ Pool 数据已刷新`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`❌ 处理失败:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 开始同步所有交易对到数据库...\n');
  
  const results = [];
  
  for (const pair of KNOWN_PAIRS) {
    const result = await syncPool(pair);
    results.push(result);
    
    // 等待一下，避免请求太快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n📊 同步完成！');
  console.log('==========================================');
  
  const success = results.filter(r => r !== null).length;
  const failed = results.filter(r => r === null).length;
  
  console.log(`✅ 成功: ${success}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('==========================================\n');
  
  if (failed > 0) {
    console.log('⚠️  有失败的交易对，请检查：');
    console.log('   1. 后端服务是否运行');
    console.log('   2. Hardhat 节点是否运行');
    console.log('   3. 合约地址是否正确');
    process.exit(1);
  }
  
  console.log('🎉 所有交易对已同步到数据库！');
  console.log('现在可以在前端 Pool 页面看到它们了。\n');
}

main().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});

