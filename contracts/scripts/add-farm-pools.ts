import { ethers } from 'hardhat'

async function main() {
  console.log('📊 开始添加挖矿池...\n')

  const masterChefAddress = '0xc5a5C42992dECbae36851359345FE25997F5C42d'
  
  // 从 .env.deployed 读取的交易对地址
  const pairs = [
    { name: 'DAI-USDT', address: '0x496af2015cBd7D3Dc2F09Ae2c0a87cE5d0d9F1FB', allocPoint: 100 },
    { name: 'DAI-USDC', address: '0xA11466cb54a75FCc68B457270c09A1BD863F510b', allocPoint: 80 },
    { name: 'DAI-WETH', address: '0xC4Eb6287C2f0115C333E1C8C38fFcb55961bAf59', allocPoint: 120 },
  ]

  const masterChef = await ethers.getContractAt('MasterChef', masterChefAddress)

  for (const pair of pairs) {
    try {
      console.log(`➕ 添加池子: ${pair.name}`)
      console.log(`   地址: ${pair.address}`)
      console.log(`   权重: ${pair.allocPoint}`)
      
      const tx = await masterChef.add(pair.allocPoint, pair.address, true)
      await tx.wait()
      
      console.log(`✅ ${pair.name} 池子添加成功\n`)
    } catch (error: any) {
      console.log(`⚠️  ${pair.name} 添加失败: ${error.message}\n`)
    }
  }

  // 查询池子总数
  const poolLength = await masterChef.poolLength()
  console.log(`\n📊 当前挖矿池总数: ${poolLength}`)

  // 查询总权重
  const totalAllocPoint = await masterChef.totalAllocPoint()
  console.log(`⚖️  总权重: ${totalAllocPoint}`)

  // 查询每区块奖励
  const rewardPerBlock = await masterChef.rewardPerBlock()
  console.log(`💰 每区块奖励: ${ethers.formatEther(rewardPerBlock)} DEX\n`)

  console.log('✨ 挖矿池添加完成！')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

