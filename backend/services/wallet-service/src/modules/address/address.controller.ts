import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AddressService } from './address.service';
import {
  AddAddressDto,
  UpdateAddressDto,
  AddressInfoDto,
  AddressListQueryDto,
  AddressListResponseDto,
  AddressDetailDto,
  BatchAddAddressDto,
} from './dto/address.dto';

/**
 * Address Controller
 * 提供地址管理的 REST API
 */
@ApiTags('Address')
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /**
   * 添加地址到监控列表
   */
  @Post()
  @ApiOperation({ summary: '添加地址到监控列表' })
  @ApiResponse({
    status: 201,
    description: '成功添加地址',
    type: AddressInfoDto,
  })
  @ApiResponse({ status: 409, description: '地址已存在' })
  async addAddress(@Body() dto: AddAddressDto): Promise<AddressInfoDto> {
    return this.addressService.addAddress(dto);
  }

  /**
   * 批量添加地址
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量添加地址' })
  @ApiResponse({
    status: 200,
    description: '成功添加地址列表',
    type: [AddressInfoDto],
  })
  async batchAddAddresses(
    @Body() dto: BatchAddAddressDto,
  ): Promise<AddressInfoDto[]> {
    return this.addressService.batchAddAddresses(dto.addresses);
  }

  /**
   * 获取地址列表（分页）
   */
  @Get('list')
  @ApiOperation({ summary: '获取地址列表（分页）' })
  @ApiResponse({
    status: 200,
    description: '成功返回地址列表',
    type: AddressListResponseDto,
  })
  async getAddressList(
    @Query() query: AddressListQueryDto,
  ): Promise<AddressListResponseDto> {
    return this.addressService.getAddressList(query);
  }

  /**
   * 获取地址详情
   */
  @Get(':address')
  @ApiOperation({ summary: '获取地址详情' })
  @ApiParam({ name: 'address', description: '钱包地址' })
  @ApiResponse({
    status: 200,
    description: '成功返回地址详情',
    type: AddressDetailDto,
  })
  @ApiResponse({ status: 404, description: '地址不存在' })
  async getAddressDetail(
    @Param('address') address: string,
  ): Promise<AddressDetailDto> {
    return this.addressService.getAddressDetail(address);
  }

  /**
   * 更新地址信息
   */
  @Put(':address')
  @ApiOperation({ summary: '更新地址信息' })
  @ApiParam({ name: 'address', description: '钱包地址' })
  @ApiResponse({
    status: 200,
    description: '成功更新地址',
    type: AddressInfoDto,
  })
  @ApiResponse({ status: 404, description: '地址不存在' })
  async updateAddress(
    @Param('address') address: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressInfoDto> {
    return this.addressService.updateAddress(address, dto);
  }

  /**
   * 删除地址
   */
  @Delete(':address')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除地址' })
  @ApiParam({ name: 'address', description: '钱包地址' })
  @ApiResponse({ status: 204, description: '成功删除地址' })
  @ApiResponse({ status: 404, description: '地址不存在' })
  async deleteAddress(@Param('address') address: string): Promise<void> {
    return this.addressService.deleteAddress(address);
  }

  /**
   * 同步地址余额
   */
  @Post(':address/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '同步地址余额' })
  @ApiParam({ name: 'address', description: '钱包地址' })
  @ApiResponse({ status: 200, description: '同步成功' })
  async syncAddressBalance(@Param('address') address: string): Promise<void> {
    return this.addressService.syncAddressBalance(address);
  }

  /**
   * 同步所有监控地址
   */
  @Post('sync/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '同步所有监控地址' })
  @ApiResponse({ status: 200, description: '同步成功' })
  async syncAllMonitoredAddresses(): Promise<void> {
    return this.addressService.syncAllMonitoredAddresses();
  }
}

