# 钱包连接调试指南

## 问题：点击连接钱包提示"请安装 MetaMask"

### 快速排查步骤

#### 1. 检查 MetaMask 是否已安装

打开浏览器控制台（F12），运行以下命令：

```javascript
console.log('window.ethereum:', window.ethereum)
console.log('MetaMask installed:', !!window.ethereum)
```

**预期结果**：
- 应该看到 `window.ethereum` 对象
- `MetaMask installed: true`

**如果显示 `undefined` 或 `false`**：
- 确认 MetaMask 插件已启用
- 尝试刷新页面
- 重启浏览器

---

#### 2. 检查 Wagmi Connectors

在控制台运行：

```javascript
// 这个需要在 React DevTools 中查看
// 或者在代码中添加 console.log
```

---

#### 3. 常见问题和解决方案

##### A. MetaMask 已安装但检测不到

**原因**：页面加载时 MetaMask 还未注入 `window.ethereum`

**解决方案**：
1. 刷新页面（Ctrl + R 或 Cmd + R）
2. 硬刷新（Ctrl + Shift + R 或 Cmd + Shift + R）
3. 重启浏览器

##### B. 多个钱包插件冲突

**原因**：安装了多个钱包插件（如 MetaMask + Coinbase Wallet）

**解决方案**：
1. 禁用其他钱包插件
2. 只保留 MetaMask
3. 刷新页面

##### C. 浏览器兼容性问题

**支持的浏览器**：
- ✅ Chrome / Chromium
- ✅ Brave
- ✅ Edge
- ✅ Firefox
- ❌ Safari（可能有问题）

**解决方案**：
- 使用 Chrome 或 Brave 浏览器
- 确保浏览器是最新版本

##### D. MetaMask 版本过旧

**解决方案**：
1. 更新 MetaMask 到最新版本
2. Chrome 扩展 → 管理扩展 → 更新

---

#### 4. 完整的调试检查清单

在控制台运行以下完整检查：

```javascript
// 复制以下代码到控制台运行
console.log('=== 钱包连接调试 ===')
console.log('1. window.ethereum:', window.ethereum ? '✅ 存在' : '❌ 不存在')
console.log('2. MetaMask isMetaMask:', window.ethereum?.isMetaMask ? '✅ 是' : '❌ 否')
console.log('3. 当前链ID:', window.ethereum?.chainId)
console.log('4. 已连接账户:', window.ethereum?.selectedAddress || '未连接')
console.log('===================')
```

**预期输出示例**：
```
=== 钱包连接调试 ===
1. window.ethereum: ✅ 存在
2. MetaMask isMetaMask: ✅ 是
3. 当前链ID: 0x1
4. 已连接账户: 0x1234...5678
===================
```

---

#### 5. 手动测试连接

在控制台手动请求连接：

```javascript
// 手动请求连接
window.ethereum.request({ method: 'eth_requestAccounts' })
  .then(accounts => {
    console.log('连接成功！账户:', accounts[0])
  })
  .catch(error => {
    console.error('连接失败:', error)
  })
```

**如果这个能成功**，说明问题在前端代码。
**如果这个失败**，说明是 MetaMask 本身的问题。

---

#### 6. 查看网络请求

检查是否有 CORS 或其他网络错误：

1. 打开开发者工具
2. 切换到 **Network** 标签
3. 点击连接钱包
4. 查看是否有红色的失败请求

---

### 已修复的问题

✅ **改进 1**：先检查 `window.ethereum` 是否存在
```typescript
if (!window.ethereum) {
  message.error('请安装 MetaMask 钱包插件')
  return
}
```

✅ **改进 2**：移除 `target: 'metaMask'`，自动检测钱包
```typescript
connectors: [
  injected({
    shimDisconnect: true,
  }),
]
```

✅ **改进 3**：更详细的错误提示
```typescript
if (!metaMaskConnector) {
  console.error('Connectors:', connectors)
  message.error('连接器未找到，请刷新页面重试')
  return
}
```

---

### 最终解决方案

如果以上方法都不行，尝试以下步骤：

#### 方案 A：重新安装 MetaMask

1. 卸载 MetaMask 插件
2. 重启浏览器
3. 重新安装 MetaMask
4. 刷新前端页面

#### 方案 B：清除浏览器缓存

1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

#### 方案 C：使用 HTTP 连接（非 HTTPS）

确保访问的是：`http://localhost:3000`（不是 `https://`）

---

### 代码修改完成

我已经修改了以下文件：

1. **`src/hooks/useWallet.ts`**
   - 添加 `window.ethereum` 检查
   - 改进错误处理
   - 添加更详细的日志

2. **`src/config/wagmi.ts`**
   - 移除 `target: 'metaMask'`
   - 添加 `shimDisconnect: true`
   - 明确指定 RPC URL

---

### 下一步

请尝试以下操作：

1. **刷新页面**（最简单的方法）
2. **打开控制台**，查看是否有错误信息
3. **运行调试命令**，检查 `window.ethereum`
4. **点击连接钱包**，查看控制台输出

如果还是不行，请把控制台的完整错误信息发给我！

