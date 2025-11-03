import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  parseAbi,
  PublicClient,
  WalletClient,
  Address,
  parseUnits,
  formatUnits,
} from 'viem';
import { localhost } from 'viem/chains';

/**
 * Blockchain Provider for Trading Service
 * 提供与区块链交互的核心功能，专注于 DEX 交易操作
 */
@Injectable()
export class BlockchainProvider implements OnModuleInit {
  private readonly logger = new Logger(BlockchainProvider.name);
  private publicClient: PublicClient;
  private wsClient: PublicClient;

  // DEX 合约地址
  private factoryAddress: Address;
  private routerAddress: Address;
  private wethAddress: Address;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeClients();
    this.loadContractAddresses();
  }

  /**
   * 初始化区块链客户端
   */
  private async initializeClients() {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl');
    const wsUrl = this.configService.get<string>('blockchain.rpcWsUrl');

    this.logger.log(`Initializing blockchain clients...`);
    this.logger.log(`RPC URL: ${rpcUrl}`);

    // HTTP 客户端（用于查询和交易）
    this.publicClient = createPublicClient({
      chain: localhost,
      transport: http(rpcUrl),
    });

    // WebSocket 客户端（用于事件监听）
    if (wsUrl) {
      try {
        this.wsClient = createPublicClient({
          chain: localhost,
          transport: webSocket(wsUrl),
        });
        this.logger.log('WebSocket client initialized');
      } catch (error) {
        this.logger.warn('WebSocket client initialization failed', error);
      }
    }

    this.logger.log('Blockchain clients initialized successfully');
  }

  /**
   * 加载合约地址
   */
  private loadContractAddresses() {
    this.factoryAddress = this.configService.get<string>(
      'contracts.factory',
    ) as Address;
    this.routerAddress = this.configService.get<string>(
      'contracts.router',
    ) as Address;
    this.wethAddress = this.configService.get<string>(
      'contracts.weth',
    ) as Address;

    if (this.factoryAddress) {
      this.logger.log(`DEX Factory: ${this.factoryAddress}`);
    }
    if (this.routerAddress) {
      this.logger.log(`DEX Router: ${this.routerAddress}`);
    }
    if (this.wethAddress) {
      this.logger.log(`WETH: ${this.wethAddress}`);
    }
  }

  /**
   * 获取当前区块号
   */
  async getBlockNumber(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }

  /**
   * 读取合约方法
   */
  async readContract(params: {
    address: Address;
    abi: any;
    functionName: string;
    args?: any[];
  }): Promise<any> {
    return await this.publicClient.readContract({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args || [],
    });
  }

  /**
   * 批量读取合约
   */
  async multicall(contracts: any[]): Promise<any[]> {
    const results = await this.publicClient.multicall({
      contracts,
    });
    return results;
  }

  /**
   * 获取 ERC20 代币信息
   */
  async getTokenInfo(tokenAddress: Address) {
    const erc20Abi = parseAbi([
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)',
      'function totalSupply() view returns (uint256)',
    ]);

    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'name',
        }),
        this.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        this.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        this.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'totalSupply',
        }),
      ]);

      return {
        address: tokenAddress,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: totalSupply as bigint,
      };
    } catch (error) {
      this.logger.error(`Failed to get token info for ${tokenAddress}`, error);
      throw error;
    }
  }

  /**
   * 获取代币余额
   */
  async getTokenBalance(
    tokenAddress: Address,
    userAddress: Address,
  ): Promise<bigint> {
    const erc20Abi = parseAbi(['function balanceOf(address) view returns (uint256)']);

    return await this.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [userAddress],
    });
  }

  /**
   * 获取 Factory 中的交易对地址
   */
  async getPair(token0: Address, token1: Address): Promise<Address> {
    if (!this.factoryAddress) {
      throw new Error('Factory address not configured');
    }

    const factoryAbi = parseAbi([
      'function getPair(address, address) view returns (address)',
    ]);

    return await this.readContract({
      address: this.factoryAddress,
      abi: factoryAbi,
      functionName: 'getPair',
      args: [token0, token1],
    });
  }

  /**
   * 获取交易对的储备量
   */
  async getReserves(pairAddress: Address): Promise<{
    reserve0: bigint;
    reserve1: bigint;
    blockTimestampLast: number;
  }> {
    const pairAbi = parseAbi([
      'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    ]);

    const reserves = await this.readContract({
      address: pairAddress,
      abi: pairAbi,
      functionName: 'getReserves',
    });

    return {
      reserve0: reserves[0] as bigint,
      reserve1: reserves[1] as bigint,
      blockTimestampLast: reserves[2] as number,
    };
  }

  /**
   * 获取交易对的代币地址
   */
  async getPairTokens(pairAddress: Address): Promise<{
    token0: Address;
    token1: Address;
  }> {
    const pairAbi = parseAbi([
      'function token0() view returns (address)',
      'function token1() view returns (address)',
    ]);

    const [token0, token1] = await Promise.all([
      this.readContract({
        address: pairAddress,
        abi: pairAbi,
        functionName: 'token0',
      }),
      this.readContract({
        address: pairAddress,
        abi: pairAbi,
        functionName: 'token1',
      }),
    ]);

    return {
      token0: token0 as Address,
      token1: token1 as Address,
    };
  }

  /**
   * 获取 LP 代币总供应量
   */
  async getLpTotalSupply(pairAddress: Address): Promise<bigint> {
    const erc20Abi = parseAbi(['function totalSupply() view returns (uint256)']);

    return await this.readContract({
      address: pairAddress,
      abi: erc20Abi,
      functionName: 'totalSupply',
    });
  }

  /**
   * 获取用户的 LP 代币余额
   */
  async getLpBalance(pairAddress: Address, userAddress: Address): Promise<bigint> {
    return await this.getTokenBalance(pairAddress, userAddress);
  }

  /**
   * 计算输出金额（基于 x*y=k 公式）
   * amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
   */
  getAmountOut(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
  ): bigint {
    if (amountIn <= 0n) {
      throw new Error('Insufficient input amount');
    }
    if (reserveIn <= 0n || reserveOut <= 0n) {
      throw new Error('Insufficient liquidity');
    }

    const amountInWithFee = amountIn * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;

    return numerator / denominator;
  }

  /**
   * 计算输入金额（基于 x*y=k 公式）
   * amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997) + 1
   */
  getAmountIn(
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
  ): bigint {
    if (amountOut <= 0n) {
      throw new Error('Insufficient output amount');
    }
    if (reserveIn <= 0n || reserveOut <= 0n) {
      throw new Error('Insufficient liquidity');
    }
    if (amountOut >= reserveOut) {
      throw new Error('Insufficient reserve');
    }

    const numerator = reserveIn * amountOut * 1000n;
    const denominator = (reserveOut - amountOut) * 997n;

    return numerator / denominator + 1n;
  }

  /**
   * 计算最优添加流动性的金额
   */
  quote(amountA: bigint, reserveA: bigint, reserveB: bigint): bigint {
    if (amountA <= 0n) {
      throw new Error('Insufficient amount');
    }
    if (reserveA <= 0n || reserveB <= 0n) {
      throw new Error('Insufficient liquidity');
    }

    return (amountA * reserveB) / reserveA;
  }

  /**
   * 监听区块
   */
  watchBlocks(callback: (blockNumber: bigint) => void): () => void {
    if (!this.wsClient) {
      throw new Error('WebSocket client not initialized');
    }

    const unwatch = this.wsClient.watchBlocks({
      onBlock: (block) => {
        callback(block.number);
      },
    });

    return unwatch;
  }

  /**
   * 获取 Factory 地址
   */
  getFactoryAddress(): Address {
    return this.factoryAddress;
  }

  /**
   * 获取 Router 地址
   */
  getRouterAddress(): Address {
    return this.routerAddress;
  }

  /**
   * 获取 WETH 地址
   */
  getWethAddress(): Address {
    return this.wethAddress;
  }

  /**
   * 获取 Public Client
   */
  getPublicClient(): PublicClient {
    return this.publicClient;
  }
}

