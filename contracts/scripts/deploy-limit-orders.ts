import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env.deployed') });

async function main() {
  console.log('\n🚀 开始部署限价单合约...\n');

  const [deployer] = await ethers.getSigners();
  console.log('📍 部署地址:', deployer.address);
  console.log('💰 账户余额:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH\n');

  // 读取已部署的合约地址
  const routerAddress = process.env.ROUTER_ADDRESS;
  
  if (!routerAddress) {
    throw new Error('❌ Router 地址未找到，请先部署核心合约');
  }

  console.log('📋 使用的合约地址:');
  console.log('  - Router:', routerAddress);
  console.log('');

  // 部署 LimitOrderBook
  console.log('📝 部署 LimitOrderBook...');
  const LimitOrderBook = await ethers.getContractFactory('LimitOrderBook');
  const limitOrderBook = await LimitOrderBook.deploy(routerAddress);
  await limitOrderBook.waitForDeployment();
  const limitOrderBookAddress = await limitOrderBook.getAddress();
  console.log('✅ LimitOrderBook 部署成功:', limitOrderBookAddress);

  // 设置默认 Keeper（部署者地址）
  console.log('\n⚙️  配置 Keeper...');
  const tx = await limitOrderBook.setKeeper(deployer.address, true);
  await tx.wait();
  console.log('✅ Keeper 设置成功:', deployer.address);

  // 保存部署地址
  const deployedAddresses = {
    limitOrderBook: limitOrderBookAddress,
    router: routerAddress,
    keeper: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, '../deployed-limit-orders-addresses.json');
  fs.writeFileSync(outputPath, JSON.stringify(deployedAddresses, null, 2));
  console.log('\n💾 部署地址已保存:', outputPath);

  // 更新 .env.deployed
  const envPath = path.join(__dirname, '../.env.deployed');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  // 添加或更新 LIMIT_ORDER_BOOK_ADDRESS
  if (envContent.includes('LIMIT_ORDER_BOOK_ADDRESS=')) {
    envContent = envContent.replace(
      /LIMIT_ORDER_BOOK_ADDRESS=.*/,
      `LIMIT_ORDER_BOOK_ADDRESS=${limitOrderBookAddress}`
    );
  } else {
    envContent += `\n# Limit Order Book\nLIMIT_ORDER_BOOK_ADDRESS=${limitOrderBookAddress}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.deployed 已更新');

  // 更新前端环境变量
  const frontendEnvPath = path.join(__dirname, '../../frontend/web-app/.env');
  if (fs.existsSync(frontendEnvPath)) {
    let frontendEnvContent = fs.readFileSync(frontendEnvPath, 'utf-8');
    
    if (frontendEnvContent.includes('VITE_LIMIT_ORDER_BOOK_ADDRESS=')) {
      frontendEnvContent = frontendEnvContent.replace(
        /VITE_LIMIT_ORDER_BOOK_ADDRESS=.*/,
        `VITE_LIMIT_ORDER_BOOK_ADDRESS=${limitOrderBookAddress}`
      );
    } else {
      frontendEnvContent += `\n# Limit Order Book\nVITE_LIMIT_ORDER_BOOK_ADDRESS=${limitOrderBookAddress}\n`;
    }
    
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);
    console.log('✅ 前端 .env 已更新');
  }

  // 更新后端环境变量
  const backendEnvPath = path.join(__dirname, '../../backend/services/analytics-service/.env');
  if (fs.existsSync(backendEnvPath)) {
    let backendEnvContent = fs.readFileSync(backendEnvPath, 'utf-8');
    
    if (backendEnvContent.includes('LIMIT_ORDER_BOOK_ADDRESS=')) {
      backendEnvContent = backendEnvContent.replace(
        /LIMIT_ORDER_BOOK_ADDRESS=.*/,
        `LIMIT_ORDER_BOOK_ADDRESS=${limitOrderBookAddress}`
      );
    } else {
      backendEnvContent += `\n# Limit Order Book\nLIMIT_ORDER_BOOK_ADDRESS=${limitOrderBookAddress}\n`;
    }
    
    fs.writeFileSync(backendEnvPath, backendEnvContent);
    console.log('✅ 后端 .env 已更新');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 限价单合约部署完成！');
  console.log('='.repeat(60));
  console.log('\n📋 部署摘要:');
  console.log('  - LimitOrderBook:', limitOrderBookAddress);
  console.log('  - Keeper:', deployer.address);
  console.log('  - Execution Fee: 0.001 ETH');
  console.log('\n⚠️  下一步:');
  console.log('  1. 后端实现 Keeper 服务（监控和执行订单）');
  console.log('  2. 前端添加限价单 UI');
  console.log('  3. 测试限价单功能');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

