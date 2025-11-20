/**
 * @title TheGraph Module
 * @notice The Graph 数据查询模块
 */

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TheGraphService } from './thegraph.service'
import { TheGraphController } from './thegraph.controller'

@Module({
  imports: [ConfigModule],
  providers: [TheGraphService],
  controllers: [TheGraphController],
  exports: [TheGraphService],
})
export class TheGraphModule {}

