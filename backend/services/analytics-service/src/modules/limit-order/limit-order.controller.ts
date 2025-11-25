import { Controller, Get, Post, Body, Query, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LimitOrderService } from './limit-order.service';
import { KeeperService } from './keeper.service';
import { QueryOrdersDto, ExecuteOrderDto, OrderResponseDto, OrderStatisticsDto } from './dto/limit-order.dto';
import { OrderStatus } from './entities/limit-order.entity';

@ApiTags('Limit Orders')
@Controller('api/v1/limit-orders')
export class LimitOrderController {
  private readonly logger = new Logger(LimitOrderController.name);

  constructor(
    private limitOrderService: LimitOrderService,
    private keeperService: KeeperService,
  ) {}

  @Get()
  @ApiOperation({ summary: '查询订单列表' })
  @ApiResponse({ status: 200, description: '返回订单列表', type: [OrderResponseDto] })
  async getOrders(@Query() query: QueryOrdersDto) {
    const { orders, total } = await this.limitOrderService.findOrders(query);

    return {
      success: true,
      data: {
        orders,
        total,
        page: query.page || 1,
        limit: query.limit || 20,
      },
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取订单统计数据' })
  @ApiResponse({ status: 200, description: '返回统计数据', type: OrderStatisticsDto })
  async getStatistics() {
    const statistics = await this.limitOrderService.getOrderStatistics();
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('active')
  @ApiOperation({ summary: '获取活跃订单列表' })
  @ApiResponse({ status: 200, description: '返回活跃订单列表', type: [OrderResponseDto] })
  async getActiveOrders() {
    const orders = await this.limitOrderService.getActiveOrders();
    return {
      success: true,
      data: orders,
    };
  }

  @Get('executable')
  @ApiOperation({ summary: '获取可执行订单列表' })
  @ApiResponse({ status: 200, description: '返回可执行订单列表', type: [OrderResponseDto] })
  async getExecutableOrders() {
    const orders = await this.limitOrderService.getExecutableOrders();
    return {
      success: true,
      data: orders,
    };
  }

  @Get('user/:address')
  @ApiOperation({ summary: '获取用户订单列表' })
  @ApiResponse({ status: 200, description: '返回用户订单列表', type: [OrderResponseDto] })
  async getUserOrders(
    @Param('address') address: string,
    @Query('status') status?: OrderStatus,
  ) {
    const orders = await this.limitOrderService.getUserOrders(address, status);
    return {
      success: true,
      data: orders,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({ status: 200, description: '返回订单详情', type: OrderResponseDto })
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    const order = await this.limitOrderService.findOneById(id);
    return {
      success: true,
      data: order,
    };
  }

  @Get('chain/:orderId')
  @ApiOperation({ summary: '从链上同步订单' })
  @ApiResponse({ status: 200, description: '返回订单详情', type: OrderResponseDto })
  async syncOrder(@Param('orderId') orderId: string) {
    const order = await this.limitOrderService.syncOrderFromChain(orderId);
    return {
      success: true,
      data: order,
    };
  }

  @Post('execute')
  @ApiOperation({ summary: '手动执行订单（仅 Keeper）' })
  @ApiResponse({ status: 200, description: '执行成功' })
  async executeOrder(@Body() executeDto: ExecuteOrderDto) {
    this.logger.log(`手动执行订单: ${executeDto.orderId}`);
    
    const txHash = await this.keeperService.manualExecuteOrder(
      executeDto.orderId,
      executeDto.path,
    );

    return {
      success: true,
      data: {
        txHash,
        orderId: executeDto.orderId,
      },
    };
  }

  @Get('keeper/status')
  @ApiOperation({ summary: '获取 Keeper 状态' })
  @ApiResponse({ status: 200, description: '返回 Keeper 状态' })
  async getKeeperStatus() {
    const status = this.keeperService.getStatus();
    return {
      success: true,
      data: status,
    };
  }

  @Post('quote')
  @ApiOperation({ summary: '获取订单报价' })
  @ApiResponse({ status: 200, description: '返回报价信息' })
  async getQuote(
    @Body() quoteDto: { tokenIn: string; tokenOut: string; amountIn: string },
  ) {
    const amountOut = await this.limitOrderService.getAmountOut(
      quoteDto.tokenIn,
      quoteDto.tokenOut,
      quoteDto.amountIn,
    );

    return {
      success: true,
      data: {
        tokenIn: quoteDto.tokenIn,
        tokenOut: quoteDto.tokenOut,
        amountIn: quoteDto.amountIn,
        amountOut,
        price: (BigInt(amountOut) * BigInt(1e18) / BigInt(quoteDto.amountIn)).toString(),
      },
    };
  }
}

