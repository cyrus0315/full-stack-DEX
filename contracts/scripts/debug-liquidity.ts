import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

/**
 * 调试添加流动性问题
 */
async function main() {
  // 加载部署的合约地址
  dotenv.config({ path: path.join(__dirname, "../.env.deployed") });

  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;
  const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
  const USDT_ADDRESS = process.env.USDT_ADDRESS;
  const DAI_ADDRESS = process.env.DAI_ADDRESS;

  console.log("🔍 开始调试...\n");
  console.log("合约地址：");
  console.log("  Factory:", FACTORY_ADDRESS);
  console.log("  Router:", ROUTER_ADDRESS);
  console.log("  USDT:", USDT_ADDRESS);
  console.log("  DAI:", DAI_ADDRESS);
  console.log("");

  const [signer] = await ethers.getSigners();
  console.log("操作账户:", signer.address);
  console.log("");

  // 获取合约实例
  const factory = await ethers.getContractAt("DEXFactory", FACTORY_ADDRESS!);
  const router = await ethers.getContractAt("DEXRouter", ROUTER_ADDRESS!);
  const usdt = await ethers.getContractAt("MockERC20", USDT_ADDRESS!);
  const dai = await ethers.getContractAt("MockERC20", DAI_ADDRESS!);

  // ===== 步骤 1: 检查交易对 =====
  console.log("1️⃣ 检查交易对是否存在...");
  const pairAddress = await factory.getPair(USDT_ADDRESS, DAI_ADDRESS);
  console.log("   交易对地址:", pairAddress);
  
  if (pairAddress === ethers.ZeroAddress) {
    console.log("   ❌ 交易对不存在！");
    return;
  }
  console.log("   ✅ 交易对存在\n");

  // ===== 步骤 2: 检查代币余额 =====
  console.log("2️⃣ 检查代币余额...");
  const usdtBalance = await usdt.balanceOf(signer.address);
  const daiBalance = await dai.balanceOf(signer.address);
  console.log("   USDT 余额:", ethers.formatUnits(usdtBalance, 6));
  console.log("   DAI 余额:", ethers.formatUnits(daiBalance, 18));
  
  if (usdtBalance < ethers.parseUnits("10000", 6)) {
    console.log("   ❌ USDT 余额不足！");
    return;
  }
  if (daiBalance < ethers.parseUnits("10000", 18)) {
    console.log("   ❌ DAI 余额不足！");
    return;
  }
  console.log("   ✅ 余额充足\n");

  // ===== 步骤 3: 检查授权 =====
  console.log("3️⃣ 检查和设置授权...");
  const usdtAllowance = await usdt.allowance(signer.address, ROUTER_ADDRESS);
  const daiAllowance = await dai.allowance(signer.address, ROUTER_ADDRESS);
  console.log("   USDT 当前授权:", ethers.formatUnits(usdtAllowance, 6));
  console.log("   DAI 当前授权:", ethers.formatUnits(daiAllowance, 18));

  const usdtAmount = ethers.parseUnits("10000", 6);
  const daiAmount = ethers.parseUnits("10000", 18);

  if (usdtAllowance < usdtAmount) {
    console.log("   设置 USDT 授权...");
    const tx1 = await usdt.approve(ROUTER_ADDRESS, usdtAmount);
    await tx1.wait();
    console.log("   ✅ USDT 授权完成");
  } else {
    console.log("   ✅ USDT 已授权");
  }

  if (daiAllowance < daiAmount) {
    console.log("   设置 DAI 授权...");
    const tx2 = await dai.approve(ROUTER_ADDRESS, daiAmount);
    await tx2.wait();
    console.log("   ✅ DAI 授权完成");
  } else {
    console.log("   ✅ DAI 已授权");
  }
  console.log("");

  // ===== 步骤 4: 检查交易对合约 =====
  console.log("4️⃣ 检查交易对合约...");
  const pair = await ethers.getContractAt("DEXPair", pairAddress);
  
  try {
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    console.log("   Token0:", token0);
    console.log("   Token1:", token1);
    
    const reserves = await pair.getReserves();
    console.log("   Reserve0:", reserves[0].toString());
    console.log("   Reserve1:", reserves[1].toString());
    console.log("   ✅ 交易对合约正常\n");
  } catch (error) {
    console.log("   ❌ 交易对合约调用失败:", error);
    return;
  }

  // ===== 步骤 5: 检查 Router 合约 =====
  console.log("5️⃣ 检查 Router 合约...");
  try {
    const routerFactory = await router.factory();
    console.log("   Router.factory():", routerFactory);
    
    if (routerFactory.toLowerCase() !== FACTORY_ADDRESS!.toLowerCase()) {
      console.log("   ❌ Router 的 factory 地址不匹配！");
      return;
    }
    console.log("   ✅ Router factory 地址正确\n");
  } catch (error) {
    console.log("   ❌ Router 合约调用失败:", error);
    return;
  }

  // ===== 步骤 6: 尝试添加流动性（使用 estimateGas） =====
  console.log("6️⃣ 预估 Gas 消耗...");
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  try {
    const estimatedGas = await router.addLiquidity.estimateGas(
      USDT_ADDRESS,
      DAI_ADDRESS,
      usdtAmount,
      daiAmount,
      0,
      0,
      signer.address,
      deadline
    );
    console.log("   预估 Gas:", estimatedGas.toString());
    console.log("   ✅ Gas 预估成功\n");
  } catch (error: any) {
    console.log("   ❌ Gas 预估失败！");
    console.log("   错误信息:", error.message);
    
    // 尝试获取更详细的错误
    if (error.data) {
      console.log("   错误数据:", error.data);
    }
    
    // 尝试解码错误
    try {
      const iface = router.interface;
      const decodedError = iface.parseError(error.data);
      console.log("   解码错误:", decodedError);
    } catch (e) {
      console.log("   无法解码错误");
    }
    
    console.log("\n🔍 详细调试 Router._addLiquidity...");
    
    // 手动检查 _addLiquidity 的逻辑
    try {
      // 检查交易对是否存在
      const pairExists = await factory.getPair(USDT_ADDRESS, DAI_ADDRESS);
      console.log("   getPair 结果:", pairExists);
      
      // 尝试直接调用 pair 的 mint
      console.log("\n   尝试直接测试 Pair.mint...");
      
      // 先转账代币到 pair
      console.log("   转 1000 USDT 到 Pair...");
      const testAmount = ethers.parseUnits("1000", 6);
      await (await usdt.transfer(pairAddress, testAmount)).wait();
      console.log("   转 1000 DAI 到 Pair...");
      await (await dai.transfer(pairAddress, ethers.parseUnits("1000", 18))).wait();
      
      // 调用 mint
      console.log("   调用 Pair.mint...");
      const mintTx = await pair.mint(signer.address);
      const receipt = await mintTx.wait();
      console.log("   ✅ Mint 成功！Gas used:", receipt?.gasUsed.toString());
      
      console.log("\n🎉 直接调用 Pair.mint 成功！问题可能在 Router 逻辑中。");
      
    } catch (innerError: any) {
      console.log("   ❌ 内部调试也失败:", innerError.message);
    }
    
    return;
  }

  // ===== 步骤 7: 实际添加流动性 =====
  console.log("7️⃣ 添加流动性...");
  try {
    const tx = await router.addLiquidity(
      USDT_ADDRESS,
      DAI_ADDRESS,
      usdtAmount,
      daiAmount,
      0,
      0,
      signer.address,
      deadline,
      {
        gasLimit: 500000 // 明确设置 gas limit
      }
    );
    
    console.log("   交易已发送，等待确认...");
    const receipt = await tx.wait();
    console.log("   ✅ 流动性添加成功！");
    console.log("   Gas used:", receipt?.gasUsed.toString());
    
  } catch (error: any) {
    console.log("   ❌ 添加流动性失败:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

