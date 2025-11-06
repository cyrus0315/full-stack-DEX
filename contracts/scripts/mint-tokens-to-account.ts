/**
 * 给指定账户 Mint 代币
 * 用于测试
 */
import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('🪙 给账户 Mint 代币')
  console.log('='.repeat(80) + '\n')

  // 获取参数
  const targetAccount = process.env.TARGET_ACCOUNT || process.argv[2]
  const accountIndex = process.env.ACCOUNT_INDEX || process.argv[3]

  let recipientAddress: string

  if (accountIndex) {
    // 使用账户索引
    const accounts = await ethers.getSigners()
    const index = parseInt(accountIndex)
    if (index >= accounts.length) {
      throw new Error(`账户索引 ${index} 超出范围（最大 ${accounts.length - 1}）`)
    }
    recipientAddress = accounts[index].address
    console.log(`📍 使用 Account #${index}: ${recipientAddress}`)
  } else if (targetAccount) {
    // 使用指定地址
    recipientAddress = targetAccount
    console.log(`📍 使用指定地址: ${recipientAddress}`)
  } else {
    // 默认使用 Account #1
    const accounts = await ethers.getSigners()
    recipientAddress = accounts[1].address
    console.log(`📍 使用 Account #1: ${recipientAddress}`)
  }

  console.log('')

  // 读取已部署的代币地址
  const envPath = path.join(__dirname, '../.env.deployed')
  if (!fs.existsSync(envPath)) {
    throw new Error('❌ 找不到 .env.deployed 文件，请先运行 deploy.ts')
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  const addresses: any = {}
  envContent.split('\n').forEach((line: string) => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, value] = line.split('=')
      addresses[key.trim()] = value.trim()
    }
  })

  const [deployer] = await ethers.getSigners()

  // Mint 各种代币
  const tokens = [
    { name: 'DAI', address: addresses.DAI_ADDRESS, amount: '10000', decimals: 18 },
    { name: 'USDT', address: addresses.USDT_ADDRESS, amount: '10000', decimals: 6 },
    { name: 'USDC', address: addresses.USDC_ADDRESS, amount: '10000', decimals: 6 },
  ]

  console.log('🪙 开始 Mint 代币...\n')

  for (const token of tokens) {
    try {
      const tokenContract = await ethers.getContractAt('MockERC20', token.address)
      const amount = ethers.parseUnits(token.amount, token.decimals)

      console.log(`   ${token.name}:`)
      console.log(`   - 数量: ${token.amount} ${token.name}`)
      
      const tx = await tokenContract.connect(deployer).mint(recipientAddress, amount)
      await tx.wait()
      
      const balance = await tokenContract.balanceOf(recipientAddress)
      const formattedBalance = ethers.formatUnits(balance, token.decimals)
      
      console.log(`   - ✅ Mint 成功`)
      console.log(`   - 当前余额: ${formattedBalance} ${token.name}`)
      console.log('')
    } catch (error: any) {
      console.log(`   - ❌ Mint 失败: ${error.message}`)
      console.log('')
    }
  }

  // 检查 ETH 余额
  const ethBalance = await ethers.provider.getBalance(recipientAddress)
  console.log('💰 ETH 余额:', ethers.formatEther(ethBalance), 'ETH')

  console.log('\n' + '='.repeat(80))
  console.log('✅ Mint 完成！')
  console.log('='.repeat(80))
  console.log('\n💡 现在可以在 MetaMask 中使用这个账户进行交易了！')
  console.log('   - 地址:', recipientAddress)
  console.log('\n📝 添加代币到 MetaMask：')
  console.log('   1. 打开 MetaMask')
  console.log('   2. 点击 "Import tokens"')
  console.log('   3. 输入代币地址：')
  for (const token of tokens) {
    console.log(`      ${token.name}: ${token.address}`)
  }
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ 执行失败:\n')
    console.error(error)
    process.exit(1)
  })

