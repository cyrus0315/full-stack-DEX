/**
 * @title Subgraph 辅助函数
 * @notice 提供通用的辅助函数
 */

import { BigDecimal, BigInt, Address } from '@graphprotocol/graph-ts'
import { ERC20 } from '../../generated/Factory/ERC20'
import { Factory } from '../../generated/Factory/Factory'
import { Pair } from '../../generated/Factory/Pair'
import {
  ZERO_BD,
  ZERO_BI,
  ONE_BD,
  FACTORY_ADDRESS,
  WHITELIST_TOKENS,
  STABLE_COINS,
  WETH_ADDRESS,
} from './constants'

/**
 * 将 BigInt 转换为 BigDecimal
 */
export function convertTokenToDecimal(
  tokenAmount: BigInt,
  decimals: BigInt
): BigDecimal {
  if (decimals == ZERO_BI) {
    return tokenAmount.toBigDecimal()
  }
  return tokenAmount.toBigDecimal().div(exponentToBigDecimal(decimals))
}

/**
 * 计算 10^n
 */
export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString('1')
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString('10'))
  }
  return bd
}

/**
 * 获取代币名称（安全）
 */
export function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (!nameResult.reverted) {
    nameValue = nameResult.value
  }
  return nameValue
}

/**
 * 获取代币符号（安全）
 */
export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress)
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (!symbolResult.reverted) {
    symbolValue = symbolResult.value
  }
  return symbolValue
}

/**
 * 获取代币小数位（安全）
 */
export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  let decimalValue = 18
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return BigInt.fromI32(decimalValue)
}

/**
 * 获取代币总供应量（安全）
 */
export function fetchTokenTotalSupply(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress)
  let totalSupplyValue = ZERO_BI
  let totalSupplyResult = contract.try_totalSupply()
  if (!totalSupplyResult.reverted) {
    totalSupplyValue = totalSupplyResult.value as BigInt
  }
  return totalSupplyValue
}

/**
 * 检查地址是否为零地址
 */
export function isNullEthValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001'
}

/**
 * 计算以太坊价格（通过稳定币池）
 * 从 WETH/USDT, WETH/USDC, WETH/DAI 池子中获取平均价格
 */
export function findEthPerToken(tokenAddress: Address): BigDecimal {
  if (tokenAddress.toHexString() == WETH_ADDRESS) {
    return ONE_BD
  }
  
  // 尝试从白名单代币中查找价格
  let factory = Factory.bind(Address.fromString(FACTORY_ADDRESS))
  
  // 尝试 token/WETH 对
  let pairAddress = factory.try_getPair(tokenAddress, Address.fromString(WETH_ADDRESS))
  if (!pairAddress.reverted && pairAddress.value.toHexString() != '0x0000000000000000000000000000000000000000') {
    let pair = Pair.bind(pairAddress.value)
    let reserves = pair.try_getReserves()
    if (!reserves.reverted) {
      let token0 = pair.token0()
      if (token0 == tokenAddress) {
        // token is token0
        if (reserves.value.value0.toBigDecimal().gt(ZERO_BD)) {
          return reserves.value.value1.toBigDecimal().div(reserves.value.value0.toBigDecimal())
        }
      } else {
        // token is token1
        if (reserves.value.value1.toBigDecimal().gt(ZERO_BD)) {
          return reserves.value.value0.toBigDecimal().div(reserves.value.value1.toBigDecimal())
        }
      }
    }
  }
  
  return ZERO_BD
}

/**
 * 获取以太坊 USD 价格
 * 通过稳定币对计算
 */
export function getEthPriceInUSD(): BigDecimal {
  // 尝试从 WETH/USDT 对获取
  let factory = Factory.bind(Address.fromString(FACTORY_ADDRESS))
  
  let usdtPair = factory.try_getPair(
    Address.fromString(WETH_ADDRESS),
    Address.fromString(STABLE_COINS[0]) // USDT
  )
  
  if (!usdtPair.reverted && usdtPair.value.toHexString() != '0x0000000000000000000000000000000000000000') {
    let pair = Pair.bind(usdtPair.value)
    let reserves = pair.try_getReserves()
    if (!reserves.reverted) {
      let token0 = pair.token0()
      if (token0.toHexString() == WETH_ADDRESS) {
        // WETH is token0, USDT is token1
        if (reserves.value.value0.toBigDecimal().gt(ZERO_BD)) {
          return reserves.value.value1.toBigDecimal().div(reserves.value.value0.toBigDecimal())
        }
      } else {
        // USDT is token0, WETH is token1
        if (reserves.value.value1.toBigDecimal().gt(ZERO_BD)) {
          return reserves.value.value0.toBigDecimal().div(reserves.value.value1.toBigDecimal())
        }
      }
    }
  }
  
  // 默认价格（可以从 oracle 获取）
  return BigDecimal.fromString('2000')
}

/**
 * 计算代币 USD 价格
 */
export function getTokenPriceInUSD(tokenAddress: Address): BigDecimal {
  // 如果是稳定币，直接返回 1
  if (STABLE_COINS.includes(tokenAddress.toHexString())) {
    return ONE_BD
  }
  
  // 计算代币的 ETH 价格
  let ethPrice = findEthPerToken(tokenAddress)
  
  // 获取 ETH 的 USD 价格
  let ethUsdPrice = getEthPriceInUSD()
  
  return ethPrice.times(ethUsdPrice)
}

