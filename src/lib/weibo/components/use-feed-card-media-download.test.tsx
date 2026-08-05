import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeedCardMediaDownload } from '@/lib/weibo/components/use-feed-card-media-download'
import type { FeedItem } from '@/lib/weibo/models/feed'

const { downloadAsZip, estimateTotalSize, extractMediaUrls, toastState } = vi.hoisted(() => ({
  downloadAsZip: vi.fn(),
  estimateTotalSize: vi.fn(),
  extractMediaUrls: vi.fn(),
  toastState: { nextId: 0 },
}))

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => `download-toast-${++toastState.nextId}`),
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

const item = {
  id: 'status-1',
  mblogId: 'status-1',
  isLongText: false,
  author: { id: 'author-1', name: 'Alice', avatarUrl: null },
  text: 'post',
  createdAt: '2026-08-01T00:00:00.000Z',
  createdAtLabel: '刚刚',
  stats: { likes: 0, comments: 0, reposts: 0 },
  images: [],
  media: null,
} satisfies FeedItem
const urls = [
  { url: 'https://example.test/1.jpg', filename: '1.jpg', type: 'image' },
  { url: 'https://example.test/2.jpg', filename: '2.jpg', type: 'image' },
]

describe('useFeedCardMediaDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastState.nextId = 0
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

    expect(extractMediaUrls).toHaveBeenCalledWith([], { author: 'Alice', text: 'post' })
    const { toast } = await import('sonner')
    expect(toast.loading).toHaveBeenCalledWith('正在准备媒体', { duration: Infinity })
    const toastId = vi.mocked(toast.loading).mock.results[0]?.value
    expect(toast.loading).toHaveBeenCalledWith('正在下载媒体（1/2）', {
      id: toastId,
      duration: Infinity,
    })
    expect(toast.loading).toHaveBeenCalledWith('正在生成 ZIP', {
      id: toastId,
      duration: Infinity,
    })
    expect(toast.success).toHaveBeenCalledWith('媒体已下载（2 个文件）', { id: toastId })
  })

  it('uses independent toast ids for concurrent downloads', async () => {
    let resolveFirst!: (value: { successCount: number; failCount: number }) => void
    let resolveSecond!: (value: { successCount: number; failCount: number }) => void
    const progressCallbacks: Array<
      (progress: { stage: 'downloading'; completed: number; total: number }) => void
    > = []
    downloadAsZip
      .mockImplementationOnce((_urls, _filename, onProgress) => {
        progressCallbacks.push(onProgress)
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      })
      .mockImplementationOnce((_urls, _filename, onProgress) => {
        progressCallbacks.push(onProgress)
        return new Promise((resolve) => {
          resolveSecond = resolve
        })
      })

    const first = renderHook(() => useFeedCardMediaDownload(item))
    const second = renderHook(() => useFeedCardMediaDownload(item))
    const firstDownload = first.result.current.handleDownload()
    const secondDownload = second.result.current.handleDownload()
    const { toast } = await import('sonner')

    await waitFor(() => expect(toast.loading).toHaveBeenCalledTimes(2))
    const firstToastId = vi.mocked(toast.loading).mock.results[0]?.value
    const secondToastId = vi.mocked(toast.loading).mock.results[1]?.value
    expect(firstToastId).not.toBe(secondToastId)

    progressCallbacks[0]?.({ stage: 'downloading', completed: 1, total: 2 })
    progressCallbacks[1]?.({ stage: 'downloading', completed: 2, total: 2 })
    expect(toast.loading).toHaveBeenCalledWith('正在下载媒体（1/2）', {
      id: firstToastId,
      duration: Infinity,
    })
    expect(toast.loading).toHaveBeenCalledWith('正在下载媒体（2/2）', {
      id: secondToastId,
      duration: Infinity,
    })

    await act(async () => {
      resolveFirst({ successCount: 2, failCount: 0 })
      resolveSecond({ successCount: 2, failCount: 0 })
      await Promise.all([firstDownload, secondDownload])
    })
    expect(toast.success).toHaveBeenCalledWith('媒体已下载（2 个文件）', { id: firstToastId })
    expect(toast.success).toHaveBeenCalledWith('媒体已下载（2 个文件）', { id: secondToastId })
  })

  it('replaces the task toast with an error when downloadAsZip throws', async () => {
    downloadAsZip.mockRejectedValueOnce(new Error('network failure'))
    const { result } = renderHook(() => useFeedCardMediaDownload(item))

    await act(async () => {
      await result.current.handleDownload()
    })

    const { toast } = await import('sonner')
    const toastId = vi.mocked(toast.loading).mock.results[0]?.value
    expect(toast.error).toHaveBeenCalledWith('媒体下载失败，请稍后再试', { id: toastId })
  })

  it('keeps the 100MB confirmation path before starting the download', async () => {
    estimateTotalSize.mockResolvedValueOnce(101 * 1024 * 1024)
    downloadAsZip.mockResolvedValueOnce({ successCount: 2, failCount: 0 })
    const { result } = renderHook(() => useFeedCardMediaDownload(item))

    await act(async () => {
      await result.current.handleDownload()
    })
    expect(result.current.downloadDialog.props.open).toBe(true)
    expect(downloadAsZip).not.toHaveBeenCalled()

    const dialog = render(result.current.downloadDialog)
    fireEvent.click(screen.getByRole('button', { name: '继续下载媒体' }))
    await waitFor(() => expect(downloadAsZip).toHaveBeenCalledTimes(1))
    dialog.unmount()
  })

  it('offers retry for failed resources only', async () => {
    const failed = [urls[1]]
    downloadAsZip.mockResolvedValueOnce({ successCount: 1, failCount: 1, failedUrls: failed })
    const { result } = renderHook(() => useFeedCardMediaDownload(item))

    await act(async () => {
      await result.current.handleDownload()
    })

    const { toast } = await import('sonner')
    const initialToastId = vi.mocked(toast.loading).mock.results[0]?.value
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
      id: initialToastId,
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
