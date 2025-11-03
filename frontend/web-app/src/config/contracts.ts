/**
 * 智能合约地址配置
 * 
 * 注意：这些地址需要在部署合约后更新
 * 可以从 contracts/.env.deployed 文件中获取
 */

export const CONTRACT_ADDRESSES = {
  // 核心合约
  FACTORY: import.meta.env.VITE_FACTORY_ADDRESS || '',
  ROUTER: import.meta.env.VITE_ROUTER_ADDRESS || '',
  
  // 测试代币
  USDT: import.meta.env.VITE_USDT_ADDRESS || '',
  DAI: import.meta.env.VITE_DAI_ADDRESS || '',
  USDC: import.meta.env.VITE_USDC_ADDRESS || '',
  WETH: import.meta.env.VITE_WETH_ADDRESS || '',
} as const

/**
 * 检查合约地址是否已配置
 */
export const isContractsConfigured = (): boolean => {
  return !!(
    CONTRACT_ADDRESSES.FACTORY &&
    CONTRACT_ADDRESSES.ROUTER &&
    CONTRACT_ADDRESSES.USDT &&
    CONTRACT_ADDRESSES.DAI
  )
}

/**
 * 获取合约地址，如果未配置则抛出错误
 */
export const getContractAddress = (name: keyof typeof CONTRACT_ADDRESSES): string => {
  const address = CONTRACT_ADDRESSES[name]
  if (!address) {
    console.warn(`Contract address for ${name} is not configured`)
  }
  return address
}

