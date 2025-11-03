import { Module, Global } from '@nestjs/common';
import { BlockchainProvider } from './blockchain.provider';

@Global() // 全局模块，其他模块无需导入即可使用
@Module({
  providers: [BlockchainProvider],
  exports: [BlockchainProvider],
})
export class BlockchainModule {}

