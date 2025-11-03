import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pool } from '../pool/entities/pool.entity';
import { SwapHistory } from '../history/entities/swap-history.entity';
import { LiquidityHistory } from '../history/entities/liquidity-history.entity';
import { PriceHistory } from './entities/price-history.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pool, SwapHistory, LiquidityHistory, PriceHistory])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

