import React, { useState, useEffect } from 'react'
import { Modal, Button, Input, Space, Typography, Alert } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import './index.css'

const { Text } = Typography

interface SlippageSettingsProps {
  value: number
  onChange: (value: number) => void
}

const PRESET_SLIPPAGES = [0.5, 1.0, 5.0]
const SLIPPAGE_STORAGE_KEY = 'dex_slippage_setting'

export const SlippageSettings: React.FC<SlippageSettingsProps> = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false)
  const [selectedSlippage, setSelectedSlippage] = useState(value)
  const [customValue, setCustomValue] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    // 从 localStorage 加载保存的设置
    const saved = localStorage.getItem(SLIPPAGE_STORAGE_KEY)
    if (saved) {
      const parsed = parseFloat(saved)
      if (!isNaN(parsed)) {
        setSelectedSlippage(parsed)
        onChange(parsed)
        
        // 检查是否是自定义值
        if (!PRESET_SLIPPAGES.includes(parsed)) {
          setIsCustom(true)
          setCustomValue(saved)
        }
      }
    }
  }, [])

  const handlePresetClick = (slippage: number) => {
    setSelectedSlippage(slippage)
    setIsCustom(false)
    setCustomValue('')
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomValue(val)
    
    if (val) {
      const parsed = parseFloat(val)
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 50) {
        setSelectedSlippage(parsed)
        setIsCustom(true)
      }
    }
  }

  const handleSave = () => {
    const finalValue = isCustom && customValue ? parseFloat(customValue) : selectedSlippage
    
    if (isNaN(finalValue) || finalValue < 0 || finalValue > 50) {
      return
    }
    
    onChange(finalValue)
    localStorage.setItem(SLIPPAGE_STORAGE_KEY, finalValue.toString())
    setVisible(false)
  }

  const getSlippageWarning = () => {
    if (selectedSlippage < 0.1) {
      return { type: 'warning' as const, message: '滑点过低可能导致交易失败' }
    }
    if (selectedSlippage > 10) {
      return { type: 'error' as const, message: '滑点过高可能导致价格不利' }
    }
    return null
  }

  const warning = getSlippageWarning()

  return (
    <>
      <Button
        icon={<SettingOutlined />}
        onClick={() => setVisible(true)}
        className="slippage-button"
      >
        滑点: {value}%
      </Button>

      <Modal
        title="滑点容忍度设置"
        open={visible}
        onOk={handleSave}
        onCancel={() => setVisible(false)}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text type="secondary">
              滑点是指交易执行时价格波动的允许范围。设置过低可能导致交易失败，设置过高可能导致价格不利。
            </Text>
          </div>

          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>快捷设置</Text>
            </div>
            <Space>
              {PRESET_SLIPPAGES.map((slippage) => (
                <Button
                  key={slippage}
                  type={selectedSlippage === slippage && !isCustom ? 'primary' : 'default'}
                  onClick={() => handlePresetClick(slippage)}
                  size="large"
                >
                  {slippage}%
                </Button>
              ))}
            </Space>
          </div>

          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>自定义滑点</Text>
            </div>
            <Input
              placeholder="输入自定义滑点"
              value={customValue}
              onChange={handleCustomChange}
              suffix="%"
              type="number"
              min={0}
              max={50}
              size="large"
              status={warning?.type === 'error' ? 'error' : undefined}
            />
          </div>

          {warning && (
            <Alert
              message={warning.message}
              type={warning.type}
              showIcon
            />
          )}

          <div style={{ 
            padding: 12, 
            background: '#f5f5f5', 
            borderRadius: 8,
            fontSize: 12,
            color: '#666'
          }}>
            <div>💡 <strong>建议：</strong></div>
            <div style={{ marginTop: 8 }}>
              • 稳定币交易：0.5% - 1%<br />
              • 普通代币：1% - 5%<br />
              • 低流动性代币：5% - 10%
            </div>
          </div>
        </Space>
      </Modal>
    </>
  )
}

export default SlippageSettings

