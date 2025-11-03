import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BlockchainListenerService } from './blockchain-listener.service';

/**
 * 区块链事件监听器控制器
 */
@ApiTags('Blockchain Listener')
@Controller('listener')
export class BlockchainListenerController {
  constructor(
    private readonly listenerService: BlockchainListenerService,
  ) {}

  /**
   * 获取监听器状态
   */
  @Get('status')
  @ApiOperation({ summary: '获取事件监听器状态' })
  @ApiResponse({ status: 200, description: '返回监听器状态' })
  getStatus() {
    return this.listenerService.getStatus();
  }

  /**
   * 手动重新同步指定 Pool
   */
  @Post('resync/:poolId')
  @ApiOperation({ summary: '手动重新同步指定 Pool' })
  @ApiResponse({ status: 200, description: 'Pool 同步成功' })
  async resyncPool(@Param('poolId', ParseIntPipe) poolId: number) {
    await this.listenerService.resyncPool(poolId);
    return {
      success: true,
      message: `Pool ${poolId} resynced successfully`,
    };
  }
}

