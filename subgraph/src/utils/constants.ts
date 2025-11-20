/**
 * @title Subgraph 常量配置
 * @notice 定义 Subgraph 中使用的常量
 */

import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'

// ========================================
// 数学常量
// ========================================

export const ZERO_BD = BigDecimal.fromString('0')
export const ONE_BD = BigDecimal.fromString('1')
export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)

// ========================================
// 合约地址
// ========================================

// Factory 地址
export const FACTORY_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'

// MasterChef 地址
export const MASTER_CHEF_ADDRESS = '0x4A679253410272dd5232B3Ff7cF5dbB88f295319'

// WETH 地址（用于价格计算）
export const WETH_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'

// 稳定币地址（用于价格计算）
export const USDT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
export const USDC_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
export const DAI_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'

// ========================================
// 白名单代币（用于 TVL 计算）
// ========================================

export const WHITELIST_TOKENS: string[] = [
  WETH_ADDRESS,
  USDT_ADDRESS,
  USDC_ADDRESS,
  DAI_ADDRESS,
]

// ========================================
// 稳定币列表（用于价格锚定）
// ========================================

export const STABLE_COINS: string[] = [
  USDT_ADDRESS,
  USDC_ADDRESS,
  DAI_ADDRESS,
]

// ========================================
// 最小流动性阈值（用于过滤小池子）
// ========================================

export const MINIMUM_LIQUIDITY_THRESHOLD_ETH = BigDecimal.fromString('2')

