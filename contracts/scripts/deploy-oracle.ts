/**
 * @title 价格预言机部署脚本
 * @author DEX Team
 * @notice 部署 PriceOracle 和 MockChainlinkAggregator 合约
 * 
 * ============================================
 * 部署流程
 * ============================================
 * 
 * 1. 部署 PriceOracle 合约
 * 2. 为每个代币部署 MockChainlinkAggregator
 * 3. 配置 Price Feeds（将 Aggregator 地址设置到 Oracle）
 * 4. 验证价格查询
 * 5. 保存合约地址到文件
 * 
 * ============================================
 * 使用方法
 * ============================================
 * 
 * 本地网络：
 * ```bash
 * pnpm hardhat run scripts/deploy-oracle.ts --network localhost
 * ```
 * 
 * 测试网：
 * ```bash
 * pnpm hardhat run scripts/deploy-oracle.ts --network goerli
 * ```
 * 
 * ============================================
 * 关于 Mock vs 真实 Chainlink
 * ============================================
 * 
 * 本地开发环境（Hardhat）：
 * - 使用 MockChainlinkAggregator
 * - 可以手动设置价格
 * - 完全可控，方便测试
 * 
 * 测试网/主网：
 * - 使用真实的 Chainlink Price Feeds
 * - 价格来自真实市场
 * - 需要替换为实际的 Feed 地址
 * 
 * Chainlink Price Feed 地址查询：
 * https://docs.chain.link/data-feeds/price-feeds/addresses
 */

import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

/**
 * @notice 代币价格配置
 * @dev 根据实际市场价格配置初始价格（仅用于本地测试）
 */
interface TokenPriceConfig {
  name: string
  symbol: string
  address: string
  initialPrice: string // USD 价格（字符串格式，方便精确表示）
  decimals: number // Chainlink 价格小数位（通常是 8）
}

/**
 * @notice 主函数
 */
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 开始部署价格预言机系统')
  console.log('='.repeat(60) + '\n')

  // ============================================
  // 1. 获取部署账户
  // ============================================
  
  const [deployer] = await ethers.getSigners()
  console.log('👤 部署账户:', deployer.address)
  
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('💰 账户余额:', ethers.formatEther(balance), 'ETH\n')

  // ============================================
  // 2. 读取已部署的代币地址
  // ============================================
  
  console.log('📖 读取代币地址...')
  
  const deployedAddressesPath = path.join(
    __dirname,
    '../deployed-addresses.json'
  )
  
  if (!fs.existsSync(deployedAddressesPath)) {
    throw new Error(
      '❌ 找不到 deployed-addresses.json\n' +
      '   请先运行 deploy.ts 部署核心合约'
    )
  }
  
  const deployedAddresses = JSON.parse(
    fs.readFileSync(deployedAddressesPath, 'utf8')
  )
  
  console.log('✅ 已读取代币地址\n')

  // ============================================
  // 3. 配置代币价格
  // ============================================
  
  console.log('⚙️  配置代币初始价格...\n')
  
  /**
   * 价格说明：
   * - Chainlink 通常使用 8 位小数
   * - 价格 = 实际 USD 价格 * 10^8
   * - 例如：$1.00 = 100000000 (1e8)
   * - 例如：$2000.00 = 200000000000 (2000e8)
   */
  const tokenConfigs: TokenPriceConfig[] = [
    {
      name: 'DAI Stablecoin',
      symbol: 'DAI',
      address: deployedAddresses.DAI,
      initialPrice: '1.00', // $1.00
      decimals: 8,
    },
    {
      name: 'Tether USD',
      symbol: 'USDT',
      address: deployedAddresses.USDT,
      initialPrice: '1.00', // $1.00
      decimals: 8,
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      address: deployedAddresses.USDC,
      initialPrice: '1.00', // $1.00
      decimals: 8,
    },
    {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      address: deployedAddresses.WETH,
      initialPrice: '2000.00', // $2000.00 (示例价格)
      decimals: 8,
    },
  ]

  // 打印配置
  console.log('📋 代币价格配置：')
  console.log('┌────────┬───────────┬─────────────────────────────────────────────┐')
  console.log('│ Token  │ Price USD │ Address                                     │')
  console.log('├────────┼───────────┼─────────────────────────────────────────────┤')
  tokenConfigs.forEach((config) => {
    const price = config.initialPrice.padStart(9, ' ')
    const addr = config.address.slice(0, 10) + '...' + config.address.slice(-8)
    console.log(`│ ${config.symbol.padEnd(6)} │ $${price} │ ${addr} │`)
  })
  console.log('└────────┴───────────┴─────────────────────────────────────────────┘\n')

  // ============================================
  // 4. 部署 PriceOracle 合约
  // ============================================
  
  console.log('📊 部署 PriceOracle 合约...')
  
  const PriceOracle = await ethers.getContractFactory('PriceOracle')
  const oracle = await PriceOracle.deploy(deployer.address)
  await oracle.waitForDeployment()
  
  const oracleAddress = await oracle.getAddress()
  console.log('✅ PriceOracle 部署成功:', oracleAddress)
  console.log('   - 所有者:', deployer.address)
  console.log('   - 严格模式:', await oracle.strictMode())
  console.log('   - 最大价格延迟:', (await oracle.maxPriceAge()).toString(), '秒\n')

  // ============================================
  // 5. 部署 Mock Aggregators
  // ============================================
  
  console.log('🔧 部署 Mock Chainlink Aggregators...\n')
  
  const MockAggregator = await ethers.getContractFactory(
    'MockChainlinkAggregator'
  )
  
  const aggregators: { [key: string]: string } = {}
  
  for (const config of tokenConfigs) {
    console.log(`   部署 ${config.symbol} Aggregator...`)
    
    // 将价格转换为 Chainlink 格式（8 位小数）
    const priceInChainlinkFormat = ethers.parseUnits(
      config.initialPrice,
      config.decimals
    )
    
    const aggregator = await MockAggregator.deploy(
      priceInChainlinkFormat,
      config.decimals
    )
    await aggregator.waitForDeployment()
    
    const aggregatorAddress = await aggregator.getAddress()
    aggregators[config.symbol] = aggregatorAddress
    
    console.log(`   ✅ ${config.symbol} Aggregator:`, aggregatorAddress)
    console.log(`      价格: $${config.initialPrice}`)
    console.log(`      小数位: ${config.decimals}`)
    
    // 验证价格
    const [, price] = await aggregator.latestRoundData()
    const formattedPrice = ethers.formatUnits(price, config.decimals)
    console.log(`      验证: $${formattedPrice}\n`)
  }

  // ============================================
  // 6. 配置 Price Feeds
  // ============================================
  
  console.log('⚙️  配置 Price Feeds...\n')
  
  for (const config of tokenConfigs) {
    console.log(`   配置 ${config.symbol}...`)
    
    const tx = await oracle.setPriceFeed(
      config.address,
      aggregators[config.symbol]
    )
    await tx.wait()
    
    console.log(`   ✅ ${config.symbol} Price Feed 已配置`)
  }
  
  console.log('')

  // ============================================
  // 7. 验证价格查询
  // ============================================
  
  console.log('🔍 验证价格查询...\n')
  
  console.log('┌────────┬───────────┬────────────┐')
  console.log('│ Token  │ Raw Price │ USD Price  │')
  console.log('├────────┼───────────┼────────────┤')
  
  for (const config of tokenConfigs) {
    try {
      const rawPrice = await oracle.getPrice(config.address)
      const usdPrice = ethers.formatUnits(rawPrice, 8) // Chainlink 使用 8 位小数
      
      console.log(
        `│ ${config.symbol.padEnd(6)} │ ${rawPrice.toString().padStart(9)} │ $${usdPrice.padEnd(9)} │`
      )
    } catch (error: any) {
      console.log(`│ ${config.symbol.padEnd(6)} │ ERROR     │ ERROR      │`)
      console.error(`   ❌ 查询失败:`, error.message)
    }
  }
  
  console.log('└────────┴───────────┴────────────┘\n')

  // ============================================
  // 8. 测试批量查询
  // ============================================
  
  console.log('🔍 测试批量查询...')
  
  const tokenAddresses = tokenConfigs.map((c) => c.address)
  const prices = await oracle.getPrices(tokenAddresses)
  
  console.log('✅ 批量查询成功，返回', prices.length, '个价格\n')

  // ============================================
  // 9. 保存部署地址
  // ============================================
  
  console.log('💾 保存合约地址...')
  
  // 更新现有的 deployed-addresses.json
  const updatedAddresses = {
    ...deployedAddresses,
    PriceOracle: oracleAddress,
    Aggregators: aggregators,
  }
  
  fs.writeFileSync(
    deployedAddressesPath,
    JSON.stringify(updatedAddresses, null, 2)
  )
  
  console.log('✅ 地址已保存到:', deployedAddressesPath)

  // 同时创建单独的 Oracle 地址文件（方便后端使用）
  const oracleAddressesPath = path.join(
    __dirname,
    '../deployed-oracle-addresses.json'
  )
  
  const oracleData = {
    network: 'hardhat',
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PriceOracle: {
        address: oracleAddress,
        owner: deployer.address,
        maxPriceAge: (await oracle.maxPriceAge()).toString(),
        strictMode: await oracle.strictMode(),
      },
      Aggregators: Object.entries(aggregators).map(([symbol, address]) => {
        const config = tokenConfigs.find((c) => c.symbol === symbol)!
        return {
          symbol,
          address,
          tokenAddress: config.address,
          initialPrice: config.initialPrice,
          decimals: config.decimals,
        }
      }),
    },
    priceFeeds: tokenConfigs.reduce((acc, config) => {
      acc[config.symbol] = {
        token: config.address,
        feed: aggregators[config.symbol],
        initialPrice: config.initialPrice,
      }
      return acc
    }, {} as any),
  }
  
  fs.writeFileSync(
    oracleAddressesPath,
    JSON.stringify(oracleData, null, 2)
  )
  
  console.log('✅ Oracle 详细信息已保存到:', oracleAddressesPath)
  console.log('')

  // ============================================
  // 10. 部署总结
  // ============================================
  
  console.log('='.repeat(60))
  console.log('🎉 价格预言机部署完成！')
  console.log('='.repeat(60))
  console.log('')
  console.log('📋 合约地址：')
  console.log('   PriceOracle:', oracleAddress)
  console.log('')
  console.log('📋 Mock Aggregators：')
  Object.entries(aggregators).forEach(([symbol, address]) => {
    console.log(`   ${symbol.padEnd(6)}: ${address}`)
  })
  console.log('')
  console.log('📝 下一步：')
  console.log('   1. 更新后端 .env 文件：')
  console.log(`      PRICE_ORACLE_ADDRESS=${oracleAddress}`)
  console.log('')
  console.log('   2. 更新前端 .env 文件：')
  console.log(`      VITE_PRICE_ORACLE_ADDRESS=${oracleAddress}`)
  console.log('')
  console.log('   3. 测试价格查询：')
  console.log('      pnpm hardhat run scripts/test-oracle.ts')
  console.log('')
  console.log('💡 提示：')
  console.log('   - 使用 MockChainlinkAggregator.setPrice() 可以更新价格（测试用）')
  console.log('   - 部署到主网时，需要替换为真实的 Chainlink Price Feeds')
  console.log('   - 真实 Feed 地址: https://docs.chain.link/data-feeds/price-feeds/addresses')
  console.log('')
  console.log('='.repeat(60))
}

/**
 * @notice 错误处理
 */
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 部署失败:\n')
    console.error(error)
    process.exit(1)
  })

