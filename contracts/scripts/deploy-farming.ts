/**
 * 流动性挖矿合约部署脚本
 * 
 * 部署顺序：
 * 1. 部署 DEXToken（治理代币）
 * 2. 部署 MasterChef（挖矿主合约）
 * 3. 将 MasterChef 设置为 DEXToken 的 owner（授权铸币权）
 * 4. 添加初始挖矿池
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n🌾 开始部署流动性挖矿合约...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 部署账户:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "ETH\n");

  // ============================================
  // Step 1: 部署 DEXToken
  // ============================================
  
  console.log("1️⃣  部署 DEX Token (治理代币)...");
  
  // 初始供应量：0（全部通过挖矿产出）
  // 如果想预挖一部分给团队，可以设置 initialSupply > 0
  const initialSupply = ethers.parseEther("0"); // 0 个初始供应
  
  const DEXToken = await ethers.getContractFactory("DEXToken");
  const dexToken = await DEXToken.deploy(initialSupply);
  await dexToken.waitForDeployment();
  
  const dexTokenAddress = await dexToken.getAddress();
  console.log("✅ DEXToken 部署成功:", dexTokenAddress);
  console.log("   - 名称: DEX Token");
  console.log("   - 符号: DEX");
  console.log("   - 初始供应:", ethers.formatEther(initialSupply));
  console.log("   - 最大供应:", ethers.formatEther(await dexToken.MAX_SUPPLY()));
  console.log();

  // ============================================
  // Step 2: 部署 MasterChef
  // ============================================
  
  console.log("2️⃣  部署 MasterChef (挖矿主合约)...");
  
  // 配置参数
  const rewardPerBlock = ethers.parseEther("10"); // 每区块奖励 10 个 DEX
  const startBlock = await ethers.provider.getBlockNumber() + 10; // 10 个区块后开始
  
  const MasterChef = await ethers.getContractFactory("MasterChef");
  const masterChef = await MasterChef.deploy(
    dexTokenAddress,
    rewardPerBlock,
    startBlock
  );
  await masterChef.waitForDeployment();
  
  const masterChefAddress = await masterChef.getAddress();
  console.log("✅ MasterChef 部署成功:", masterChefAddress);
  console.log("   - 每区块奖励:", ethers.formatEther(rewardPerBlock), "DEX");
  console.log("   - 开始区块:", startBlock);
  console.log("   - 当前区块:", await ethers.provider.getBlockNumber());
  console.log();

  // ============================================
  // Step 3: 转移 DEXToken 所有权给 MasterChef
  // ============================================
  
  console.log("3️⃣  转移 DEXToken 铸币权给 MasterChef...");
  
  const transferTx = await dexToken.transferOwnership(masterChefAddress);
  await transferTx.wait();
  
  console.log("✅ 铸币权转移成功");
  console.log("   - MasterChef 现在可以铸造 DEX 代币作为奖励");
  console.log();

  // ============================================
  // Step 4: 读取已部署的 DEX 合约地址
  // ============================================
  
  console.log("4️⃣  读取已部署的交易对地址...");
  
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  let addresses: any = {};
  
  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    console.log("✅ 成功读取已部署的合约地址");
  } else {
    console.log("⚠️  未找到 deployed-addresses.json");
    console.log("   提示：请先运行 deploy.ts 部署 DEX 核心合约");
  }
  console.log();

  // ============================================
  // Step 5: 添加初始挖矿池
  // ============================================
  
  console.log("5️⃣  添加初始挖矿池...");
  
  const pools = [
    {
      name: "DAI-USDT",
      pairAddress: addresses.pairs?.["DAI-USDT"],
      allocPoint: 100, // 权重 100
    },
    {
      name: "DAI-USDC",
      pairAddress: addresses.pairs?.["DAI-USDC"],
      allocPoint: 80, // 权重 80
    },
    {
      name: "USDT-USDC",
      pairAddress: addresses.pairs?.["USDT-USDC"],
      allocPoint: 80, // 权重 80
    },
  ];

  let addedPools = 0;
  
  for (const pool of pools) {
    if (pool.pairAddress && pool.pairAddress !== ethers.ZeroAddress) {
      console.log(`\n   添加池子: ${pool.name}`);
      console.log(`   - LP Token: ${pool.pairAddress}`);
      console.log(`   - 权重: ${pool.allocPoint}`);
      
      try {
        const addTx = await masterChef.add(
          pool.allocPoint,
          pool.pairAddress,
          false // withUpdate = false（首次添加不需要更新）
        );
        await addTx.wait();
        console.log(`   ✅ ${pool.name} 池子添加成功`);
        addedPools++;
      } catch (error: any) {
        console.log(`   ⚠️  ${pool.name} 添加失败:`, error.message);
      }
    } else {
      console.log(`\n   ⏭️  跳过 ${pool.name}（未找到交易对地址）`);
    }
  }
  
  console.log(`\n✅ 成功添加 ${addedPools} 个挖矿池`);
  console.log();

  // ============================================
  // Step 6: 保存部署地址
  // ============================================
  
  console.log("6️⃣  保存部署地址...");
  
  addresses.farming = {
    dexToken: dexTokenAddress,
    masterChef: masterChefAddress,
    rewardPerBlock: rewardPerBlock.toString(),
    startBlock: startBlock,
    deployedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("✅ 地址已保存到:", addressesPath);
  console.log();

  // ============================================
  // 部署总结
  // ============================================
  
  console.log("═══════════════════════════════════════");
  console.log("🎉 流动性挖矿部署完成！");
  console.log("═══════════════════════════════════════");
  console.log("\n📋 部署信息：");
  console.log("   DEXToken:   ", dexTokenAddress);
  console.log("   MasterChef: ", masterChefAddress);
  console.log("\n⚙️  配置信息：");
  console.log("   每区块奖励:", ethers.formatEther(rewardPerBlock), "DEX");
  console.log("   开始区块:  ", startBlock);
  console.log("   挖矿池数量:", addedPools);
  console.log("\n📊 APR 估算（简化计算）：");
  console.log("   假设条件：");
  console.log("   - 每区块 10 DEX");
  console.log("   - 每 15 秒一个区块");
  console.log("   - 1 年 ≈ 2,102,400 区块");
  console.log("   年产出 ≈ 21,024,000 DEX");
  console.log("\n💡 后续步骤：");
  console.log("   1. 用户需要先在 DEX 中添加流动性获得 LP Token");
  console.log("   2. 用户授权 LP Token 给 MasterChef");
  console.log("   3. 用户在 MasterChef 中质押 LP Token");
  console.log("   4. 用户每个区块获得 DEX 代币奖励");
  console.log("   5. 用户可随时提取 LP Token 和领取奖励");
  console.log("\n🔧 合约管理：");
  console.log("   - 添加新池子: masterChef.add(allocPoint, lpToken, true)");
  console.log("   - 调整权重:   masterChef.set(pid, newAllocPoint, true)");
  console.log("   - 调整产出:   masterChef.updateRewardPerBlock(newReward)");
  console.log("\n✨ 挖矿将在区块", startBlock, "开始！");
  console.log("═══════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失败:", error);
    process.exit(1);
  });

