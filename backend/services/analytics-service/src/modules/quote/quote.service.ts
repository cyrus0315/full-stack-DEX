import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { CacheProvider } from '../../providers/cache/cache.provider';
import { ConfigService } from '@nestjs/config';
import {
  QuoteRequestDto,
  QuoteResponseDto,
  QuoteExactOutRequestDto,
  QuoteExactOutResponseDto,
  PriceInfoDto,
  BatchQuoteRequestDto,
  BatchQuoteResponseDto,
  EnhancedQuoteResponseDto,
  MinimumReceivedDto,
  RecommendationDto,
} from './dto/quote.dto';
import { Address } from 'viem';

/**
 * Quote Service - 价格查询服务
 * 提供价格查询、滑点计算、价格影响评估等功能
 */
@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  private readonly priceCacheTtl: number;

  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    private readonly cacheProvider: CacheProvider,
    private readonly configService: ConfigService,
  ) {
    this.priceCacheTtl = this.configService.get<number>('cache.priceTtl', 10);
  }

  /**
   * 获取精确输入的报价
   */
  async getQuote(request: QuoteRequestDto): Promise<QuoteResponseDto> {
    const { tokenIn, tokenOut, amountIn, slippage = 0.5 } = request;

    this.logger.log(`Get quote: ${tokenIn} -> ${tokenOut}, amount: ${amountIn}`);

    // 获取交易对地址
    const pairAddress = await this.blockchainProvider.getPair(
      tokenIn as Address,
      tokenOut as Address,
    );

    if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
      throw new NotFoundException('Trading pair does not exist');
    }

    // 获取储备量
    const reserves = await this.blockchainProvider.getReserves(pairAddress as Address);

    // 获取交易对的代币顺序
    const { token0, token1 } = await this.blockchainProvider.getPairTokens(
      pairAddress as Address,
    );

    // 确定储备量顺序
    const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
    const reserveIn = isToken0In ? reserves.reserve0 : reserves.reserve1;
    const reserveOut = isToken0In ? reserves.reserve1 : reserves.reserve0;

    // 计算输出金额
    const amountInBigInt = BigInt(amountIn);
    const amountOutBigInt = this.blockchainProvider.getAmountOut(
      amountInBigInt,
      reserveIn,
      reserveOut,
    );

    // 计算最小输出金额（考虑滑点）
    const amountOutMin = this.calculateAmountOutMin(amountOutBigInt, slippage);

    // 计算价格
    const price = this.calculatePrice(amountOutBigInt, amountInBigInt);

    // 计算价格影响
    const priceImpact = this.calculatePriceImpact(
      amountInBigInt,
      amountOutBigInt,
      reserveIn,
      reserveOut,
    );

    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: amountOutBigInt.toString(),
      amountOutMin: amountOutMin.toString(),
      price,
      priceImpact,
      path: [tokenIn, tokenOut],
      pairAddress,
      reserve0: reserves.reserve0.toString(),
      reserve1: reserves.reserve1.toString(),
    };
  }

  /**
   * 获取精确输出的报价
   */
  async getQuoteExactOut(
    request: QuoteExactOutRequestDto,
  ): Promise<QuoteExactOutResponseDto> {
    const { tokenIn, tokenOut, amountOut, slippage = 0.5 } = request;

    this.logger.log(
      `Get quote exact out: ${tokenIn} -> ${tokenOut}, amount out: ${amountOut}`,
    );

    // 获取交易对地址
    const pairAddress = await this.blockchainProvider.getPair(
      tokenIn as Address,
      tokenOut as Address,
    );

    if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
      throw new NotFoundException('Trading pair does not exist');
    }

    // 获取储备量
    const reserves = await this.blockchainProvider.getReserves(pairAddress as Address);

    // 获取交易对的代币顺序
    const { token0, token1 } = await this.blockchainProvider.getPairTokens(
      pairAddress as Address,
    );

    // 确定储备量顺序
    const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
    const reserveIn = isToken0In ? reserves.reserve0 : reserves.reserve1;
    const reserveOut = isToken0In ? reserves.reserve1 : reserves.reserve0;

    // 计算输入金额
    const amountOutBigInt = BigInt(amountOut);
    const amountInBigInt = this.blockchainProvider.getAmountIn(
      amountOutBigInt,
      reserveIn,
      reserveOut,
    );

    // 计算最大输入金额（考虑滑点）
    const amountInMax = this.calculateAmountInMax(amountInBigInt, slippage);

    // 计算价格
    const price = this.calculatePrice(amountOutBigInt, amountInBigInt);

    // 计算价格影响
    const priceImpact = this.calculatePriceImpact(
      amountInBigInt,
      amountOutBigInt,
      reserveIn,
      reserveOut,
    );

    return {
      tokenIn,
      tokenOut,
      amountIn: amountInBigInt.toString(),
      amountInMax: amountInMax.toString(),
      amountOut,
      price,
      priceImpact,
      path: [tokenIn, tokenOut],
    };
  }

  /**
   * 批量查询价格
   */
  async getBatchQuote(request: BatchQuoteRequestDto): Promise<BatchQuoteResponseDto> {
    this.logger.log(`Batch quote: ${request.quotes.length} queries`);

    const results = await Promise.all(
      request.quotes.map(async (quote) => {
        try {
          return await this.getQuote(quote);
        } catch (error) {
          this.logger.warn(`Failed to get quote: ${error.message}`);
          return null;
        }
      }),
    );

    return { results };
  }

  /**
   * 获取价格信息
   */
  async getPriceInfo(token0: string, token1: string): Promise<PriceInfoDto> {
    const cacheKey = `price:${token0.toLowerCase()}:${token1.toLowerCase()}`;

    // 尝试从缓存获取
    const cached = await this.cacheProvider.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 获取交易对地址
    const pairAddress = await this.blockchainProvider.getPair(
      token0 as Address,
      token1 as Address,
    );

    if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
      throw new NotFoundException('Trading pair does not exist');
    }

    // 获取储备量
    const reserves = await this.blockchainProvider.getReserves(pairAddress as Address);

    // 获取交易对的代币顺序
    const pairTokens = await this.blockchainProvider.getPairTokens(
      pairAddress as Address,
    );

    // 确定储备量顺序
    const isToken0First = token0.toLowerCase() === pairTokens.token0.toLowerCase();
    const reserve0 = isToken0First ? reserves.reserve0 : reserves.reserve1;
    const reserve1 = isToken0First ? reserves.reserve1 : reserves.reserve0;

    // 计算价格
    const price = this.calculatePrice(reserve1, reserve0);
    const inversePrice = this.calculatePrice(reserve0, reserve1);

    const priceInfo: PriceInfoDto = {
      token0,
      token1,
      price,
      inversePrice,
      reserve0: reserve0.toString(),
      reserve1: reserve1.toString(),
      lastUpdate: reserves.blockTimestampLast,
    };

    // 缓存结果
    await this.cacheProvider.set(
      cacheKey,
      JSON.stringify(priceInfo),
      this.priceCacheTtl,
    );

    return priceInfo;
  }

  /**
   * 计算最小输出金额（考虑滑点）
   */
  private calculateAmountOutMin(amountOut: bigint, slippage: number): bigint {
    const slippageBp = BigInt(Math.floor(slippage * 100)); // 转换为基点
    return (amountOut * (10000n - slippageBp)) / 10000n;
  }

  /**
   * 计算最大输入金额（考虑滑点）
   */
  private calculateAmountInMax(amountIn: bigint, slippage: number): bigint {
    const slippageBp = BigInt(Math.floor(slippage * 100)); // 转换为基点
    return (amountIn * (10000n + slippageBp)) / 10000n;
  }

  /**
   * 计算价格
   */
  private calculatePrice(amountOut: bigint, amountIn: bigint): string {
    if (amountIn === 0n) {
      return '0';
    }

    // 使用高精度计算
    const price = (Number(amountOut) * 1e18) / Number(amountIn);
    return (price / 1e18).toFixed(18);
  }

  /**
   * 获取增强报价（包含完整分析）
   */
  async getEnhancedQuote(request: QuoteRequestDto): Promise<EnhancedQuoteResponseDto> {
    const { tokenIn, tokenOut, amountIn } = request;

    this.logger.log(`Get enhanced quote: ${tokenIn} -> ${tokenOut}, amount: ${amountIn}`);

    // 1. 获取基础报价
    const baseQuote = await this.getQuote(request);

    // 2. 计算不同滑点下的最小接收量
    const amountOutBigInt = BigInt(baseQuote.amountOut);
    const minimumReceived: MinimumReceivedDto = {
      '0.5': this.applySlippage(amountOutBigInt, 50).toString(),
      '1.0': this.applySlippage(amountOutBigInt, 100).toString(),
      '5.0': this.applySlippage(amountOutBigInt, 500).toString(),
    };

    // 3. 计算交易前后价格
    const reserve0 = BigInt(baseQuote.reserve0);
    const reserve1 = BigInt(baseQuote.reserve1);
    const amountInBigInt = BigInt(amountIn);

    const priceBeforeSwap = this.calculatePrice(reserve1, reserve0);
    
    // 交易后新储备量
    const newReserve0 = reserve0 + amountInBigInt;
    const newReserve1 = reserve1 - amountOutBigInt;
    const priceAfterSwap = this.calculatePrice(newReserve1, newReserve0);

    // 4. 评估流动性深度
    const liquidityDepth = this.assessLiquidityDepth(reserve0, reserve1, amountInBigInt);

    // 5. 推荐滑点
    const priceImpactNum = parseFloat(baseQuote.priceImpact);
    const recommendation = this.getRecommendation(priceImpactNum, liquidityDepth);

    // 6. 执行价格
    const executionPrice = this.calculatePrice(amountOutBigInt, amountInBigInt);

    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: baseQuote.amountOut,
      priceImpact: baseQuote.priceImpact,
      executionPrice,
      route: [tokenIn, tokenOut],
      minimumReceived,
      priceBeforeSwap,
      priceAfterSwap,
      liquidityDepth,
      gasEstimate: '150000', // 估算值，实际可以从链上读取
      recommendation,
      pairAddress: baseQuote.pairAddress,
      reserve0: baseQuote.reserve0,
      reserve1: baseQuote.reserve1,
    };
  }

  /**
   * 应用滑点
   * @param amount 金额
   * @param slippageBps 滑点（基点，50 = 0.5%, 100 = 1%, 500 = 5%）
   */
  private applySlippage(amount: bigint, slippageBps: number): bigint {
    return (amount * (10000n - BigInt(slippageBps))) / 10000n;
  }

  /**
   * 评估流动性深度
   */
  private assessLiquidityDepth(
    reserve0: bigint,
    reserve1: bigint,
    amountIn: bigint,
  ): string {
    // 计算交易量占总流动性的比例
    const liquidityRatio = Number(amountIn) / Number(reserve0);

    if (liquidityRatio < 0.01) {
      return 'high'; // < 1%
    } else if (liquidityRatio < 0.05) {
      return 'medium'; // 1-5%
    } else {
      return 'low'; // > 5%
    }
  }

  /**
   * 获取推荐信息
   */
  private getRecommendation(
    priceImpact: number,
    liquidityDepth: string,
  ): RecommendationDto {
    let suggestedSlippage = 0.5;
    let warning: string | null = null;

    if (priceImpact < 0.5) {
      suggestedSlippage = 0.5;
    } else if (priceImpact < 2) {
      suggestedSlippage = 1.0;
    } else if (priceImpact < 5) {
      suggestedSlippage = 2.0;
      warning = 'Moderate price impact. Consider reducing trade size.';
    } else if (priceImpact < 10) {
      suggestedSlippage = 5.0;
      warning = 'High price impact! Consider splitting into multiple trades.';
    } else {
      suggestedSlippage = Math.max(5.0, Math.ceil(priceImpact));
      warning = 'Very high price impact! Trade at your own risk.';
    }

    if (liquidityDepth === 'low') {
      warning = warning || 'Low liquidity pool. Exercise caution.';
    }

    return {
      suggestedSlippage,
      warning,
    };
  }

  /**
   * 计算价格影响
   * Price Impact = (1 - (amountOut * reserveIn) / (amountIn * reserveOut)) * 100
   */
  private calculatePriceImpact(
    amountIn: bigint,
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
  ): string {
    if (amountIn === 0n || reserveOut === 0n) {
      return '0';
    }

    try {
      // 理论输出（无滑点）
      const expectedOut = (amountIn * reserveOut) / reserveIn;

      // 价格影响百分比
      const impact = ((expectedOut - amountOut) * 10000n) / expectedOut;

      return (Number(impact) / 100).toFixed(2);
    } catch (error) {
      this.logger.warn('Failed to calculate price impact', error);
      return '0';
    }
  }
}

