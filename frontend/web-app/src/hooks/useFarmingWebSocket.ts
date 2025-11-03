import { useEffect } from 'react'
import { message } from 'antd'
import { useWebSocket } from './useWebSocket'

/**
 * useFarmingWebSocket Hook
 * 
 * 监听挖矿相关的实时事件
 * 
 * 事件类型：
 * - farming:action - 挖矿操作事件
 *   - deposit: 质押
 *   - withdraw: 提取
 *   - reward_paid: 奖励发放
 *   - emergency_withdraw: 紧急提取
 *   - pool_added: 新增池子
 *   - pool_updated: 池子更新
 */
export const useFarmingWebSocket = (onUpdate?: () => void) => {
  const { socket, isConnected } = useWebSocket()

  useEffect(() => {
    if (!socket || !isConnected) return

    // 监听挖矿操作事件
    const handleFarmingAction = (data: any) => {
      console.log('Farming action:', data)

      // 根据事件类型显示不同的提示
      switch (data.type) {
        case 'deposit':
          message.success(`质押成功: ${data.amount} LP Token (池子 #${data.poolId})`)
          break
        case 'withdraw':
          message.info(`提取成功: ${data.amount} LP Token (池子 #${data.poolId})`)
          break
        case 'reward_paid':
          message.success(`奖励发放: ${data.amount} DEX`)
          break
        case 'emergency_withdraw':
          message.warning(`紧急提取: ${data.amount} LP Token (池子 #${data.poolId})`)
          break
        case 'pool_added':
          message.info(`新增挖矿池 #${data.poolId}`)
          break
        case 'pool_updated':
          message.info(`池子 #${data.poolId} 已更新`)
          break
      }

      // 触发更新回调
      if (onUpdate) {
        onUpdate()
      }
    }

    // 注册事件监听
    socket.on('farming:action', handleFarmingAction)

    // 清理
    return () => {
      socket.off('farming:action', handleFarmingAction)
    }
  }, [socket, isConnected, onUpdate])

  return {
    isConnected,
  }
}

