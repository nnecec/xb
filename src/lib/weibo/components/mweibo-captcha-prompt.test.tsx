import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  MweiboCaptchaPrompt,
  MweiboUnavailablePrompt,
} from '@/lib/weibo/components/mweibo-captcha-prompt'

describe('MweiboCaptchaPrompt', () => {
  afterEach(cleanup)

  it('renders an explanation and a link to m.weibo.cn', () => {
    render(<MweiboCaptchaPrompt topic="测试话题" channelType="60" onRetry={vi.fn()} />)

    expect(screen.getByText('需要人机验证')).toBeInTheDocument()
    expect(screen.getByText(/微博移动端要求验证/)).toBeInTheDocument()
    expect(screen.queryByText(/网络面板/)).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: /打开微博原话题页/ })
    const url = new URL(link.getAttribute('href') ?? '')
    expect(url.origin).toBe('https://m.weibo.cn')
    expect(url.pathname).toBe('/search')
    expect(url.searchParams.get('containerid')).toBe('231522type=60&q=#测试话题#')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders a recovery explanation for non-success topic responses', () => {
    render(<MweiboUnavailablePrompt topic="测试话题" onRetry={vi.fn()} />)

    expect(screen.getByText('话题内容暂时不可用')).toBeInTheDocument()
    expect(screen.getByText(/访问限制或登录状态失效/)).toBeInTheDocument()
    expect(screen.getByText(/关闭「话题页打开方式」/)).toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<MweiboCaptchaPrompt topic="测试话题" onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: '重新加载' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
