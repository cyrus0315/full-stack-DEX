import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { BlockScannerService } from './block-scanner.service';
import {
  TransactionDetailDto,
  TransactionListQueryDto,
  TransactionListResponseDto,
  TransactionStatsDto,
  SyncTransactionsDto,
} from './dto/transaction.dto';

/**
 * Transaction Controller
 * 提供交易查询和自动扫描的 REST API
 */
@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly blockScannerService: BlockScannerService,
  ) {}

  /**
   * 通过哈希获取交易详情
   */
  @Get(':hash')
  @ApiOperation({ summary: '获取交易详情' })
  @ApiParam({ name: 'hash', description: '交易哈希' })
  @ApiResponse({
    status: 200,
    description: '成功返回交易详情',
    type: TransactionDetailDto,
  })
  @ApiResponse({ status: 404, description: '交易不存在' })
  async getTransactionByHash(
    @Param('hash') hash: string,
  ): Promise<TransactionDetailDto> {
    return this.transactionService.getTransactionByHash(hash);
  }

  /**
   * 获取交易列表（分页）
   */
  @Get()
  @ApiOperation({ summary: '获取交易列表（分页）' })
  @ApiResponse({
    status: 200,
    description: '成功返回交易列表',
    type: TransactionListResponseDto,
  })
  async getTransactionList(
    @Query() query: TransactionListQueryDto,
  ): Promise<TransactionListResponseDto> {
    return this.transactionService.getTransactionList(query);
  }

  /**
   * 根据地址获取交易列表
   */
  @Get('address/:address')
  @ApiOperation({ summary: '根据地址获取交易列表' })
  @ApiParam({ name: 'address', description: '钱包地址' })
  @ApiResponse({
    status: 200,
    description: '成功返回交易列表',
    type: TransactionListResponseDto,
  })
  async getTransactionsByAddress(
    @Param('address') address: string,
    @Query() query: TransactionListQueryDto,
  ): Promise<TransactionListResponseDto> {
    return this.transactionService.getTransactionsByAddress(address, query);
  }

  /**
   * 获取地址的交易统计
   */
  @Get('stats/:address')
  @ApiOperation({ summary: '获取地址的交易统计' })
  @ApiParam({ name: 'address', description: '钱包地址' })
  @ApiResponse({
    status: 200,
    description: '成功返回交易统计',
    type: TransactionStatsDto,
  })
  async getTransactionStats(
    @Param('address') address: string,
  ): Promise<TransactionStatsDto> {
    return this.transactionService.getTransactionStats(address);
  }

  /**
   * 同步地址的交易记录
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '同步地址的交易记录' })
  @ApiResponse({
    status: 200,
    description: '同步完成，返回同步的交易数量',
  })
  async syncAddressTransactions(
    @Body() dto: SyncTransactionsDto,
  ): Promise<{ count: number; message: string }> {
    const count = await this.transactionService.syncAddressTransactions(
      dto.address,
    );

    return {
      count,
      message: `已同步 ${count} 笔交易`,
    };
  }

  /**
   * 获取区块扫描器状态
   */
  @Get('scanner/status')
  @ApiOperation({ summary: '获取区块扫描器状态' })
  @ApiResponse({
    status: 200,
    description: '成功返回扫描器状态',
  })
  async getScannerStatus() {
    return this.blockScannerService.getStatus();
  }

  /**
   * 手动扫描区块范围
   */
  @Post('scanner/scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动扫描指定区块范围' })
  @ApiResponse({
    status: 200,
    description: '扫描完成，返回导入的交易数量',
  })
  async scanBlockRange(
    @Body() dto: { startBlock: number; endBlock: number },
  ) {
    const result = await this.blockScannerService.scanBlockRange(
      dto.startBlock,
      dto.endBlock,
    );

    return {
      success: true,
      ...result,
      message: `扫描完成：导入 ${result.importedCount} 笔交易`,
    };
  }

  /**
   * 刷新监控地址列表
   */
  @Post('scanner/refresh-addresses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新监控地址列表' })
  @ApiResponse({
    status: 200,
    description: '刷新完成',
  })
  async refreshMonitoredAddresses() {
    await this.blockScannerService.refreshMonitoredAddresses();
    const status = this.blockScannerService.getStatus();

    return {
      success: true,
      monitoredAddresses: status.monitoredAddresses,
      message: `已刷新监控地址列表：${status.monitoredAddresses} 个地址`,
    };
  }
}

