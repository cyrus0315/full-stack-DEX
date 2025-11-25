import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { parseEther, formatEther } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

// API 基础 URL
const API_BASE_URL = 'http://localhost:3002';

export enum OrderStatus {
  ACTIVE = 'active',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface LimitOrder {
  id: number;
  orderId: string;
  maker: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  executionPrice: string;
  status: OrderStatus;
  createdAtBlock: number;
  expiresAt?: string;
  filledAtBlock?: number;
  filledAmountOut?: string;
  executor?: string;
  txHash: string;
  filledTxHash?: string;
  createdAt: string;
  updatedAt: string;
  isExecutable?: boolean;
  estimatedAmountOut?: string;
}

/**
 * Hook: 获取用户订单列表
 */
export function useUserOrders(address?: string, status?: OrderStatus) {
  return useQuery({
    queryKey: ['limitOrders', 'user', address, status],
    queryFn: async () => {
      if (!address) return [];
      
      const url = `${API_BASE_URL}/api/v1/limit-orders/user/${address}${status ? `?status=${status}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.data as LimitOrder[];
    },
    enabled: !!address,
  });
}

/**
 * Hook: 获取活跃订单列表
 */
export function useActiveOrders() {
  return useQuery({
    queryKey: ['limitOrders', 'active'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/limit-orders/active`);
      const data = await response.json();
      return data.data as LimitOrder[];
    },
  });
}

/**
 * Hook: 获取订单统计
 */
export function useOrderStatistics() {
  return useQuery({
    queryKey: ['limitOrders', 'statistics'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/limit-orders/statistics`);
      const data = await response.json();
      return data.data;
    },
  });
}

/**
 * Hook: 创建限价单
 */
export function useCreateLimitOrder() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const limitOrderBookAddress = import.meta.env.VITE_LIMIT_ORDER_BOOK_ADDRESS;
  const executionFee = parseEther('0.001'); // 0.001 ETH

  const createOrder = useCallback(
    async (params: {
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      minAmountOut: string;
      duration: number; // 秒
    }) => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      if (!limitOrderBookAddress) {
        throw new Error('LimitOrderBook address not configured');
      }

      setIsCreating(true);

      try {
        // 1. 检查授权
        const tokenContract = {
          address: params.tokenIn as `0x${string}`,
          abi: [
            {
              inputs: [{ name: 'spender', type: 'address' }, { name: 'owner', type: 'address' }],
              name: 'allowance',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
            {
              inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
              name: 'approve',
              outputs: [{ name: '', type: 'bool' }],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
        };

        const allowance = await publicClient.readContract({
          ...tokenContract,
          functionName: 'allowance',
          args: [limitOrderBookAddress as `0x${string}`, walletClient.account.address],
        });

        // 2. 如果授权不足，先授权
        if (BigInt(allowance as bigint) < BigInt(params.amountIn)) {
          message.loading('Approving tokens...', 0);

          const approveTx = await walletClient.writeContract({
            ...tokenContract,
            functionName: 'approve',
            args: [limitOrderBookAddress as `0x${string}`, BigInt(params.amountIn)],
          });

          await publicClient.waitForTransactionReceipt({ hash: approveTx });
          message.destroy();
          message.success('Approval successful');
        }

        // 3. 创建订单
        message.loading('Creating limit order...', 0);

        const orderBookContract = {
          address: limitOrderBookAddress as `0x${string}`,
          abi: [
            {
              inputs: [
                { name: 'tokenIn', type: 'address' },
                { name: 'tokenOut', type: 'address' },
                { name: 'amountIn', type: 'uint256' },
                { name: 'minAmountOut', type: 'uint256' },
                { name: 'duration', type: 'uint256' },
              ],
              name: 'createOrder',
              outputs: [{ name: 'orderId', type: 'uint256' }],
              stateMutability: 'payable',
              type: 'function',
            },
          ],
        };

        const createTx = await walletClient.writeContract({
          ...orderBookContract,
          functionName: 'createOrder',
          args: [
            params.tokenIn as `0x${string}`,
            params.tokenOut as `0x${string}`,
            BigInt(params.amountIn),
            BigInt(params.minAmountOut),
            BigInt(params.duration),
          ],
          value: executionFee,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
        message.destroy();
        message.success('Limit order created successfully!');

        // 刷新订单列表
        queryClient.invalidateQueries({ queryKey: ['limitOrders'] });

        return receipt.transactionHash;
      } catch (error: any) {
        message.destroy();
        
        if (error.message?.includes('User rejected')) {
          message.error('Transaction rejected by user');
        } else {
          message.error(`Failed to create order: ${error.message || 'Unknown error'}`);
        }
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [walletClient, publicClient, limitOrderBookAddress, queryClient]
  );

  return { createOrder, isCreating };
}

/**
 * Hook: 取消限价单
 */
export function useCancelLimitOrder() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!walletClient || !publicClient) {
        throw new Error('Wallet not connected');
      }

      const limitOrderBookAddress = import.meta.env.VITE_LIMIT_ORDER_BOOK_ADDRESS;
      if (!limitOrderBookAddress) {
        throw new Error('LimitOrderBook address not configured');
      }

      message.loading('Cancelling order...', 0);

      try {
        const orderBookContract = {
          address: limitOrderBookAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ name: 'orderId', type: 'uint256' }],
              name: 'cancelOrder',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
        };

        const cancelTx = await walletClient.writeContract({
          ...orderBookContract,
          functionName: 'cancelOrder',
          args: [BigInt(orderId)],
        });

        await publicClient.waitForTransactionReceipt({ hash: cancelTx });
        message.destroy();
        message.success('Order cancelled successfully!');

        // 刷新订单列表
        queryClient.invalidateQueries({ queryKey: ['limitOrders'] });

        return cancelTx;
      } catch (error: any) {
        message.destroy();
        message.error(`Failed to cancel order: ${error.message || 'Unknown error'}`);
        throw error;
      }
    },
    [walletClient, publicClient, queryClient]
  );

  return { cancelOrder };
}

