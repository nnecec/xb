import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MweiboTopicRecoveryPrompt } from '@/lib/weibo/components/mweibo-topic-recovery-prompt'

const originalTopicUrl =
  'https://m.weibo.cn/search?containerid=231522type%3D60%26q%3D%23%E6%B5%8B%E8%AF%95%E8%AF%9D%E9%A2%98%23&v_p=42'

describe('MweiboTopicRecoveryPrompt', () => {
  afterEach(cleanup)

  it('renders the captcha recovery state without knowing transport errors or URL builders', () => {
    render(
      <MweiboTopicRecoveryPrompt
        recovery={{ kind: 'captcha', originalTopicUrl }}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('需要人机验证')).toBeInTheDocument()
    expect(screen.getByText(/微博移动端要求验证/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /打开微博原话题页/ })
    expect(link).toHaveAttribute('href', originalTopicUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders the unavailable recovery state', () => {
    render(
      <MweiboTopicRecoveryPrompt
        recovery={{ kind: 'unavailable', originalTopicUrl, reason: 'business' }}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('话题内容暂时不可用')).toBeInTheDocument()
    expect(screen.getByText(/访问限制或登录状态失效/)).toBeInTheDocument()
    expect(screen.getByText(/关闭「话题页打开方式」/)).toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <MweiboTopicRecoveryPrompt
        recovery={{ kind: 'captcha', originalTopicUrl }}
        onRetry={onRetry}
      />,
    )

    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
