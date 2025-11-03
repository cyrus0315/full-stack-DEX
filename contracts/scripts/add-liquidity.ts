import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

/**
 * 添加初始流动性脚本
 * 为部署的交易对添加流动性，以便测试交易功能
 */
async function main() {
  // 加载部署的合约地址
  dotenv.config({ path: path.join(__dirname, "../.env.deployed") });

  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;
  const USDT_ADDRESS = process.env.USDT_ADDRESS;
  const DAI_ADDRESS = process.env.DAI_ADDRESS;
  const USDC_ADDRESS = process.env.USDC_ADDRESS;
  const WETH_ADDRESS = process.env.WETH_ADDRESS;

  if (!ROUTER_ADDRESS || !USDT_ADDRESS || !DAI_ADDRESS) {
    throw new Error("请先运行 deploy.ts 部署合约");
  }

  console.log("🚀 开始添加流动性...\n");

  const [signer] = await ethers.getSigners();
  console.log("操作账户:", signer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(signer.address)), "ETH\n");

  // 获取合约实例
  const router = await ethers.getContractAt("DEXRouter", ROUTER_ADDRESS);
  const usdt = await ethers.getContractAt("MockERC20", USDT_ADDRESS);
  const dai = await ethers.getContractAt("MockERC20", DAI_ADDRESS);
  const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
  const weth = await ethers.getContractAt("WETH9", WETH_ADDRESS);

  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

  // ==================== 1. USDT/DAI 流动性 ====================
  console.log("📝 添加 USDT/DAI 流动性...");

  const usdtAmount = ethers.parseUnits("10000", 6); // 10,000 USDT
  const daiAmount = ethers.parseUnits("10000", 18); // 10,000 DAI

  // 授权
  await (await usdt.approve(ROUTER_ADDRESS, usdtAmount)).wait();
  await (await dai.approve(ROUTER_ADDRESS, daiAmount)).wait();
  console.log("✅ 代币授权完成");

  // 添加流动性
  const tx1 = await router.addLiquidity(
    USDT_ADDRESS,
    DAI_ADDRESS,
    usdtAmount,
    daiAmount,
    0,
    0,
    signer.address,
    deadline
  );
  await tx1.wait();
  console.log("✅ USDT/DAI 流动性添加成功");
  console.log("   金额: 10,000 USDT + 10,000 DAI\n");

  // ==================== 2. USDT/USDC 流动性 ====================
  console.log("📝 添加 USDT/USDC 流动性...");

  const usdcAmount = ethers.parseUnits("5000", 6); // 5,000 USDC

  await (await usdt.approve(ROUTER_ADDRESS, usdtAmount)).wait();
  await (await usdc.approve(ROUTER_ADDRESS, usdcAmount)).wait();
  console.log("✅ 代币授权完成");

  const tx2 = await router.addLiquidity(
    USDT_ADDRESS,
    USDC_ADDRESS,
    ethers.parseUnits("5000", 6), // 5,000 USDT
    usdcAmount,
    0,
    0,
    signer.address,
    deadline
  );
  await tx2.wait();
  console.log("✅ USDT/USDC 流动性添加成功");
  console.log("   金额: 5,000 USDT + 5,000 USDC\n");

  // ==================== 3. DAI/USDC 流动性 ====================
  console.log("📝 添加 DAI/USDC 流动性...");

  const daiForUsdc = ethers.parseUnits("5000", 18); // 5,000 DAI
  const usdcForDai = ethers.parseUnits("5000", 6);  // 5,000 USDC

  await (await dai.approve(ROUTER_ADDRESS, daiForUsdc)).wait();
  await (await usdc.approve(ROUTER_ADDRESS, usdcForDai)).wait();
  console.log("✅ 代币授权完成");

  const tx3 = await router.addLiquidity(
    DAI_ADDRESS,
    USDC_ADDRESS,
    daiForUsdc,
    usdcForDai,
    0,
    0,
    signer.address,
    deadline
  );
  await tx3.wait();
  console.log("✅ DAI/USDC 流动性添加成功");
  console.log("   金额: 5,000 DAI + 5,000 USDC\n");

  // ==================== 4. WETH/DAI 流动性 ====================
  console.log("📝 添加 WETH/DAI 流动性...");

  const daiForWeth = ethers.parseUnits("30000", 18); // 30,000 DAI
  const ethAmount = ethers.parseEther("10"); // 10 ETH

  await (await dai.approve(ROUTER_ADDRESS, daiForWeth)).wait();
  console.log("✅ DAI 授权完成");

  const tx4 = await router.addLiquidityETH(
    DAI_ADDRESS,
    daiForWeth,
    0,
    0,
    signer.address,
    deadline,
    { value: ethAmount }
  );
  await tx4.wait();
  console.log("✅ WETH/DAI 流动性添加成功");
  console.log("   金额: 30,000 DAI + 10 ETH\n");

  // ==================== 5. WETH/USDT 流动性 ====================
  console.log("📝 添加 WETH/USDT 流动性...");

  const usdtForWeth = ethers.parseUnits("15000", 6); // 15,000 USDT
  const ethAmount2 = ethers.parseEther("5"); // 5 ETH

  await (await usdt.approve(ROUTER_ADDRESS, usdtForWeth)).wait();
  console.log("✅ USDT 授权完成");

  const tx5 = await router.addLiquidityETH(
    USDT_ADDRESS,
    usdtForWeth,
    0,
    0,
    signer.address,
    deadline,
    { value: ethAmount2 }
  );
  await tx5.wait();
  console.log("✅ WETH/USDT 流动性添加成功");
  console.log("   金额: 15,000 USDT + 5 ETH\n");

  // ==================== 6. WETH/USDC 流动性 ====================
  console.log("📝 添加 WETH/USDC 流动性...");

  const usdcForWeth = ethers.parseUnits("9000", 6); // 9,000 USDC
  const ethAmount3 = ethers.parseEther("3"); // 3 ETH

  await (await usdc.approve(ROUTER_ADDRESS, usdcForWeth)).wait();
  console.log("✅ USDC 授权完成");

  const tx6 = await router.addLiquidityETH(
    USDC_ADDRESS,
    usdcForWeth,
    0,
    0,
    signer.address,
    deadline,
    { value: ethAmount3 }
  );
  await tx6.wait();
  console.log("✅ WETH/USDC 流动性添加成功");
  console.log("   金额: 9,000 USDC + 3 ETH\n");

  // ==================== 输出流动性信息 ====================
  console.log("🎉 所有流动性添加完成！\n");
  console.log("==================== 流动性汇总 ====================");
  console.log("1️⃣  USDT/DAI:    10,000 USDT + 10,000 DAI");
  console.log("    价格: 1 USDT = 1 DAI");
  console.log("");
  console.log("2️⃣  USDT/USDC:   5,000 USDT + 5,000 USDC");
  console.log("    价格: 1 USDT = 1 USDC");
  console.log("");
  console.log("3️⃣  DAI/USDC:    5,000 DAI + 5,000 USDC");
  console.log("    价格: 1 DAI = 1 USDC");
  console.log("");
  console.log("4️⃣  WETH/DAI:    10 ETH + 30,000 DAI");
  console.log("    价格: 1 ETH = 3,000 DAI");
  console.log("");
  console.log("5️⃣  WETH/USDT:   5 ETH + 15,000 USDT");
  console.log("    价格: 1 ETH = 3,000 USDT");
  console.log("");
  console.log("6️⃣  WETH/USDC:   3 ETH + 9,000 USDC");
  console.log("    价格: 1 ETH = 3,000 USDC");
  console.log("====================================================\n");

  console.log("✅ 现在可以进行交易测试了！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

