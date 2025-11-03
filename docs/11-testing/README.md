# 测试文档

本目录包含所有测试相关的文档、指南和报告。

---

## 📚 文档列表

### 📋 测试指南

#### [E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md)
**端到端测试完整指南**

内容包括：
- 测试准备步骤
- 运行测试的完整流程
- 测试阶段说明（10个阶段）
- 故障排查指南
- 性能指标
- CI/CD 集成

---

### 📊 测试报告

#### [PHASE1_COMPLETION_REPORT.md](./PHASE1_COMPLETION_REPORT.md)
**一期完成报告**

包含：
- 总体完成情况（100%）
- 已完成功能清单
  - 智能合约层
  - Trading Service
  - Wallet Service
  - 基础设施
- 测试和文档
- 技术亮点
- 代码统计
- 核心流程验证
- 交付物清单
- 系统架构图
- 里程碑达成
- 二期规划预览

---

#### [trading-service-tests.md](./trading-service-tests.md)
**Trading Service 测试报告**

Trading Service 各模块的详细测试记录和结果。

---

## 🚀 快速链接

### 测试脚本
所有测试脚本位于 [`../../tests/`](../../tests/) 目录：
- [端到端测试](../../tests/e2e/test-e2e-full.sh)
- [Swap 模块测试](../../tests/unit/test-swap.sh)
- [Liquidity 模块测试](../../tests/unit/test-liquidity-full.sh)
- [Block Scanner 测试](../../tests/unit/test-scanner.sh)
- [WebSocket 测试页面](../../tests/e2e/test-websocket.html)

### 开发文档
- [开发指南](../05-development/README.md)
- [API 文档](../04-backend-api/README.md)
- [智能合约文档](../03-smart-contracts/README.md)

### 部署文档
- [部署指南](../06-deployment/README.md)
- [故障排查](../07-troubleshooting/README.md)

---

## 📊 测试覆盖概览

### 端到端测试
- ✅ **环境检查** - Hardhat 节点、后端服务
- ✅ **合约部署** - 自动部署或使用现有合约
- ✅ **Wallet Service** - 余额查询、地址管理
- ✅ **Trading Service** - Pool、Quote 模块
- ✅ **添加流动性** - 代币授权、流动性添加、头寸查询
- ✅ **代币交换** - Exact In、Exact Out 交换
- ✅ **移除流动性** - LP token 授权、流动性移除
- ✅ **数据同步** - Block Scanner 同步验证
- ✅ **历史查询** - Swap、Liquidity 记录查询

### 单元测试
- ✅ **Swap Module** - 授权、交换、查询（10+ 测试用例）
- ✅ **Liquidity Module** - 添加、移除、头寸（15+ 测试用例）
- ✅ **Block Scanner** - 扫描、导入、过滤
- ✅ **WebSocket** - 连接、订阅、推送

---

## 🎯 测试指标

### 一期测试结果

```
总测试数:          40+
核心功能通过率:     100%
端到端测试通过率:   93%+
单元测试通过率:     100%
```

### 性能指标
- API 响应时间: <100ms (缓存)
- 交易确认时间: ~5 秒/交易
- Block Scanner 延迟: <10 秒
- WebSocket 实时性: 即时推送

---

## 📝 测试最佳实践

### 1. 测试前准备
- 确保所有服务正常运行
- 检查数据库连接
- 确认合约已部署

### 2. 测试顺序
1. 单元测试（各模块独立）
2. 集成测试（模块间交互）
3. 端到端测试（完整流程）

### 3. 测试环境
- 使用 Hardhat 本地节点
- 独立的测试数据库
- 清理测试数据

### 4. 测试记录
- 记录测试结果
- 保存失败日志
- 更新测试文档

---

## 🐛 常见问题

### Q1: 测试脚本无法执行？
**A**: 添加执行权限
```bash
chmod +x tests/e2e/*.sh
chmod +x tests/unit/*.sh
```

### Q2: 服务连接失败？
**A**: 检查服务状态和端口
```bash
lsof -i :8545  # Hardhat
lsof -i :3001  # Wallet Service
lsof -i :3002  # Trading Service
```

### Q3: 测试数据冲突？
**A**: 重新部署合约或清理数据库
```bash
cd contracts
rm .env.deployed
npx hardhat run scripts/deploy.ts --network localhost
```

### Q4: Block Scanner 未同步？
**A**: 检查配置和日志
```bash
# 检查配置
grep "scanner" backend/services/wallet-service/.env

# 查看日志
tail -f backend/services/wallet-service/logs/app.log
```

---

## 📚 延伸阅读

- [Hardhat 测试文档](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [NestJS 测试指南](https://docs.nestjs.com/fundamentals/testing)
- [viem 测试工具](https://viem.sh/docs/actions/test/introduction.html)

---

## 🔄 持续集成

### GitHub Actions (计划中)
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E Tests
        run: ./tests/e2e/test-e2e-full.sh
```

### 本地 CI 脚本
```bash
# 运行所有测试
./tests/run-all-tests.sh
```

---

**最后更新**: 2025-10-29  
**测试状态**: ✅ 一期全部通过  
**下一步**: 二期测试计划

