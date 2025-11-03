import { Token } from '../types'
import { CONTRACT_ADDRESSES } from './contracts'

/**
 * 代币列表配置
 * 
 * 注意：地址需要与部署的合约地址匹配
 */
export const TOKENS: Record<string, Token> = {
  ETH: {
    address: CONTRACT_ADDRESSES.WETH, // 使用 WETH 地址（添加流动性时 Router 会自动处理 ETH ↔ WETH 转换）
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
  },
  USDT: {
    address: CONTRACT_ADDRESSES.USDT,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  },
  DAI: {
    address: CONTRACT_ADDRESSES.DAI,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  },
  USDC: {
    address: CONTRACT_ADDRESSES.USDC,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  WETH: {
    address: CONTRACT_ADDRESSES.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
  },
}

/**
 * 默认代币列表（用于显示）
 */
export const DEFAULT_TOKENS = [
  TOKENS.ETH,
  TOKENS.USDT,
  TOKENS.DAI,
  TOKENS.USDC,
  // TOKENS.WETH, // ETH 已经使用 WETH 地址，不需要单独显示
].filter(token => token.address) // 过滤掉未配置的代币

/**
 * 根据地址获取代币信息
 */
export const getTokenByAddress = (address: string): Token | undefined => {
  return DEFAULT_TOKENS.find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  )
}

/**
 * 根据符号获取代币信息
 */
export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return DEFAULT_TOKENS.find(
    (token) => token.symbol.toUpperCase() === symbol.toUpperCase()
  )
}

