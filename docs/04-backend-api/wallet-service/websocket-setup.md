# WebSocket 实时推送 - 安装说明

## 📦 安装依赖

WebSocket 功能需要以下依赖包：

```bash
cd backend/services/wallet-service
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## ✅ 已完成的工作

1. **核心文件**:
   - ✅ `src/websocket/events.gateway.ts` - WebSocket Gateway
   - ✅ `src/websocket/websocket.module.ts` - WebSocket Module
   - ✅ `src/app.module.ts` - 已注册 WebSocketModule
   - ✅ `src/modules/transaction/block-scanner.service.ts` - 已集成事件推送

2. **测试文件**:
   - ✅ `test-websocket.html` - 可视化测试页面

3. **文档**:
   - ✅ `docs/04-backend-api/wallet-service/websocket-realtime.md` - 完整文档

## 🚀 启动服务

安装依赖后，重启服务：

```bash
# 停止当前服务 (Ctrl+C)

# 重新启动
pnpm run start:dev
```

## 🧪 测试

1. **打开测试页面**:
   ```bash
   open test-websocket.html
   ```
   或在浏览器中打开文件。

2. **连接 WebSocket**:
   - 点击"连接"按钮
   - 查看连接状态

3. **测试实时推送**:
   - 在另一个终端执行交易：
     ```bash
     cd ../../contracts
     npx hardhat run scripts/add-liquidity.ts --network localhost
     ```
   - 应该能看到新区块和新交易的实时推送

## 📡 功能特性

- ✅ 新交易实时通知
- ✅ 新区块实时通知
- ✅ 余额变化通知
- ✅ 地址订阅管理
- ✅ 自动与 Block Scanner 集成

## 🔧 配置

WebSocket 使用与 HTTP 相同的端口：

```env
PORT=3001
```

WebSocket 地址：
```
ws://localhost:3001/events
```

## 📖 API 文档

详见：`docs/04-backend-api/wallet-service/websocket-realtime.md`

## 💡 使用示例

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/events');

socket.on('connect', () => {
  // 订阅地址
  socket.emit('subscribe:address', { 
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' 
  });
});

// 监听新交易
socket.on('transaction:new', (data) => {
  console.log('新交易:', data);
});

// 监听新区块
socket.on('block:new', (data) => {
  console.log('新区块:', data);
});
```

## ⚠️ 注意事项

1. 必须先安装依赖才能启动服务
2. 如果不安装依赖，服务会报错无法启动
3. 建议在开发环境先测试，确认功能正常后再部署

---

**安装命令**:
```bash
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
```

