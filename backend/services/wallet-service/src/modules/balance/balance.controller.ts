import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { BalanceService } from './balance.service';
import {
  BalanceResponseDto,
  BatchBalanceRequestDto,
  BatchBalanceResponseDto,
  AllBalancesResponseDto,
} from './dto/balance.dto';

@ApiTags('Balance')
@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * 查询 ETH 余额
   */
  @Get('eth/:address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询 ETH 余额',
    description: '查询指定地址的 ETH 余额（带缓存，10秒 TTL）',
  })
  @ApiParam({
    name: 'address',
    description: '以太坊地址',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回余额信息',
    type: BalanceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '地址格式错误',
  })
  async getEthBalance(
    @Param('address') address: string,
  ): Promise<BalanceResponseDto> {
    return this.balanceService.getEthBalance(address);
  }

  /**
   * 查询 ERC20 代币余额
   */
  @Get('token/:address/:tokenAddress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询 ERC20 代币余额',
    description: '查询指定地址的 ERC20 代币余额（带缓存，10秒 TTL）',
  })
  @ApiParam({
    name: 'address',
    description: '用户地址',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiParam({
    name: 'tokenAddress',
    description: '代币合约地址',
    example: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回代币余额',
    type: BalanceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '地址格式错误',
  })
  async getTokenBalance(
    @Param('address') address: string,
    @Param('tokenAddress') tokenAddress: string,
  ): Promise<BalanceResponseDto> {
    return this.balanceService.getTokenBalance(address, tokenAddress);
  }

  /**
   * 批量查询余额
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量查询余额',
    description: '批量查询多个地址和多个代币的余额（支持并行查询）',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回批量余额信息',
    type: [BatchBalanceResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  async getBatchBalances(
    @Body() dto: BatchBalanceRequestDto,
  ): Promise<BatchBalanceResponseDto[]> {
    return this.balanceService.getBatchBalances(dto);
  }

  /**
   * 查询用户所有余额
   */
  @Get('all/:address')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '查询用户所有余额',
    description: '查询指定地址的所有余额（ETH + 常用代币）',
  })
  @ApiParam({
    name: 'address',
    description: '用户地址',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @ApiResponse({
    status: 200,
    description: '成功返回所有余额信息',
    type: AllBalancesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '地址格式错误',
  })
  async getAllBalances(
    @Param('address') address: string,
  ): Promise<AllBalancesResponseDto> {
    return this.balanceService.getAllBalances(address);
  }
}

