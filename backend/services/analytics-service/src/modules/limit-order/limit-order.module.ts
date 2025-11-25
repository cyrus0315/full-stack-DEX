import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { LimitOrder } from './entities/limit-order.entity';
import { LimitOrderService } from './limit-order.service';
import { LimitOrderController } from './limit-order.controller';
import { LimitOrderListenerService } from './limit-order-listener.service';
import { KeeperService } from './keeper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LimitOrder]),
    ScheduleModule.forRoot(),
  ],
  controllers: [LimitOrderController],
  providers: [
    LimitOrderService,
    LimitOrderListenerService,
    KeeperService,
  ],
  exports: [LimitOrderService, KeeperService],
})
export class LimitOrderModule {}

