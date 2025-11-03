import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { CacheProvider } from '../../providers/cache/cache.provider';
import { Token } from './entities/token.entity';
import {
  TokenInfoDto,
  TokenListQueryDto,
  TokenListResponseDto,
} from './dto/token.dto';

/**
 * Token Service
 * 负责代币信息的查询、缓存和管理
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  // Redis 缓存 TTL
  private readonly TOKEN_INFO_CACHE_TTL = 3600; // 1 小时
  private readonly TOKEN_LIST_CACHE_TTL = 300; // 5 分钟

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly cacheProvider: CacheProvider,
  ) {}

  /**
   * 获取代币信息（优先级：缓存 -> 数据库 -> 链上）
   */
  async getTokenInfo(address: string): Promise<TokenInfoDto> {
    const normalizedAddress = address.toLowerCase();
    const cacheKey = `token:${normalizedAddress}`;

    try {
      // 1. 尝试从 Redis 缓存获取
      const cached = await this.cacheProvider.get(cacheKey);
      if (cached) {
        this.logger.debug(`从缓存获取代币信息: ${address}`);
        return JSON.parse(cached);
      }

      // 2. 尝试从数据库获取
      let token = await this.tokenRepository.findOne({
        where: { address: normalizedAddress },
      });

      if (token) {
        this.logger.debug(`从数据库获取代币信息: ${address}`);
      } else {
        // 3. 从链上查询并保存
        this.logger.debug(`从链上查询代币信息: ${address}`);
        token = await this.fetchAndSaveTokenFromChain(normalizedAddress);
      }

      // 构建响应
      const response: TokenInfoDto = {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        totalSupply: token.totalSupply,
        logoUrl: token.logoUrl,
        isVerified: token.isVerified,
        description: token.description,
        website: token.website,
        timestamp: Date.now(),
      };

      // 缓存到 Redis
      await this.cacheProvider.set(
        cacheKey,
        JSON.stringify(response),
        this.TOKEN_INFO_CACHE_TTL,
      );

      return response;
    } catch (error) {
      this.logger.error(`获取代币信息失败: ${address}`, error.stack);
      throw new NotFoundException(`Token not found or invalid: ${address}`);
    }
  }

  /**
   * 批量获取代币信息
   */
  async getBatchTokenInfo(addresses: string[]): Promise<TokenInfoDto[]> {
    this.logger.debug(`批量查询代币信息: ${addresses.length} 个`);

    // 并行查询所有代币
    const promises = addresses.map((address) =>
      this.getTokenInfo(address).catch((error) => {
        this.logger.warn(`查询代币失败 ${address}: ${error.message}`);
        return null;
      }),
    );

    const results = await Promise.all(promises);

    // 过滤掉失败的查询
    return results.filter((result): result is TokenInfoDto => result !== null);
  }

  /**
   * 获取代币列表（分页）
   */
  async getTokenList(
    query: TokenListQueryDto,
  ): Promise<TokenListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    
    this.logger.debug(`查询代币列表: page=${page}, limit=${limit}`);
    
    try {
      // 查询数据库
      const total = await this.tokenRepository.count();
      const tokens = await this.tokenRepository.find({
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });
      
      this.logger.debug(`查询到 ${total} 个代币`);
      
      // 构建响应
      const tokenList: TokenInfoDto[] = tokens.map((token) => ({
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        totalSupply: token.totalSupply,
        logoUrl: token.logoUrl,
        isVerified: token.isVerified,
        description: token.description,
        website: token.website,
        timestamp: Date.now(),
      }));
      
      return {
        tokens: tokenList,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`获取代币列表失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 从链上获取代币信息并保存到数据库
   */
  private async fetchAndSaveTokenFromChain(
    address: string,
  ): Promise<Token> {
    try {
      // 并行查询代币的多个属性
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.getTokenName(address),
        this.getTokenSymbol(address),
        this.blockchainProvider.getTokenDecimals(address),
        this.getTokenTotalSupply(address),
      ]);

      // 创建并保存实体
      const token = this.tokenRepository.create({
        address,
        name: name || 'Unknown',
        symbol: symbol || 'UNKNOWN',
        decimals,
        totalSupply,
        isVerified: false,
      });

      await this.tokenRepository.save(token);

      this.logger.log(`已保存代币信息到数据库: ${symbol} (${address})`);

      return token;
    } catch (error) {
      this.logger.error(`从链上获取代币信息失败: ${address}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取代币名称
   */
  private async getTokenName(address: string): Promise<string | undefined> {
    try {
      const result = await this.blockchainProvider.readContract(
        address,
        'function name() view returns (string)',
        'name',
        [],
      );
      return result as string;
    } catch (error) {
      this.logger.warn(`获取代币名称失败: ${address}`);
      return undefined;
    }
  }

  /**
   * 获取代币符号
   */
  private async getTokenSymbol(address: string): Promise<string | undefined> {
    try {
      const result = await this.blockchainProvider.readContract(
        address,
        'function symbol() view returns (string)',
        'symbol',
        [],
      );
      return result as string;
    } catch (error) {
      this.logger.warn(`获取代币符号失败: ${address}`);
      return undefined;
    }
  }

  /**
   * 获取代币总供应量
   */
  private async getTokenTotalSupply(
    address: string,
  ): Promise<string | undefined> {
    try {
      const result = await this.blockchainProvider.readContract(
        address,
        'function totalSupply() view returns (uint256)',
        'totalSupply',
        [],
      );
      return result?.toString();
    } catch (error) {
      this.logger.warn(`获取代币总供应量失败: ${address}`);
      return undefined;
    }
  }

  /**
   * 更新代币信息（手动触发）
   */
  async updateTokenInfo(address: string): Promise<TokenInfoDto> {
    const normalizedAddress = address.toLowerCase();

    // 清除缓存
    const cacheKey = `token:${normalizedAddress}`;
    await this.cacheProvider.del(cacheKey);

    // 从数据库删除旧数据
    await this.tokenRepository.delete({ address: normalizedAddress });

    // 重新获取
    return this.getTokenInfo(normalizedAddress);
  }

  /**
   * 标记代币为已验证（管理员功能）
   */
  async verifyToken(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();

    await this.tokenRepository.update(
      { address: normalizedAddress },
      { isVerified: true },
    );

    // 清除缓存
    const cacheKey = `token:${normalizedAddress}`;
    await this.cacheProvider.del(cacheKey);

    this.logger.log(`代币已标记为已验证: ${address}`);
  }
}

