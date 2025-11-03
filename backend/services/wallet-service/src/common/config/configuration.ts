export default () => ({
  // 应用配置
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
  },

  // 数据库配置
  database: {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'dex_user',
    password: process.env.DATABASE_PASSWORD || 'dev_password',
    database: process.env.DATABASE_NAME || 'dex_wallet',
    entities: ['dist/**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production', // 生产环境禁用
    logging: process.env.NODE_ENV === 'development',
  },

  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // 区块链配置
  blockchain: {
    network: process.env.BLOCKCHAIN_NETWORK || 'sepolia',
    rpcUrl:
      process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
    wsUrl: process.env.BLOCKCHAIN_WS_URL,
    chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '31337', 10),
  },

  // 区块扫描器配置
  scanner: {
    enabled: process.env.SCANNER_ENABLED !== 'false', // 默认启用
    pollingInterval: parseInt(process.env.SCANNER_POLLING_INTERVAL || '2000', 10), // 2秒
  },

  // 缓存 TTL 配置（秒）
  cache: {
    ttl: {
      balance: parseInt(process.env.CACHE_TTL_BALANCE || '10', 10),
      tokenInfo: parseInt(process.env.CACHE_TTL_TOKEN_INFO || '3600', 10),
      price: parseInt(process.env.CACHE_TTL_PRICE || '60', 10),
    },
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});

