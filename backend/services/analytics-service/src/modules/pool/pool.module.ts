import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';
import { PoolUsdService } from './pool-usd.service';
import { Pool } from './entities/pool.entity';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';
import { CacheModule } from '../../providers/cache/cache.module';
import { PriceModule } from '../price/price.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pool]),
    BlockchainModule,
    CacheModule,
    forwardRef(() => PriceModule), // 引入价格模块
  ],
  controllers: [PoolController],
  providers: [PoolService, PoolUsdService],
  exports: [PoolService, PoolUsdService],
})
export class PoolModule {}

