import { Controller, Get, Param, Query, Logger, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FarmingService } from './farming.service';
import {
  FarmsResponseDto,
  FarmDto,
  UserFarmsResponseDto,
  LeaderboardResponseDto,
} from './dto/farm.dto';

/**
 * FarmingController
 * 
 * 提供流动性挖矿相关的 API 端点
 */
@ApiTags('Farming')
@Controller('farms')
export class FarmingController {
  private readonly logger = new Logger(FarmingController.name);

  constructor(private readonly farmingService: FarmingService) {}

  /**
   * 获取所有挖矿池列表
   */
  @Get()
  @ApiOperation({ summary: '获取所有挖矿池列表' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功返回挖矿池列表',
    type: FarmsResponseDto,
  })
  async getAllFarms(): Promise<{ success: boolean; data: FarmsResponseDto }> {
    this.logger.log('GET /farms - Fetching all farms');
    
    try {
      const data = await this.farmingService.getAllFarms();
      return { success: true, data };
    } catch (error) {
      this.logger.error('Failed to fetch farms:', error);
      throw error;
    }
  }

  /**
   * 获取单个池子详情
   */
  @Get(':poolId')
  @ApiOperation({ summary: '获取单个池子详情' })
  @ApiParam({ name: 'poolId', description: '池子 ID', example: 0 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功返回池子详情',
    type: FarmDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '池子不存在',
  })
  async getFarm(
    @Param('poolId') poolId: string,
  ): Promise<{ success: boolean; data: FarmDto }> {
    this.logger.log(`GET /farms/${poolId} - Fetching farm details`);
    
    try {
      const data = await this.farmingService.getFarm(parseInt(poolId));
      return { success: true, data };
    } catch (error) {
      this.logger.error(`Failed to fetch farm ${poolId}:`, error);
      throw error;
    }
  }

  /**
   * 获取用户在所有池子的质押情况
   */
  @Get('user/:address')
  @ApiOperation({ summary: '获取用户在所有池子的质押情况' })
  @ApiParam({ name: 'address', description: '用户钱包地址' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功返回用户质押信息',
    type: UserFarmsResponseDto,
  })
  async getUserFarms(
    @Param('address') address: string,
  ): Promise<{ success: boolean; data: UserFarmsResponseDto }> {
    this.logger.log(`GET /farms/user/${address} - Fetching user farms`);
    
    try {
      const data = await this.farmingService.getUserFarms(address);
      return { success: true, data };
    } catch (error) {
      this.logger.error(`Failed to fetch user farms for ${address}:`, error);
      throw error;
    }
  }

  /**
   * 获取排行榜
   */
  @Get('leaderboard/top')
  @ApiOperation({ summary: '获取质押排行榜' })
  @ApiQuery({ name: 'limit', description: '返回数量', required: false, example: 100 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '成功返回排行榜',
    type: LeaderboardResponseDto,
  })
  async getLeaderboard(
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; data: LeaderboardResponseDto }> {
    const limitNum = limit ? parseInt(limit) : 100;
    this.logger.log(`GET /farms/leaderboard/top?limit=${limitNum} - Fetching leaderboard`);
    
    try {
      const data = await this.farmingService.getLeaderboard(limitNum);
      return { success: true, data };
    } catch (error) {
      this.logger.error('Failed to fetch leaderboard:', error);
      throw error;
    }
  }

  /**
   * 手动同步单个池子数据
   */
  @Get(':poolId/sync')
  @ApiOperation({ summary: '手动同步池子数据（从链上）' })
  @ApiParam({ name: 'poolId', description: '池子 ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '同步成功',
  })
  async syncPool(
    @Param('poolId') poolId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`GET /farms/${poolId}/sync - Manual sync`);
    
    try {
      await this.farmingService.syncPoolFromChain(parseInt(poolId));
      return { success: true, message: `Pool ${poolId} synced successfully` };
    } catch (error) {
      this.logger.error(`Failed to sync pool ${poolId}:`, error);
      throw error;
    }
  }
}

