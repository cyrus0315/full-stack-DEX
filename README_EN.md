# 🚀 DEX - Decentralized Exchange

> Enterprise-grade DEX implementation based on UniswapV2 with modern tech stack, fully open-source.

[English](./README_EN.md) | [简体中文](./README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E.svg)](https://nestjs.com/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636.svg)](https://soliditylang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## 📖 Introduction

A full-featured decentralized exchange (DEX) featuring:

- ✅ **Swap** - Token exchange with AMM algorithm
- ✅ **Liquidity** - Add/remove liquidity
- ✅ **Pool** - Liquidity pool management
- ✅ **Farms** - Liquidity mining
- ✅ **History** - Complete transaction history
- ✅ **Analytics** - Data analysis and statistics
- ✅ **Real-time** - WebSocket live updates

### 🌟 Highlights

- **Truly Decentralized** - Users manage private keys through MetaMask
- **Modern Architecture** - Frontend calls contracts directly, backend provides read-only services
- **Complete Analytics** - Historical records, statistics, real-time monitoring
- **Production-Ready** - Refactored and optimized code, clean and maintainable

---

## 📸 Screenshots

### 💱 Swap - Token Exchange
<img src="./docs/images/screenshots/swap.jpg" alt="Swap Interface" width="800">

*Instantly swap any ERC20 tokens with slippage protection*

### 💧 Pool - Liquidity Pools
<img src="./docs/images/screenshots/pool-list.jpg" alt="Pool List" width="800">

*View all trading pairs with TVL and APY at a glance*

### ➕ Add Liquidity - Provide Liquidity
<img src="./docs/images/screenshots/add-liquidity.jpg" alt="Add Liquidity" width="800">

*Become a liquidity provider and earn trading fees*

### 🌾 Farms - Liquidity Mining
<img src="./docs/images/screenshots/farms.jpg" alt="Farms" width="800">

*Stake LP tokens to earn additional rewards*

### 📊 Pool Detail - Pool Information
<img src="./docs/images/screenshots/pool-detail.jpg" alt="Pool Detail" width="800">

*Detailed pool information and staking interface*

### 📜 History - Transaction Records
<img src="./docs/images/screenshots/history.jpg" alt="Transaction History" width="800">

*Complete Swap and liquidity operation history*

---

## 🎯 Why This Project?

### Comparison with Other DEX Implementations

| Feature | This Project | Others |
|---------|-------------|---------|
| **Completeness** | ✅ Swap + Liquidity + Analytics | ⚠️ Basic features only |
| **Architecture** | ✅ Production-grade, microservices | ⚠️ Simple examples |
| **Documentation** | ✅ 15+ detailed guides | ⚠️ Basic README |
| **Code Quality** | ✅ TypeScript + ESLint + Comments | ⚠️ JavaScript, few comments |
| **Real-time Data** | ✅ WebSocket + Event listeners | ❌ None |
| **Analytics** | ✅ History + Statistics | ❌ None |

### Use Cases

- 🎓 **Learn DeFi Development**: Complete DEX implementation for Web3 learning
- 🚀 **Rapid Prototyping**: Build your own DEX quickly
- 📚 **Educational Reference**: Clear code, comprehensive docs
- 🏢 **Enterprise Projects**: Production-ready code for commercial use

---

## 🏗️ Tech Stack

### Smart Contracts
- **Solidity** - Contract language
- **Hardhat** - Development framework
- **UniswapV2** - AMM protocol

### Backend
- **NestJS** - Node.js framework
- **TypeScript** - Type safety
- **TypeORM** - ORM framework
- **PostgreSQL** - Database
- **Redis** - Cache
- **Socket.IO** - WebSocket real-time communication
- **Viem** - Ethereum library (read-only)

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Ant Design** - UI component library
- **Wagmi** - React Hooks for Ethereum
- **Viem** - Ethereum library
- **Zustand** - State management
- **React Query** - Data fetching

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14
- MetaMask wallet

### 1. Clone Repository

```bash
git clone https://github.com/your-username/dex.git
cd dex
```

### 2. One-Click Start

```bash
# See detailed steps
cat START_ALL.md

# Or quick start guide
cat GETTING_STARTED.md
```

### 3. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3002
- **API Docs:** http://localhost:3002/api
- **Wallet Service:** http://localhost:3001

---

## 📊 Project Status

### ✅ Completed Features

- **Phase 1** - Core Features ✅
  - Smart contract deployment
  - Frontend basic features
  - Backend API
  - MetaMask integration

- **Phase 2** - Real-time Data Sync ✅
  - Blockchain event listening
  - WebSocket live updates
  - Auto data synchronization
  - Scheduled tasks

- **Phase 3** - Data Analytics ✅
  - Transaction history
  - Liquidity history
  - Statistical analysis
  - User activity tracking

- **Code Cleanup** - Architecture Optimization ✅
  - Removed deprecated code (~2500 lines)
  - Backend purification (read-only service)
  - Documentation organization

### 📝 Upcoming Features

- **Phase 4** - UX Improvements
  - Data visualization (charts)
  - Dark/Light theme
  - Multi-language support
  - Mobile optimization

- **Phase 5** - Advanced Features
  - Price oracle integration
  - Multi-hop routing
  - Limit orders
  - APY calculation

---

## 📚 Documentation

### Core Docs

| Document | Description |
|----------|-------------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | Quick start guide |
| [START_ALL.md](./START_ALL.md) | Start all services |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture overview |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Quick reference |
| [TODO_LIST.md](./TODO_LIST.md) | Task list |

### Detailed Docs

| Directory | Description |
|-----------|-------------|
| [docs/INDEX.md](./docs/INDEX.md) | 📖 Documentation index (recommended) |
| [docs/phases/](./docs/phases/) | 🎯 Development phase records |
| [docs/guides/](./docs/guides/) | 📖 User guides |
| [docs/maintenance/](./docs/maintenance/) | 🧹 Maintenance docs |

---

## 🎯 Core Concepts

### User Perspective

```
User → MetaMask → Smart Contracts
         ↓
    Sign Transaction
         ↓
   On-chain Execution (Decentralized)
```

### System Architecture

```
┌─────────────────────────────────────────────┐
│                   Frontend                   │
│   (React + Viem + MetaMask)                 │
│   - Direct contract calls                    │
│   - Backend API queries                      │
└──────────────┬──────────────────────────────┘
               │
               ├──────────────┐
               │              │
               ▼              ▼
      ┌────────────┐   ┌──────────────┐
      │  Contracts │   │   Backend     │
      │ (Solidity) │   │   (NestJS)    │
      │            │   │  - Read API   │
      │ - Swap     │   │  - Analytics  │
      │ - Pool     │   │  - Events     │
      │ - Router   │   │  - Real-time  │
      └────────────┘   └──────────────┘
            ▲                  │
            │                  │
            └──────────────────┘
           Blockchain Events
```

---

## 🔧 Development

### Project Structure

```
dex/
├── contracts/          # Smart contracts
│   ├── contracts/      # Solidity contracts
│   └── scripts/        # Deployment scripts
│
├── backend/            # Backend services
│   └── services/
│       ├── analytics-service/  # Data analytics
│       └── wallet-service/     # Wallet service
│
├── frontend/           # Frontend app
│   └── web-app/        # React app
│
├── docs/               # Documentation
└── tests/              # Tests
```

### Common Commands

```bash
# Mint tokens
bash scripts/mint-tokens-simple.sh

# Sync pool data
bash scripts/sync-all-pools.sh

# Test API
bash scripts/test-analytics-api.sh
```

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

### Development Standards

- **Code Style** - ESLint + Prettier
- **Commit Convention** - Conventional Commits
- **Branch Strategy** - Git Flow
- **Testing** - Unit tests + Integration tests

---

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

## 🌟 Acknowledgments

- [Uniswap V2](https://uniswap.org/) - AMM protocol
- [NestJS](https://nestjs.com/) - Backend framework
- [React](https://reactjs.org/) - Frontend framework
- [Viem](https://viem.sh/) - Ethereum library
- [Wagmi](https://wagmi.sh/) - React Hooks

---

## 📞 Contact

- **GitHub Issues** - Bug reports
- **Discussions** - Community discussions

---

**Project Status:** ✅ Phase 3 Complete, Fully Functional  
**Last Updated:** 2025-11-14  
**Maintainers:** DEX Team

