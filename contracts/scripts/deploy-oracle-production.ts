/**
 * @title 生产环境价格预言机部署脚本
 * @author DEX Team
 * @notice 使用真实的 Chainlink Price Feeds 部署到生产环境
 * 
 * 使用方法：
 * ```bash
 * # Ethereum Mainnet
 * pnpm hardhat run scripts/deploy-oracle-production.ts --network mainnet
 * 
 * # Polygon Mainnet
 * pnpm hardhat run scripts/deploy-oracle-production.ts --network polygon
 * 
 * # Arbitrum One
 * pnpm hardhat run scripts/deploy-oracle-production.ts --network arbitrum
 * ```
 */

import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 真实的 Chainlink Price Feed 地址
 * 来源: https://docs.chain.link/data-feeds/price-feeds/addresses
 */
const CHAINLINK_FEEDS = {
  // Ethereum Mainnet
  mainnet: {
    ETH_USD: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
    BTC_USD: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    USDT_USD: '0x3E7d1eAB13ad0104d2750B8863b489D65364e32D',
    USDC_USD: '0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6',
    DAI_USD: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9',
  },
  // Polygon Mainnet
  polygon: {
    MATIC_USD: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
    ETH_USD: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    USDT_USD: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
    USDC_USD: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
    DAI_USD: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
  },
  // Arbitrum One
  arbitrum: {
    ETH_USD: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    BTC_USD: '0x6ce185860a4963106506C203335A2910413708e9',
    USDT_USD: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7',
    USDC_USD: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    DAI_USD: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB',
  },
  // Sepolia Testnet (用于测试)
  sepolia: {
    ETH_USD: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    BTC_USD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    USDC_USD: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
  },
}

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || 'mainnet'
  
  console.log('\n' + '='.repeat(70))
  console.log(`🚀 生产环境部署 - ${networkName.toUpperCase()}`)
  console.log('='.repeat(70) + '\n')

  // 获取部署账户
  const [deployer] = await ethers.getSigners()
  console.log('👤 部署账户:', deployer.address)
  
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log('💰 账户余额:', ethers.formatEther(balance), 'ETH')
  
  if (balance < ethers.parseEther('0.1')) {
    console.warn('⚠️  警告: 账户余额较低，可能不足以完成部署')
  }
  console.log('')

  // 读取已部署的代币地址
  const deployedAddressesPath = path.join(__dirname, '../deployed-addresses.json')
  
  if (!fs.existsSync(deployedAddressesPath)) {
    throw new Error(
      '❌ 找不到 deployed-addresses.json\n' +
      '   请先部署核心合约（DEXFactory, Tokens 等）'
    )
  }
  
  const deployedAddresses = JSON.parse(
    fs.readFileSync(deployedAddressesPath, 'utf8')
  )

  // 获取对应网络的 Price Feeds
  const feeds = CHAINLINK_FEEDS[networkName as keyof typeof CHAINLINK_FEEDS]
  
  if (!feeds) {
    throw new Error(
      `❌ 不支持的网络: ${networkName}\n` +
      `   支持的网络: ${Object.keys(CHAINLINK_FEEDS).join(', ')}`
    )
  }

  console.log('📡 使用 Chainlink Price Feeds:')
  Object.entries(feeds).forEach(([pair, address]) => {
    console.log(`   ${pair}: ${address}`)
  })
  console.log('')

  // 部署 PriceOracle
  console.log('📊 部署 PriceOracle 合约...')
  
  const PriceOracle = await ethers.getContractFactory('PriceOracle')
  const oracle = await PriceOracle.deploy(deployer.address)
  await oracle.waitForDeployment()
  
  const oracleAddress = await oracle.getAddress()
  console.log('✅ PriceOracle 部署成功:', oracleAddress)
  console.log('   - 所有者:', deployer.address)
  console.log('')

  // 配置 Price Feeds
  console.log('⚙️  配置 Price Feeds...\n')

  const feedMappings: { [key: string]: string } = {}

  // WETH -> ETH/USD
  if (deployedAddresses.WETH && feeds.ETH_USD) {
    console.log('   配置 WETH -> ETH/USD...')
    const tx = await oracle.setPriceFeed(deployedAddresses.WETH, feeds.ETH_USD)
    await tx.wait()
    feedMappings['WETH'] = feeds.ETH_USD
    console.log('   ✅ WETH 已配置')
  }

  // USDT -> USDT/USD
  if (deployedAddresses.USDT && feeds.USDT_USD) {
    console.log('   配置 USDT -> USDT/USD...')
    const tx = await oracle.setPriceFeed(deployedAddresses.USDT, feeds.USDT_USD)
    await tx.wait()
    feedMappings['USDT'] = feeds.USDT_USD
    console.log('   ✅ USDT 已配置')
  }

  // USDC -> USDC/USD
  if (deployedAddresses.USDC && feeds.USDC_USD) {
    console.log('   配置 USDC -> USDC/USD...')
    const tx = await oracle.setPriceFeed(deployedAddresses.USDC, feeds.USDC_USD)
    await tx.wait()
    feedMappings['USDC'] = feeds.USDC_USD
    console.log('   ✅ USDC 已配置')
  }

  // DAI -> DAI/USD
  if (deployedAddresses.DAI && feeds.DAI_USD) {
    console.log('   配置 DAI -> DAI/USD...')
    const tx = await oracle.setPriceFeed(deployedAddresses.DAI, feeds.DAI_USD)
    await tx.wait()
    feedMappings['DAI'] = feeds.DAI_USD
    console.log('   ✅ DAI 已配置')
  }

  console.log('')

  // 验证价格读取
  console.log('🔍 验证价格读取...\n')

  if (deployedAddresses.WETH) {
    try {
      const price = await oracle.getPrice(deployedAddresses.WETH)
      const usdPrice = ethers.formatUnits(price, 8)
      console.log(`   WETH 当前价格: $${usdPrice}`)
    } catch (error: any) {
      console.error(`   ❌ WETH 价格读取失败:`, error.message)
    }
  }

  if (deployedAddresses.USDT) {
    try {
      const price = await oracle.getPrice(deployedAddresses.USDT)
      const usdPrice = ethers.formatUnits(price, 8)
      console.log(`   USDT 当前价格: $${usdPrice}`)
    } catch (error: any) {
      console.error(`   ❌ USDT 价格读取失败:`, error.message)
    }
  }

  console.log('')

  // 保存部署配置
  const config = {
    network: networkName,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    priceOracle: oracleAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    priceFeeds: feedMappings,
    chainlinkFeeds: feeds,
  }

  const configPath = path.join(
    __dirname,
    `../deployed-oracle-${networkName}.json`
  )
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

  // 更新 .env.deployed
  const envDeployedPath = path.join(__dirname, '../.env.deployed')
  let envContent = fs.existsSync(envDeployedPath)
    ? fs.readFileSync(envDeployedPath, 'utf8')
    : ''

  if (envContent.includes('PRICE_ORACLE_ADDRESS=')) {
    envContent = envContent.replace(
      /PRICE_ORACLE_ADDRESS=.*/g,
      `PRICE_ORACLE_ADDRESS=${oracleAddress}`
    )
  } else {
    envContent += `\n# Price Oracle (${networkName})\nPRICE_ORACLE_ADDRESS=${oracleAddress}\n`
  }

  fs.writeFileSync(envDeployedPath, envContent)

  // 打印部署总结
  console.log('='.repeat(70))
  console.log('🎉 部署完成！')
  console.log('='.repeat(70))
  console.log('')
  console.log('📋 部署信息：')
  console.log('   网络:', networkName)
  console.log('   PriceOracle:', oracleAddress)
  console.log('   配置文件:', configPath)
  console.log('')
  console.log('📝 下一步：')
  console.log('   1. 更新后端 .env:')
  console.log(`      PRICE_ORACLE_ADDRESS=${oracleAddress}`)
  console.log('')
  console.log('   2. 更新前端 .env:')
  console.log(`      VITE_PRICE_ORACLE_ADDRESS=${oracleAddress}`)
  console.log('')
  console.log('   3. 验证合约（可选）:')
  console.log(`      pnpm hardhat verify --network ${networkName} ${oracleAddress} ${deployer.address}`)
  console.log('')
  console.log('='.repeat(70))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 部署失败:\n')
    console.error(error)
    process.exit(1)
  })

