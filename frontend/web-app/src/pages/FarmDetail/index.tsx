import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Button,
  Input,
  Space,
  Tabs,
  Alert,
  Spin,
  message,
  Modal,
  Progress,
} from 'antd'
import {
  ArrowLeftOutlined,
  FireOutlined,
  DollarOutlined,
  TrophyOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useAccount } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { useFarming, useReadFarming } from '../../hooks/useFarming'
import { useFarmingWebSocket } from '../../hooks/useFarmingWebSocket'
import { apiService } from '../../services/api'
import './index.css'

const { Title, Text } = Typography
const { TabPane } = Tabs

/**
 * FarmDetail 页面
 * 
 * 单个挖矿池详情页，包含质押和提取操作
 */
const FarmDetail: React.FC = () => {
  const { poolId } = useParams<{ poolId: string }>()
  const navigate = useNavigate()
  const { address } = useAccount()

  const [loading, setLoading] = useState(true)
  const [farmData, setFarmData] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)

  // 质押状态
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  // Hooks
  const { isLoading: isTxLoading, approveLPToken, deposit, withdraw, emergencyWithdraw } = useFarming()
  const farmingData = useReadFarming(Number(poolId), address)

  // WebSocket 实时更新
  useFarmingWebSocket(() => {
    loadFarmData()
    if (address) {
      loadUserData()
    }
  })

  // 加载数据
  useEffect(() => {
    if (poolId) {
      loadFarmData()
    }
  }, [poolId])

  useEffect(() => {
    if (address && poolId) {
      loadUserData()
    }
  }, [address, poolId])

  const loadFarmData = async () => {
    try {
      setLoading(true)
      const response = await apiService.getFarm(Number(poolId))
      if (response.success) {
        setFarmData(response.data)
      }
    } catch (error) {
      console.error('Failed to load farm:', error)
      message.error('加载挖矿池失败')
    } finally {
      setLoading(false)
    }
  }

  const loadUserData = async () => {
    if (!address) return
    try {
      const response = await apiService.getUserFarms(address)
      if (response.success) {
        const userFarm = response.data.farms.find((f: any) => f.poolId === Number(poolId))
        setUserData(userFarm || null)
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  // 质押操作
  const handleDeposit = async () => {
    if (!address) {
      message.warning('请先连接钱包')
      return
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      message.warning('请输入质押数量')
      return
    }

    try {
      // 检查授权
      const lpBalance = farmingData.lpBalance
      const allowance = farmingData.allowance
      const amount = parseUnits(depositAmount, 18)

      if (amount > lpBalance) {
        message.error('LP Token 余额不足')
        return
      }

      // 如果授权不足，先授权
      if (allowance < amount) {
        await approveLPToken(farmData.lpToken.address)
        await new Promise(resolve => setTimeout(resolve, 2000)) // 等待链上确认
      }

      // 质押
      await deposit(Number(poolId), depositAmount, 18)
      
      // 刷新数据
      setDepositAmount('')
      await loadUserData()
      
      message.success('质押成功！')
    } catch (error: any) {
      console.error('Deposit error:', error)
    }
  }

  // 提取操作
  const handleWithdraw = async () => {
    if (!address) {
      message.warning('请先连接钱包')
      return
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      message.warning('请输入提取数量')
      return
    }

    try {
      const userAmount = farmingData.userInfo?.amount || 0n
      const amount = parseUnits(withdrawAmount, 18)

      if (amount > userAmount) {
        message.error('提取数量超过已质押数量')
        return
      }

      await withdraw(Number(poolId), withdrawAmount, 18)
      
      // 刷新数据
      setWithdrawAmount('')
      await loadUserData()
      
      message.success('提取成功！奖励已自动领取')
    } catch (error: any) {
      console.error('Withdraw error:', error)
    }
  }

  // 紧急提取
  const handleEmergencyWithdraw = () => {
    Modal.confirm({
      title: '⚠️ 紧急提取',
      content: (
        <div>
          <p>紧急提取将：</p>
          <ul>
            <li><strong>取回所有已质押的 LP Token</strong></li>
            <li><strong style={{ color: '#ff4d4f' }}>放弃所有待领取奖励</strong></li>
          </ul>
          <p>确定要继续吗？</p>
        </div>
      ),
      okText: '确定紧急提取',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await emergencyWithdraw(Number(poolId))
          await loadUserData()
          message.warning('紧急提取成功！奖励已放弃')
        } catch (error) {
          console.error('Emergency withdraw error:', error)
        }
      },
    })
  }

  // 快捷设置金额
  const setMaxDeposit = () => {
    const balance = farmingData.lpBalance
    if (balance) {
      setDepositAmount(formatUnits(balance, 18))
    }
  }

  const setMaxWithdraw = () => {
    const amount = farmingData.userInfo?.amount
    if (amount) {
      setWithdrawAmount(formatUnits(amount, 18))
    }
  }

  if (loading) {
    return (
      <div className="farm-detail-loading">
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!farmData) {
    return (
      <div className="farm-detail-error">
        <Alert
          message="未找到挖矿池"
          description="该挖矿池不存在或已被移除"
          type="error"
          showIcon
        />
        <Button onClick={() => navigate('/farms')} style={{ marginTop: 16 }}>
          返回挖矿列表
        </Button>
      </div>
    )
  }

  const { lpToken, apr, tvl, totalStaked, dailyReward, weight } = farmData
  const userStaked = userData?.stakedAmount || '0'
  const pendingReward = userData?.pendingReward || '0'
  const shareOfPool = userData?.shareOfPool || 0

  return (
    <div className="farm-detail-page">
      {/* 返回按钮 */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/farms')}
        className="back-button"
      >
        返回挖矿列表
      </Button>

      {/* 头部信息 */}
      <Card className="farm-detail-header">
        <Row align="middle" gutter={24}>
          <Col>
            <div className="token-icons-large">
              <div className="token-icon-large">{lpToken.token0.symbol[0]}</div>
              <div className="token-icon-large token-icon-overlap">{lpToken.token1.symbol[0]}</div>
            </div>
          </Col>
          <Col flex="auto">
            <Title level={2} style={{ margin: 0 }}>
              {lpToken.token0.symbol}-{lpToken.token1.symbol}
            </Title>
            <Text type="secondary">流动性挖矿池 #{poolId}</Text>
          </Col>
          <Col>
            <Statistic
              title="APR"
              value={parseFloat(apr).toFixed(2)}
              suffix="%"
              valueStyle={{ fontSize: '32px', color: '#52c41a' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 左侧：池子信息 */}
        <Col xs={24} lg={12}>
          <Card title={<><FireOutlined /> 池子信息</>} className="info-card">
            <Row gutter={[16, 24]}>
              <Col span={12}>
                <Statistic
                  title="TVL"
                  value={parseFloat(tvl).toFixed(2)}
                  prefix={<DollarOutlined />}
                  suffix="USD"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="每日奖励"
                  value={parseFloat(dailyReward).toFixed(2)}
                  suffix="DEX"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="总质押量"
                  value={parseFloat(totalStaked).toFixed(2)}
                  suffix="LP"
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="权重占比"
                  value={(weight * 100).toFixed(2)}
                  suffix="%"
                />
              </Col>
            </Row>
          </Card>

          {/* 用户信息 */}
          {address && (
            <Card title={<><TrophyOutlined /> 我的信息</>} className="info-card">
              <Row gutter={[16, 24]}>
                <Col span={12}>
                  <Statistic
                    title="已质押"
                    value={parseFloat(userStaked).toFixed(4)}
                    suffix="LP"
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="待领取奖励"
                    value={parseFloat(pendingReward).toFixed(4)}
                    suffix="DEX"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={24}>
                  <div>
                    <Text type="secondary">占池子比例</Text>
                    <Progress
                      percent={shareOfPool}
                      format={(percent) => `${percent?.toFixed(4)}%`}
                      strokeColor="#52c41a"
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary">LP Token 余额</Text>
                  <br />
                  <Text strong>{formatUnits(farmingData.lpBalance || 0n, 18)} LP</Text>
                </Col>
                <Col span={12}>
                  <Text type="secondary">已授权额度</Text>
                  <br />
                  <Text strong>
                    {farmingData.allowance && farmingData.allowance > 0n
                      ? formatUnits(farmingData.allowance, 18)
                      : '未授权'}
                  </Text>
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        {/* 右侧：操作面板 */}
        <Col xs={24} lg={12}>
          <Card className="action-card">
            {!address ? (
              <Alert
                message="请先连接钱包"
                description="连接钱包后即可开始质押挖矿"
                type="info"
                showIcon
              />
            ) : (
              <Tabs defaultActiveKey="deposit">
                <TabPane tab="质押" key="deposit">
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Text>质押数量</Text>
                      <Input
                        size="large"
                        placeholder="0.0"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        suffix={
                          <Button type="link" size="small" onClick={setMaxDeposit}>
                            最大
                          </Button>
                        }
                      />
                      <Text type="secondary">
                        余额: {formatUnits(farmingData.lpBalance || 0n, 18)} LP
                      </Text>
                    </div>

                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={handleDeposit}
                      loading={isTxLoading}
                      disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                    >
                      质押
                    </Button>

                    <Alert
                      message="提示"
                      description="质押后立即开始赚取 DEX 代币奖励，随时可以提取"
                      type="info"
                      showIcon
                    />
                  </Space>
                </TabPane>

                <TabPane tab="提取" key="withdraw">
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <div>
                      <Text>提取数量</Text>
                      <Input
                        size="large"
                        placeholder="0.0"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        suffix={
                          <Button type="link" size="small" onClick={setMaxWithdraw}>
                            最大
                          </Button>
                        }
                      />
                      <Text type="secondary">
                        已质押: {formatUnits(farmingData.userInfo?.amount || 0n, 18)} LP
                      </Text>
                    </div>

                    <Button
                      type="primary"
                      size="large"
                      block
                      onClick={handleWithdraw}
                      loading={isTxLoading}
                      disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                    >
                      提取并领取奖励
                    </Button>

                    <Alert
                      message="提示"
                      description="提取 LP Token 时会自动领取所有待领取奖励"
                      type="success"
                      showIcon
                    />

                    {parseFloat(userStaked) > 0 && (
                      <Button
                        danger
                        block
                        onClick={handleEmergencyWithdraw}
                        icon={<WarningOutlined />}
                      >
                        紧急提取（放弃奖励）
                      </Button>
                    )}
                  </Space>
                </TabPane>
              </Tabs>
            )}
          </Card>
        </Col>
      </Row>

      {/* 说明 */}
      <Card className="info-card">
        <Title level={4}>📖 如何操作？</Title>
        <ol>
          <li><strong>获取 LP Token</strong>：在流动性页面添加 {lpToken.token0.symbol}-{lpToken.token1.symbol} 流动性</li>
          <li><strong>授权</strong>：首次质押需要授权 LP Token 给 MasterChef 合约</li>
          <li><strong>质押</strong>：输入数量并点击"质押"按钮</li>
          <li><strong>赚取奖励</strong>：质押后每个区块自动累积 DEX 代币奖励</li>
          <li><strong>提取</strong>：随时可以提取 LP Token，会自动领取所有奖励</li>
        </ol>
      </Card>
    </div>
  )
}

export default FarmDetail

