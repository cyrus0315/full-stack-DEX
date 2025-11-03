import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './common/config/configuration';

// 基础设施模块
import { BlockchainModule } from './providers/blockchain/blockchain.module';
import { CacheModule } from './providers/cache/cache.module';
import { WebSocketModule } from './websocket/websocket.module';

// 业务模块
import { BalanceModule } from './modules/balance/balance.module';
import { TokenModule } from './modules/token/token.module';
import { AddressModule } from './modules/address/address.module';
import { TransactionModule } from './modules/transaction/transaction.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // TypeORM 数据库模块
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        autoLoadEntities: true, // 自动加载所有通过 forFeature 注册的实体
        synchronize: configService.get('app.nodeEnv') !== 'production',
        logging: configService.get('app.nodeEnv') === 'development',
      }),
    }),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // 基础设施模块
    BlockchainModule,
    CacheModule,
    WebSocketModule,

    // 业务模块
    BalanceModule,
    TokenModule,
    AddressModule,
    TransactionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

