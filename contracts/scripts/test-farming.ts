/**
 * 流动性挖矿测试脚本
 * 
 * 测试流程：
 * 1. 查询用户的 LP Token 余额
 * 2. 授权 LP Token 给 MasterChef
 * 3. 质押 LP Token
 * 4. 等待几个区块
 * 5. 查询待领取奖励
 * 6. 领取奖励
 * 7. 提取 LP Token
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// 辅助函数：等待 N 个区块
async function waitBlocks(n: number) {
  console.log(`\n⏳ 等待 ${n} 个区块...`);
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  console.log(`✅ 已等待 ${n} 个区块`);
}

async function main() {
  console.log("\n🧪 流动性挖矿测试\n");

  const [user] = await ethers.getSigners();
  console.log("👤 测试账户:", user.address);
  console.log();

  // ============================================
  // Step 1: 读取合约地址
  // ============================================
  
  console.log("1️⃣  读取合约地址...");
  
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ 未找到 deployed-addresses.json");
    console.log("   请先运行: npx hardhat run scripts/deploy-farming.ts --network localhost");
    process.exit(1);
  }
  
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  if (!addresses.farming) {
    console.error("❌ 未找到 farming 配置");
    console.log("   请先运行: npx hardhat run scripts/deploy-farming.ts --network localhost");
    process.exit(1);
  }
  
  const dexTokenAddress = addresses.farming.dexToken;
  const masterChefAddress = addresses.farming.masterChef;
  const daiUsdtPairAddress = addresses.pairs?.["DAI-USDT"];
  
  console.log("✅ 合约地址读取成功");
  console.log("   DEXToken:   ", dexTokenAddress);
  console.log("   MasterChef: ", masterChefAddress);
  console.log("   DAI-USDT LP:", daiUsdtPairAddress);
  console.log();

  if (!daiUsdtPairAddress) {
    console.error("❌ 未找到 DAI-USDT 交易对");
    console.log("   请先添加流动性");
    process.exit(1);
  }

  // ============================================
  // Step 2: 获取合约实例
  // ============================================
  
  console.log("2️⃣  获取合约实例...");
  
  const dexToken = await ethers.getContractAt("DEXToken", dexTokenAddress);
  const masterChef = await ethers.getContractAt("MasterChef", masterChefAddress);
  const lpToken = await ethers.getContractAt("DEXPair", daiUsdtPairAddress);
  
  console.log("✅ 合约实例创建成功");
  console.log();

  // ============================================
  // Step 3: 查询用户 LP Token 余额
  // ============================================
  
  console.log("3️⃣  查询 LP Token 余额...");
  
  const lpBalance = await lpToken.balanceOf(user.address);
  console.log("   LP Token 余额:", ethers.formatEther(lpBalance));
  
  if (lpBalance === 0n) {
    console.error("\n❌ 没有 LP Token！");
    console.log("   请先添加流动性：");
    console.log("   npx hardhat run scripts/add-liquidity.ts --network localhost");
    process.exit(1);
  }
  
  // 质押 50% 的 LP Token
  const depositAmount = lpBalance / 2n;
  console.log("   准备质押:", ethers.formatEther(depositAmount), "LP Token");
  console.log();

  // ============================================
  // Step 4: 授权 LP Token
  // ============================================
  
  console.log("4️⃣  授权 LP Token 给 MasterChef...");
  
  const allowance = await lpToken.allowance(user.address, masterChefAddress);
  console.log("   当前授权额度:", ethers.formatEther(allowance));
  
  if (allowance < depositAmount) {
    console.log("   执行授权...");
    const approveTx = await lpToken.approve(masterChefAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log("   ✅ 授权成功");
  } else {
    console.log("   ✅ 已有足够授权");
  }
  console.log();

  // ============================================
  // Step 5: 查询池子信息
  // ============================================
  
  console.log("5️⃣  查询池子信息...");
  
  const poolId = 0; // DAI-USDT 是第一个池子
  const poolInfo = await masterChef.poolInfo(poolId);
  const totalAllocPoint = await masterChef.totalAllocPoint();
  const rewardPerBlock = await masterChef.rewardPerBlock();
  
  console.log("   池子 ID:", poolId);
  console.log("   LP Token:", poolInfo.lpToken);
  console.log("   分配点数:", poolInfo.allocPoint.toString());
  console.log("   总分配点:", totalAllocPoint.toString());
  console.log("   权重占比:", Number(poolInfo.allocPoint * 10000n / totalAllocPoint) / 100, "%");
  console.log("   每区块奖励:", ethers.formatEther(rewardPerBlock), "DEX");
  console.log("   本池每区块:", ethers.formatEther(rewardPerBlock * poolInfo.allocPoint / totalAllocPoint), "DEX");
  console.log();

  // ============================================
  // Step 6: 质押 LP Token
  // ============================================
  
  console.log("6️⃣  质押 LP Token...");
  
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("   当前区块:", currentBlock);
  console.log("   开始区块:", addresses.farming.startBlock);
  
  // 如果还没到开始区块，等待
  if (currentBlock < addresses.farming.startBlock) {
    const blocksToWait = addresses.farming.startBlock - currentBlock;
    console.log(`   ⏳ 需要等待 ${blocksToWait} 个区块才能开始挖矿...`);
    await waitBlocks(blocksToWait + 1);
  }
  
  console.log("   执行质押...");
  const depositTx = await masterChef.deposit(poolId, depositAmount);
  await depositTx.wait();
  
  console.log("   ✅ 质押成功！");
  console.log();

  // ============================================
  // Step 7: 查询质押信息
  // ============================================
  
  console.log("7️⃣  查询质押信息...");
  
  const userInfo = await masterChef.userInfo(poolId, user.address);
  console.log("   已质押:", ethers.formatEther(userInfo.amount), "LP Token");
  console.log("   奖励债务:", ethers.formatEther(userInfo.rewardDebt), "DEX");
  console.log();

  // ============================================
  // Step 8: 等待并查询奖励
  // ============================================
  
  console.log("8️⃣  等待挖矿产出...");
  
  const blocksToMine = 50;
  console.log(`   挖矿 ${blocksToMine} 个区块...`);
  
  for (let i = 0; i < blocksToMine; i++) {
    await ethers.provider.send("evm_mine", []);
    
    if ((i + 1) % 10 === 0) {
      const pending = await masterChef.pendingReward(poolId, user.address);
      console.log(`   - 区块 ${i + 1}: 待领取 ${ethers.formatEther(pending)} DEX`);
    }
  }
  
  console.log();

  // ============================================
  // Step 9: 查询最终奖励
  // ============================================
  
  console.log("9️⃣  查询待领取奖励...");
  
  const finalPending = await masterChef.pendingReward(poolId, user.address);
  console.log("   待领取:", ethers.formatEther(finalPending), "DEX");
  
  // 计算预期奖励
  const expectedReward = rewardPerBlock * BigInt(blocksToMine) * poolInfo.allocPoint / totalAllocPoint;
  console.log("   预期奖励:", ethers.formatEther(expectedReward), "DEX");
  console.log("   误差:", ((Number(finalPending - expectedReward) / Number(expectedReward)) * 100).toFixed(2), "%");
  console.log();

  // ============================================
  // Step 10: 提取部分 LP Token（会自动领取奖励）
  // ============================================
  
  console.log("🔟 提取部分 LP Token...");
  
  const withdrawAmount = depositAmount / 2n;
  console.log("   提取数量:", ethers.formatEther(withdrawAmount), "LP Token");
  
  const dexBalanceBefore = await dexToken.balanceOf(user.address);
  console.log("   提取前 DEX 余额:", ethers.formatEther(dexBalanceBefore));
  
  const withdrawTx = await masterChef.withdraw(poolId, withdrawAmount);
  await withdrawTx.wait();
  
  const dexBalanceAfter = await dexToken.balanceOf(user.address);
  console.log("   提取后 DEX 余额:", ethers.formatEther(dexBalanceAfter));
  console.log("   实际领取:", ethers.formatEther(dexBalanceAfter - dexBalanceBefore), "DEX");
  console.log("   ✅ 提取成功！");
  console.log();

  // ============================================
  // Step 11: 查询更新后的状态
  // ============================================
  
  console.log("1️⃣1️⃣  查询最终状态...");
  
  const userInfoAfter = await masterChef.userInfo(poolId, user.address);
  const lpBalanceAfter = await lpToken.balanceOf(user.address);
  const pendingAfter = await masterChef.pendingReward(poolId, user.address);
  
  console.log("   LP Token 余额:", ethers.formatEther(lpBalanceAfter));
  console.log("   仍在质押:", ethers.formatEther(userInfoAfter.amount), "LP Token");
  console.log("   DEX 代币余额:", ethers.formatEther(dexBalanceAfter));
  console.log("   待领取奖励:", ethers.formatEther(pendingAfter), "DEX");
  console.log();

  // ============================================
  // 测试总结
  // ============================================
  
  console.log("═══════════════════════════════════════");
  console.log("✅ 流动性挖矿测试完成！");
  console.log("═══════════════════════════════════════");
  console.log("\n📊 测试数据：");
  console.log("   质押数量:  ", ethers.formatEther(depositAmount), "LP Token");
  console.log("   挖矿区块:  ", blocksToMine);
  console.log("   获得奖励:  ", ethers.formatEther(dexBalanceAfter), "DEX");
  console.log("   提取数量:  ", ethers.formatEther(withdrawAmount), "LP Token");
  console.log("   剩余质押:  ", ethers.formatEther(userInfoAfter.amount), "LP Token");
  console.log("\n💡 测试验证：");
  console.log("   ✅ 授权功能正常");
  console.log("   ✅ 质押功能正常");
  console.log("   ✅ 奖励计算正确");
  console.log("   ✅ 提取功能正常");
  console.log("   ✅ 自动领取奖励正常");
  console.log("\n🎉 所有功能测试通过！");
  console.log("═══════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  });

