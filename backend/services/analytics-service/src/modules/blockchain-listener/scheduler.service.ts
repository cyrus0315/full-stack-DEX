import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from 'viem';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { Pool } from '../pool/entities/pool.entity';
import { AnalyticsService } from '../analytics/analytics.service';

/**
 * 定时同步任务服务
 * 
 * 作为事件监听器的 Fallback 机制：
 * - 定期检查所有 Pool 的储备量
 * - 如果检测到差异则更新数据库
 * - 确保即使事件监听失败，数据也能保持同步
 * - 定期记录价格历史用于滑点统计
 */
@Injectable()
export class PoolSyncSchedulerService {
  private readonly logger = new Logger(PoolSyncSchedulerService.name);
  private isSyncing = false;
  private isRecordingPrices = false;

  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>,
    @Inject(forwardRef(() => AnalyticsService))
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * 每 30 秒执行一次全量同步（Fallback）
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncAllPools() {
    if (this.isSyncing) {
      this.logger.debug('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    try {
      const pools = await this.poolRepository.find({
        where: { isActive: true },
      });

      if (pools.length === 0) {
        this.logger.debug('No pools to sync');
        return;
      }

      this.logger.debug(`🔄 Starting scheduled sync for ${pools.length} pools...`);

      let updatedCount = 0;

      for (const pool of pools) {
        if (!pool.pairAddress) continue;

        try {
          // 从链上获取最新储备量
          const reserves = await this.blockchainProvider.getReserves(
            pool.pairAddress as Address,
          );

          // 检查是否有变化
          const hasChanged =
            reserves.reserve0.toString() !== pool.reserve0 ||
            reserves.reserve1.toString() !== pool.reserve1;

          if (hasChanged) {
            // 更新数据库
            await this.poolRepository.update(
              { id: pool.id },
              {
                reserve0: reserves.reserve0.toString(),
                reserve1: reserves.reserve1.toString(),
              },
            );

            this.logger.log(
              `📊 Pool ${pool.token0Symbol}/${pool.token1Symbol} synced (${reserves.reserve0}/${reserves.reserve1})`,
            );
            updatedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to sync pool ${pool.pairAddress}:`,
            error,
          );
        }
      }

      if (updatedCount > 0) {
        this.logger.log(`✅ Sync completed: ${updatedCount}/${pools.length} pools updated`);
      }
    } catch (error) {
      this.logger.error('Scheduled sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 每小时清理一次不活跃的 Pool
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupInactivePools() {
    try {
      const result = await this.poolRepository
        .createQueryBuilder()
        .update(Pool)
        .set({ isActive: false })
        .where('reserve0 = :zero AND reserve1 = :zero', { zero: '0' })
        .andWhere('isActive = :active', { active: true })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`🧹 Cleaned up ${result.affected} inactive pools`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup inactive pools:', error);
    }
  }

  /**
   * 每 5 分钟记录一次价格历史
   */
  @Cron('*/5 * * * *')
  async recordPriceHistory() {
    if (this.isRecordingPrices) {
      this.logger.debug('Price recording already in progress, skipping...');
      return;
    }

    this.isRecordingPrices = true;
    try {
      const pools = await this.poolRepository.find({
        where: { isActive: true },
      });

      if (pools.length === 0) {
        this.logger.debug('No pools to record prices for');
        return;
      }

      this.logger.debug(`📈 Recording prices for ${pools.length} pools...`);

      let recordedCount = 0;

      for (const pool of pools) {
        if (!pool.pairAddress) continue;

        try {
          // 从链上获取当前储备量和区块号
          const reserves = await this.blockchainProvider.getReserves(
            pool.pairAddress as Address,
          );
          
          const blockNumber = await this.blockchainProvider.getBlockNumber();

          // 记录价格历史
          await this.analyticsService.recordPriceHistory(
            pool.id,
            reserves.reserve0.toString(),
            reserves.reserve1.toString(),
            blockNumber.toString(),
          );

          recordedCount++;
        } catch (error) {
          this.logger.error(
            `Failed to record price for pool ${pool.pairAddress}:`,
            error,
          );
        }
      }

      if (recordedCount > 0) {
        this.logger.log(`✅ Price recording completed: ${recordedCount}/${pools.length} pools recorded`);
      }
    } catch (error) {
      this.logger.error('Price recording failed:', error);
    } finally {
      this.isRecordingPrices = false;
    }
  }

  /**
   * 手动触发全量同步
   */
  async triggerManualSync(): Promise<void> {
    this.logger.log('🔄 Manual sync triggered');
    await this.syncAllPools();
  }
}

