import { useState } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { parseAbi, Address } from 'viem'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import { message } from 'antd'
import { apiService } from '../services/api'

/**
 * Swap Hook - 直接调用合约执行交易
 * 
 * 这是真正的 DEX 工作方式：
 * 1. 前端直接调用Router合约
 * 2. 用户通过 MetaMask 签名
 * 3. 交易由用户账户执行
 */
export const useSwap = () => {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [loading, setLoading] = useState(false)

  const routerAbi = parseAbi([
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
    'function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] calldata path, address to, uint256 deadline) external returns (uint256[] memory amounts)',
  ])

  const erc20Abi = parseAbi([
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
  ])

  /**
   * 检查并授权代币
   */
  const checkAndApprove = async (
    tokenAddress: string,
    amount: bigint
  ): Promise<boolean> => {
    if (!walletClient) {
      message.error('请先连接钱包')
      return false
    }

    try {
      const routerAddress = CONTRACT_ADDRESSES.ROUTER as Address
      
      // 🐛 调试：检查 Router 地址
      console.log('🔍 Router Address:', routerAddress)
      console.log('🔍 Token Address:', tokenAddress)
      console.log('🔍 Amount to approve:', amount.toString())
      
      // 检查当前授权额度
      const allowance = await publicClient?.readContract({
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [walletClient.account.address, routerAddress],
      })

      // 如果授权额度足够，无需重新授权
      if (allowance && allowance >= amount) {
        return true
      }

      // 请求授权
      message.info('正在请求代币授权...')
      
      const hash = await walletClient.writeContract({
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [routerAddress, amount],
        gas: 100000n, // 显式设置 gas limit，避免估算失败
      })

      message.loading({ content: '授权交易已提交，等待确认...', key: 'approve', duration: 0 })
      
      // 等待交易确认（本地网络通常 1-2 秒）
      // 设置超时时间为 30 秒
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), 30000)
      )
      
      const receiptPromise = publicClient?.waitForTransactionReceipt({ 
        hash,
        confirmations: 1, // 本地网络只需要 1 个确认
      })
      
      await Promise.race([receiptPromise, timeoutPromise])
      
      message.success({ content: '✅ 授权成功！', key: 'approve' })
      return true
    } catch (error: any) {
      console.error('Approval failed:', error)
      
      // 销毁 loading 消息
      message.destroy('approve')
      
      // 判断错误类型并提供详细错误信息
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        message.warning('您取消了授权')
      } else if (error.message?.includes('timeout')) {
        message.error('授权交易超时，请检查网络连接后重试')
      } else if (error.message?.includes('aborted')) {
        message.error('授权请求被中止，可能的原因：\n1. Gas limit 不足\n2. 网络连接问题\n3. 节点响应超时\n\n请刷新页面后重试')
      } else if (error.message?.includes('insufficient funds')) {
        message.error('账户余额不足以支付 Gas 费用')
      } else if (error.shortMessage) {
        message.error(`授权失败: ${error.shortMessage}`)
      } else {
        message.error(`授权失败: ${error.message || '未知错误'}\n\n建议：\n1. 刷新页面重试\n2. 检查 MetaMask 连接\n3. 确认账户有足够 ETH 支付 Gas`)
      }
      return false
    }
  }

  /**
   * 执行 Swap（精确输入）
   */
  const swapExactTokensForTokens = async (params: {
    tokenIn: string
    tokenOut: string
    amountIn: bigint
    amountOutMin: bigint
    deadline: number
  }) => {
    if (!walletClient) {
      message.error('请先连接钱包')
      return null
    }

    const { tokenIn, tokenOut, amountIn, amountOutMin, deadline } = params

    setLoading(true)
    try {
      // 1. 检查并授权代币
      const approved = await checkAndApprove(tokenIn, amountIn)
      if (!approved) {
        setLoading(false)
        return null
      }

      // 2. 执行交换
      message.info('正在执行交换...')
      
      const path = [tokenIn, tokenOut] as Address[]
      const routerAddress = CONTRACT_ADDRESSES.ROUTER as Address
      
      const hash = await walletClient.writeContract({
        address: routerAddress,
        abi: routerAbi,
        functionName: 'swapExactTokensForTokens',
        args: [
          amountIn,
          amountOutMin,
          path,
          walletClient.account.address,
          BigInt(deadline),
        ],
        gas: 200000n, // 显式设置 gas limit
      })

      message.loading({ content: '交易已提交，等待确认...', key: 'swap', duration: 0 })
      
      // 3. 等待交易确认（本地网络快速确认）
      // 设置超时时间为 30 秒
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), 30000)
      )
      
      const receiptPromise = publicClient?.waitForTransactionReceipt({ 
        hash,
        confirmations: 1, // 本地网络只需要 1 个确认
      })
      
      const receipt = await Promise.race([receiptPromise, timeoutPromise])
      
      if (receipt?.status === 'success') {
        message.success('🎉 交易成功！')
        
        // 4. 自动刷新 Pool 数据（从链上同步最新储备量）
        // 这样前端 Pool 页面会显示更新后的数据
        apiService.refreshPoolByTokens(tokenIn, tokenOut).catch(err => {
          console.warn('Pool refresh failed (non-critical):', err)
        })
        
        return hash
      } else {
        message.error('交易失败')
        return null
      }
    } catch (error: any) {
      console.error('Swap failed:', error)
      
      // 销毁 loading 消息
      message.destroy('swap')
      
      // 判断错误类型并提供详细错误信息
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        message.warning('您取消了交易')
      } else if (error.message?.includes('timeout')) {
        message.error('交易超时，请检查网络连接后重试')
      } else if (error.message?.includes('aborted')) {
        message.error('交易请求被中止，可能的原因：\n1. Gas limit 不足\n2. 滑点设置过低\n3. 网络连接问题\n\n请调整滑点或刷新页面后重试')
      } else if (error.message?.includes('insufficient')) {
        message.error('余额不足或流动性不足')
      } else if (error.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
        message.error('输出金额不足，请增加滑点容忍度')
      } else if (error.shortMessage) {
        message.error(`交易失败: ${error.shortMessage}`)
      } else {
        message.error(`交易失败: ${error.message || '未知错误'}\n\n建议：\n1. 增加滑点容忍度\n2. 刷新页面重试\n3. 检查账户余额`)
      }
      
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    swapExactTokensForTokens,
    loading,
  }
}

