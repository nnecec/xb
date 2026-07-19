import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ComposeDialog } from '@/lib/weibo/components/compose-dialog'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/weibo/components/emoticon-picker', () => ({
  EmoticonPicker: () => <div data-testid="emoticon-picker" />,
}))

vi.mock('@/lib/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/services/weibo-repository')>(
    '@/lib/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    publishWeiboStatus: vi.fn(async () => {}),
  }
})

function renderCompose(onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ComposeDialog open={true} onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    ),
  }
}

async function fillAndSubmit(text: string) {
  const textarea = screen.getByRole('textbox', { name: '微博内容' })
  fireEvent.change(textarea, { target: { value: text } })

  const submit = screen.getByRole('button', { name: '发布微博' })
  await waitFor(() => {
    expect(submit).not.toBeDisabled()
  })
  fireEvent.click(submit)
}

describe('ComposeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders title and disables submit when text is empty', () => {
    renderCompose()

    expect(
      screen.getByText('发布微博', { selector: '[data-slot="dialog-title"]' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '发布微博' })).toBeDisabled()
  })

  it('publishes content and closes on success', async () => {
    const { publishWeiboStatus } = await import('@/lib/weibo/services/weibo-repository')
    const { toast } = await import('sonner')
    vi.mocked(publishWeiboStatus).mockImplementation(async () => {})

    const { onOpenChange } = renderCompose()
    await fillAndSubmit('hello weibo')

    await waitFor(() => {
      expect(vi.mocked(publishWeiboStatus)).toHaveBeenCalledWith('hello weibo', expect.anything())
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows an error toast when publish fails', async () => {
    const { publishWeiboStatus } = await import('@/lib/weibo/services/weibo-repository')
    const { toast } = await import('sonner')
    vi.mocked(publishWeiboStatus).mockImplementation(async () => {
      throw new Error('publish failed')
    })

    const { onOpenChange } = renderCompose()
    await fillAndSubmit('hello weibo')

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('publish failed')
    })
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
