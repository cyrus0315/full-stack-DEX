import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Logger,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PoolService } from './pool.service';
import { PoolUsdService } from './pool-usd.service';
import {
  CreatePoolDto,
  PoolListQueryDto,
  PoolInfoDto,
  PoolListResponseDto,
  UpdatePoolDto,
  PoolStatsDto,
} from './dto/pool.dto';

/**
 * Pool Controller - 流动性池管理接口
 */
@ApiTags('Pool')
@Controller('pool')
export class PoolController {
  private readonly logger = new Logger(PoolController.name);

  constructor(
    private readonly poolService: PoolService,
    private readonly poolUsdService: PoolUsdService,
  ) {}

  /**
   * 获取或创建池子
   */
  @Post()
  @ApiOperation({ summary: '获取或创建交易对池子' })
  @ApiResponse({ status: 201, description: '成功', type: PoolInfoDto })
  @ApiResponse({ status: 404, description: '交易对不存在' })
  async getOrCreatePool(@Body() createPoolDto: CreatePoolDto): Promise<PoolInfoDto> {
    this.logger.log(
      `Get or create pool: ${createPoolDto.token0Address} - ${createPoolDto.token1Address}`,
    );
    return await this.poolService.getOrCreatePool(createPoolDto);
  }

  /**
   * 获取池子列表
   */
  @Get()
  @ApiOperation({ summary: '获取池子列表' })
  @ApiResponse({ status: 200, description: '成功', type: PoolListResponseDto })
  async getPoolList(@Query() query: PoolListQueryDto): Promise<PoolListResponseDto> {
    this.logger.log(`Get pool list: page=${query.page}, limit=${query.limit}`);
    const result = await this.poolService.getPoolList(query);
    // 为所有池子添加 USD 价格信息
    result.pools = await this.poolUsdService.enrichPoolsWithUsdPrices(result.pools);
    return result;
  }

  /**
   * 获取池子统计信息
   */
  @Get('stats')
  @ApiOperation({ summary: '获取池子统计信息' })
  @ApiResponse({ status: 200, description: '成功', type: PoolStatsDto })
  async getPoolStats(): Promise<PoolStatsDto> {
    this.logger.log('Get pool stats');
    return await this.poolService.getPoolStats();
  }

  /**
   * 根据ID获取池子详情
   */
  @Get(':id')
  @ApiOperation({ summary: '根据ID获取池子详情' })
  @ApiParam({ name: 'id', description: '池子ID' })
  @ApiResponse({ status: 200, description: '成功', type: PoolInfoDto })
  @ApiResponse({ status: 404, description: '池子不存在' })
  async getPoolById(@Param('id', ParseIntPipe) id: number): Promise<PoolInfoDto> {
    this.logger.log(`Get pool by ID: ${id}`);
    const pool = await this.poolService.getPoolById(id);
    // 添加 USD 价格信息
    return this.poolUsdService.enrichPoolWithUsdPrices(pool);
  }

  /**
   * 刷新池子数据
   */
  @Post(':id/refresh')
  @ApiOperation({ summary: '从链上刷新池子数据' })
  @ApiParam({ name: 'id', description: '池子ID' })
  @ApiResponse({ status: 200, description: '成功', type: PoolInfoDto })
  @ApiResponse({ status: 404, description: '池子不存在' })
  async refreshPoolData(@Param('id', ParseIntPipe) id: number): Promise<PoolInfoDto> {
    this.logger.log(`Refresh pool data: ${id}`);
    return await this.poolService.refreshPoolData(id);
  }

  /**
   * 更新池子信息
   */
  @Put(':id')
  @ApiOperation({ summary: '更新池子信息' })
  @ApiParam({ name: 'id', description: '池子ID' })
  @ApiResponse({ status: 200, description: '成功', type: PoolInfoDto })
  @ApiResponse({ status: 404, description: '池子不存在' })
  async updatePool(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePoolDto,
  ): Promise<PoolInfoDto> {
    this.logger.log(`Update pool: ${id}`);
    return await this.poolService.updatePool(id, updateDto);
  }

  /**
   * 根据代币地址查询池子
   */
  @Get('pair/:token0/:token1')
  @ApiOperation({ summary: '根据代币地址查询池子' })
  @ApiParam({ name: 'token0', description: 'Token0 地址' })
  @ApiParam({ name: 'token1', description: 'Token1 地址' })
  @ApiResponse({ status: 200, description: '成功', type: PoolInfoDto })
  @ApiResponse({ status: 404, description: '池子不存在' })
  async findPoolByTokens(
    @Param('token0') token0: string,
    @Param('token1') token1: string,
  ): Promise<PoolInfoDto> {
    this.logger.log(`Find pool by tokens: ${token0} - ${token1}`);
    const pool = await this.poolService.findPoolByTokens(token0, token1);

    if (!pool) {
      throw new NotFoundException(`Pool not found for ${token0}/${token1}`);
    }

    return pool;
  }

  /**
   * 根据交易对地址查询池子
   */
  @Get('address/:pairAddress')
  @ApiOperation({ summary: '根据交易对地址查询池子' })
  @ApiParam({ name: 'pairAddress', description: '交易对地址' })
  @ApiResponse({ status: 200, description: '成功', type: PoolInfoDto })
  @ApiResponse({ status: 404, description: '池子不存在' })
  async findPoolByPairAddress(
    @Param('pairAddress') pairAddress: string,
  ): Promise<PoolInfoDto> {
    this.logger.log(`Find pool by pair address: ${pairAddress}`);
    const pool = await this.poolService.findPoolByPairAddress(pairAddress);

    if (!pool) {
      throw new NotFoundException(`Pool not found at address ${pairAddress}`);
    }

    return pool;
  }
}

