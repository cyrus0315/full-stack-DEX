import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatUnits } from 'viem';
import { BlockchainProvider } from '@providers/blockchain/blockchain.provider';
import { CacheProvider } from '@providers/cache/cache.provider';
import {
  BalanceResponseDto,
  BatchBalanceRequestDto,
  BatchBalanceResponseDto,
  AllBalancesResponseDto,
} from './dto/balance.dto';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);
  private readonly balanceCacheTTL: number;

  // 缓存键前缀
  private readonly CACHE_PREFIX = {
    ETH: 'balance:eth:',
    TOKEN: 'balance:token:',
    TOKEN_INFO: 'token:info:',
  };

  constructor(
    private blockchainProvider: BlockchainProvider,
    private cacheProvider: CacheProvider,
    private configService: ConfigService,
  ) {
    this.balanceCacheTTL = this.configService.get('cache.ttl.balance', 10);
  }

  /**
   * 查询 ETH 余额
   */
  async getEthBalance(address: string): Promise<BalanceResponseDto> {
    this.validateAddress(address);

    const cacheKey = `${this.CACHE_PREFIX.ETH}${address}`;

    // 1. 先查缓存
    const cached = await this.cacheProvider.get(cacheKey);
    if (cached) {
      this.logger.debug(`ETH 余额缓存命中: ${address}`);
      return JSON.parse(cached);
    }

    // 2. 查询链上余额
    this.logger.debug(`查询链上 ETH 余额: ${address}`);
    const balance = await this.blockchainProvider.getEthBalance(address);

    // 3. 构造响应
    const response: BalanceResponseDto = {
      address,
      balance,
      decimals: 18,
      symbol: 'ETH',
      name: 'Ethereum',
      timestamp: Date.now(),
    };

    // 4. 写入缓存
    await this.cacheProvider.set(
      cacheKey,
      JSON.stringify(response),
      this.balanceCacheTTL,
    );

    return response;
  }

  /**
   * 查询 ERC20 代币余额
   */
  async getTokenBalance(
    address: string,
    tokenAddress: string,
  ): Promise<BalanceResponseDto> {
    this.validateAddress(address);
    this.validateAddress(tokenAddress);

    const cacheKey = `${this.CACHE_PREFIX.TOKEN}${address}:${tokenAddress}`;

    // 1. 先查缓存
    const cached = await this.cacheProvider.get(cacheKey);
    if (cached) {
      this.logger.debug(`代币余额缓存命中: ${address} - ${tokenAddress}`);
      return JSON.parse(cached);
    }

    // 2. 并行查询余额和代币信息
    const [balanceRaw, decimals, symbol, name] = await Promise.all([
      this.blockchainProvider.getTokenBalance(tokenAddress, address),
      this.getTokenDecimals(tokenAddress),
      this.getTokenSymbol(tokenAddress),
      this.getTokenName(tokenAddress),
    ]);

    // 3. 格式化余额
    const balance = formatUnits(balanceRaw, decimals);

    // 4. 构造响应
    const response: BalanceResponseDto = {
      address,
      balance,
      decimals,
      symbol,
      name,
      timestamp: Date.now(),
    };

    // 5. 写入缓存
    await this.cacheProvider.set(
      cacheKey,
      JSON.stringify(response),
      this.balanceCacheTTL,
    );

    return response;
  }

  /**
   * 批量查询余额
   */
  async getBatchBalances(
    dto: BatchBalanceRequestDto,
  ): Promise<BatchBalanceResponseDto[]> {
    const { addresses, tokens } = dto;
    const results: BatchBalanceResponseDto[] = [];

    // 1. 如果没有指定代币，只查询 ETH
    if (!tokens || tokens.length === 0) {
      for (const address of addresses) {
        const ethBalance = await this.getEthBalance(address);
        results.push({
          address,
          token: null,
          balance: ethBalance.balance,
          decimals: 18,
          symbol: 'ETH',
        });
      }
      return results;
    }

    // 2. 查询所有地址 × 所有代币的余额
    const queries: Promise<{
      address: string;
      token: string;
      balance: string;
      decimals: number;
      symbol: string | undefined;
    } | null>[] = [];
    
    for (const address of addresses) {
      for (const token of tokens) {
        queries.push(
          this.getTokenBalance(address, token)
            .then((result) => ({
              address,
              token,
              balance: result.balance,
              decimals: result.decimals,
              symbol: result.symbol,
            }))
            .catch((error) => {
              this.logger.error(`批量查询失败: ${address} - ${token}`, error);
              return null;
            }),
        );
      }
    }

    // 3. 并行执行所有查询
    const allResults = await Promise.all(queries);

    // 4. 过滤掉失败的查询
    return allResults.filter((r) => r !== null) as BatchBalanceResponseDto[];
  }

  /**
   * 查询用户所有余额（ETH + 常用代币）
   */
  async getAllBalances(address: string): Promise<AllBalancesResponseDto> {
    this.validateAddress(address);

    // 常用代币列表（可以从数据库或配置读取）
    const commonTokens = this.getCommonTokens();

    const balances: Record<string, any> = {};
    let totalValueUsd = 0;

    // 1. 查询 ETH 余额
    try {
      const ethBalance = await this.getEthBalance(address);
      balances['ETH'] = {
        balance: ethBalance.balance,
        decimals: ethBalance.decimals,
        valueUsd: '0.00', // TODO: 集成价格 API
      };
    } catch (error) {
      this.logger.error(`查询 ETH 余额失败: ${address}`, error);
    }

    // 2. 并行查询所有代币余额
    const tokenQueries = commonTokens.map(async (token) => {
      try {
        const balance = await this.getTokenBalance(address, token.address);
        return {
          symbol: token.symbol,
          balance: balance.balance,
          decimals: balance.decimals,
          valueUsd: '0.00', // TODO: 集成价格 API
        };
      } catch (error) {
        this.logger.error(`查询代币余额失败: ${token.symbol}`, error);
        return null;
      }
    });

    const tokenResults = await Promise.all(tokenQueries);

    // 3. 过滤掉余额为 0 的代币
    tokenResults.forEach((result) => {
      if (result && parseFloat(result.balance) > 0) {
        balances[result.symbol] = result;
      }
    });

    return {
      address,
      balances,
      totalValueUsd: totalValueUsd.toFixed(2),
      timestamp: Date.now(),
    };
  }

  /**
   * 获取代币 decimals（带缓存）
   */
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    const cacheKey = `${this.CACHE_PREFIX.TOKEN_INFO}${tokenAddress}:decimals`;
    const cached = await this.cacheProvider.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    const decimals = await this.blockchainProvider.getTokenDecimals(
      tokenAddress,
    );
    await this.cacheProvider.set(cacheKey, decimals.toString(), 3600); // 1小时缓存

    return decimals;
  }

  /**
   * 获取代币 symbol（带缓存）
   */
  private async getTokenSymbol(tokenAddress: string): Promise<string> {
    const cacheKey = `${this.CACHE_PREFIX.TOKEN_INFO}${tokenAddress}:symbol`;
    const cached = await this.cacheProvider.get(cacheKey);

    if (cached) {
      return cached;
    }

    const symbol = await this.blockchainProvider.getTokenSymbol(tokenAddress);
    await this.cacheProvider.set(cacheKey, symbol, 3600);

    return symbol;
  }

  /**
   * 获取代币 name（带缓存）
   */
  private async getTokenName(tokenAddress: string): Promise<string> {
    const cacheKey = `${this.CACHE_PREFIX.TOKEN_INFO}${tokenAddress}:name`;
    const cached = await this.cacheProvider.get(cacheKey);

    if (cached) {
      return cached;
    }

    const name = await this.blockchainProvider.getTokenName(tokenAddress);
    await this.cacheProvider.set(cacheKey, name, 3600);

    return name;
  }

  /**
   * 验证以太坊地址格式
   */
  private validateAddress(address: string): void {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException(`Invalid Ethereum address: ${address}`);
    }
  }

  /**
   * 获取常用代币列表
   * TODO: 从数据库读取
   */
  private getCommonTokens() {
    // Sepolia 测试网常用代币
    return [
      {
        symbol: 'USDT',
        address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
      },
      {
        symbol: 'USDC',
        address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Sepolia USDC
      },
      // 可以添加更多代币
    ];
  }
}

