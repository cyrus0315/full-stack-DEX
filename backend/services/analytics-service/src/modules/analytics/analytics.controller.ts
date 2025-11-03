import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * 获取全局概览数据
   * GET /api/v1/analytics/overview
   */
  @Get('overview')
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  /**
   * 获取单个池子的详细分析数据
   * GET /api/v1/analytics/pool/:poolId
   */
  @Get('pool/:poolId')
  async getPoolAnalytics(@Param('poolId', ParseIntPipe) poolId: number) {
    return this.analyticsService.getPoolAnalytics(poolId);
  }

  /**
   * 获取池子的历史数据（用于图表）
   * GET /api/v1/analytics/pool/:poolId/history?hours=24
   */
  @Get('pool/:poolId/history')
  async getPoolHistory(
    @Param('poolId', ParseIntPipe) poolId: number,
    @Query('hours', new ParseIntPipe({ optional: true })) hours?: number,
  ) {
    return this.analyticsService.getPoolHistory(poolId, hours);
  }

  /**
   * 获取用户统计数据
   * GET /api/v1/analytics/user/:address
   */
  @Get('user/:address')
  async getUserStats(@Param('address') address: string) {
    return this.analyticsService.getUserStats(address);
  }

  /**
   * 获取滑点统计数据
   * GET /api/v1/analytics/slippage-stats/:poolId
   */
  @Get('slippage-stats/:poolId')
  async getSlippageStats(@Param('poolId', ParseIntPipe) poolId: number) {
    return this.analyticsService.getSlippageStats(poolId);
  }
}

