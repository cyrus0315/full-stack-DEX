// 检查账户代币余额
const hre = require("hardhat");

async function main() {
  const DAI_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
  const USDT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
  const WALLET = process.argv[2] || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  console.log('\n💰 检查余额...');
  console.log('账户:', WALLET);
  console.log('');

  // 获取 ETH 余额
  const ethBalance = await hre.ethers.provider.getBalance(WALLET);
  console.log('ETH:', hre.ethers.formatEther(ethBalance));

  // 获取 DAI 余额
  const DAI = await hre.ethers.getContractAt('MockERC20', DAI_ADDRESS);
  const daiBalance = await DAI.balanceOf(WALLET);
  console.log('DAI:', hre.ethers.formatUnits(daiBalance, 18));

  // 获取 USDT 余额
  const USDT = await hre.ethers.getContractAt('MockERC20', USDT_ADDRESS);
  const usdtBalance = await USDT.balanceOf(WALLET);
  console.log('USDT:', hre.ethers.formatUnits(usdtBalance, 6));

  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

