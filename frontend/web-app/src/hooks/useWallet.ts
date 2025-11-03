import { useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { useWalletStore } from '../store/wallet'
import { hardhatLocal } from '../config/chains'
import { message } from 'antd'

/**
 * 钱包连接 Hook
 * 
 * 封装 wagmi 的钱包连接功能，提供统一的接口
 */
export const useWallet = () => {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  
  const {
    setConnected,
    setDisconnected,
    setEthBalance,
    address: storedAddress,
  } = useWalletStore()
  
  // 获取 ETH 余额
  const { data: balance } = useBalance({
    address: address,
    chainId: hardhatLocal.id,
  })
  
  // 同步连接状态到全局 store
  useEffect(() => {
    if (isConnected && address && chainId) {
      setConnected(address, chainId)
    } else {
      setDisconnected()
    }
  }, [isConnected, address, chainId, setConnected, setDisconnected])
  
  // 同步余额到全局 store
  useEffect(() => {
    if (balance) {
      setEthBalance(balance.formatted)
    }
  }, [balance, setEthBalance])
  
  /**
   * 连接钱包
   */
  const connectWallet = async () => {
    try {
      // 首先检查是否安装了 MetaMask
      if (!window.ethereum) {
        message.error('请安装 MetaMask 钱包插件')
        window.open('https://metamask.io/download/', '_blank')
        return
      }
      
      // 查找 injected connector
      const metaMaskConnector = connectors.find(
        (connector) => connector.id === 'injected'
      )
      
      if (!metaMaskConnector) {
        console.error('Connectors:', connectors)
        message.error('连接器未找到，请刷新页面重试')
        return
      }
      
      await connect({ connector: metaMaskConnector })
      message.success('钱包连接成功！')
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      
      // 处理用户拒绝连接的情况
      if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
        message.warning('您拒绝了连接请求')
      } else {
        message.error(error.message || '钱包连接失败')
      }
    }
  }
  
  /**
   * 断开钱包
   */
  const disconnectWallet = () => {
    disconnect()
    setDisconnected()
    message.info('钱包已断开')
  }
  
  /**
   * 切换网络到 Hardhat
   */
  const switchToHardhat = async () => {
    try {
      if (!window.ethereum) {
        message.error('请安装 MetaMask')
        return
      }
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // 31337 in hex
      })
    } catch (error: any) {
      // 如果网络不存在，尝试添加
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x7a69',
                chainName: 'Hardhat Local',
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['http://127.0.0.1:8545'],
              },
            ],
          })
        } catch (addError) {
          console.error('Failed to add network:', addError)
          message.error('添加网络失败')
        }
      } else {
        console.error('Failed to switch network:', error)
        message.error('切换网络失败')
      }
    }
  }
  
  return {
    // 状态
    address,
    isConnected,
    chainId,
    balance: balance?.formatted || '0',
    
    // 方法
    connectWallet,
    disconnectWallet,
    switchToHardhat,
  }
}

// 扩展 Window 接口以支持 ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

