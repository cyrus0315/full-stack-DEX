import { Module } from '@nestjs/common';
import { BlockchainProvider } from './blockchain.provider';

@Module({
  providers: [BlockchainProvider],
  exports: [BlockchainProvider],
})
export class BlockchainModule {}

