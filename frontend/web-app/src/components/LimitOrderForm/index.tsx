import React, { useState, useEffect } from 'react';
import { Card, Input, Button, InputNumber, Select, message } from 'antd';
import { SwapOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { parseEther, formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useCreateLimitOrder } from '../../hooks/useLimitOrders';
import './index.css';

const { Option } = Select;

interface LimitOrderFormProps {
  tokenIn?: { address: string; symbol: string; decimals: number };
  tokenOut?: { address: string; symbol: string; decimals: number };
  onSuccess?: () => void;
}

export const LimitOrderForm: React.FC<LimitOrderFormProps> = ({
  tokenIn,
  tokenOut,
  onSuccess,
}) => {
  const { address } = useAccount();
  const { createOrder, isCreating } = useCreateLimitOrder();

  const [amountIn, setAmountIn] = useState<string>('');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [duration, setDuration] = useState<number>(86400); // 默认 24 小时
  const [minAmountOut, setMinAmountOut] = useState<string>('');

  // 计算最小输出数量
  useEffect(() => {
    if (amountIn && targetPrice) {
      try {
        const amountInNum = parseFloat(amountIn);
        const priceNum = parseFloat(targetPrice);
        const calculatedMinOut = (amountInNum * priceNum).toFixed(6);
        setMinAmountOut(calculatedMinOut);
      } catch {
        setMinAmountOut('');
      }
    } else {
      setMinAmountOut('');
    }
  }, [amountIn, targetPrice]);

  const handleCreateOrder = async () => {
    if (!address) {
      message.error('Please connect wallet');
      return;
    }

    if (!tokenIn || !tokenOut) {
      message.error('Please select tokens');
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      message.error('Please enter amount');
      return;
    }

    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      message.error('Please enter target price');
      return;
    }

    try {
      const amountInWei = parseEther(amountIn);
      const minAmountOutWei = parseEther(minAmountOut);

      await createOrder({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInWei.toString(),
        minAmountOut: minAmountOutWei.toString(),
        duration,
      });

      // 重置表单
      setAmountIn('');
      setTargetPrice('');
      setMinAmountOut('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Create limit order failed:', error);
    }
  };

  const durations = [
    { label: '1 Hour', value: 3600 },
    { label: '6 Hours', value: 21600 },
    { label: '1 Day', value: 86400 },
    { label: '3 Days', value: 259200 },
    { label: '7 Days', value: 604800 },
    { label: 'Never', value: 0 },
  ];

  return (
    <Card className="limit-order-form" bordered={false}>
      <div className="form-header">
        <h3>Create Limit Order</h3>
        <div className="execution-fee">
          <ClockCircleOutlined /> Execution Fee: 0.001 ETH
        </div>
      </div>

      <div className="form-body">
        {/* 输入代币 */}
        <div className="form-field">
          <label>You Pay</label>
          <div className="input-wrapper">
            <Input
              size="large"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              suffix={
                <span className="token-symbol">{tokenIn?.symbol || 'Token'}</span>
              }
            />
          </div>
        </div>

        {/* 交换图标 */}
        <div className="swap-icon">
          <SwapOutlined />
        </div>

        {/* 输出代币 */}
        <div className="form-field">
          <label>You Receive (min)</label>
          <div className="input-wrapper">
            <Input
              size="large"
              placeholder="0.0"
              value={minAmountOut}
              readOnly
              suffix={
                <span className="token-symbol">{tokenOut?.symbol || 'Token'}</span>
              }
            />
          </div>
        </div>

        {/* 目标价格 */}
        <div className="form-field">
          <label>Target Price</label>
          <div className="input-wrapper">
            <Input
              size="large"
              placeholder="0.0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              suffix={
                <span className="price-unit">
                  {tokenOut?.symbol || 'Token'} per {tokenIn?.symbol || 'Token'}
                </span>
              }
            />
          </div>
          <div className="price-hint">
            {targetPrice && amountIn && (
              <span>
                You will receive at least {minAmountOut} {tokenOut?.symbol}
              </span>
            )}
          </div>
        </div>

        {/* 有效期 */}
        <div className="form-field">
          <label>Expiration</label>
          <Select
            size="large"
            value={duration}
            onChange={setDuration}
            style={{ width: '100%' }}
          >
            {durations.map((d) => (
              <Option key={d.value} value={d.value}>
                {d.label}
              </Option>
            ))}
          </Select>
        </div>

        {/* 提交按钮 */}
        <Button
          type="primary"
          size="large"
          block
          onClick={handleCreateOrder}
          loading={isCreating}
          disabled={!address || !tokenIn || !tokenOut || !amountIn || !targetPrice}
        >
          {!address ? 'Connect Wallet' : 'Create Limit Order'}
        </Button>

        {/* 说明 */}
        <div className="form-info">
          <p>
            <strong>Note:</strong> Limit orders will be executed automatically when
            the market price reaches your target price. You need to pay a small
            execution fee (0.001 ETH) which will be paid to the keeper who executes
            your order.
          </p>
        </div>
      </div>
    </Card>
  );
};

