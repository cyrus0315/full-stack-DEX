import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { TokenPrice } from './entities/token-price.entity';

/**
 * PriceModule
 * 
 * 价格预言机模块
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TokenPrice]),
  ],
  controllers: [PriceController],
  providers: [PriceService],
  exports: [PriceService], // 导出 PriceService 供其他模块使用
})
export class PriceModule {}

