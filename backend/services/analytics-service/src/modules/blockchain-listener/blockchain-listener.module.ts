import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainListenerService } from './blockchain-listener.service';
import { BlockchainListenerController } from './blockchain-listener.controller';
import { EventsGateway } from './websocket.gateway';
import { PoolSyncSchedulerService } from './scheduler.service';
import { Pool } from '../pool/entities/pool.entity';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';
import { HistoryModule } from '../history/history.module';
import { AnalyticsModule } from '../analytics/analytics.module';

/**
 * 区块链事件监听器模块
 * 
 * 功能：
 * - 监听 Factory PairCreated 事件
 * - 监听 Pair Sync/Mint/Burn/Swap 事件
 * - 自动更新数据库
 * - WebSocket 实时推送
 * - 定时同步任务（Fallback）
 * - 定期记录价格历史
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Pool]),
    BlockchainModule,
    HistoryModule,
    forwardRef(() => AnalyticsModule),
  ],
  controllers: [BlockchainListenerController],
  providers: [
    BlockchainListenerService,
    EventsGateway,
    PoolSyncSchedulerService,
  ],
  exports: [
    BlockchainListenerService,
    EventsGateway,
    PoolSyncSchedulerService,
  ],
})
export class BlockchainListenerModule {}

