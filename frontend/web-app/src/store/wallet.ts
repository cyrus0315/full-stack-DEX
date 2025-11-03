import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WalletState {
  // 连接状态
  isConnected: boolean
  address: string | null
  chainId: number | null
  
  // 余额
  ethBalance: string
  
  // 方法
  setConnected: (address: string, chainId: number) => void
  setDisconnected: () => void
  setEthBalance: (balance: string) => void
}

/**
 * 钱包状态管理
 */
export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      // 初始状态
      isConnected: false,
      address: null,
      chainId: null,
      ethBalance: '0',
      
      // 设置连接状态
      setConnected: (address: string, chainId: number) => {
        set({
          isConnected: true,
          address: address.toLowerCase(),
          chainId,
        })
      },
      
      // 断开连接
      setDisconnected: () => {
        set({
          isConnected: false,
          address: null,
          chainId: null,
          ethBalance: '0',
        })
      },
      
      // 设置 ETH 余额
      setEthBalance: (balance: string) => {
        set({ ethBalance: balance })
      },
    }),
    {
      name: 'dex-wallet-storage',
      partialize: (state) => ({
        address: state.address,
        chainId: state.chainId,
      }),
    }
  )
)

