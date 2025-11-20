/**
 * @title TheGraph Controller
 * @notice 提供 The Graph 数据查询 API 端点
 */

import { Controller, Get, Param, Query, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger'
import { TheGraphService } from './thegraph.service'

@ApiTags('TheGraph')
@Controller('api/v1/thegraph')
export class TheGraphController {
  private readonly logger = new Logger(TheGraphController.name)

  constructor(private readonly theGraphService: TheGraphService) {}

  // ========================================
  // Factory Endpoints
  // ========================================

  @Get('factory/:address')
  @ApiOperation({ summary: '获取 Factory 全局统计' })
  @ApiParam({ name: 'address', description: 'Factory 合约地址' })
  async getFactory(@Param('address') address: string) {
    try {
      const factory = await this.theGraphService.getFactory(address)
      return {
        success: true,
        data: factory,
      }
    } catch (error) {
      this.logger.error(`获取 Factory 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // ========================================
  // Pair Endpoints
  // ========================================

  @Get('pairs')
  @ApiOperation({ summary: '获取所有交易对' })
  @ApiQuery({ name: 'first', required: false, description: '返回数量' })
  @ApiQuery({ name: 'skip', required: false, description: '跳过数量' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description: '排序字段',
  })
  @ApiQuery({
    name: 'orderDirection',
    required: false,
    enum: ['asc', 'desc'],
    description: '排序方向',
  })
  async getPairs(
    @Query('first') first?: string,
    @Query('skip') skip?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDirection') orderDirection?: 'asc' | 'desc',
  ) {
    try {
      const pairs = await this.theGraphService.getPairs({
        first: first ? parseInt(first) : undefined,
        skip: skip ? parseInt(skip) : undefined,
        orderBy,
        orderDirection,
      })
      return {
        success: true,
        data: pairs,
      }
    } catch (error) {
      this.logger.error(`获取 Pairs 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  @Get('pairs/:address')
  @ApiOperation({ summary: '获取单个交易对' })
  @ApiParam({ name: 'address', description: '交易对地址' })
  async getPair(@Param('address') address: string) {
    try {
      const pair = await this.theGraphService.getPair(address)
      return {
        success: true,
        data: pair,
      }
    } catch (error) {
      this.logger.error(`获取 Pair ${address} 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // ========================================
  // Swap Endpoints
  // ========================================

  @Get('swaps')
  @ApiOperation({ summary: '获取最近的交易' })
  @ApiQuery({ name: 'first', required: false, description: '返回数量' })
  @ApiQuery({ name: 'skip', required: false, description: '跳过数量' })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description: '排序字段',
  })
  @ApiQuery({
    name: 'orderDirection',
    required: false,
    enum: ['asc', 'desc'],
    description: '排序方向',
  })
  async getSwaps(
    @Query('first') first?: string,
    @Query('skip') skip?: string,
    @Query('orderBy') orderBy?: string,
    @Query('orderDirection') orderDirection?: 'asc' | 'desc',
  ) {
    try {
      const swaps = await this.theGraphService.getSwaps({
        first: first ? parseInt(first) : undefined,
        skip: skip ? parseInt(skip) : undefined,
        orderBy,
        orderDirection,
      })
      return {
        success: true,
        data: swaps,
      }
    } catch (error) {
      this.logger.error(`获取 Swaps 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // ========================================
  // Liquidity Endpoints
  // ========================================

  @Get('mints')
  @ApiOperation({ summary: '获取添加流动性事件' })
  @ApiQuery({ name: 'first', required: false, description: '返回数量' })
  @ApiQuery({ name: 'skip', required: false, description: '跳过数量' })
  async getMints(
    @Query('first') first?: string,
    @Query('skip') skip?: string,
  ) {
    try {
      const mints = await this.theGraphService.getMints({
        first: first ? parseInt(first) : undefined,
        skip: skip ? parseInt(skip) : undefined,
      })
      return {
        success: true,
        data: mints,
      }
    } catch (error) {
      this.logger.error(`获取 Mints 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  @Get('burns')
  @ApiOperation({ summary: '获取移除流动性事件' })
  @ApiQuery({ name: 'first', required: false, description: '返回数量' })
  @ApiQuery({ name: 'skip', required: false, description: '跳过数量' })
  async getBurns(
    @Query('first') first?: string,
    @Query('skip') skip?: string,
  ) {
    try {
      const burns = await this.theGraphService.getBurns({
        first: first ? parseInt(first) : undefined,
        skip: skip ? parseInt(skip) : undefined,
      })
      return {
        success: true,
        data: burns,
      }
    } catch (error) {
      this.logger.error(`获取 Burns 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // ========================================
  // Farming Endpoints
  // ========================================

  @Get('farms')
  @ApiOperation({ summary: '获取所有挖矿池' })
  @ApiQuery({ name: 'first', required: false, description: '返回数量' })
  @ApiQuery({ name: 'skip', required: false, description: '跳过数量' })
  async getFarms(
    @Query('first') first?: string,
    @Query('skip') skip?: string,
  ) {
    try {
      const farms = await this.theGraphService.getFarms({
        first: first ? parseInt(first) : undefined,
        skip: skip ? parseInt(skip) : undefined,
      })
      return {
        success: true,
        data: farms,
      }
    } catch (error) {
      this.logger.error(`获取 Farms 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  @Get('user-stakes/:address')
  @ApiOperation({ summary: '获取用户质押信息' })
  @ApiParam({ name: 'address', description: '用户地址' })
  async getUserStakes(@Param('address') address: string) {
    try {
      const userStakes =
        await this.theGraphService.getUserStakes(address)
      return {
        success: true,
        data: userStakes,
      }
    } catch (error) {
      this.logger.error(
        `获取用户 ${address} 质押信息失败: ${error.message}`,
      )
      return {
        success: false,
        error: error.message,
      }
    }
  }

  // ========================================
  // Token Endpoints
  // ========================================

  @Get('tokens')
  @ApiOperation({ summary: '获取所有代币' })
  @ApiQuery({ name: 'first', required: false, description: '返回数量' })
  @ApiQuery({ name: 'skip', required: false, description: '跳过数量' })
  async getTokens(
    @Query('first') first?: string,
    @Query('skip') skip?: string,
  ) {
    try {
      const tokens = await this.theGraphService.getTokens({
        first: first ? parseInt(first) : undefined,
        skip: skip ? parseInt(skip) : undefined,
      })
      return {
        success: true,
        data: tokens,
      }
    } catch (error) {
      this.logger.error(`获取 Tokens 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  @Get('tokens/:address')
  @ApiOperation({ summary: '获取单个代币' })
  @ApiParam({ name: 'address', description: '代币地址' })
  async getToken(@Param('address') address: string) {
    try {
      const token = await this.theGraphService.getToken(address)
      return {
        success: true,
        data: token,
      }
    } catch (error) {
      this.logger.error(`获取 Token ${address} 失败: ${error.message}`)
      return {
        success: false,
        error: error.message,
      }
    }
  }
}

