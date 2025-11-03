import { Layout as AntLayout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import {
  SwapOutlined,
  DropboxOutlined,
  AppstoreOutlined,
  WalletOutlined,
  HistoryOutlined,
  FireOutlined,
} from '@ant-design/icons'
import ConnectWallet from '../ConnectWallet'
import './index.css'

const { Header, Content } = AntLayout

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()

  const menuItems = [
    {
      key: '/swap',
      icon: <SwapOutlined />,
      label: <Link to="/swap">Swap</Link>,
    },
    {
      key: '/liquidity',
      icon: <DropboxOutlined />,
      label: <Link to="/liquidity">Liquidity</Link>,
    },
    {
      key: '/pool',
      icon: <AppstoreOutlined />,
      label: <Link to="/pool">Pool</Link>,
    },
    {
      key: '/farms',
      icon: <FireOutlined />,
      label: <Link to="/farms">Farms</Link>,
    },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: <Link to="/history">History</Link>,
    },
    {
      key: '/portfolio',
      icon: <WalletOutlined />,
      label: <Link to="/portfolio">Portfolio</Link>,
    },
  ]

  return (
    <AntLayout className="layout">
      <Header className="header">
        <div className="header-content">
          <div className="logo">
            <SwapOutlined style={{ fontSize: '24px', marginRight: '8px' }} />
            <span>DEX</span>
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ flex: 1, minWidth: 0 }}
          />
          <ConnectWallet />
        </div>
      </Header>
      <Content className="content">
        <div className="content-wrapper">{children}</div>
      </Content>
    </AntLayout>
  )
}

export default Layout

