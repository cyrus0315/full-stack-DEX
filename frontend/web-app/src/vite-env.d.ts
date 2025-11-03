/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_SERVICE_URL: string
  readonly VITE_TRADING_SERVICE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_RPC_URL: string
  readonly VITE_FACTORY_ADDRESS: string
  readonly VITE_ROUTER_ADDRESS: string
  readonly VITE_USDT_ADDRESS: string
  readonly VITE_DAI_ADDRESS: string
  readonly VITE_WETH_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

