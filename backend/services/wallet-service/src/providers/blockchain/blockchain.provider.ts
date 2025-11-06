import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  http,
  webSocket,
  parseAbi,
  formatUnits,
  PublicClient,
  parseEther,
} from 'viem';
import { localhost } from 'viem/chains';

@Injectable()
export class BlockchainProvider implements OnModuleInit {
  private readonly logger = new Logger(BlockchainProvider.name);
  private publicClient: PublicClient;
  private wsClient: PublicClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeClients();
  }

  /**
   * 初始化区块链客户端
   */
  private initializeClients() {
    const rpcUrl = this.configService.get('blockchain.rpcUrl');
    const wsUrl = this.configService.get('blockchain.wsUrl');

    this.logger.log(`Initializing blockchain clients...`);
    this.logger.log(`RPC URL: ${rpcUrl}`);

    // HTTP 客户端（用于查询）
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
   * 获取 HTTP 客户端
   */
  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  /**
   * 获取 WebSocket 客户端
   */
  getWsClient(): PublicClient {
    if (!this.wsClient) {
      throw new Error('WebSocket client not initialized');
    }
    return this.wsClient;
  }

  /**
   * 查询 ETH 余额
   */
  async getEthBalance(address: string): Promise<string> {
    try {
      const balance = await this.publicClient.getBalance({
        address: address as `0x${string}`,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      this.logger.error(`查询 ETH 余额失败: ${address}`, error);
      throw error;
    }
  }

  /**
   * 查询 ERC20 代币余额
   */
  async getTokenBalance(
    tokenAddress: string,
    userAddress: string,
  ): Promise<bigint> {
    try {
      const balance = await this.publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      });
      return balance as bigint;
    } catch (error) {
      this.logger.error(
        `查询代币余额失败: ${tokenAddress}, ${userAddress}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 查询代币 decimals
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const decimals = await this.publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals',
      });
      return decimals as number;
    } catch (error) {
      this.logger.error(`查询代币 decimals 失败: ${tokenAddress}`, error);
      throw error;
    }
  }

  /**
   * 查询代币 symbol
   */
  async getTokenSymbol(tokenAddress: string): Promise<string> {
    try {
      const symbol = await this.publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: parseAbi(['function symbol() view returns (string)']),
        functionName: 'symbol',
      });
      return symbol as string;
    } catch (error) {
      this.logger.error(`查询代币 symbol 失败: ${tokenAddress}`, error);
      throw error;
    }
  }

  /**
   * 查询代币 name
   */
  async getTokenName(tokenAddress: string): Promise<string> {
    try {
      const name = await this.publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: parseAbi(['function name() view returns (string)']),
        functionName: 'name',
      });
      return name as string;
    } catch (error) {
      this.logger.error(`查询代币 name 失败: ${tokenAddress}`, error);
      throw error;
    }
  }

  /**
   * 监听新区块
   */
  watchBlocks(callback: (blockNumber: bigint) => void) {
    if (!this.wsClient) {
      throw new Error('WebSocket client required for watching blocks');
    }

    return this.wsClient.watchBlockNumber({
      onBlockNumber: callback,
      emitOnBegin: true,
    });
  }

  /**
   * 监听合约事件
   */
  watchContractEvent(params: {
    address: string;
    eventName: string;
    abi: any[];
    onLogs: (logs: any[]) => void;
  }) {
    if (!this.wsClient) {
      throw new Error('WebSocket client required for watching events');
    }

    return this.wsClient.watchContractEvent({
      address: params.address as `0x${string}`,
      abi: params.abi,
      eventName: params.eventName,
      onLogs: params.onLogs,
    });
  }

  /**
   * 批量查询（使用 multicall）
   */
  async multicall(contracts: any[]) {
    try {
      return await this.publicClient.multicall({ contracts });
    } catch (error) {
      this.logger.error('Multicall 查询失败', error);
      throw error;
    }
  }

  /**
   * 通用合约读取方法
   * @param contractAddress 合约地址
   * @param abiFunction ABI 函数签名（Human-readable format）
   * @param functionName 函数名
   * @param args 参数数组
   */
  async readContract(
    contractAddress: string,
    abiFunction: string,
    functionName: string,
    args: any[],
  ): Promise<any> {
    try {
      const result = await this.publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: parseAbi([abiFunction]),
        functionName,
        args,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `读取合约失败: ${contractAddress}.${functionName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * 获取地址的字节码（判断是否为合约）
   */
  async getCode(address: string): Promise<string> {
    try {
      const code = await this.publicClient.getBytecode({
        address: address as `0x${string}`,
      });
      return code || '0x';
    } catch (error) {
      this.logger.error(`获取地址字节码失败: ${address}`, error);
      return '0x';
    }
  }

  /**
   * 获取交易详情
   */
  async getTransactionByHash(hash: string): Promise<any> {
    try {
      const tx = await this.publicClient.getTransaction({
        hash: hash as `0x${string}`,
      });
      return tx;
    } catch (error) {
      this.logger.error(`获取交易失败: ${hash}`, error);
      throw error;
    }
  }

  /**
   * 获取交易回执
   */
  async getTransactionReceipt(hash: string): Promise<any> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: hash as `0x${string}`,
      });
      return receipt;
    } catch (error) {
      this.logger.error(`获取交易回执失败: ${hash}`, error);
      throw error;
    }
  }

  /**
   * 获取区块信息
   */
  async getBlock(blockNumber: bigint): Promise<any> {
    try {
      const block = await this.publicClient.getBlock({
        blockNumber,
        includeTransactions: false,
      });
      return block;
    } catch (error) {
      this.logger.error(`获取区块失败: ${blockNumber}`, error);
      throw error;
    }
  }

  /**
   * 获取当前区块号
   */
  async getBlockNumber(): Promise<bigint> {
    try {
      return await this.publicClient.getBlockNumber();
    } catch (error) {
      this.logger.error('获取当前区块号失败', error);
      throw error;
    }
  }
}

