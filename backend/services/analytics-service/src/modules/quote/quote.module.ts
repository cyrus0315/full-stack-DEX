import { Module } from '@nestjs/common';
import { QuoteController } from './quote.controller';
import { QuoteService } from './quote.service';
import { BlockchainModule } from '../../providers/blockchain/blockchain.module';
import { CacheModule } from '../../providers/cache/cache.module';

@Module({
  imports: [BlockchainModule, CacheModule],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}

