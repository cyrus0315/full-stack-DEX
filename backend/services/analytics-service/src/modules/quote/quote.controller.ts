import { Controller, Post, Get, Body, Query, Logger, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import {
  QuoteRequestDto,
  QuoteResponseDto,
  QuoteExactOutRequestDto,
  QuoteExactOutResponseDto,
  PriceInfoDto,
  BatchQuoteRequestDto,
  BatchQuoteResponseDto,
  EnhancedQuoteResponseDto,
} from './dto/quote.dto';

/**
 * Quote Controller - 价格查询接口
 */
@ApiTags('Quote')
@Controller('quote')
export class QuoteController {
  private readonly logger = new Logger(QuoteController.name);

  constructor(private readonly quoteService: QuoteService) {}

  /**
   * 获取价格报价（精确输入）
   */
  @Post()
  @ApiOperation({ summary: '获取交易报价（指定输入金额）' })
  @ApiResponse({ status: 200, description: '成功', type: QuoteResponseDto })
  @ApiResponse({ status: 404, description: '交易对不存在' })
  async getQuote(@Body() request: QuoteRequestDto): Promise<QuoteResponseDto> {
    this.logger.log(`Get quote: ${request.tokenIn} -> ${request.tokenOut}`);
    return await this.quoteService.getQuote(request);
  }

  /**
   * 获取增强报价（包含详细分析）
   */
  @Post('enhanced')
  @ApiOperation({ summary: '获取增强交易报价（包含滑点分析、推荐等）' })
  @ApiResponse({ status: 200, description: '成功', type: EnhancedQuoteResponseDto })
  @ApiResponse({ status: 404, description: '交易对不存在' })
  async getEnhancedQuote(@Body() request: QuoteRequestDto): Promise<EnhancedQuoteResponseDto> {
    this.logger.log(`Get enhanced quote: ${request.tokenIn} -> ${request.tokenOut}`);
    return await this.quoteService.getEnhancedQuote(request);
  }

  /**
   * 获取价格报价（精确输出）
   */
  @Post('exact-out')
  @ApiOperation({ summary: '获取交易报价（指定输出金额）' })
  @ApiResponse({ status: 200, description: '成功', type: QuoteExactOutResponseDto })
  @ApiResponse({ status: 404, description: '交易对不存在' })
  async getQuoteExactOut(
    @Body() request: QuoteExactOutRequestDto,
  ): Promise<QuoteExactOutResponseDto> {
    this.logger.log(`Get quote exact out: ${request.tokenIn} -> ${request.tokenOut}`);
    return await this.quoteService.getQuoteExactOut(request);
  }

  /**
   * 批量查询价格
   */
  @Post('batch')
  @ApiOperation({ summary: '批量查询价格' })
  @ApiResponse({ status: 200, description: '成功', type: BatchQuoteResponseDto })
  async getBatchQuote(
    @Body() request: BatchQuoteRequestDto,
  ): Promise<BatchQuoteResponseDto> {
    this.logger.log(`Batch quote: ${request.quotes.length} queries`);
    return await this.quoteService.getBatchQuote(request);
  }

  /**
   * 获取价格信息
   */
  @Get('price/:token0/:token1')
  @ApiOperation({ summary: '获取价格信息' })
  @ApiParam({ name: 'token0', description: 'Token0 地址' })
  @ApiParam({ name: 'token1', description: 'Token1 地址' })
  @ApiResponse({ status: 200, description: '成功', type: PriceInfoDto })
  @ApiResponse({ status: 404, description: '交易对不存在' })
  async getPriceInfo(
    @Param('token0') token0: string,
    @Param('token1') token1: string,
  ): Promise<PriceInfoDto> {
    this.logger.log(`Get price info: ${token0} - ${token1}`);
    return await this.quoteService.getPriceInfo(token0, token1);
  }
}

