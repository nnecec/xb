import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeedCardMediaDownload } from '@/lib/weibo/components/use-feed-card-media-download'
import type { FeedItem } from '@/lib/weibo/models/feed'

const { downloadAsZip, estimateTotalSize, extractMediaUrls } = vi.hoisted(() => ({
  downloadAsZip: vi.fn(),
  estimateTotalSize: vi.fn(),
  extractMediaUrls: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'download-toast'),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/weibo/utils/download-media', () => ({
  downloadAsZip,
  estimateTotalSize,
  extractMediaUrls,
}))

const item = { author: { name: 'Alice' }, text: 'post' } as FeedItem
const urls = [
  { url: 'https://example.test/1.jpg', filename: '1.jpg', type: 'image' },
  { url: 'https://example.test/2.jpg', filename: '2.jpg', type: 'image' },
]

describe('useFeedCardMediaDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    extractMediaUrls.mockReturnValue(urls)
    estimateTotalSize.mockResolvedValue(0)
  })

  it('keeps one toast updated through download and zip generation', async () => {
    downloadAsZip.mockImplementation(async (_urls, _filename, onProgress) => {
      onProgress({ stage: 'downloading', completed: 1, total: 2 })
      onProgress({ stage: 'generating-zip' })
      return { successCount: 2, failCount: 0 }
    })
    const { result } = renderHook(() => useFeedCardMediaDownload(item))

    await act(async () => {
      await result.current.handleDownload()
    })

    const { toast } = await import('sonner')
    expect(toast.loading).toHaveBeenCalledWith('正在准备媒体', { duration: Infinity })
    expect(toast.loading).toHaveBeenCalledWith('正在下载媒体（1/2）', {
      id: 'download-toast',
      duration: Infinity,
    })
    expect(toast.loading).toHaveBeenCalledWith('正在生成 ZIP', {
      id: 'download-toast',
      duration: Infinity,
    })
    expect(toast.success).toHaveBeenCalledWith('媒体已下载（2 个文件）', { id: 'download-toast' })
  })

  it('offers retry for failed resources only', async () => {
    const failed = [urls[1]]
    downloadAsZip.mockResolvedValueOnce({ successCount: 1, failCount: 1, failedUrls: failed })
    const { result } = renderHook(() => useFeedCardMediaDownload(item))

    await act(async () => {
      await result.current.handleDownload()
    })

    const { toast } = await import('sonner')
    const warningCall = vi.mocked(toast.warning).mock.calls[0]
    const action = warningCall?.[1]?.action as
      | { label: string; onClick: (event: never) => void }
      | undefined
    expect(action).toMatchObject({ label: '重试失败项' })

    downloadAsZip.mockResolvedValueOnce({ successCount: 1, failCount: 0 })
    await act(async () => {
      action?.onClick({} as never)
    })
    expect(toast.loading).toHaveBeenCalledWith('正在准备媒体', {
      id: 'download-toast',
      duration: Infinity,
    })
    await waitFor(() =>
      expect(downloadAsZip).toHaveBeenLastCalledWith(
        failed,
        'Alice_post.zip',
        expect.any(Function),
      ),
    )
  })
})
