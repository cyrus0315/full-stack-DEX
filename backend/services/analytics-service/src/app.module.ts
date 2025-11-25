import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './common/config/configuration';
import { BlockchainModule } from './providers/blockchain/blockchain.module';
import { CacheModule } from './providers/cache/cache.module';
import { PoolModule } from './modules/pool/pool.module';
import { QuoteModule } from './modules/quote/quote.module';
import { BlockchainListenerModule } from './modules/blockchain-listener/blockchain-listener.module';
import { HistoryModule } from './modules/history/history.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FarmingModule } from './modules/farming/farming.module';
import { PriceModule } from './modules/price/price.module';
import { TheGraphModule } from './modules/thegraph/thegraph.module';
import { LimitOrderModule } from './modules/limit-order/limit-order.module';

/**
 * App Module - Analytics Service 主模块
 * 
 * 提供只读 API 服务：
 * - Pool 数据查询
 * - 报价查询
 * - 历史记录查询
 * - 数据分析统计
 * - 区块链事件监听和同步
 * - 价格预言机
 */
@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        autoLoadEntities: true,
        synchronize: true, // 开发环境使用，生产环境应该关闭
        logging: false,
      }),
    }),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // Provider 模块
    BlockchainModule,
    CacheModule,

    // 业务模块
    PoolModule,                   // 流动性池查询
    QuoteModule,                  // 价格报价
    BlockchainListenerModule,     // 事件监听和同步
    HistoryModule,                // 历史记录查询
    AnalyticsModule,              // 数据分析统计
    FarmingModule,                // 流动性挖矿
    PriceModule,                  // 价格预言机
    TheGraphModule,               // The Graph 数据索引
    LimitOrderModule,             // 限价单
  ],
})
export class AppModule {}

