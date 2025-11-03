export default () => ({
  // 服务配置
  port: parseInt(process.env.PORT || '3002', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  nodeEnv: process.env.NODE_ENV || 'development',

  // 数据库配置
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'h15',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'dex_trading',
  },

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '1', 10),
  },

  // 区块链配置
  blockchain: {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
    rpcWsUrl: process.env.BLOCKCHAIN_RPC_WS_URL || 'ws://127.0.0.1:8545',
    chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '31337', 10),
  },

  // DEX 合约地址
  contracts: {
    factory: process.env.DEX_FACTORY_ADDRESS || '',
    router: process.env.DEX_ROUTER_ADDRESS || '',
    weth: process.env.WETH_ADDRESS || '',
  },

  // 交易配置
  trading: {
    privateKey: process.env.TRADING_PRIVATE_KEY || '',
    defaultSlippage: parseFloat(process.env.DEFAULT_SLIPPAGE || '0.5'), // 0.5%
    defaultDeadline: parseInt(process.env.DEFAULT_DEADLINE || '1200', 10), // 20分钟
    minLiquidity: process.env.MIN_LIQUIDITY || '1000',
  },

  // 缓存配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5分钟
    priceTtl: parseInt(process.env.PRICE_CACHE_TTL || '10', 10), // 10秒
  },
});

