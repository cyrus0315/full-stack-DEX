// 检查交易对是否存在
const hre = require("hardhat");

async function main() {
  const FACTORY_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
  const DAI_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
  const USDT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

  console.log('\n🔍 检查 DAI/USDT 交易对...\n');

  const Factory = await hre.ethers.getContractAt('DEXFactory', FACTORY_ADDRESS);
  
  const pairAddress = await Factory.getPair(DAI_ADDRESS, USDT_ADDRESS);
  
  console.log('DAI:', DAI_ADDRESS);
  console.log('USDT:', USDT_ADDRESS);
  console.log('');
  console.log('交易对地址:', pairAddress);
  
  if (pairAddress === '0x0000000000000000000000000000000000000000') {
    console.log('❌ 交易对不存在！');
    console.log('');
    console.log('需要先创建流动性池！');
  } else {
    console.log('✅ 交易对存在！');
    console.log('');
    
    // 检查储备量
    const Pair = await hre.ethers.getContractAt('DEXPair', pairAddress);
    const reserves = await Pair.getReserves();
    const token0 = await Pair.token0();
    const token1 = await Pair.token1();
    
    console.log('Token0:', token0);
    console.log('Token1:', token1);
    console.log('');
    
    if (token0.toLowerCase() === DAI_ADDRESS.toLowerCase()) {
      console.log('Reserve DAI:', hre.ethers.formatUnits(reserves[0], 18));
      console.log('Reserve USDT:', hre.ethers.formatUnits(reserves[1], 6));
    } else {
      console.log('Reserve USDT:', hre.ethers.formatUnits(reserves[0], 6));
      console.log('Reserve DAI:', hre.ethers.formatUnits(reserves[1], 18));
    }
  }
  
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

