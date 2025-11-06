/**
 * 显示 Hardhat 账户列表和私钥
 * 用于导入到 MetaMask
 */
import { ethers } from 'hardhat'

async function main() {
  console.log('\n' + '='.repeat(80))
  console.log('📋 Hardhat 本地账户列表')
  console.log('='.repeat(80) + '\n')

  const accounts = await ethers.getSigners()

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]
    const balance = await ethers.provider.getBalance(account.address)
    
    console.log(`Account #${i}:`)
    console.log(`  地址:   ${account.address}`)
    console.log(`  余额:   ${ethers.formatEther(balance)} ETH`)
    
    // 注意：在真实环境中，永远不要打印私钥！
    // 这里只是因为是本地开发环境的测试账户
    if (process.env.SHOW_PRIVATE_KEY === 'true') {
      // Hardhat 默认账户的私钥是固定的
      const privateKeys = [
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
        '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
        '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
        '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
        '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
        '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
        '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
        '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
      ]
      
      if (i < privateKeys.length) {
        console.log(`  私钥:   ${privateKeys[i]}`)
      }
    }
    console.log('')
  }

  console.log('='.repeat(80))
  console.log('💡 提示：')
  console.log('   1. 复制私钥导入到 MetaMask')
  console.log('   2. 在 MetaMask 中添加 Hardhat 网络：')
  console.log('      - 网络名称: Hardhat Local')
  console.log('      - RPC URL: http://127.0.0.1:8545')
  console.log('      - Chain ID: 31337')
  console.log('      - 货币符号: ETH')
  console.log('   3. 使用 mint-tokens.ts 给账户 mint 代币')
  console.log('='.repeat(80) + '\n')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

