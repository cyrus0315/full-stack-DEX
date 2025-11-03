import { ethers } from 'hardhat';

/**
 * 部署测试代币脚本
 * 用于在本地 Hardhat 网络部署多个测试代币，方便测试 Token Module
 */
async function main() {
  console.log('开始部署测试代币...\n');

  const [deployer] = await ethers.getSigners();
  console.log('部署账户:', deployer.address);
  console.log('账户余额:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // 部署 MockERC20 工厂
  const MockERC20 = await ethers.getContractFactory('MockERC20');

  // 部署多个测试代币
  const tokens = [
    {
      name: 'Test USDT',
      symbol: 'TUSDT',
      decimals: 6,
      initialSupply: ethers.parseUnits('1000000', 6), // 1,000,000 TUSDT
    },
    {
      name: 'Test USDC',
      symbol: 'TUSDC',
      decimals: 6,
      initialSupply: ethers.parseUnits('1000000', 6), // 1,000,000 TUSDC
    },
    {
      name: 'Test DAI',
      symbol: 'TDAI',
      decimals: 18,
      initialSupply: ethers.parseUnits('1000000', 18), // 1,000,000 TDAI
    },
    {
      name: 'Test WBTC',
      symbol: 'TWBTC',
      decimals: 8,
      initialSupply: ethers.parseUnits('1000', 8), // 1,000 TWBTC
    },
    {
      name: 'Test LINK',
      symbol: 'TLINK',
      decimals: 18,
      initialSupply: ethers.parseUnits('1000000', 18), // 1,000,000 TLINK
    },
  ];

  const deployedTokens = [];

  for (const tokenConfig of tokens) {
    console.log(`部署 ${tokenConfig.name} (${tokenConfig.symbol})...`);

    const token = await MockERC20.deploy(
      tokenConfig.name,
      tokenConfig.symbol,
      tokenConfig.decimals,
    );

    await token.waitForDeployment();
    const address = await token.getAddress();

    // Mint 初始供应量给部署者
    await token.mint(deployer.address, tokenConfig.initialSupply);

    console.log(`✅ ${tokenConfig.symbol} 部署成功`);
    console.log(`   地址: ${address}`);
    console.log(`   精度: ${tokenConfig.decimals}`);
    console.log(`   初始供应量: ${ethers.formatUnits(tokenConfig.initialSupply, tokenConfig.decimals)}\n`);

    deployedTokens.push({
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      address,
      decimals: tokenConfig.decimals,
    });
  }

  // 部署 WETH9
  console.log('部署 WETH9...');
  const WETH9 = await ethers.getContractFactory('WETH9');
  const weth = await WETH9.deploy();
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();

  console.log('✅ WETH9 部署成功');
  console.log(`   地址: ${wethAddress}\n`);

  deployedTokens.push({
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: wethAddress,
    decimals: 18,
  });

  // 输出部署摘要
  console.log('========================================');
  console.log('部署完成！测试代币列表：');
  console.log('========================================\n');

  deployedTokens.forEach((token) => {
    console.log(`${token.symbol.padEnd(8)} | ${token.address}`);
  });

  console.log('\n========================================');
  console.log('测试命令：');
  console.log('========================================\n');

  // 输出测试 Token API 的 curl 命令
  console.log('# 查询单个代币信息');
  console.log(`curl http://localhost:3001/api/v1/token/${deployedTokens[0].address}\n`);

  console.log('# 批量查询代币信息');
  const addresses = deployedTokens.slice(0, 3).map((t) => `"${t.address}"`).join(',');
  console.log(`curl -X POST http://localhost:3001/api/v1/token/batch \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"addresses": [${addresses}]}'`);
  console.log();

  // 保存部署信息到文件
  const fs = require('fs');
  const deploymentInfo = {
    network: 'localhost',
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    tokens: deployedTokens,
  };

  fs.writeFileSync(
    './deployments/localhost-tokens.json',
    JSON.stringify(deploymentInfo, null, 2),
  );

  console.log('✅ 部署信息已保存到: ./deployments/localhost-tokens.json\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

