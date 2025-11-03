import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { Address } from './entities/address.entity';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';

/**
 * Address Module
 * 提供地址管理和监控功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Address]),
    BlockchainModule,
  ],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}

