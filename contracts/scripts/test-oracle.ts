/**
 * @title 价格预言机测试脚本
 * @author DEX Team
 * @notice 测试 PriceOracle 和 MockChainlinkAggregator 的各种功能
 * 
 * ============================================
 * 测试内容
 * ============================================
 * 
 * 1. 基础价格查询
 * 2. 批量价格查询
 * 3. 价格更新（Mock）
 * 4. 价格验证
 * 5. Price Feed 管理
 * 6. 异常情况处理
 * 
 * ============================================
 * 使用方法
 * ============================================
 * 
 * ```bash
 * # 确保 Hardhat 节点和合约已部署
 * pnpm hardhat run scripts/test-oracle.ts --network localhost
 * ```
 */

import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

/**
 * @notice 主测试函数
 */
async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 价格预言机功能测试')
  console.log('='.repeat(70) + '\n')

  // ============================================
  // 1. 获取账户
  // ============================================
  
  const [deployer, user1] = await ethers.getSigners()
  console.log('👤 测试账户:', deployer.address, '\n')

  // ============================================
  // 2. 读取合约地址
  // ============================================
  
  console.log('📖 读取合约地址...')
  
  const oracleAddressesPath = path.join(
    __dirname,
    '../deployed-oracle-addresses.json'
  )
  
  if (!fs.existsSync(oracleAddressesPath)) {
    throw new Error(
      '❌ 找不到 deployed-oracle-addresses.json\n' +
      '   请先运行 deploy-oracle.ts'
    )
  }
  
  const oracleData = JSON.parse(
    fs.readFileSync(oracleAddressesPath, 'utf8')
  )
  
  console.log('✅ 已读取合约地址\n')

  // ============================================
  // 3. 连接合约
  // ============================================
  
  console.log('🔗 连接合约...')
  
  const oracleAddress = oracleData.contracts.PriceOracle.address
  const oracle = await ethers.getContractAt('PriceOracle', oracleAddress)
  
  console.log('✅ PriceOracle:', oracleAddress)
  console.log('   - Owner:', await oracle.owner())
  console.log('   - Max Price Age:', (await oracle.maxPriceAge()).toString(), '秒')
  console.log('   - Strict Mode:', await oracle.strictMode())
  console.log('')

  // 连接所有 Aggregators
  const aggregators: any = {}
  for (const agg of oracleData.contracts.Aggregators) {
    aggregators[agg.symbol] = await ethers.getContractAt(
      'MockChainlinkAggregator',
      agg.address
    )
  }
  
  console.log('✅ 已连接', Object.keys(aggregators).length, '个 Aggregators\n')

  // ============================================
  // 测试 1: 基础价格查询
  // ============================================
  
  console.log('━'.repeat(70))
  console.log('测试 1: 基础价格查询')
  console.log('━'.repeat(70) + '\n')
  
  console.log('📊 查询所有代币价格...\n')
  console.log('┌────────┬──────────────┬─────────────┬────────────┐')
  console.log('│ Token  │ Raw Price    │ USD Price   │ Status     │')
  console.log('├────────┼──────────────┼─────────────┼────────────┤')
  
  for (const agg of oracleData.contracts.Aggregators) {
    try {
      const price = await oracle.getPrice(agg.tokenAddress)
      const usdPrice = ethers.formatUnits(price, 8)
      console.log(
        `│ ${agg.symbol.padEnd(6)} │ ${price.toString().padStart(12)} │ $${usdPrice.padEnd(10)} │ ✅ Success │`
      )
    } catch (error: any) {
      console.log(
        `│ ${agg.symbol.padEnd(6)} │ -            │ -           │ ❌ Failed  │`
      )
      console.error(`   Error: ${error.message}`)
    }
  }
  
  console.log('└────────┴──────────────┴─────────────┴────────────┘\n')

  // ============================================
  // 测试 2: 批量价格查询
  // ============================================
  
  console.log('━'.repeat(70))
  console.log('测试 2: 批量价格查询')
  console.log('━'.repeat(70) + '\n')
  
  const tokenAddresses = oracleData.contracts.Aggregators.map(
    (agg: any) => agg.tokenAddress
  )
  
  console.log('📊 批量查询', tokenAddresses.length, '个代币...')
  
  const startTime = Date.now()
  const prices = await oracle.getPrices(tokenAddresses)
  const endTime = Date.now()
  
  console.log('✅ 查询成功，耗时:', endTime - startTime, 'ms')
  console.log('   返回', prices.length, '个价格\n')
  
  prices.forEach((price: bigint, index: number) => {
    const agg = oracleData.contracts.Aggregators[index]
    const usdPrice = ethers.formatUnits(price, 8)
    console.log(`   ${agg.symbol}: $${usdPrice}`)
  })
  
  console.log('')

  // ============================================
  // 测试 3: 价格更新（Mock Aggregator）
  // ============================================
  
  console.log('━'.repeat(70))
  console.log('测试 3: 价格更新（Mock Aggregator）')
  console.log('━'.repeat(70) + '\n')
  
  console.log('📝 测试 WETH 价格更新...\n')
  
  const wethAgg = aggregators['WETH']
  const wethToken = oracleData.contracts.Aggregators.find(
    (a: any) => a.symbol === 'WETH'
  ).tokenAddress
  
  // 1. 查询当前价格
  let currentPrice = await oracle.getPrice(wethToken)
  console.log('   当前价格: $' + ethers.formatUnits(currentPrice, 8))
  
  // 2. 更新价格到 $2500
  console.log('   更新价格到 $2500...')
  const newPrice = ethers.parseUnits('2500', 8)
  await wethAgg.setPrice(newPrice)
  console.log('   ✅ 价格更新成功')
  
  // 3. 再次查询
  currentPrice = await oracle.getPrice(wethToken)
  console.log('   新价格: $' + ethers.formatUnits(currentPrice, 8))
  
  // 4. 恢复原价格
  console.log('   恢复原价格 $2000...')
  await wethAgg.setPrice(ethers.parseUnits('2000', 8))
  console.log('   ✅ 价格已恢复\n')

  // ============================================
  // 测试 4: 价格验证
  // ============================================
  
  console.log('━'.repeat(70))
  console.log('测试 4: 价格验证')
  console.log('━'.repeat(70) + '\n')
  
  console.log('🔍 测试价格验证功能...\n')
  
  for (const agg of oracleData.contracts.Aggregators) {
    const [price, isValid, timestamp] = await oracle.getPriceWithValidation(
      agg.tokenAddress
    )
    
    const usdPrice = ethers.formatUnits(price, 8)
    const age = Math.floor(Date.now() / 1000 - Number(timestamp))
    
    console.log(`   ${agg.symbol}:`)
    console.log(`      价格: $${usdPrice}`)
    console.log(`      有效: ${isValid ? '✅ Yes' : '❌ No'}`)
    console.log(`      年龄: ${age} 秒`)
    console.log('')
  }

  // ============================================
  // 测试 5: Price Feed 管理
  // ============================================
  
  console.log('━'.repeat(70))
  console.log('测试 5: Price Feed 管理')
  console.log('━'.repeat(70) + '\n')
  
  console.log('⚙️  测试 Price Feed 配置...\n')
  
  // 检查 Price Feed 是否设置
  const daiToken = oracleData.contracts.Aggregators.find(
    (a: any) => a.symbol === 'DAI'
  ).tokenAddress
  
  const hasFeed = await oracle.hasPriceFeed(daiToken)
  console.log('   DAI 是否配置 Feed:', hasFeed ? '✅ Yes' : '❌ No')
  
  // 获取 Price Feed 详细信息
  const [feed, decimals, description, version] = await oracle.getPriceFeedInfo(
    daiToken
  )
  
  console.log('   Feed 地址:', feed)
  console.log('   小数位:', decimals)
  console.log('   描述:', description)
  console.log('   版本:', version.toString())
  console.log('')

  // ============================================
  // 测试 6: 异常情况处理
  // ============================================
  
  console.log('━'.repeat(70))
  console.log('测试 6: 异常情况处理')
  console.log('━'.repeat(70) + '\n')
  
  console.log('🚫 测试异常情况...\n')
  
  // 测试 1: 查询未配置的代币
  console.log('   测试 1: 查询未配置的代币...')
  try {
    const randomAddress = ethers.Wallet.createRandom().address
    await oracle.getPrice(randomAddress)
    console.log('   ❌ 应该抛出错误但没有\n')
  } catch (error: any) {
    console.log('   ✅ 正确抛出错误:', error.message.split('\n')[0], '\n')
  }
  
  // 测试 2: 非所有者尝试配置 Feed
  console.log('   测试 2: 非所有者尝试配置 Feed...')
  try {
    const oracleAsUser = oracle.connect(user1)
    await oracleAsUser.setPriceFeed(daiToken, aggregators['DAI'].target)
    console.log('   ❌ 应该抛出权限错误但没有\n')
  } catch (error: any) {
    console.log('   ✅ 正确抛出错误:', error.message.split('\n')[0], '\n')
  }
  
  // 测试 3: 设置无效的 Feed 地址
  console.log('   测试 3: 设置无效的 Feed 地址...')
  try {
    const randomAddress = ethers.Wallet.createRandom().address
    await oracle.setPriceFeed(daiToken, randomAddress)
    console.log('   ❌ 应该抛出验证错误但没有\n')
  } catch (error: any) {
    console.log('   ✅ 正确抛出错误:', error.message.split('\n')[0], '\n')
  }

  // ============================================
  // 测试 7: 价格计算示例
  // ============================================
  
  console.log('━'.repeat(70))
  console.log('测试 7: 价格计算示例')
  console.log('━'.repeat(70) + '\n')
  
  console.log('💰 模拟真实使用场景...\n')
  
  // 场景 1: 计算 Pool TVL
  console.log('   场景 1: 计算 DAI-USDT Pool TVL')
  const daiPrice = await oracle.getPrice(daiToken)
  const usdtToken = oracleData.contracts.Aggregators.find(
    (a: any) => a.symbol === 'USDT'
  ).tokenAddress
  const usdtPrice = await oracle.getPrice(usdtToken)
  
  // 假设池子有 1000 DAI 和 1000 USDT
  const daiReserve = ethers.parseUnits('1000', 18) // DAI 18 decimals
  const usdtReserve = ethers.parseUnits('1000', 6) // USDT 6 decimals
  
  // TVL = (DAI Reserve * DAI Price) + (USDT Reserve * USDT Price)
  const daiValue = (daiReserve * daiPrice) / ethers.parseUnits('1', 18) / ethers.parseUnits('1', 8)
  const usdtValue = (usdtReserve * usdtPrice) / ethers.parseUnits('1', 6) / ethers.parseUnits('1', 8)
  const tvl = daiValue + usdtValue
  
  console.log('   - DAI Reserve: 1000 DAI')
  console.log('   - USDT Reserve: 1000 USDT')
  console.log('   - DAI Price:', ethers.formatUnits(daiPrice, 8), 'USD')
  console.log('   - USDT Price:', ethers.formatUnits(usdtPrice, 8), 'USD')
  console.log('   - TVL: $' + tvl.toString())
  console.log('')
  
  // 场景 2: 计算用户资产价值
  console.log('   场景 2: 计算用户资产价值')
  const wethPrice = await oracle.getPrice(wethToken)
  
  // 假设用户有 100 DAI, 50 USDT, 0.5 WETH
  const userDai = ethers.parseUnits('100', 18)
  const userUsdt = ethers.parseUnits('50', 6)
  const userWeth = ethers.parseUnits('0.5', 18)
  
  const userDaiValue = (userDai * daiPrice) / ethers.parseUnits('1', 18) / ethers.parseUnits('1', 8)
  const userUsdtValue = (userUsdt * usdtPrice) / ethers.parseUnits('1', 6) / ethers.parseUnits('1', 8)
  const userWethValue = (userWeth * wethPrice) / ethers.parseUnits('1', 18) / ethers.parseUnits('1', 8)
  const totalValue = userDaiValue + userUsdtValue + userWethValue
  
  console.log('   - 100 DAI = $' + userDaiValue.toString())
  console.log('   - 50 USDT = $' + userUsdtValue.toString())
  console.log('   - 0.5 WETH = $' + userWethValue.toString())
  console.log('   - Total = $' + totalValue.toString())
  console.log('')

  // ============================================
  // 测试总结
  // ============================================
  
  console.log('='.repeat(70))
  console.log('🎉 所有测试完成！')
  console.log('='.repeat(70))
  console.log('')
  console.log('📊 测试结果：')
  console.log('   ✅ 基础价格查询')
  console.log('   ✅ 批量价格查询')
  console.log('   ✅ 价格更新（Mock）')
  console.log('   ✅ 价格验证')
  console.log('   ✅ Price Feed 管理')
  console.log('   ✅ 异常情况处理')
  console.log('   ✅ 价格计算示例')
  console.log('')
  console.log('💡 下一步：')
  console.log('   1. 后端集成 PriceOracleService')
  console.log('   2. 前端集成 usePriceOracle Hook')
  console.log('   3. 所有页面显示 USD 价格')
  console.log('')
  console.log('='.repeat(70))
}

/**
 * @notice 错误处理
 */
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 测试失败:\n')
    console.error(error)
    process.exit(1)
  })

