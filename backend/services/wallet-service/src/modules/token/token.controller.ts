import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TokenService } from './token.service';
import {
  TokenInfoDto,
  BatchTokenQueryDto,
  TokenListQueryDto,
  TokenListResponseDto,
} from './dto/token.dto';

/**
 * Token Controller
 * 提供代币信息查询的 REST API
 */
@ApiTags('Token')
@Controller('token')
export class TokenController {
  private readonly logger = new Logger(TokenController.name);
  
  constructor(private readonly tokenService: TokenService) {}

  /**
   * 获取代币列表（分页）
   */
  @Get('list')
  @ApiOperation({ summary: '获取代币列表（分页）' })
  @ApiResponse({
    status: 200,
    description: '成功返回代币列表',
    type: TokenListResponseDto,
  })
  async getTokenList(
    @Query() query: any,
  ): Promise<TokenListResponseDto> {
    return this.tokenService.getTokenList(query || {});
  }

  /**
   * 批量获取代币信息
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量获取代币信息' })
  @ApiResponse({
    status: 200,
    description: '成功返回代币信息列表',
    type: [TokenInfoDto],
  })
  async getBatchTokenInfo(
    @Body() body: BatchTokenQueryDto,
  ): Promise<TokenInfoDto[]> {
    return this.tokenService.getBatchTokenInfo(body.addresses);
  }

  /**
   * 获取单个代币信息
   */
  @Get(':address')
  @ApiOperation({ summary: '获取代币信息' })
  @ApiParam({ name: 'address', description: '代币合约地址' })
  @ApiResponse({
    status: 200,
    description: '成功返回代币信息',
    type: TokenInfoDto,
  })
  @ApiResponse({ status: 404, description: '代币不存在或无效' })
  async getTokenInfo(@Param('address') address: string): Promise<TokenInfoDto> {
    return this.tokenService.getTokenInfo(address);
  }

  /**
   * 手动更新代币信息
   */
  @Post(':address/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手动刷新代币信息' })
  @ApiParam({ name: 'address', description: '代币合约地址' })
  @ApiResponse({
    status: 200,
    description: '成功刷新代币信息',
    type: TokenInfoDto,
  })
  async refreshTokenInfo(
    @Param('address') address: string,
  ): Promise<TokenInfoDto> {
    return this.tokenService.updateTokenInfo(address);
  }
}

