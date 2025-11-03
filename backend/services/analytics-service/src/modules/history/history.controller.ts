import { Controller, Get, Query, Param, ParseIntPipe, ValidationPipe } from '@nestjs/common';
import { HistoryService } from './history.service';
import { QuerySwapHistoryDto, QueryLiquidityHistoryDto } from './dto/history.dto';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /**
   * 获取 Swap 历史记录
   * GET /api/v1/history/swaps?userAddress=0x...&page=1&limit=20
   */
  @Get('swaps')
  async getSwapHistory(@Query(ValidationPipe) query: QuerySwapHistoryDto) {
    return this.historyService.getSwapHistory(query);
  }

  /**
   * 获取 Liquidity 历史记录
   * GET /api/v1/history/liquidity?userAddress=0x...&actionType=add&page=1&limit=20
   */
  @Get('liquidity')
  async getLiquidityHistory(@Query(ValidationPipe) query: QueryLiquidityHistoryDto) {
    return this.historyService.getLiquidityHistory(query);
  }

  /**
   * 获取用户的最近活动
   * GET /api/v1/history/user/:address/recent
   */
  @Get('user/:address/recent')
  async getUserRecentActivity(
    @Param('address') address: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.historyService.getUserRecentActivity(address, limit);
  }

  /**
   * 获取池子的统计数据
   * GET /api/v1/history/pool/:poolId/stats?hours=24
   */
  @Get('pool/:poolId/stats')
  async getPoolStats(
    @Param('poolId', ParseIntPipe) poolId: number,
    @Query('hours', new ParseIntPipe({ optional: true })) hours?: number,
  ) {
    return this.historyService.getPoolStats(poolId, hours);
  }
}

