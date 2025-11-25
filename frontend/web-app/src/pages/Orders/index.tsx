import { useState } from 'react';
import { Card, Table, Button, Tag, Space, Typography, Tabs, message, Tooltip, Empty } from 'antd';
import { ReloadOutlined, CloseCircleOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useUserOrders, useCancelLimitOrder, OrderStatus, LimitOrder } from '../../hooks/useLimitOrders';
import { formatAddress, formatNumber } from '../../utils/format';
import './index.css';

const { Title, Text } = Typography;

const OrdersPage: React.FC = () => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('active');
  
  // 获取用户订单
  const { data: activeOrders, isLoading: activeLoading, refetch: refetchActive } = useUserOrders(
    address,
    OrderStatus.ACTIVE
  );
  const { data: filledOrders, isLoading: filledLoading, refetch: refetchFilled } = useUserOrders(
    address,
    OrderStatus.FILLED
  );
  const { data: cancelledOrders, isLoading: cancelledLoading, refetch: refetchCancelled } = useUserOrders(
    address,
    OrderStatus.CANCELLED
  );

  const { cancelOrder } = useCancelLimitOrder();
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // 取消订单
  const handleCancelOrder = async (orderId: string) => {
    try {
      setCancellingOrderId(orderId);
      await cancelOrder(orderId);
      refetchActive();
    } catch (error) {
      console.error('Cancel order failed:', error);
    } finally {
      setCancellingOrderId(null);
    }
  };

  // 状态标签渲染
  const renderStatusTag = (status: OrderStatus) => {
    const statusConfig = {
      [OrderStatus.ACTIVE]: { color: 'processing', text: 'Active', icon: <ClockCircleOutlined /> },
      [OrderStatus.FILLED]: { color: 'success', text: 'Filled', icon: <CheckCircleOutlined /> },
      [OrderStatus.CANCELLED]: { color: 'default', text: 'Cancelled', icon: <CloseCircleOutlined /> },
      [OrderStatus.EXPIRED]: { color: 'warning', text: 'Expired', icon: <ClockCircleOutlined /> },
    };

    const config = statusConfig[status];
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // 表格列定义
  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 100,
      render: (orderId: string) => (
        <Tooltip title={orderId}>
          <Text code>#{orderId}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Pair',
      key: 'pair',
      render: (_: any, record: LimitOrder) => (
        <Space>
          <Text strong>Token A → Token B</Text>
        </Space>
      ),
    },
    {
      title: 'Amount In',
      dataIndex: 'amountIn',
      key: 'amountIn',
      render: (amountIn: string) => (
        <Text>{formatNumber(formatEther(BigInt(amountIn)))}</Text>
      ),
    },
    {
      title: 'Min Amount Out',
      dataIndex: 'minAmountOut',
      key: 'minAmountOut',
      render: (minAmountOut: string) => (
        <Text>{formatNumber(formatEther(BigInt(minAmountOut)))}</Text>
      ),
    },
    {
      title: 'Target Price',
      dataIndex: 'executionPrice',
      key: 'executionPrice',
      render: (executionPrice: string) => (
        <Text>{formatNumber(formatEther(BigInt(executionPrice)))}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => renderStatusTag(status),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => (
        <Text type="secondary">{new Date(createdAt).toLocaleString()}</Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: LimitOrder) => {
        if (record.status === OrderStatus.ACTIVE) {
          return (
            <Button
              size="small"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => handleCancelOrder(record.orderId)}
              loading={cancellingOrderId === record.orderId}
            >
              Cancel
            </Button>
          );
        }
        return null;
      },
    },
  ];

  const tabItems = [
    {
      key: 'active',
      label: `Active (${activeOrders?.length || 0})`,
      children: (
        <Table
          dataSource={activeOrders || []}
          columns={columns}
          loading={activeLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                description="No active orders"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      ),
    },
    {
      key: 'filled',
      label: `Filled (${filledOrders?.length || 0})`,
      children: (
        <Table
          dataSource={filledOrders || []}
          columns={columns.filter(col => col.key !== 'action')}
          loading={filledLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                description="No filled orders"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      ),
    },
    {
      key: 'cancelled',
      label: `Cancelled (${cancelledOrders?.length || 0})`,
      children: (
        <Table
          dataSource={cancelledOrders || []}
          columns={columns.filter(col => col.key !== 'action')}
          loading={cancelledLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{
            emptyText: (
              <Empty
                description="No cancelled orders"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      ),
    },
  ];

  if (!address) {
    return (
      <div className="orders-page">
        <Card>
          <Empty
            description="Please connect your wallet to view your orders"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <ClockCircleOutlined /> My Orders
          </Title>
          <Text type="secondary">
            Manage your limit orders
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            refetchActive();
            refetchFilled();
            refetchCancelled();
          }}
        >
          Refresh
        </Button>
      </div>

      <Card className="orders-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default OrdersPage;

