/**
 * @title Pair Mapping
 * @notice 处理 DEXPair 合约事件（Swap, Mint, Burn, Sync）
 */

import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import {
  Mint as MintEvent,
  Burn as BurnEvent,
  Swap as SwapEvent,
  Sync as SyncEvent,
} from '../../generated/templates/Pair/Pair'
import { Pair, Token, Mint, Burn, Swap, Transaction, Factory } from '../../generated/schema'
import { ZERO_BD, ZERO_BI, ONE_BI, FACTORY_ADDRESS } from '../utils/constants'
import { convertTokenToDecimal, getTokenPriceInUSD } from '../utils/helpers'

/**
 * 处理 Mint 事件（添加流动性）
 */
export function handleMint(event: MintEvent): void {
  let pair = Pair.load(event.address.toHexString())
  if (pair === null) {
    return
  }

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }

  // 创建 Transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.save()
  }

  // 创建 Mint 实体
  let mint = new Mint(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  )
  mint.transaction = transaction.id
  mint.pair = pair.id
  mint.timestamp = event.block.timestamp
  mint.sender = event.params.sender
  mint.to = event.transaction.from // 接收者
  
  // 转换金额
  mint.amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
  mint.amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)
  mint.liquidity = ZERO_BD // 需要从 Transfer 事件获取
  
  // 计算 USD 价值
  let token0Price = getTokenPriceInUSD(Address.fromString(token0.id))
  let token1Price = getTokenPriceInUSD(Address.fromString(token1.id))
  mint.amountUSD = mint.amount0.times(token0Price).plus(mint.amount1.times(token1Price))
  
  mint.feeTo = null
  mint.feeLiquidity = null
  mint.logIndex = event.logIndex
  mint.save()

  // 更新 Pair 统计
  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.save()

  // 更新 Factory 统计
  let factory = Factory.load(FACTORY_ADDRESS)
  if (factory !== null) {
    factory.txCount = factory.txCount.plus(ONE_BI)
    factory.save()
  }
}

/**
 * 处理 Burn 事件（移除流动性）
 */
export function handleBurn(event: BurnEvent): void {
  let pair = Pair.load(event.address.toHexString())
  if (pair === null) {
    return
  }

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }

  // 创建 Transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.save()
  }

  // 创建 Burn 实体
  let burn = new Burn(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  )
  burn.transaction = transaction.id
  burn.pair = pair.id
  burn.timestamp = event.block.timestamp
  burn.sender = event.params.sender
  burn.to = event.params.to
  
  // 转换金额
  burn.amount0 = convertTokenToDecimal(event.params.amount0, token0.decimals)
  burn.amount1 = convertTokenToDecimal(event.params.amount1, token1.decimals)
  burn.liquidity = ZERO_BD
  
  // 计算 USD 价值
  let token0Price = getTokenPriceInUSD(Address.fromString(token0.id))
  let token1Price = getTokenPriceInUSD(Address.fromString(token1.id))
  burn.amountUSD = burn.amount0.times(token0Price).plus(burn.amount1.times(token1Price))
  
  burn.needsComplete = false
  burn.feeTo = null
  burn.feeLiquidity = null
  burn.logIndex = event.logIndex
  burn.save()

  // 更新 Pair 统计
  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.save()

  // 更新 Factory 统计
  let factory = Factory.load(FACTORY_ADDRESS)
  if (factory !== null) {
    factory.txCount = factory.txCount.plus(ONE_BI)
    factory.save()
  }
}

/**
 * 处理 Swap 事件（交易）
 */
export function handleSwap(event: SwapEvent): void {
  let pair = Pair.load(event.address.toHexString())
  if (pair === null) {
    return
  }

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }

  // 创建 Transaction
  let transaction = Transaction.load(event.transaction.hash.toHexString())
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString())
    transaction.blockNumber = event.block.number
    transaction.timestamp = event.block.timestamp
    transaction.save()
  }

  // 创建 Swap 实体
  let swap = new Swap(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  )
  swap.transaction = transaction.id
  swap.pair = pair.id
  swap.timestamp = event.block.timestamp
  swap.sender = event.params.sender
  swap.to = event.params.to
  
  // 转换金额
  swap.amount0In = convertTokenToDecimal(event.params.amount0In, token0.decimals)
  swap.amount1In = convertTokenToDecimal(event.params.amount1In, token1.decimals)
  swap.amount0Out = convertTokenToDecimal(event.params.amount0Out, token0.decimals)
  swap.amount1Out = convertTokenToDecimal(event.params.amount1Out, token1.decimals)
  
  // 计算交易量（USD）
  let token0Price = getTokenPriceInUSD(Address.fromString(token0.id))
  let token1Price = getTokenPriceInUSD(Address.fromString(token1.id))
  
  let amount0Total = swap.amount0In.plus(swap.amount0Out)
  let amount1Total = swap.amount1In.plus(swap.amount1Out)
  swap.amountUSD = amount0Total.times(token0Price).plus(amount1Total.times(token1Price)).div(BigDecimal.fromString('2'))
  
  swap.logIndex = event.logIndex
  swap.save()

  // 更新 Pair 交易量
  pair.volumeToken0 = pair.volumeToken0.plus(amount0Total)
  pair.volumeToken1 = pair.volumeToken1.plus(amount1Total)
  pair.volumeUSD = pair.volumeUSD.plus(swap.amountUSD)
  pair.txCount = pair.txCount.plus(ONE_BI)
  pair.save()

  // 更新 Token 交易量
  token0.tradeVolume = token0.tradeVolume.plus(amount0Total)
  token0.tradeVolumeUSD = token0.tradeVolumeUSD.plus(amount0Total.times(token0Price))
  token0.txCount = token0.txCount.plus(ONE_BI)
  token0.save()

  token1.tradeVolume = token1.tradeVolume.plus(amount1Total)
  token1.tradeVolumeUSD = token1.tradeVolumeUSD.plus(amount1Total.times(token1Price))
  token1.txCount = token1.txCount.plus(ONE_BI)
  token1.save()

  // 更新 Factory 统计
  let factory = Factory.load(FACTORY_ADDRESS)
  if (factory !== null) {
    factory.totalVolumeUSD = factory.totalVolumeUSD.plus(swap.amountUSD)
    factory.txCount = factory.txCount.plus(ONE_BI)
    factory.save()
  }
}

/**
 * 处理 Sync 事件（储备量更新）
 */
export function handleSync(event: SyncEvent): void {
  let pair = Pair.load(event.address.toHexString())
  if (pair === null) {
    return
  }

  let token0 = Token.load(pair.token0)
  let token1 = Token.load(pair.token1)
  if (token0 === null || token1 === null) {
    return
  }

  // 更新储备量
  pair.reserve0 = convertTokenToDecimal(event.params.reserve0, token0.decimals)
  pair.reserve1 = convertTokenToDecimal(event.params.reserve1, token1.decimals)

  // 更新价格
  if (pair.reserve0.gt(ZERO_BD) && pair.reserve1.gt(ZERO_BD)) {
    pair.token0Price = pair.reserve1.div(pair.reserve0)
    pair.token1Price = pair.reserve0.div(pair.reserve1)
  }

  // 计算 USD 价值
  let token0Price = getTokenPriceInUSD(Address.fromString(token0.id))
  let token1Price = getTokenPriceInUSD(Address.fromString(token1.id))
  pair.reserveUSD = pair.reserve0.times(token0Price).plus(pair.reserve1.times(token1Price))

  pair.updatedAt = event.block.timestamp
  pair.save()
}

