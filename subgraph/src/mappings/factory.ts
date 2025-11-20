/**
 * @title Factory Mapping
 * @notice 处理 DEXFactory 合约事件
 */

import { PairCreated } from '../../generated/Factory/Factory'
import { Pair as PairTemplate } from '../../generated/templates'
import { Factory, Pair, Token, Transaction } from '../../generated/schema'
import { ZERO_BD, ZERO_BI, ONE_BI, FACTORY_ADDRESS } from '../utils/constants'
import {
  fetchTokenName,
  fetchTokenSymbol,
  fetchTokenDecimals,
  fetchTokenTotalSupply,
} from '../utils/helpers'
import { Address, BigInt } from '@graphprotocol/graph-ts'

/**
 * 处理 PairCreated 事件
 * 当创建新的交易对时触发
 */
export function handlePairCreated(event: PairCreated): void {
  // 加载或创建 Factory
  let factory = Factory.load(FACTORY_ADDRESS)
  if (factory === null) {
    factory = new Factory(FACTORY_ADDRESS)
    factory.pairCount = 0
    factory.totalVolumeUSD = ZERO_BD
    factory.totalVolumeETH = ZERO_BD
    factory.untrackedVolumeUSD = ZERO_BD
    factory.totalLiquidityUSD = ZERO_BD
    factory.totalLiquidityETH = ZERO_BD
    factory.txCount = ZERO_BI
    factory.updatedAt = event.block.timestamp
  }
  factory.pairCount = factory.pairCount + 1
  factory.save()

  // 创建 Token 实体（如果不存在）
  let token0 = Token.load(event.params.token0.toHexString())
  if (token0 === null) {
    token0 = new Token(event.params.token0.toHexString())
    token0.symbol = fetchTokenSymbol(event.params.token0)
    token0.name = fetchTokenName(event.params.token0)
    token0.decimals = fetchTokenDecimals(event.params.token0)
    token0.totalSupply = fetchTokenTotalSupply(event.params.token0)
    token0.tradeVolume = ZERO_BD
    token0.tradeVolumeUSD = ZERO_BD
    token0.untrackedVolumeUSD = ZERO_BD
    token0.txCount = ZERO_BI
    token0.totalLiquidity = ZERO_BD
    token0.derivedETH = ZERO_BD
    token0.save()
  }

  let token1 = Token.load(event.params.token1.toHexString())
  if (token1 === null) {
    token1 = new Token(event.params.token1.toHexString())
    token1.symbol = fetchTokenSymbol(event.params.token1)
    token1.name = fetchTokenName(event.params.token1)
    token1.decimals = fetchTokenDecimals(event.params.token1)
    token1.totalSupply = fetchTokenTotalSupply(event.params.token1)
    token1.tradeVolume = ZERO_BD
    token1.tradeVolumeUSD = ZERO_BD
    token1.untrackedVolumeUSD = ZERO_BD
    token1.txCount = ZERO_BI
    token1.totalLiquidity = ZERO_BD
    token1.derivedETH = ZERO_BD
    token1.save()
  }

  // 创建 Pair 实体
  let pair = new Pair(event.params.pair.toHexString())
  pair.token0 = token0.id
  pair.token1 = token1.id
  pair.reserve0 = ZERO_BD
  pair.reserve1 = ZERO_BD
  pair.totalSupply = ZERO_BD
  pair.reserveETH = ZERO_BD
  pair.reserveUSD = ZERO_BD
  pair.untrackedVolumeUSD = ZERO_BD
  pair.token0Price = ZERO_BD
  pair.token1Price = ZERO_BD
  pair.volumeToken0 = ZERO_BD
  pair.volumeToken1 = ZERO_BD
  pair.volumeUSD = ZERO_BD
  pair.txCount = ZERO_BI
  pair.createdAtTimestamp = event.block.timestamp
  pair.createdAtBlockNumber = event.block.number
  pair.updatedAt = event.block.timestamp
  pair.save()

  // 创建动态数据源来监听 Pair 事件
  PairTemplate.create(event.params.pair)
}

