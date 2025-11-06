import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { hardhat } from 'viem/chains';
import { Farm } from './entities/farm.entity';
import { UserFarm } from './entities/user-farm.entity';
import { PriceService } from '../price/price.service';
import {
  FarmDto,
  FarmsResponseDto,
  FarmingSummaryDto,
  UserFarmsResponseDto,
  UserFarmDto,
  UserFarmingSummaryDto,
  LeaderboardResponseDto,
  LeaderboardItemDto,
  LPTokenInfoDto,
} from './dto/farm.dto';

/**
 * FarmingService
 * 
 * 负责流动性挖矿相关的业务逻辑：
 * 1. 从链上读取池子数据
 * 2. 计算 APR/APY
 * 3. 管理用户质押信息
 * 4. 提供查询接口
 */
@Injectable()
export class FarmingService {
  private readonly logger = new Logger(FarmingService.name);
  private readonly publicClient: any;
  private readonly masterChefAddress: string;
  private readonly dexTokenAddress: string;

  // MasterChef ABI（只包含需要的函数）
  private readonly masterChefAbi = parseAbi([
    'function poolLength() view returns (uint256)',
    'function poolInfo(uint256) view returns (address lpToken, uint256 allocPoint, uint256 lastRewardBlock, uint256 accRewardPerShare)',
    'function userInfo(uint256, address) view returns (uint256 amount, uint256 rewardDebt)',
    'function pendingReward(uint256, address) view returns (uint256)',
    'function rewardPerBlock() view returns (uint256)',
    'function totalAllocPoint() view returns (uint256)',
    'function getPoolAPR(uint256) view returns (uint256)',
  ]);

  // DEXPair ABI
  private readonly pairAbi = parseAbi([
    'function token0() view returns (address)',
    'function token1() view returns (address)',
    'function symbol() view returns (string)',
    'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)',
  ]);

  // ERC20 ABI
  private readonly erc20Abi = parseAbi([
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
  ]);

  constructor(
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
    @InjectRepository(UserFarm)
    private readonly userFarmRepository: Repository<UserFarm>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PriceService))
    private readonly priceService: PriceService,
  ) {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:8545');
    
    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http(rpcUrl),
    });

    // 从环境变量读取合约地址
    this.masterChefAddress = this.configService.get<string>('MASTER_CHEF_ADDRESS', '');
    this.dexTokenAddress = this.configService.get<string>('DEX_TOKEN_ADDRESS', '');

    if (!this.masterChefAddress) {
      this.logger.warn('MASTER_CHEF_ADDRESS not configured');
    }
  }

  /**
   * 获取所有挖矿池列表
   */
  async getAllFarms(): Promise<FarmsResponseDto> {
    this.logger.log('Fetching all farms...');

    // 从数据库获取所有池子
    const farms = await this.farmRepository.find({
      order: { poolId: 'ASC' },
    });

    // 从链上读取总分配点和每区块奖励
    const [totalAllocPoint, rewardPerBlock, currentBlock] = await Promise.all([
      this.getTotalAllocPoint(),
      this.getRewardPerBlock(),
      this.getCurrentBlock(),
    ]);

    // 计算总 TVL
    const totalTvl = farms.reduce((sum, farm) => {
      return sum + parseFloat(farm.tvl || '0');
    }, 0);

    // 构建响应
    const farmDtos: FarmDto[] = farms.map(farm => this.toFarmDto(farm, totalAllocPoint));

    // 获取 DEX 代币价格
    let dexPrice = '1.0';
    try {
      const dexPriceData = await this.priceService.getTokenPrice(this.dexTokenAddress);
      dexPrice = dexPriceData.priceUsd;
    } catch (error) {
      this.logger.warn('Failed to get DEX token price, using default 1.0');
    }

    const summary: FarmingSummaryDto = {
      totalPools: farms.length,
      activePools: farms.filter(f => f.active).length,
      totalTvl: totalTvl.toString(),
      totalAllocPoint: totalAllocPoint.toString(),
      rewardPerBlock: formatUnits(rewardPerBlock, 18),
      dexPrice,
      currentBlock: currentBlock.toString(),
    };

    return {
      farms: farmDtos,
      summary,
    };
  }

  /**
   * 获取单个池子信息
   */
  async getFarm(poolId: number): Promise<FarmDto> {
    const farm = await this.farmRepository.findOne({ where: { poolId } });
    
    if (!farm) {
      throw new NotFoundException(`Farm with poolId ${poolId} not found`);
    }

    const totalAllocPoint = await this.getTotalAllocPoint();
    return this.toFarmDto(farm, totalAllocPoint);
  }

  /**
   * 获取用户在所有池子的质押情况
   */
  async getUserFarms(userAddress: string): Promise<UserFarmsResponseDto> {
    this.logger.log(`Fetching farms for user ${userAddress}`);

    // 从数据库获取用户质押信息
    const userFarms = await this.userFarmRepository.find({
      where: { userAddress: userAddress.toLowerCase() },
    });

    // 获取对应的池子信息
    const farms = await this.farmRepository.find({
      where: userFarms.map(uf => ({ poolId: uf.poolId })),
    });

    const farmMap = new Map(farms.map(f => [f.poolId, f]));

    // 构建用户池子信息
    const userFarmDtos: UserFarmDto[] = userFarms.map(uf => {
      const farm = farmMap.get(uf.poolId);
      return {
        poolId: uf.poolId,
        lpTokenSymbol: farm?.lpTokenSymbol || '',
        stakedAmount: uf.stakedAmount,
        stakedUsd: uf.stakedUsd,
        pendingReward: uf.pendingReward,
        totalEarned: uf.totalEarned,
        totalEarnedUsd: uf.totalEarnedUsd,
        apr: farm?.apr || '0',
        shareOfPool: uf.shareOfPool,
        lastActionAt: uf.lastActionAt,
      };
    });

    // 计算总览
    const summary: UserFarmingSummaryDto = {
      totalPools: userFarms.length,
      totalStakedUsd: userFarms.reduce((sum, uf) => sum + parseFloat(uf.stakedUsd || '0'), 0).toString(),
      totalPendingReward: userFarms.reduce((sum, uf) => sum + parseFloat(uf.pendingReward || '0'), 0).toString(),
      totalEarned: userFarms.reduce((sum, uf) => sum + parseFloat(uf.totalEarned || '0'), 0).toString(),
      totalEarnedUsd: userFarms.reduce((sum, uf) => sum + parseFloat(uf.totalEarnedUsd || '0'), 0).toString(),
    };

    return {
      userAddress,
      farms: userFarmDtos,
      summary,
    };
  }

  /**
   * 获取排行榜
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardResponseDto> {
    this.logger.log(`Fetching leaderboard (limit: ${limit})`);

    // 查询所有用户并按总质押价值排序
    const query = this.userFarmRepository
      .createQueryBuilder('uf')
      .select('uf.userAddress', 'userAddress')
      .addSelect('SUM(CAST(uf.stakedUsd AS DECIMAL))', 'totalStakedUsd')
      .addSelect('SUM(CAST(uf.totalEarned AS DECIMAL))', 'totalEarned')
      .addSelect('COUNT(uf.poolId)', 'poolCount')
      .groupBy('uf.userAddress')
      .orderBy('totalStakedUsd', 'DESC')
      .limit(limit);

    const results = await query.getRawMany();

    // 构建排行榜
    const leaderboard: LeaderboardItemDto[] = results.map((result, index) => ({
      rank: index + 1,
      userAddress: result.userAddress,
      totalStakedUsd: result.totalStakedUsd?.toString() || '0',
      totalEarned: result.totalEarned?.toString() || '0',
      poolCount: parseInt(result.poolCount) || 0,
    }));

    // 获取总用户数
    const totalUsers = await this.userFarmRepository
      .createQueryBuilder('uf')
      .select('COUNT(DISTINCT uf.userAddress)', 'count')
      .getRawOne();

    return {
      leaderboard,
      totalUsers: parseInt(totalUsers.count) || 0,
    };
  }

  /**
   * 从链上同步单个池子数据
   */
  async syncPoolFromChain(poolId: number): Promise<Farm> {
    this.logger.log(`Syncing pool ${poolId} from chain...`);

    if (!this.masterChefAddress) {
      throw new Error('MasterChef address not configured');
    }

    // 从链上读取池子信息
    const poolInfo = await this.publicClient.readContract({
      address: this.masterChefAddress as `0x${string}`,
      abi: this.masterChefAbi,
      functionName: 'poolInfo',
      args: [BigInt(poolId)],
    });

    const [lpTokenAddress, allocPoint, lastRewardBlock, accRewardPerShare] = poolInfo;

    // 读取 LP Token 信息
    const [token0Address, token1Address, lpSymbol] = await Promise.all([
      this.publicClient.readContract({
        address: lpTokenAddress,
        abi: this.pairAbi,
        functionName: 'token0',
      }),
      this.publicClient.readContract({
        address: lpTokenAddress,
        abi: this.pairAbi,
        functionName: 'token1',
      }),
      this.publicClient.readContract({
        address: lpTokenAddress,
        abi: this.pairAbi,
        functionName: 'symbol',
      }),
    ]);

    // 读取 Token 符号
    const [token0Symbol, token1Symbol] = await Promise.all([
      this.publicClient.readContract({
        address: token0Address,
        abi: this.erc20Abi,
        functionName: 'symbol',
      }),
      this.publicClient.readContract({
        address: token1Address,
        abi: this.erc20Abi,
        functionName: 'symbol',
      }),
    ]);

    // 读取总质押量
    const totalStaked = await this.publicClient.readContract({
      address: lpTokenAddress,
      abi: this.erc20Abi,
      functionName: 'balanceOf',
      args: [this.masterChefAddress],
    });

    // 读取 APR
    const apr = await this.publicClient.readContract({
      address: this.masterChefAddress as `0x${string}`,
      abi: this.masterChefAbi,
      functionName: 'getPoolAPR',
      args: [BigInt(poolId)],
    });

    // 计算 APY（简化计算：APY = (1 + APR/365)^365 - 1）
    const aprValue = Number(apr) / 100; // 链上返回的是 basis points
    const apy = aprValue; // 简化：暂时使用 APR

    // 计算每日奖励
    const rewardPerBlock = await this.getRewardPerBlock();
    const totalAllocPoint = await this.getTotalAllocPoint();
    const blocksPerDay = BigInt(24 * 60 * 60 / 15); // 假设每 15 秒一个区块
    const dailyReward = rewardPerBlock * blocksPerDay * allocPoint / totalAllocPoint;

    // 构建 lpTokenSymbol
    const lpTokenSymbol = `${token0Symbol}-${token1Symbol} LP`;

    // 保存或更新数据库
    let farm = await this.farmRepository.findOne({ where: { poolId } });
    
    if (!farm) {
      farm = this.farmRepository.create({
        poolId,
        lpTokenAddress: lpTokenAddress.toLowerCase(),
        lpTokenSymbol,
        token0Address: token0Address.toLowerCase(),
        token0Symbol: token0Symbol as string,
        token1Address: token1Address.toLowerCase(),
        token1Symbol: token1Symbol as string,
        allocPoint: allocPoint.toString(),
        lastRewardBlock: lastRewardBlock.toString(),
        accRewardPerShare: accRewardPerShare.toString(),
      });
    } else {
      farm.allocPoint = allocPoint.toString();
      farm.lastRewardBlock = lastRewardBlock.toString();
      farm.accRewardPerShare = accRewardPerShare.toString();
    }

    farm.totalStaked = formatUnits(totalStaked, 18);
    farm.apr = aprValue.toFixed(2);
    farm.apy = apy.toFixed(2);
    farm.dailyReward = formatUnits(dailyReward, 18);
    
    // 计算 LP Token 的实际 USD 价值
    try {
      const [reserves, lpTotalSupply] = await Promise.all([
        this.publicClient.readContract({
          address: lpTokenAddress,
          abi: this.pairAbi,
          functionName: 'getReserves',
        }),
        this.publicClient.readContract({
          address: lpTokenAddress,
          abi: this.pairAbi,
          functionName: 'totalSupply',
        }),
      ]);

      const reserve0 = formatUnits(reserves[0], 18);
      const reserve1 = formatUnits(reserves[1], 18);
      const totalSupplyFormatted = formatUnits(lpTotalSupply, 18);

      // 使用 PriceService 计算 LP Token USD 价值
      const tvlUsd = await this.priceService.calculateLpTokenUsdValue(
        lpTokenAddress.toLowerCase(),
        farm.totalStaked,
        reserve0,
        reserve1,
        totalSupplyFormatted,
        token0Address.toLowerCase(),
        token1Address.toLowerCase(),
      );

      farm.tvl = tvlUsd;
      farm.totalStakedUsd = tvlUsd;
    } catch (error) {
      this.logger.warn(`Failed to calculate USD value for pool ${poolId}, using token amount`);
      farm.tvl = farm.totalStaked;
      farm.totalStakedUsd = farm.totalStaked;
    }

    await this.farmRepository.save(farm);
    
    this.logger.log(`Pool ${poolId} synced successfully`);
    
    return farm;
  }

  /**
   * 从链上同步所有池子
   */
  async syncAllPoolsFromChain(): Promise<void> {
    this.logger.log('Syncing all pools from chain...');

    const poolLength = await this.publicClient.readContract({
      address: this.masterChefAddress as `0x${string}`,
      abi: this.masterChefAbi,
      functionName: 'poolLength',
    });

    const poolCount = Number(poolLength);
    this.logger.log(`Total pools: ${poolCount}`);

    for (let i = 0; i < poolCount; i++) {
      try {
        await this.syncPoolFromChain(i);
      } catch (error) {
        this.logger.error(`Failed to sync pool ${i}:`, error);
      }
    }

    this.logger.log('All pools synced');
  }

  /**
   * 更新用户质押信息
   */
  async updateUserStake(userAddress: string, poolId: number): Promise<void> {
    this.logger.log(`Updating user stake: ${userAddress} in pool ${poolId}`);

    if (!this.masterChefAddress) {
      throw new Error('MasterChef address not configured');
    }

    const userAddressLower = userAddress.toLowerCase();

    // 从链上读取用户信息
    const [userInfo, pendingReward] = await Promise.all([
      this.publicClient.readContract({
        address: this.masterChefAddress as `0x${string}`,
        abi: this.masterChefAbi,
        functionName: 'userInfo',
        args: [BigInt(poolId), userAddress as `0x${string}`],
      }),
      this.publicClient.readContract({
        address: this.masterChefAddress as `0x${string}`,
        abi: this.masterChefAbi,
        functionName: 'pendingReward',
        args: [BigInt(poolId), userAddress as `0x${string}`],
      }),
    ]);

    const [amount, rewardDebt] = userInfo;

    // 如果用户已无质押，删除记录
    if (amount === 0n) {
      await this.userFarmRepository.delete({ userAddress: userAddressLower, poolId });
      this.logger.log(`User stake removed (zero balance)`);
      return;
    }

    // 获取池子信息以计算占比
    const farm = await this.farmRepository.findOne({ where: { poolId } });
    const totalStaked = farm ? parseFloat(farm.totalStaked) : 0;
    const userStaked = parseFloat(formatUnits(amount, 18));
    const shareOfPool = totalStaked > 0 ? (userStaked / totalStaked) * 100 : 0;

    // 保存或更新
    let userFarm = await this.userFarmRepository.findOne({
      where: { userAddress: userAddressLower, poolId },
    });

    if (!userFarm) {
      userFarm = this.userFarmRepository.create({
        userAddress: userAddressLower,
        poolId,
        stakedAmount: formatUnits(amount, 18),
        rewardDebt: rewardDebt.toString(),
        lastActionAt: new Date(),
      });
    } else {
      userFarm.stakedAmount = formatUnits(amount, 18);
      userFarm.rewardDebt = rewardDebt.toString();
      userFarm.lastActionAt = new Date();
    }

    userFarm.pendingReward = formatUnits(pendingReward, 18);
    userFarm.shareOfPool = shareOfPool;
    
    // 计算用户质押的实际 USD 价值
    try {
      const lpTokenAddress = farm?.lpTokenAddress;
      if (lpTokenAddress) {
        const [reserves, lpTotalSupply, token0Address, token1Address] = await Promise.all([
          this.publicClient.readContract({
            address: lpTokenAddress as `0x${string}`,
            abi: this.pairAbi,
            functionName: 'getReserves',
          }),
          this.publicClient.readContract({
            address: lpTokenAddress as `0x${string}`,
            abi: this.pairAbi,
            functionName: 'totalSupply',
          }),
          this.publicClient.readContract({
            address: lpTokenAddress as `0x${string}`,
            abi: this.pairAbi,
            functionName: 'token0',
          }),
          this.publicClient.readContract({
            address: lpTokenAddress as `0x${string}`,
            abi: this.pairAbi,
            functionName: 'token1',
          }),
        ]);

        const reserve0 = formatUnits(reserves[0], 18);
        const reserve1 = formatUnits(reserves[1], 18);
        const totalSupplyFormatted = formatUnits(lpTotalSupply, 18);

        const stakedUsd = await this.priceService.calculateLpTokenUsdValue(
          lpTokenAddress,
          userFarm.stakedAmount,
          reserve0,
          reserve1,
          totalSupplyFormatted,
          token0Address.toLowerCase(),
          token1Address.toLowerCase(),
        );

        userFarm.stakedUsd = stakedUsd;
      } else {
        userFarm.stakedUsd = userFarm.stakedAmount;
      }
    } catch (error) {
      this.logger.warn(`Failed to calculate USD value for user stake`);
      userFarm.stakedUsd = userFarm.stakedAmount;
    }

    await this.userFarmRepository.save(userFarm);
    
    this.logger.log(`User stake updated successfully`);
  }

  /**
   * 记录用户领取奖励
   */
  async recordRewardClaim(userAddress: string, poolId: number, amount: bigint): Promise<void> {
    const userAddressLower = userAddress.toLowerCase();
    
    const userFarm = await this.userFarmRepository.findOne({
      where: { userAddress: userAddressLower, poolId },
    });

    if (userFarm) {
      const currentEarned = parseFloat(userFarm.totalEarned || '0');
      const newEarned = currentEarned + parseFloat(formatUnits(amount, 18));
      
      userFarm.totalEarned = newEarned.toString();
      userFarm.totalEarnedUsd = newEarned.toString(); // 简化：假设 DEX 价格为 1
      userFarm.pendingReward = '0'; // 领取后待领取归零
      
      await this.userFarmRepository.save(userFarm);
      
      this.logger.log(`Recorded reward claim: ${formatUnits(amount, 18)} DEX`);
    }
  }

  // ============================================
  // 辅助方法
  // ============================================

  private toFarmDto(farm: Farm, totalAllocPoint: bigint): FarmDto {
    const allocPoint = BigInt(farm.allocPoint);
    const weight = totalAllocPoint > 0n ? Number(allocPoint * 10000n / totalAllocPoint) / 10000 : 0;

    const lpToken: LPTokenInfoDto = {
      address: farm.lpTokenAddress,
      symbol: farm.lpTokenSymbol,
      token0: {
        symbol: farm.token0Symbol,
        address: farm.token0Address,
      },
      token1: {
        symbol: farm.token1Symbol,
        address: farm.token1Address,
      },
    };

    return {
      poolId: farm.poolId,
      lpToken,
      allocPoint: farm.allocPoint,
      weight,
      totalStaked: farm.totalStaked,
      totalStakedUsd: farm.totalStakedUsd,
      apr: farm.apr,
      apy: farm.apy,
      dailyReward: farm.dailyReward,
      tvl: farm.tvl,
      active: farm.active,
    };
  }

  private async getTotalAllocPoint(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.masterChefAddress as `0x${string}`,
      abi: this.masterChefAbi,
      functionName: 'totalAllocPoint',
    });
  }

  private async getRewardPerBlock(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.masterChefAddress as `0x${string}`,
      abi: this.masterChefAbi,
      functionName: 'rewardPerBlock',
    });
  }

  private async getCurrentBlock(): Promise<bigint> {
    return await this.publicClient.getBlockNumber();
  }
}

