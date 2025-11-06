/**
 * 价格显示组件
 * 
 * 显示代币价格和USD价值
 */

import React from 'react';
import { Spin, Tooltip } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { usePriceByAddress, useTokenValue, formatPrice, formatUsdValue } from '../../hooks/usePriceOracle';
import './index.css';

interface PriceDisplayProps {
  tokenAddress: string;
  amount?: string;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * 代币价格显示
 */
export const TokenPriceDisplay: React.FC<PriceDisplayProps> = ({
  tokenAddress,
  showIcon = true,
  size = 'medium',
}) => {
  const { price, priceUsd, loading } = usePriceByAddress(tokenAddress);

  if (loading) {
    return <Spin size="small" />;
  }

  if (!price || priceUsd === 0) {
    return <span className={`price-display price-display-${size}`}>-</span>;
  }

  return (
    <Tooltip title={`Last updated: ${price.lastUpdateTime ? new Date(price.lastUpdateTime).toLocaleString() : 'N/A'}`}>
      <span className={`price-display price-display-${size}`}>
        {showIcon && <DollarOutlined style={{ marginRight: 4 }} />}
        {formatPrice(priceUsd)}
      </span>
    </Tooltip>
  );
};

/**
 * 代币USD价值显示
 */
export const TokenValueDisplay: React.FC<PriceDisplayProps> = ({
  tokenAddress,
  amount,
  showIcon = true,
  size = 'medium',
}) => {
  const { valueUsd, loading } = useTokenValue(tokenAddress, amount);

  if (loading) {
    return <Spin size="small" />;
  }

  if (valueUsd === 0) {
    return <span className={`price-display price-display-${size}`}>-</span>;
  }

  return (
    <span className={`price-display price-display-${size} price-value`}>
      {showIcon && <DollarOutlined style={{ marginRight: 4 }} />}
      {formatUsdValue(valueUsd)}
    </span>
  );
};

export default {
  TokenPriceDisplay,
  TokenValueDisplay,
};

