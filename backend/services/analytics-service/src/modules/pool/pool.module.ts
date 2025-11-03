import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';
import { Pool } from './entities/pool.entity';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';
import { CacheModule } from '../../providers/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pool]),
    BlockchainModule,
    CacheModule,
  ],
  controllers: [PoolController],
  providers: [PoolService],
  exports: [PoolService],
})
export class PoolModule {}

