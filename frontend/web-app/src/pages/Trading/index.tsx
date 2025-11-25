import { useState } from 'react';
import { Card, Tabs, Typography } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import SwapPage from '../Swap';
import { LimitOrderForm } from '../../components/LimitOrderForm';
import { DEFAULT_TOKENS } from '../../config/tokens';
import './index.css';

const { Title, Text } = Typography;

const TradingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('market');

  const items = [
    {
      key: 'market',
      label: (
        <span>
          <ThunderboltOutlined /> Market
        </span>
      ),
      children: <SwapPage />,
    },
    {
      key: 'limit',
      label: (
        <span>
          <ClockCircleOutlined /> Limit
        </span>
      ),
      children: (
        <div className="limit-order-container">
          <LimitOrderForm
            tokenIn={DEFAULT_TOKENS[1]}
            tokenOut={DEFAULT_TOKENS[2]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="trading-page">
      <div className="trading-header">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Trade
          </Title>
          <Text type="secondary">
            Trade tokens instantly or create limit orders
          </Text>
        </div>
      </div>

      <Card className="trading-card" bordered={false}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={items}
          size="large"
        />
      </Card>
    </div>
  );
};

export default TradingPage;

