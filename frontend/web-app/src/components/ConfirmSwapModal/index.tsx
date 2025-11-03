import React from 'react'
import { Modal, Typography, Space, Divider, Button, Alert, Statistic, Row, Col } from 'antd'
import {
  SwapOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import { formatNumber } from '../../utils/format'
import './index.css'

const { Text, Title } = Typography

interface ConfirmSwapModalProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  swapData: {
    tokenIn: {
      symbol: string
      amount: string
    }
    tokenOut: {
      symbol: string
      amount: string
    }
    priceImpact: string
    minimumReceived: string
    slippage: number
    executionPrice: string
    warning: string | null
    liquidityDepth: 'high' | 'medium' | 'low'
    gasEstimate?: string
  }
}

export const ConfirmSwapModal: React.FC<ConfirmSwapModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  loading = false,
  swapData,
}) => {
  const getPriceImpactColor = (impact: string) => {
    const impactNum = parseFloat(impact)
    if (impactNum < 1) return '#52c41a' // green
    if (impactNum < 5) return '#faad14' // orange
    return '#ff4d4f' // red
  }

  const getLiquidityDepthText = (depth: string) => {
    const map = {
      high: '充足',
      medium: '中等',
      low: '不足',
    }
    return map[depth as keyof typeof map] || depth
  }

  const getLiquidityDepthColor = (depth: string) => {
    const map = {
      high: '#52c41a',
      medium: '#faad14',
      low: '#ff4d4f',
    }
    return map[depth as keyof typeof map] || '#666'
  }

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>确认交易</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button 
          key="cancel" 
          onClick={onCancel} 
          disabled={loading} 
          size="large"
          style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            color: 'rgba(255, 255, 255, 0.85)'
          }}
        >
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={onConfirm}
          loading={loading}
          size="large"
          danger={swapData.warning !== null}
          style={{
            background: swapData.warning 
              ? 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
              : 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
            borderColor: 'transparent',
            fontWeight: 600,
          }}
        >
          {swapData.warning ? '⚠️ 确认交易（高风险）' : '✓ 确认交易'}
        </Button>,
      ]}
      width={520}
      className="confirm-swap-modal"
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 警告提示 */}
        {swapData.warning && (
          <Alert
            message={swapData.warning}
            type="error"
            icon={<WarningOutlined />}
            showIcon
          />
        )}

        {/* 交易摘要 */}
        <div className="swap-summary">
          <div className="token-amount">
            <Text type="secondary">支付</Text>
            <Title level={3} style={{ margin: 0 }}>
              {formatNumber(swapData.tokenIn.amount)} {swapData.tokenIn.symbol}
            </Title>
          </div>

          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <ArrowDownOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          </div>

          <div className="token-amount">
            <Text type="secondary">接收（预估）</Text>
            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
              {formatNumber(swapData.tokenOut.amount)} {swapData.tokenOut.symbol}
            </Title>
          </div>
        </div>

        <Divider style={{ margin: 0 }} />

        {/* 交易详情 */}
        <div className="swap-details">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Statistic
                title="价格影响"
                value={swapData.priceImpact}
                suffix="%"
                valueStyle={{
                  color: getPriceImpactColor(swapData.priceImpact),
                  fontSize: 20,
                }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="滑点容忍度"
                value={swapData.slippage}
                suffix="%"
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
          </Row>

          <Divider dashed style={{ margin: '16px 0' }} />

          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div className="detail-row">
              <Text type="secondary">执行价格</Text>
              <Text strong>
                1 {swapData.tokenIn.symbol} ≈{' '}
                {formatNumber(swapData.executionPrice)} {swapData.tokenOut.symbol}
              </Text>
            </div>

            <div className="detail-row">
              <Space>
                <Text type="secondary">最小接收</Text>
                <InfoCircleOutlined style={{ color: '#999', fontSize: 12 }} />
              </Space>
              <Text strong>
                {formatNumber(swapData.minimumReceived)} {swapData.tokenOut.symbol}
              </Text>
            </div>

            <div className="detail-row">
              <Text type="secondary">流动性深度</Text>
              <Text strong style={{ color: getLiquidityDepthColor(swapData.liquidityDepth) }}>
                {getLiquidityDepthText(swapData.liquidityDepth)}
              </Text>
            </div>

            {swapData.gasEstimate && (
              <div className="detail-row">
                <Text type="secondary">预估 Gas</Text>
                <Text>{swapData.gasEstimate}</Text>
              </div>
            )}
          </Space>
        </div>

        {/* 风险提示 */}
        <div
          style={{
            padding: 16,
            background: 'rgba(24, 144, 255, 0.1)',
            border: '1px solid rgba(24, 144, 255, 0.2)',
            borderRadius: 12,
            fontSize: 12,
          }}
        >
          <Space direction="vertical" size={6}>
            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontWeight: 500 }}>
              <InfoCircleOutlined /> 交易提示：
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              • 实际成交价格可能因滑点而有所不同
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
              • 确保账户有足够的 Gas 费用
            </Text>
            {parseFloat(swapData.priceImpact) > 5 && (
              <Text style={{ color: '#ff7875', fontWeight: 500 }}>
                • 价格影响较大，建议分批交易
              </Text>
            )}
          </Space>
        </div>
      </Space>
    </Modal>
  )
}

export default ConfirmSwapModal

