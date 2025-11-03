import { Button, Dropdown, Space, Typography } from 'antd'
import {
  WalletOutlined,
  DisconnectOutlined,
  CopyOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useWallet } from '../../hooks/useWallet'
import { message } from 'antd'
import type { MenuProps } from 'antd'

const { Text } = Typography

const ConnectWallet: React.FC = () => {
  const {
    address,
    isConnected,
    chainId,
    balance,
    connectWallet,
    disconnectWallet,
    switchToHardhat,
  } = useWallet()

  /**
   * 格式化地址显示（显示前6位和后4位）
   */
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  /**
   * 复制地址到剪贴板
   */
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      message.success('地址已复制')
    }
  }

  /**
   * 已连接状态下的下拉菜单
   */
  const menuItems: MenuProps['items'] = [
    {
      key: 'address',
      label: (
        <Space direction="vertical" style={{ padding: '4px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            钱包地址
          </Text>
          <Text strong>{address && formatAddress(address)}</Text>
        </Space>
      ),
      disabled: true,
    },
    {
      key: 'balance',
      label: (
        <Space direction="vertical" style={{ padding: '4px 0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ETH 余额
          </Text>
          <Text strong>{parseFloat(balance).toFixed(4)} ETH</Text>
        </Space>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'copy',
      label: '复制地址',
      icon: <CopyOutlined />,
      onClick: copyAddress,
    },
    {
      key: 'switch',
      label: '切换到 Hardhat',
      icon: <SwapOutlined />,
      onClick: switchToHardhat,
      disabled: chainId === 31337,
    },
    {
      type: 'divider',
    },
    {
      key: 'disconnect',
      label: '断开连接',
      icon: <DisconnectOutlined />,
      danger: true,
      onClick: disconnectWallet,
    },
  ]

  // 未连接状态
  if (!isConnected) {
    return (
      <Button
        type="primary"
        icon={<WalletOutlined />}
        onClick={connectWallet}
        size="large"
      >
        Connect Wallet
      </Button>
    )
  }

  // 已连接状态
  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
      <Button
        type="primary"
        icon={<WalletOutlined />}
        size="large"
        style={{
          background:
            chainId === 31337 ? '#52c41a' : '#ff4d4f',
        }}
      >
        {address && formatAddress(address)}
      </Button>
    </Dropdown>
  )
}

export default ConnectWallet

