import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { hardhat } from 'viem/chains';
import { TokenPrice } from './entities/token-price.entity';
import { TokenPriceDto, AllPricesResponseDto } from './dto/price.dto';

/**
 * PriceService
 * 
 * 负责价格预言机相关的业务逻辑：
 * 1. 从链上 PriceOracle 合约读取价格
 * 2. 缓存价格数据到数据库
 * 3. 定时刷新价格
 * 4. 提供价格查询接口
 */
@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);
  private readonly publicClient: any;
  private readonly priceOracleAddress: string;
  
  // 内存缓存（快速访问）
  private priceCache: Map<string, TokenPriceDto> = new Map();
  private lastRefreshTime: Date = new Date();

  // PriceOracle ABI
  private readonly priceOracleAbi = parseAbi([
    'function getPrice(address token) view returns (uint256)',
    'function getPrices(address[] tokens) view returns (uint256[])',
    'function hasPriceFeed(address token) view returns (bool)',
    'function getPriceFeedInfo(address token) view returns (address feed, uint8 decimals, string memory description, uint256 version)',
  ]);

  // ERC20 ABI (读取 symbol)
  private readonly erc20Abi = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
  ]);

  constructor(
    @InjectRepository(TokenPrice)
    private readonly tokenPriceRepository: Repository<TokenPrice>,
    private readonly configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:8545');
    
    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http(rpcUrl),
    });

    // 从环境变量读取 PriceOracle 合约地址
    this.priceOracleAddress = this.configService.get<string>('PRICE_ORACLE_ADDRESS', '');

    if (!this.priceOracleAddress) {
      this.logger.warn('⚠️  PRICE_ORACLE_ADDRESS not configured, price service disabled');
    } else {
      this.logger.log(`✅ PriceOracle initialized at ${this.priceOracleAddress}`);
      // 启动后立即刷新一次价格
      this.refreshAllPrices().catch(err => {
        this.logger.error('Failed to initial refresh prices:', err);
      });
    }
  }

  /**
   * 获取单个代币的价格
   */
  async getTokenPrice(tokenAddress: string): Promise<TokenPriceDto> {
    const tokenAddressLower = tokenAddress.toLowerCase();

    // 先查内存缓存
    if (this.priceCache.has(tokenAddressLower)) {
      return this.priceCache.get(tokenAddressLower)!;
    }

    // 查数据库
    const tokenPrice = await this.tokenPriceRepository.findOne({
      where: { tokenAddress: tokenAddressLower },
    });

    if (!tokenPrice) {
      // 尝试从链上读取
      try {
        await this.fetchAndSaveTokenPrice(tokenAddress);
        const newPrice = await this.tokenPriceRepository.findOne({
          where: { tokenAddress: tokenAddressLower },
        });
        if (newPrice) {
          const dto = this.toTokenPriceDto(newPrice);
          this.priceCache.set(tokenAddressLower, dto);
          return dto;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch price for ${tokenAddress}:`, error);
      }
      
      throw new NotFoundException(`Price not found for token ${tokenAddress}`);
    }

    const dto = this.toTokenPriceDto(tokenPrice);
    this.priceCache.set(tokenAddressLower, dto);
    return dto;
  }

  /**
   * 批量获取代币价格
   */
  async getTokenPrices(tokenAddresses: string[]): Promise<TokenPriceDto[]> {
    const prices: TokenPriceDto[] = [];

    for (const address of tokenAddresses) {
      try {
        const price = await this.getTokenPrice(address);
        prices.push(price);
      } catch (error) {
        this.logger.warn(`Failed to get price for ${address}`);
        // 返回默认价格
        prices.push({
          tokenAddress: address.toLowerCase(),
          symbol: 'UNKNOWN',
          priceUsd: '0',
          isActive: false,
        });
      }
    }

    return prices;
  }

  /**
   * 获取所有代币价格
   */
  async getAllPrices(): Promise<AllPricesResponseDto> {
    const tokenPrices = await this.tokenPriceRepository.find({
      where: { isActive: true },
      order: { symbol: 'ASC' },
    });

    const prices = tokenPrices.map(tp => this.toTokenPriceDto(tp));

    return {
      prices,
      lastRefreshTime: this.lastRefreshTime,
      totalTokens: prices.length,
    };
  }

  /**
   * 计算代币的 USD 价值
   */
  async calculateUsdValue(tokenAddress: string, amount: string): Promise<string> {
    try {
      const price = await this.getTokenPrice(tokenAddress);
      const priceNum = parseFloat(price.priceUsd);
      const amountNum = parseFloat(amount);
      
      if (isNaN(priceNum) || isNaN(amountNum)) {
        return '0';
      }

      return (priceNum * amountNum).toFixed(2);
    } catch (error) {
      this.logger.warn(`Failed to calculate USD value for ${tokenAddress}`);
      return '0';
    }
  }

  /**
   * 计算 LP Token 的 USD 价值
   * 
   * LP Token 价值 = (reserve0 * price0 + reserve1 * price1) / totalSupply * amount
   */
  async calculateLpTokenUsdValue(
    lpTokenAddress: string,
    amount: string,
    reserve0: string,
    reserve1: string,
    totalSupply: string,
    token0Address: string,
    token1Address: string,
  ): Promise<string> {
    try {
      const [price0, price1] = await Promise.all([
        this.getTokenPrice(token0Address),
        this.getTokenPrice(token1Address),
      ]);

      const reserve0Num = parseFloat(reserve0);
      const reserve1Num = parseFloat(reserve1);
      const totalSupplyNum = parseFloat(totalSupply);
      const amountNum = parseFloat(amount);
      const price0Num = parseFloat(price0.priceUsd);
      const price1Num = parseFloat(price1.priceUsd);

      if (totalSupplyNum === 0) {
        return '0';
      }

      // TVL = reserve0 * price0 + reserve1 * price1
      const tvl = reserve0Num * price0Num + reserve1Num * price1Num;
      
      // LP Token 价格 = TVL / totalSupply
      const lpPrice = tvl / totalSupplyNum;
      
      // LP Token USD 价值 = LP Token 数量 * LP Token 价格
      const usdValue = amountNum * lpPrice;

      return usdValue.toFixed(2);
    } catch (error) {
      this.logger.warn(`Failed to calculate LP token USD value for ${lpTokenAddress}:`, error);
      return '0';
    }
  }

  /**
   * 定时任务：每 30 秒刷新一次价格
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async refreshAllPrices(): Promise<void> {
    if (!this.priceOracleAddress) {
      return;
    }

    this.logger.debug('🔄 Refreshing prices from PriceOracle...');

    try {
      // 获取所有已配置的代币地址
      const tokens = await this.tokenPriceRepository.find({
        where: { isActive: true },
      });

      if (tokens.length === 0) {
        this.logger.warn('No tokens configured for price refresh');
        return;
      }

      // 批量从链上读取价格
      const tokenAddresses = tokens.map(t => t.tokenAddress as `0x${string}`);
      
      for (const tokenAddress of tokenAddresses) {
        try {
          await this.fetchAndSaveTokenPrice(tokenAddress);
        } catch (error) {
          this.logger.error(`Failed to refresh price for ${tokenAddress}:`, error.message);
        }
      }

      this.lastRefreshTime = new Date();
      this.logger.debug(`✅ Prices refreshed: ${tokens.length} tokens`);
    } catch (error) {
      this.logger.error('Failed to refresh prices:', error);
    }
  }

  /**
   * 从链上获取并保存代币价格
   */
  private async fetchAndSaveTokenPrice(tokenAddress: string): Promise<void> {
    const tokenAddressLower = tokenAddress.toLowerCase();

    // 检查是否有价格源
    const hasFeed = await this.publicClient.readContract({
      address: this.priceOracleAddress as `0x${string}`,
      abi: this.priceOracleAbi,
      functionName: 'hasPriceFeed',
      args: [tokenAddress as `0x${string}`],
    });

    if (!hasFeed) {
      this.logger.warn(`No price feed for token ${tokenAddress}`);
      return;
    }

    // 读取价格（返回 uint256，8 位小数）
    const priceRaw = await this.publicClient.readContract({
      address: this.priceOracleAddress as `0x${string}`,
      abi: this.priceOracleAbi,
      functionName: 'getPrice',
      args: [tokenAddress as `0x${string}`],
    }) as bigint;

    // Chainlink 价格统一使用 8 位小数
    const decimals = 8;

    // 转换价格
    let priceUsd = '0';
    if (priceRaw > 0n) {
      priceUsd = formatUnits(priceRaw, decimals);
    }

    // 读取价格源地址
    const feedInfo = await this.publicClient.readContract({
      address: this.priceOracleAddress as `0x${string}`,
      abi: this.priceOracleAbi,
      functionName: 'getPriceFeedInfo',
      args: [tokenAddress as `0x${string}`],
    }) as [string, number, string, bigint];
    
    const priceFeedAddress = feedInfo[0];

    // 读取代币符号
    let symbol = 'UNKNOWN';
    try {
      symbol = await this.publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: this.erc20Abi,
        functionName: 'symbol',
      });
    } catch (error) {
      this.logger.warn(`Failed to read symbol for ${tokenAddress}`);
    }

    // 获取当前区块
    const currentBlock = await this.publicClient.getBlockNumber();

    // 保存或更新数据库
    let tokenPrice = await this.tokenPriceRepository.findOne({
      where: { tokenAddress: tokenAddressLower },
    });

    if (!tokenPrice) {
      tokenPrice = this.tokenPriceRepository.create({
        tokenAddress: tokenAddressLower,
        symbol,
        priceUsd,
        priceFeedAddress: priceFeedAddress.toLowerCase(),
        lastUpdateBlock: currentBlock.toString(),
        lastUpdateTime: new Date(),
        decimals: Number(decimals),
        isActive: true,
      });
    } else {
      tokenPrice.priceUsd = priceUsd;
      tokenPrice.priceFeedAddress = priceFeedAddress.toLowerCase();
      tokenPrice.lastUpdateBlock = currentBlock.toString();
      tokenPrice.lastUpdateTime = new Date();
      tokenPrice.decimals = Number(decimals);
    }

    await this.tokenPriceRepository.save(tokenPrice);

    // 更新内存缓存
    const dto = this.toTokenPriceDto(tokenPrice);
    this.priceCache.set(tokenAddressLower, dto);

    this.logger.debug(`💰 ${symbol}: $${priceUsd}`);
  }

  /**
   * 手动添加代币到价格追踪
   */
  async addTokenForPriceTracking(tokenAddress: string, symbol?: string): Promise<void> {
    const tokenAddressLower = tokenAddress.toLowerCase();

    // 检查是否已存在
    const existing = await this.tokenPriceRepository.findOne({
      where: { tokenAddress: tokenAddressLower },
    });

    if (existing) {
      this.logger.log(`Token ${tokenAddress} already tracked`);
      return;
    }

    // 如果未提供 symbol，尝试从链上读取
    if (!symbol) {
      try {
        symbol = await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: this.erc20Abi,
          functionName: 'symbol',
        });
      } catch (error) {
        symbol = 'UNKNOWN';
      }
    }

    // 创建记录
    const tokenPrice = this.tokenPriceRepository.create({
      tokenAddress: tokenAddressLower,
      symbol: symbol || 'UNKNOWN',
      priceUsd: '0',
      isActive: true,
      decimals: 8,
    });

    await this.tokenPriceRepository.save(tokenPrice);
    this.logger.log(`✅ Added token ${symbol} (${tokenAddress}) for price tracking`);

    // 立即获取价格
    try {
      await this.fetchAndSaveTokenPrice(tokenAddress);
    } catch (error) {
      this.logger.warn(`Failed to fetch initial price for ${tokenAddress}`);
    }
  }

  /**
   * 清除价格缓存
   */
  clearCache(): void {
    this.priceCache.clear();
    this.logger.log('Price cache cleared');
  }

  // ============================================
  // 辅助方法
  // ============================================

  private toTokenPriceDto(tokenPrice: TokenPrice): TokenPriceDto {
    return {
      tokenAddress: tokenPrice.tokenAddress,
      symbol: tokenPrice.symbol,
      priceUsd: tokenPrice.priceUsd,
      lastUpdateTime: tokenPrice.lastUpdateTime,
      isActive: tokenPrice.isActive,
    };
  }
}

