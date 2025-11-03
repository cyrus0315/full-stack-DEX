import { useState } from 'react'
import { Modal, List, Input, Avatar, Typography, Space, Button } from 'antd'
import { SearchOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Token } from '../../types'
import { DEFAULT_TOKENS } from '../../config/tokens'
import './index.css'

const { Text } = Typography

interface TokenSelectProps {
  visible: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  selectedToken?: Token
  excludeToken?: Token // 排除的代币（比如已选择的另一个代币）
}

const TokenSelect: React.FC<TokenSelectProps> = ({
  visible,
  onClose,
  onSelect,
  selectedToken,
  excludeToken,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  // 过滤代币列表
  const filteredTokens = DEFAULT_TOKENS.filter((token) => {
    // 排除已选择的代币
    if (excludeToken && token.address === excludeToken.address) {
      return false
    }
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  const handleSelect = (token: Token) => {
    // 如果点击的是已选中的代币，则取消选中
    if (selectedToken?.address === token.address) {
      onSelect(null as any) // 取消选中
    } else {
      onSelect(token)
    }
    onClose()
    setSearchQuery('')
  }

  const handleClear = () => {
    onSelect(null as any) // 清除选择
    onClose()
    setSearchQuery('')
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>选择代币</span>
          {selectedToken && (
            <Button
              type="text"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={handleClear}
              style={{ color: 'rgba(255, 255, 255, 0.65)' }}
            >
              清除选择
            </Button>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={420}
      className="token-select-modal"
    >
      <div className="token-select-content">
        {/* 搜索框 */}
        <Input
          size="large"
          placeholder="搜索代币名称或地址"
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="token-search-input"
        />

        {/* 代币列表 */}
        <List
          className="token-list"
          dataSource={filteredTokens}
          renderItem={(token) => {
            const isSelected = selectedToken?.address === token.address
            return (
              <List.Item
                className={`token-list-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(token)}
              >
                <Space size={12} style={{ flex: 1 }}>
                  <Avatar
                    src={token.logoURI}
                    size={36}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {token.symbol[0]}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block' }}>
                      {token.symbol}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {token.name}
                    </Text>
                  </div>
                  {isSelected && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      已选中 · 点击取消
                    </Text>
                  )}
                </Space>
              </List.Item>
            )
          }}
          locale={{ emptyText: '未找到代币' }}
        />
      </div>
    </Modal>
  )
}

export default TokenSelect

