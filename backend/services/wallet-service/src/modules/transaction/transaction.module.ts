import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { BlockScannerService } from './block-scanner.service';
import { Transaction } from './entities/transaction.entity';
import { Address } from '../address/entities/address.entity';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';
import { WebSocketModule } from '../../websocket/websocket.module';

/**
 * Transaction Module
 * 提供交易查询、监控和自动扫描功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Address]),
    BlockchainModule,
    forwardRef(() => WebSocketModule),
  ],
  controllers: [TransactionController],
  providers: [TransactionService, BlockScannerService],
  exports: [TransactionService, BlockScannerService],
})
export class TransactionModule {}

