import { Controller, Get, Param, Post, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PriceService } from './price.service';
import { TokenPriceDto, AllPricesResponseDto } from './dto/price.dto';

/**
 * PriceController
 * 
 * 价格查询 API 控制器
 */
@ApiTags('价格预言机')
@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  /**
   * 获取所有代币价格
   */
  @Get()
  @ApiOperation({ summary: '获取所有代币价格' })
  @ApiResponse({ status: 200, description: '成功', type: AllPricesResponseDto })
  async getAllPrices(): Promise<AllPricesResponseDto> {
    return this.priceService.getAllPrices();
  }

  /**
   * 获取单个代币价格
   */
  @Get(':tokenAddress')
  @ApiOperation({ summary: '获取单个代币价格' })
  @ApiParam({ name: 'tokenAddress', description: '代币地址' })
  @ApiResponse({ status: 200, description: '成功', type: TokenPriceDto })
  @ApiResponse({ status: 404, description: '价格未找到' })
  async getTokenPrice(
    @Param('tokenAddress') tokenAddress: string,
  ): Promise<TokenPriceDto> {
    return this.priceService.getTokenPrice(tokenAddress);
  }

  /**
   * 计算代币的 USD 价值
   */
  @Get(':tokenAddress/value/:amount')
  @ApiOperation({ summary: '计算代币的 USD 价值' })
  @ApiParam({ name: 'tokenAddress', description: '代币地址' })
  @ApiParam({ name: 'amount', description: '代币数量' })
  @ApiResponse({ status: 200, description: '成功' })
  async calculateUsdValue(
    @Param('tokenAddress') tokenAddress: string,
    @Param('amount') amount: string,
  ): Promise<{ usdValue: string }> {
    const usdValue = await this.priceService.calculateUsdValue(tokenAddress, amount);
    return { usdValue };
  }

  /**
   * 手动刷新所有价格
   */
  @Post('refresh')
  @ApiOperation({ summary: '手动刷新所有价格' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  async refreshPrices(): Promise<{ message: string }> {
    await this.priceService.refreshAllPrices();
    return { message: 'Prices refresh triggered' };
  }

  /**
   * 添加代币到价格追踪
   */
  @Post('track')
  @ApiOperation({ summary: '添加代币到价格追踪' })
  @ApiResponse({ status: 200, description: '添加成功' })
  async addToken(
    @Body() body: { tokenAddress: string; symbol?: string },
  ): Promise<{ message: string }> {
    await this.priceService.addTokenForPriceTracking(body.tokenAddress, body.symbol);
    return { message: 'Token added for tracking' };
  }

  /**
   * 清除价格缓存
   */
  @Delete('cache')
  @ApiOperation({ summary: '清除价格缓存' })
  @ApiResponse({ status: 200, description: '缓存清除成功' })
  async clearCache(): Promise<{ message: string }> {
    this.priceService.clearCache();
    return { message: 'Cache cleared' };
  }
}

