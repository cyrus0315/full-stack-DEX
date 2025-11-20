/**
 * @title MasterChef Mapping
 * @notice 处理 MasterChef 合约事件（流动性挖矿）
 */

import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import {
  Deposit as DepositEvent,
  Withdraw as WithdrawEvent,
  EmergencyWithdraw as EmergencyWithdrawEvent,
  PoolAdded as PoolAddedEvent,
  PoolUpdated as PoolUpdatedEvent,
} from '../../generated/MasterChef/MasterChef'
import { Farm, UserStake, Deposit, Withdrawal, Pair } from '../../generated/schema'
import { ZERO_BD, ZERO_BI, ONE_BI } from '../utils/constants'
import { convertTokenToDecimal, getTokenPriceInUSD } from '../utils/helpers'
import { ERC20 } from '../../generated/MasterChef/ERC20'

/**
 * 处理 PoolAdded 事件
 * 当添加新的挖矿池时触发
 */
export function handlePoolAdded(event: PoolAddedEvent): void {
  let farm = new Farm(event.params.pid.toString())
  farm.lpToken = event.params.lpToken
  farm.allocPoint = event.params.allocPoint
  farm.lastRewardBlock = event.params.lastRewardBlock
  farm.accRewardPerShare = ZERO_BI
  farm.totalStaked = ZERO_BD
  farm.totalStakedUSD = ZERO_BD
  farm.apr = ZERO_BD
  farm.status = 'active'
  farm.createdAtTimestamp = event.block.timestamp
  farm.createdAtBlockNumber = event.block.number
  farm.updatedAt = event.block.timestamp
  
  // 尝试关联 Pair
  let pair = Pair.load(event.params.lpToken.toHexString())
  if (pair !== null) {
    farm.pair = pair.id
  }
  
  farm.save()
}

/**
 * 处理 PoolUpdated 事件
 * 当更新池子配置时触发
 */
export function handlePoolUpdated(event: PoolUpdatedEvent): void {
  let farm = Farm.load(event.params.pid.toString())
  if (farm === null) {
    return
  }
  
  farm.allocPoint = event.params.allocPoint
  farm.updatedAt = event.block.timestamp
  farm.save()
}

/**
 * 处理 Deposit 事件
 * 当用户质押 LP Token 时触发
 */
export function handleDeposit(event: DepositEvent): void {
  let farm = Farm.load(event.params.pid.toString())
  if (farm === null) {
    return
  }

  // 获取 LP Token 小数位
  let lpToken = ERC20.bind(Address.fromBytes(farm.lpToken))
  let decimalsResult = lpToken.try_decimals()
  let decimals = decimalsResult.reverted ? BigInt.fromI32(18) : BigInt.fromI32(decimalsResult.value)
  
  let amount = convertTokenToDecimal(event.params.amount, decimals)

  // 创建 Deposit 记录
  let deposit = new Deposit(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  )
  deposit.user = event.params.user
  deposit.farm = farm.id
  deposit.amount = amount
  deposit.timestamp = event.block.timestamp
  deposit.blockNumber = event.block.number
  deposit.transaction = event.transaction.hash
  deposit.save()

  // 更新或创建 UserStake
  let userStakeId = event.params.user.toHexString() + '-' + event.params.pid.toString()
  let userStake = UserStake.load(userStakeId)
  if (userStake === null) {
    userStake = new UserStake(userStakeId)
    userStake.user = event.params.user
    userStake.farm = farm.id
    userStake.amount = ZERO_BD
    userStake.amountUSD = ZERO_BD
    userStake.rewardDebt = ZERO_BI
    userStake.pendingReward = ZERO_BD
    userStake.totalEarned = ZERO_BD
    userStake.totalEarnedUSD = ZERO_BD
    userStake.lastDepositTimestamp = event.block.timestamp
    userStake.lastWithdrawTimestamp = ZERO_BI
  }
  
  userStake.amount = userStake.amount.plus(amount)
  userStake.lastDepositTimestamp = event.block.timestamp
  userStake.updatedAt = event.block.timestamp
  
  // 计算 USD 价值
  if (farm.pair !== null) {
    let pair = Pair.load(farm.pair!)
    if (pair !== null) {
      // LP Token 价值 = (reserve0 * price0 + reserve1 * price1) / totalSupply
      let lpTokenPrice = pair.reserveUSD.div(pair.totalSupply.gt(ZERO_BD) ? pair.totalSupply : BigDecimal.fromString('1'))
      userStake.amountUSD = userStake.amount.times(lpTokenPrice)
    }
  }
  
  userStake.save()

  // 更新 Farm 总质押量
  farm.totalStaked = farm.totalStaked.plus(amount)
  
  // 计算总质押 USD 价值
  if (farm.pair !== null) {
    let pair = Pair.load(farm.pair!)
    if (pair !== null) {
      let lpTokenPrice = pair.reserveUSD.div(pair.totalSupply.gt(ZERO_BD) ? pair.totalSupply : BigDecimal.fromString('1'))
      farm.totalStakedUSD = farm.totalStaked.times(lpTokenPrice)
    }
  }
  
  farm.updatedAt = event.block.timestamp
  farm.save()
}

/**
 * 处理 Withdraw 事件
 * 当用户取回 LP Token 时触发
 */
export function handleWithdraw(event: WithdrawEvent): void {
  let farm = Farm.load(event.params.pid.toString())
  if (farm === null) {
    return
  }

  // 获取 LP Token 小数位
  let lpToken = ERC20.bind(Address.fromBytes(farm.lpToken))
  let decimalsResult = lpToken.try_decimals()
  let decimals = decimalsResult.reverted ? BigInt.fromI32(18) : BigInt.fromI32(decimalsResult.value)
  
  let amount = convertTokenToDecimal(event.params.amount, decimals)

  // 创建 Withdrawal 记录
  let withdrawal = new Withdrawal(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  )
  withdrawal.user = event.params.user
  withdrawal.farm = farm.id
  withdrawal.amount = amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transaction = event.transaction.hash
  withdrawal.save()

  // 更新 UserStake
  let userStakeId = event.params.user.toHexString() + '-' + event.params.pid.toString()
  let userStake = UserStake.load(userStakeId)
  if (userStake !== null) {
    userStake.amount = userStake.amount.minus(amount)
    if (userStake.amount.lt(ZERO_BD)) {
      userStake.amount = ZERO_BD
    }
    
    userStake.lastWithdrawTimestamp = event.block.timestamp
    userStake.updatedAt = event.block.timestamp
    
    // 更新 USD 价值
    if (farm.pair !== null) {
      let pair = Pair.load(farm.pair!)
      if (pair !== null) {
        let lpTokenPrice = pair.reserveUSD.div(pair.totalSupply.gt(ZERO_BD) ? pair.totalSupply : BigDecimal.fromString('1'))
        userStake.amountUSD = userStake.amount.times(lpTokenPrice)
      }
    }
    
    userStake.save()
  }

  // 更新 Farm 总质押量
  farm.totalStaked = farm.totalStaked.minus(amount)
  if (farm.totalStaked.lt(ZERO_BD)) {
    farm.totalStaked = ZERO_BD
  }
  
  // 更新总质押 USD 价值
  if (farm.pair !== null) {
    let pair = Pair.load(farm.pair!)
    if (pair !== null) {
      let lpTokenPrice = pair.reserveUSD.div(pair.totalSupply.gt(ZERO_BD) ? pair.totalSupply : BigDecimal.fromString('1'))
      farm.totalStakedUSD = farm.totalStaked.times(lpTokenPrice)
    }
  }
  
  farm.updatedAt = event.block.timestamp
  farm.save()
}

/**
 * 处理 EmergencyWithdraw 事件
 * 当用户紧急提取时触发（放弃奖励）
 */
export function handleEmergencyWithdraw(event: EmergencyWithdrawEvent): void {
  let farm = Farm.load(event.params.pid.toString())
  if (farm === null) {
    return
  }

  // 获取 LP Token 小数位
  let lpToken = ERC20.bind(Address.fromBytes(farm.lpToken))
  let decimalsResult = lpToken.try_decimals()
  let decimals = decimalsResult.reverted ? BigInt.fromI32(18) : BigInt.fromI32(decimalsResult.value)
  
  let amount = convertTokenToDecimal(event.params.amount, decimals)

  // 创建 Withdrawal 记录（标记为紧急提取）
  let withdrawal = new Withdrawal(
    event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  )
  withdrawal.user = event.params.user
  withdrawal.farm = farm.id
  withdrawal.amount = amount
  withdrawal.timestamp = event.block.timestamp
  withdrawal.blockNumber = event.block.number
  withdrawal.transaction = event.transaction.hash
  withdrawal.save()

  // 更新 UserStake
  let userStakeId = event.params.user.toHexString() + '-' + event.params.pid.toString()
  let userStake = UserStake.load(userStakeId)
  if (userStake !== null) {
    userStake.amount = ZERO_BD
    userStake.amountUSD = ZERO_BD
    userStake.lastWithdrawTimestamp = event.block.timestamp
    userStake.updatedAt = event.block.timestamp
    userStake.save()
  }

  // 更新 Farm 总质押量
  farm.totalStaked = farm.totalStaked.minus(amount)
  if (farm.totalStaked.lt(ZERO_BD)) {
    farm.totalStaked = ZERO_BD
  }
  
  // 更新总质押 USD 价值
  if (farm.pair !== null) {
    let pair = Pair.load(farm.pair!)
    if (pair !== null) {
      let lpTokenPrice = pair.reserveUSD.div(pair.totalSupply.gt(ZERO_BD) ? pair.totalSupply : BigDecimal.fromString('1'))
      farm.totalStakedUSD = farm.totalStaked.times(lpTokenPrice)
    }
  }
  
  farm.updatedAt = event.block.timestamp
  farm.save()
}

