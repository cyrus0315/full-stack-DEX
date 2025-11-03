import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './config/wagmi'
import Layout from './components/Layout'
import SwapPage from './pages/Swap'
import LiquidityPage from './pages/Liquidity'
import PoolPage from './pages/Pool'
import PoolDetail from './pages/PoolDetail'
import PortfolioPage from './pages/Portfolio'
import HistoryPage from './pages/History'
import Farms from './pages/Farms'
import FarmDetail from './pages/FarmDetail'
import MyFarms from './pages/MyFarms'
import './App.css'

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            algorithm: theme.darkAlgorithm,
            token: {
              colorPrimary: '#00b96b',
              borderRadius: 12,
            },
          }}
        >
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/swap" replace />} />
                <Route path="/swap" element={<SwapPage />} />
                <Route path="/liquidity" element={<LiquidityPage />} />
                <Route path="/pool" element={<PoolPage />} />
                <Route path="/pool/:id" element={<PoolDetail />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/farms" element={<Farms />} />
                <Route path="/farms/me" element={<MyFarms />} />
                <Route path="/farms/:poolId" element={<FarmDetail />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App

