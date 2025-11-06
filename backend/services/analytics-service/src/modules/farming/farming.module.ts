import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FarmingService } from './farming.service';
import { FarmingController } from './farming.controller';
import { FarmingListenerService } from './farming-listener.service';
import { FarmingSchedulerService } from './farming-scheduler.service';
import { Farm } from './entities/farm.entity';
import { UserFarm } from './entities/user-farm.entity';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';
import { BlockchainListenerModule } from '../blockchain-listener/blockchain-listener.module';
import { PriceModule } from '../price/price.module';

/**
 * FarmingModule
 * 
 * 流动性挖矿模块
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Farm, UserFarm]),
    BlockchainModule, // 需要 BlockchainProvider
    forwardRef(() => BlockchainListenerModule), // 需要 EventsGateway（避免循环依赖）
    forwardRef(() => PriceModule), // 引入价格模块
  ],
  controllers: [FarmingController],
  providers: [FarmingService, FarmingListenerService, FarmingSchedulerService],
  exports: [FarmingService], // 导出供其他模块使用
})
export class FarmingModule {}

