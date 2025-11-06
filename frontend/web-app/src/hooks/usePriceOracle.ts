/**
 * usePriceOracle Hook
 * 
 * 从后端API获取实时代币价格
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1';

export interface TokenPrice {
  tokenAddress: string;
  symbol: string;
  priceUsd: string;
  lastUpdateTime: string | null;
  isActive: boolean;
}

export interface PriceData {
  prices: TokenPrice[];
  lastRefreshTime: string;
  totalTokens: number;
}

/**
 * Hook：获取所有代币价格
 */
export function usePrices() {
  const [prices, setPrices] = useState<TokenPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<PriceData>(`${API_BASE_URL}/price`);
      
      setPrices(response.data.prices);
      setLastRefreshTime(response.data.lastRefreshTime);
    } catch (err: any) {
      console.error('Failed to fetch prices:', err);
      setError(err.response?.data?.message || 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    
    // 每30秒刷新一次
    const interval = setInterval(fetchPrices, 30000);
    
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return {
    prices,
    loading,
    error,
    lastRefreshTime,
    refresh: fetchPrices,
  };
}

/**
 * Hook：获取单个代币价格（通过地址）
 */
export function useTokenPrice(tokenAddress: string | undefined) {
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!tokenAddress) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<TokenPrice>(
        `${API_BASE_URL}/price/${tokenAddress}`
      );
      
      setPrice(response.data);
    } catch (err: any) {
      console.error(`Failed to fetch price for ${tokenAddress}:`, err);
      setError(err.response?.data?.message || 'Failed to fetch price');
      setPrice(null);
    } finally {
      setLoading(false);
    }
  }, [tokenAddress]);

  useEffect(() => {
    fetchPrice();
    
    // 每30秒刷新一次
    const interval = setInterval(fetchPrice, 30000);
    
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return {
    price,
    loading,
    error,
    refresh: fetchPrice,
  };
}

/**
 * Hook：从价格列表中查找代币价格（内存查找，更高效）
 */
export function usePriceByAddress(tokenAddress: string | undefined) {
  const { prices, loading } = usePrices();

  const price = prices.find(
    (p) => p.tokenAddress.toLowerCase() === tokenAddress?.toLowerCase()
  );

  const priceUsd = price ? parseFloat(price.priceUsd) : 0;

  return {
    price,
    priceUsd,
    priceFormatted: priceUsd > 0 ? `$${priceUsd.toFixed(2)}` : '-',
    loading,
  };
}

/**
 * Hook：计算代币USD价值
 */
export function useTokenValue(
  tokenAddress: string | undefined,
  amount: string | undefined
) {
  const { priceUsd, loading } = usePriceByAddress(tokenAddress);

  const amountNum = amount ? parseFloat(amount) : 0;
  const valueUsd = priceUsd * amountNum;

  return {
    valueUsd,
    valueFormatted: valueUsd > 0 ? `$${valueUsd.toFixed(2)}` : '-',
    loading,
  };
}

/**
 * 格式化价格显示
 */
export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  
  if (num === 0 || isNaN(num)) return '-';
  if (num < 0.01) return `$${num.toFixed(6)}`;
  if (num < 1) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(2)}`;
}

/**
 * 格式化USD价值
 */
export function formatUsdValue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === 0 || isNaN(num)) return '-';
  if (num < 0.01) return '<$0.01';
  if (num < 1000) return `$${num.toFixed(2)}`;
  if (num < 1000000) return `$${(num / 1000).toFixed(2)}K`;
  return `$${(num / 1000000).toFixed(2)}M`;
}

