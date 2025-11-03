/**
 * 格式化工具函数
 */

/**
 * 格式化数字（添加千分位）
 */
export const formatNumber = (num: string | number, decimals: number = 4): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num
  
  if (isNaN(value)) return '0'
  
  // 如果数字很小，使用科学计数法
  if (value > 0 && value < 0.0001) {
    return value.toExponential(2)
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

/**
 * 格式化代币数量
 */
export const formatTokenAmount = (
  amount: string | number,
  decimals: number = 18
): string => {
  try {
    const value = typeof amount === 'string' ? BigInt(amount) : BigInt(Math.floor(amount))
    const divisor = BigInt(10 ** decimals)
    const whole = value / divisor
    const remainder = value % divisor
    
    // 保留有效小数位
    const decimal = remainder.toString().padStart(decimals, '0').slice(0, 6)
    const result = `${whole}.${decimal}`
    
    return parseFloat(result).toString()
  } catch {
    return '0'
  }
}

/**
 * 解析代币数量（转换为最小单位）
 */
export const parseTokenAmount = (
  amount: string,
  decimals: number = 18
): string => {
  try {
    const [whole = '0', decimal = '0'] = amount.split('.')
    const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals)
    const value = BigInt(whole + paddedDecimal)
    return value.toString()
  } catch {
    return '0'
  }
}

/**
 * 格式化地址（缩短显示）
 */
export const formatAddress = (
  address: string,
  startLength: number = 6,
  endLength: number = 4
): string => {
  if (!address || address.length < startLength + endLength) return address
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
}

/**
 * 格式化百分比
 */
export const formatPercentage = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0%'
  return `${num.toFixed(2)}%`
}

/**
 * 格式化时间戳
 */
export const formatTimestamp = (timestamp: string | number): string => {
  try {
    const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
    const date = new Date(ts * 1000)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '-'
  }
}

/**
 * 格式化交易哈希
 */
export const formatTxHash = (hash: string): string => {
  return formatAddress(hash, 10, 8)
}

/**
 * 检查是否为有效的以太坊地址
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * 检查是否为有效的数字输入
 */
export const isValidNumber = (value: string): boolean => {
  if (!value) return false
  return /^\d*\.?\d*$/.test(value) && !isNaN(parseFloat(value))
}

