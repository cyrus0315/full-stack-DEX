import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.deployed') });

async function main() {
  console.log('\n🧪 测试限价单合约...\n');

  const [deployer, user1] = await ethers.getSigners();

  // 获取合约地址
  const limitOrderBookAddress = process.env.LIMIT_ORDER_BOOK_ADDRESS;
  const tokenAAddress = process.env.TOKEN_A_ADDRESS;
  const tokenBAddress = process.env.TOKEN_B_ADDRESS;

  if (!limitOrderBookAddress || !tokenAAddress || !tokenBAddress) {
    throw new Error('❌ 合约地址未找到');
  }

  console.log('📋 合约地址:');
  console.log('  - LimitOrderBook:', limitOrderBookAddress);
  console.log('  - Token A:', tokenAAddress);
  console.log('  - Token B:', tokenBAddress);
  console.log('');

  // 获取合约实例
  const limitOrderBook = await ethers.getContractAt('LimitOrderBook', limitOrderBookAddress);
  const tokenA = await ethers.getContractAt('MockERC20', tokenAAddress);
  const tokenB = await ethers.getContractAt('MockERC20', tokenBAddress);

  // 检查执行费用
  const executionFee = await limitOrderBook.executionFee();
  console.log('💰 执行费用:', ethers.formatEther(executionFee), 'ETH\n');

  // 准备测试代币
  console.log('📝 准备测试代币...');
  const amountIn = ethers.parseEther('100');
  
  // 检查余额
  let balance = await tokenA.balanceOf(deployer.address);
  if (balance < amountIn) {
    console.log('  - Minting Token A...');
    await (await tokenA.mint(deployer.address, amountIn)).wait();
  }
  console.log('  ✅ Token A 余额:', ethers.formatEther(await tokenA.balanceOf(deployer.address)));

  // 授权
  console.log('\n📝 授权代币...');
  await (await tokenA.approve(limitOrderBookAddress, amountIn)).wait();
  console.log('  ✅ 授权成功');

  // 创建限价单
  console.log('\n📝 创建限价单...');
  const minAmountOut = ethers.parseEther('200'); // 期望至少得到 200 Token B
  const duration = 86400; // 24 小时

  const tx = await limitOrderBook.createOrder(
    tokenAAddress,
    tokenBAddress,
    amountIn,
    minAmountOut,
    duration,
    { value: executionFee }
  );
  const receipt = await tx.wait();
  
  // 获取订单 ID
  const event = receipt?.logs.find(
    (log: any) => {
      try {
        return limitOrderBook.interface.parseLog(log)?.name === 'OrderCreated';
      } catch {
        return false;
      }
    }
  );
  
  const parsedEvent = event ? limitOrderBook.interface.parseLog(event) : null;
  const orderId = parsedEvent?.args?.orderId;

  console.log('  ✅ 订单创建成功!');
  console.log('  - 订单 ID:', orderId?.toString());

  // 查询订单
  console.log('\n📝 查询订单信息...');
  const order = await limitOrderBook.getOrder(orderId);
  console.log('  - ID:', order.id.toString());
  console.log('  - Maker:', order.maker);
  console.log('  - Token In:', order.tokenIn);
  console.log('  - Token Out:', order.tokenOut);
  console.log('  - Amount In:', ethers.formatEther(order.amountIn));
  console.log('  - Min Amount Out:', ethers.formatEther(order.minAmountOut));
  console.log('  - Execution Price:', ethers.formatUnits(order.executionPrice, 18));
  console.log('  - Status:', ['Active', 'Filled', 'Cancelled', 'Expired'][order.status]);
  console.log('  - Created At:', new Date(Number(order.createdAt) * 1000).toLocaleString());
  console.log('  - Expires At:', order.expiresAt > 0 ? new Date(Number(order.expiresAt) * 1000).toLocaleString() : 'Never');

  // 查询用户订单
  console.log('\n📝 查询用户所有订单...');
  const userOrders = await limitOrderBook.getUserOrders(deployer.address);
  console.log('  - 订单数量:', userOrders.length);
  console.log('  - 订单 IDs:', userOrders.map((id: bigint) => id.toString()).join(', '));

  // 查询活跃订单
  console.log('\n📝 查询所有活跃订单...');
  const activeOrders = await limitOrderBook.getActiveOrders();
  console.log('  - 活跃订单数量:', activeOrders.length);

  // 取消订单
  console.log('\n📝 取消订单...');
  await (await limitOrderBook.cancelOrder(orderId)).wait();
  console.log('  ✅ 订单已取消');

  // 再次查询订单状态
  const cancelledOrder = await limitOrderBook.getOrder(orderId);
  console.log('  - 新状态:', ['Active', 'Filled', 'Cancelled', 'Expired'][cancelledOrder.status]);

  // 检查代币是否退回
  const finalBalance = await tokenA.balanceOf(deployer.address);
  console.log('  - Token A 退回余额:', ethers.formatEther(finalBalance));

  console.log('\n✅ 测试完成!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

