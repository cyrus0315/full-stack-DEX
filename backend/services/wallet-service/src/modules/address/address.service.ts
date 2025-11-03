import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { Address } from './entities/address.entity';
import {
  AddAddressDto,
  UpdateAddressDto,
  AddressInfoDto,
  AddressListQueryDto,
  AddressListResponseDto,
  AddressDetailDto,
} from './dto/address.dto';

/**
 * Address Service
 * 负责地址的管理和监控
 */
@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly blockchainProvider: BlockchainProvider,
  ) {}

  /**
   * 添加地址到监控列表
   */
  async addAddress(dto: AddAddressDto): Promise<AddressInfoDto> {
    const normalizedAddress = dto.address.toLowerCase();

    // 检查地址是否已存在
    const existing = await this.addressRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (existing) {
      throw new ConflictException(`地址已存在: ${dto.address}`);
    }

    try {
      // 检查地址是否为合约
      const code = await this.blockchainProvider.getCode(normalizedAddress);
      const isContract = code !== '0x' && code.length > 2;

      // 获取 ETH 余额
      const ethBalance = await this.blockchainProvider.getEthBalance(
        normalizedAddress,
      );

      // 创建地址记录
      const address = this.addressRepository.create({
        address: normalizedAddress,
        label: dto.label,
        description: dto.description,
        type: isContract ? 'Contract' : 'EOA',
        isMonitored: dto.isMonitored !== undefined ? dto.isMonitored : true,
        tags: dto.tags ? dto.tags.join(',') : undefined,
        ethBalance: ethBalance.toString(),
        lastSyncAt: new Date(),
      });

      await this.addressRepository.save(address);

      this.logger.log(`地址已添加: ${dto.address} (${address.type})`);

      return this.toDto(address);
    } catch (error) {
      this.logger.error(`添加地址失败: ${dto.address}`, error.stack);
      throw error;
    }
  }

  /**
   * 批量添加地址
   */
  async batchAddAddresses(dtos: AddAddressDto[]): Promise<AddressInfoDto[]> {
    const results: AddressInfoDto[] = [];

    for (const dto of dtos) {
      try {
        const result = await this.addAddress(dto);
        results.push(result);
      } catch (error) {
        this.logger.warn(`批量添加失败 ${dto.address}: ${error.message}`);
        // 继续处理其他地址
      }
    }

    return results;
  }

  /**
   * 删除地址
   */
  async deleteAddress(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();

    const result = await this.addressRepository.delete({
      address: normalizedAddress,
    });

    if (result.affected === 0) {
      throw new NotFoundException(`地址不存在: ${address}`);
    }

    this.logger.log(`地址已删除: ${address}`);
  }

  /**
   * 更新地址信息
   */
  async updateAddress(
    address: string,
    dto: UpdateAddressDto,
  ): Promise<AddressInfoDto> {
    const normalizedAddress = address.toLowerCase();

    const existing = await this.addressRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!existing) {
      throw new NotFoundException(`地址不存在: ${address}`);
    }

    // 更新字段
    if (dto.label !== undefined) existing.label = dto.label;
    if (dto.description !== undefined) existing.description = dto.description;
    if (dto.isMonitored !== undefined) existing.isMonitored = dto.isMonitored;
    if (dto.tags) existing.tags = dto.tags.join(',');

    await this.addressRepository.save(existing);

    this.logger.log(`地址已更新: ${address}`);

    return this.toDto(existing);
  }

  /**
   * 获取地址详情
   */
  async getAddressDetail(address: string): Promise<AddressDetailDto> {
    const normalizedAddress = address.toLowerCase();

    const existing = await this.addressRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!existing) {
      throw new NotFoundException(`地址不存在: ${address}`);
    }

    // 刷新余额
    await this.syncAddressBalance(normalizedAddress);

    // 重新查询
    const updated = await this.addressRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!updated) {
      throw new NotFoundException(`地址不存在: ${address}`);
    }

    return {
      ...this.toDto(updated),
      // TODO: 添加代币持仓和最近交易
      tokenBalances: [],
      recentTransactions: [],
    };
  }

  /**
   * 获取地址列表（分页）
   */
  async getAddressList(
    query: AddressListQueryDto,
  ): Promise<AddressListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    this.logger.debug(`查询地址列表: page=${page}, limit=${limit}`);

    try {
      // 使用 QueryBuilder
      let queryBuilder = this.addressRepository.createQueryBuilder('address');

      // 搜索条件
      if (query.search) {
        queryBuilder = queryBuilder.andWhere(
          '(address.address ILIKE :search OR address.label ILIKE :search)',
          { search: `%${query.search}%` },
        );
      }

      // 监控状态过滤
      if (query.isMonitored !== undefined) {
        queryBuilder = queryBuilder.andWhere(
          'address.isMonitored = :isMonitored',
          { isMonitored: query.isMonitored },
        );
      }

      // 类型过滤
      if (query.type) {
        queryBuilder = queryBuilder.andWhere('address.type = :type', {
          type: query.type,
        });
      }

      // 标签过滤
      if (query.tag) {
        queryBuilder = queryBuilder.andWhere('address.tags ILIKE :tag', {
          tag: `%${query.tag}%`,
        });
      }

      queryBuilder = queryBuilder
        .orderBy('address.createdAt', 'DESC')
        .skip(skip)
        .take(limit);

      const [addresses, total] = await queryBuilder.getManyAndCount();

      this.logger.debug(`查询到 ${total} 个地址`);

      return {
        addresses: addresses.map((addr) => this.toDto(addr)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`获取地址列表失败`, error.stack);
      throw error;
    }
  }

  /**
   * 同步地址余额
   */
  async syncAddressBalance(address: string): Promise<void> {
    const normalizedAddress = address.toLowerCase();

    try {
      const ethBalance = await this.blockchainProvider.getEthBalance(
        normalizedAddress,
      );

      await this.addressRepository.update(
        { address: normalizedAddress },
        {
          ethBalance: ethBalance.toString(),
          lastSyncAt: new Date(),
        },
      );

      this.logger.debug(`地址余额已同步: ${address}`);
    } catch (error) {
      this.logger.error(`同步地址余额失败: ${address}`, error.stack);
    }
  }

  /**
   * 同步所有监控地址
   */
  async syncAllMonitoredAddresses(): Promise<void> {
    this.logger.log('开始同步所有监控地址...');

    const addresses = await this.addressRepository.find({
      where: { isMonitored: true },
    });

    this.logger.log(`找到 ${addresses.length} 个监控地址`);

    for (const address of addresses) {
      await this.syncAddressBalance(address.address);
    }

    this.logger.log('所有监控地址同步完成');
  }

  /**
   * 转换为 DTO
   */
  private toDto(address: Address): AddressInfoDto {
    return {
      id: address.id,
      address: address.address,
      label: address.label,
      description: address.description,
      type: address.type,
      isMonitored: address.isMonitored,
      ethBalance: address.ethBalance || '0',
      transactionCount: address.transactionCount,
      tags: address.tags ? address.tags.split(',') : [],
      lastSyncAt: address.lastSyncAt,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}

