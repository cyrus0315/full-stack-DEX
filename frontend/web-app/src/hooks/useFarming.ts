import { useState } from 'react'
import { useWriteContract, useReadContract } from 'wagmi'
import { parseUnits } from 'viem'
import { message } from 'antd'
import MasterChefABI from '../contracts/MasterChef.json'
import ERC20ABI from '../contracts/ERC20.json'

const MASTER_CHEF_ADDRESS = import.meta.env.VITE_MASTER_CHEF_ADDRESS as `0x${string}`

/**
 * useFarming Hook
 * 
 * 流动性挖矿操作 Hook
 * 
 * 功能：
 * - 授权 LP Token
 * - 质押 LP Token
 * - 提取 LP Token
 * - 查询待领取奖励
 * - 紧急提取
 */
export const useFarming = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { writeContractAsync } = useWriteContract()

  /**
   * 授权 LP Token
   */
  const approveLPToken = async (lpTokenAddress: string, amount?: bigint) => {
    try {
      setIsLoading(true)
      message.loading({ content: '正在授权...', key: 'approve', duration: 0 })

      const hash = await writeContractAsync({
        address: lpTokenAddress as `0x${string}`,
        abi: ERC20ABI.abi,
        functionName: 'approve',
        args: [MASTER_CHEF_ADDRESS, amount || BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')], // 默认最大授权
      })

      message.loading({ content: '等待交易确认...', key: 'approve', duration: 0 })
      
      // 等待交易确认
      await new Promise(resolve => setTimeout(resolve, 2000))

      message.success({ content: '授权成功！', key: 'approve' })
      return hash
    } catch (error: any) {
      console.error('Approve error:', error)
      message.error({ 
        content: error.message || '授权失败', 
        key: 'approve' 
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 质押 LP Token
   */
  const deposit = async (poolId: number, amount: string, decimals: number = 18) => {
    try {
      setIsLoading(true)
      message.loading({ content: '正在质押...', key: 'deposit', duration: 0 })

      const amountBigInt = parseUnits(amount, decimals)

      console.log('Deposit params:', {
        masterChef: MASTER_CHEF_ADDRESS,
        poolId,
        amount: amountBigInt.toString(),
      })

      const hash = await writeContractAsync({
        address: MASTER_CHEF_ADDRESS,
        abi: MasterChefABI.abi,
        functionName: 'deposit',
        args: [BigInt(poolId), amountBigInt],
      })

      message.loading({ content: '等待交易确认...', key: 'deposit', duration: 0 })
      
      // 等待交易确认
      await new Promise(resolve => setTimeout(resolve, 2000))

      message.success({ 
        content: `成功质押 ${amount} LP Token！`, 
        key: 'deposit' 
      })
      return hash
    } catch (error: any) {
      console.error('Deposit error:', error)
      message.error({ 
        content: error.message || '质押失败', 
        key: 'deposit' 
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 提取 LP Token（自动领取奖励）
   */
  const withdraw = async (poolId: number, amount: string, decimals: number = 18) => {
    try {
      setIsLoading(true)
      message.loading({ content: '正在提取...', key: 'withdraw', duration: 0 })

      const amountBigInt = parseUnits(amount, decimals)

      console.log('Withdraw params:', {
        masterChef: MASTER_CHEF_ADDRESS,
        poolId,
        amount: amountBigInt.toString(),
      })

      const hash = await writeContractAsync({
        address: MASTER_CHEF_ADDRESS,
        abi: MasterChefABI.abi,
        functionName: 'withdraw',
        args: [BigInt(poolId), amountBigInt],
      })

      message.loading({ content: '等待交易确认...', key: 'withdraw', duration: 0 })
      
      // 等待交易确认
      await new Promise(resolve => setTimeout(resolve, 2000))

      message.success({ 
        content: `成功提取 ${amount} LP Token 并领取奖励！`, 
        key: 'withdraw' 
      })
      return hash
    } catch (error: any) {
      console.error('Withdraw error:', error)
      message.error({ 
        content: error.message || '提取失败', 
        key: 'withdraw' 
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 紧急提取（不领取奖励）
   */
  const emergencyWithdraw = async (poolId: number) => {
    try {
      setIsLoading(true)
      message.loading({ content: '正在紧急提取...', key: 'emergency', duration: 0 })

      console.log('Emergency withdraw params:', {
        masterChef: MASTER_CHEF_ADDRESS,
        poolId,
      })

      const hash = await writeContractAsync({
        address: MASTER_CHEF_ADDRESS,
        abi: MasterChefABI.abi,
        functionName: 'emergencyWithdraw',
        args: [BigInt(poolId)],
      })

      message.loading({ content: '等待交易确认...', key: 'emergency', duration: 0 })
      
      // 等待交易确认
      await new Promise(resolve => setTimeout(resolve, 2000))

      message.warning({ 
        content: '紧急提取成功！（未领取奖励）', 
        key: 'emergency' 
      })
      return hash
    } catch (error: any) {
      console.error('Emergency withdraw error:', error)
      message.error({ 
        content: error.message || '紧急提取失败', 
        key: 'emergency' 
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    approveLPToken,
    deposit,
    withdraw,
    emergencyWithdraw,
  }
}

/**
 * useReadFarming Hook
 * 
 * 读取挖矿数据（链上）
 */
export const useReadFarming = (poolId: number, userAddress?: string) => {
  // 查询池子信息
  const { data: poolInfo } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'poolInfo',
    args: [BigInt(poolId)],
  })

  // 查询用户信息
  const { data: userInfo } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'userInfo',
    args: [BigInt(poolId), userAddress as `0x${string}`],
    query: {
      enabled: !!userAddress,
    },
  })

  // 查询待领取奖励
  const { data: pendingReward } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'pendingReward',
    args: [BigInt(poolId), userAddress as `0x${string}`],
    query: {
      enabled: !!userAddress,
    },
  })

  // 查询 LP Token 余额
  const { data: lpBalance } = useReadContract({
    address: (poolInfo as any)?.[0] as `0x${string}`,
    abi: ERC20ABI.abi,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!poolInfo && !!userAddress,
    },
  })

  // 查询授权额度
  const { data: allowance } = useReadContract({
    address: (poolInfo as any)?.[0] as `0x${string}`,
    abi: ERC20ABI.abi,
    functionName: 'allowance',
    args: [userAddress as `0x${string}`, MASTER_CHEF_ADDRESS],
    query: {
      enabled: !!poolInfo && !!userAddress,
    },
  })

  return {
    poolInfo: poolInfo ? {
      lpToken: (poolInfo as any)[0],
      allocPoint: (poolInfo as any)[1],
      lastRewardBlock: (poolInfo as any)[2],
      accRewardPerShare: (poolInfo as any)[3],
    } : null,
    userInfo: userInfo ? {
      amount: (userInfo as any)[0],
      rewardDebt: (userInfo as any)[1],
    } : null,
    pendingReward: pendingReward as bigint || 0n,
    lpBalance: lpBalance as bigint || 0n,
    allowance: allowance as bigint || 0n,
  }
}

/**
 * useReadGlobalFarming Hook
 * 
 * 读取全局挖矿数据
 */
export const useReadGlobalFarming = () => {
  // 查询池子数量
  const { data: poolLength } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'poolLength',
  })

  // 查询每区块奖励
  const { data: rewardPerBlock } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'rewardPerBlock',
  })

  // 查询总分配点
  const { data: totalAllocPoint } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'totalAllocPoint',
  })

  return {
    poolLength: poolLength ? Number(poolLength) : 0,
    rewardPerBlock: rewardPerBlock || 0n,
    totalAllocPoint: totalAllocPoint || 0n,
  }
}

