import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { hardhatLocal } from './chains'

/**
 * Wagmi 配置
 * 用于管理钱包连接和区块链交互
 */
export const wagmiConfig = createConfig({
  chains: [hardhatLocal],
  connectors: [
    injected({
      // 不指定 target，自动检测
      shimDisconnect: true,
    }),
  ],
  transports: {
    [hardhatLocal.id]: http('http://127.0.0.1:8545'),
  },
})

