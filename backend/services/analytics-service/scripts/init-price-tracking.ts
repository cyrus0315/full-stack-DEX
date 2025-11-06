/**
 * 初始化价格追踪脚本
 * 
 * 将所有需要追踪价格的代币添加到数据库
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PriceService } from '../src/modules/price/price.service';

async function bootstrap() {
  console.log('🚀 初始化价格追踪...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const priceService = app.get(PriceService);

  // 从环境变量读取代币地址
  const tokens = [
    { address: process.env.WETH_ADDRESS, symbol: 'WETH' },
    { address: process.env.USDT_ADDRESS, symbol: 'USDT' },
    { address: process.env.DAI_ADDRESS, symbol: 'DAI' },
    { address: process.env.USDC_ADDRESS, symbol: 'USDC' },
    { address: process.env.DEX_TOKEN_ADDRESS, symbol: 'DEX' },
  ];

  console.log('📋 待添加的代币：');
  tokens.forEach(t => console.log(`  - ${t.symbol}: ${t.address}`));
  console.log('');

  for (const token of tokens) {
    if (!token.address) {
      console.log(`⚠️  跳过 ${token.symbol}（地址未配置）`);
      continue;
    }

    try {
      await priceService.addTokenForPriceTracking(token.address, token.symbol);
      console.log(`✅ ${token.symbol} 已添加到价格追踪`);
    } catch (error) {
      console.error(`❌ ${token.symbol} 添加失败:`, error.message);
    }
  }

  console.log('\n🔄 刷新所有价格...');
  try {
    await priceService.refreshAllPrices();
    console.log('✅ 价格刷新完成');
  } catch (error) {
    console.error('❌ 价格刷新失败:', error.message);
  }

  console.log('\n📊 当前价格：');
  try {
    const allPrices = await priceService.getAllPrices();
    allPrices.prices.forEach(p => {
      console.log(`  ${p.symbol}: $${p.priceUsd}`);
    });
  } catch (error) {
    console.error('❌ 获取价格失败:', error.message);
  }

  await app.close();
  console.log('\n✅ 初始化完成！');
}

bootstrap().catch(err => {
  console.error('❌ 初始化失败:', err);
  process.exit(1);
});

