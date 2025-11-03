import { defineChain } from 'viem'

/**
 * Hardhat 本地测试链配置
 */
export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Local Explorer', url: '' },
  },
  testnet: true,
})

/**
 * 支持的链列表
 */
export const supportedChains = [hardhatLocal]

/**
 * 默认链
 */
export const defaultChain = hardhatLocal

