import JSZip from 'jszip'

import type { MediaAsset } from '@/lib/weibo/components/media-region/media-region-model'

export interface MediaUrl {
  url: string
  fallbackUrls?: string[]
  filename: string
  type: 'image' | 'video' | 'audio'
}

export interface DownloadZipResult {
  successCount: number
  failCount: number
  /** Media entries which failed all of their candidate URLs. */
  failedUrls?: MediaUrl[]
}

export type DownloadProgress =
  | { stage: 'downloading'; completed: number; total: number }
  | { stage: 'generating-zip' }

export type DownloadProgressCallback = (progress: DownloadProgress) => void

interface MediaHeadResponse {
  ok: boolean
  size?: number
  error?: string
}

interface MediaFetchResponse {
  ok: boolean
  data?: string
  contentType?: string
  error?: string
}

const sinaimgDownloadSizes = [
  'large',
  'mw2000',
  'woriginal',
  'original',
  'orj1080',
  'orj960',
  'bmiddle',
  'thumbnail',
]

function canUseBackgroundFetch(): boolean {
  return typeof browser !== 'undefined' && Boolean(browser.runtime?.sendMessage)
}

function base64ToBlob(data: string, contentType = 'application/octet-stream'): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: contentType })
}

async function estimateMediaSize(url: string): Promise<number> {
  if (!canUseBackgroundFetch()) {
    const response = await fetch(url, { method: 'HEAD' })
    return Number.parseInt(response.headers.get('content-length') || '0', 10)
  }

  const response = (await browser.runtime.sendMessage({
    type: 'media-head',
    url,
  })) as MediaHeadResponse

  if (!response.ok) {
    throw new Error(response.error || '媒体大小预估失败')
  }

  return response.size ?? 0
}

async function fetchMediaBlobFromUrl(url: string): Promise<Blob> {
  if (!canUseBackgroundFetch()) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.blob()
  }

  const response = (await browser.runtime.sendMessage({
    type: 'media-fetch',
    url,
  })) as MediaFetchResponse

  if (!response.ok || !response.data) {
    throw new Error(response.error || '媒体下载失败')
  }

  return base64ToBlob(response.data, response.contentType)
}

function uniqueUrls(urls: Array<string | undefined>): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const url of urls) {
    const trimmed = normalizeDownloadUrl(url)
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    unique.push(trimmed)
  }

  return unique
}

function normalizeDownloadUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' && isWeiboMediaHost(parsed.hostname)) {
      parsed.protocol = 'https:'
      return parsed.toString()
    }
  } catch {
    return trimmed
  }

  return trimmed
}

function isWeiboMediaHost(hostname: string): boolean {
  return (
    hostname === 'sinaimg.cn' ||
    hostname.endsWith('.sinaimg.cn') ||
    hostname === 'weibocdn.com' ||
    hostname.endsWith('.weibocdn.com')
  )
}

function isSinaimgHost(hostname: string): boolean {
  return hostname === 'sinaimg.cn' || hostname.endsWith('.sinaimg.cn')
}

function expandSinaimgImageUrls(urls: Array<string | undefined>): string[] {
  const normalized = uniqueUrls(urls)
  const expanded: string[] = [...normalized]

  for (const url of normalized) {
    try {
      const parsed = new URL(url)
      if (!isSinaimgHost(parsed.hostname)) {
        continue
      }

      const parts = parsed.pathname.split('/')
      if (parts.length < 3) {
        continue
      }

      const filename = parts.at(-1)
      if (!filename) {
        continue
      }

      for (const size of sinaimgDownloadSizes) {
        const candidate = new URL(parsed.toString())
        candidate.pathname = `/${size}/${filename}`
        expanded.push(candidate.toString())
      }
    } catch {
      // Keep the original URL; malformed candidates will fail in the fetch layer.
    }
  }

  return uniqueUrls(expanded)
}

function createMediaFallbackUrls(
  url: string,
  fallbackUrls: string[] | undefined,
  type: MediaUrl['type'],
): string[] | undefined {
  const urls =
    type === 'image'
      ? expandSinaimgImageUrls([url, ...(fallbackUrls ?? [])])
      : uniqueUrls([url, ...(fallbackUrls ?? [])])

  return urls.length > 1 ? urls : undefined
}

async function fetchMediaBlob(mediaUrl: MediaUrl): Promise<Blob> {
  const urls = uniqueUrls([mediaUrl.url, ...(mediaUrl.fallbackUrls ?? [])])
  const errors: string[] = []

  for (const url of urls) {
    try {
      const blob = await fetchMediaBlobFromUrl(url)

      return blob
    } catch (error) {
      const errorMsg = `${url}: ${error instanceof Error ? error.message : String(error)}`

      errors.push(errorMsg)
    }
  }

  const finalError = errors.join('; ') || '媒体下载失败'

  throw new Error(finalError)
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'

  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 60_000)
}

/**
 * 从 URL 推断文件扩展名
 */
export function inferExtension(url: string, type: MediaUrl['type'] = 'image'): string {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|mp3|m4a|aac|wav|ogg)(\?|$)/i)
  const extension = match?.[1]
  if (extension) {
    return extension.toLowerCase()
  }
  // 默认根据类型推断
  if (type === 'audio') return 'm4a'
  return url.includes('video') || url.includes('.mp4') ? 'mp4' : 'jpg'
}

/**
 * 生成安全的文件名
 */
function sanitizeFilename(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // 移除 HTML 标签
    .replace(/[<>:"/\\|?*\n\r]/g, '') // 移除特殊字符
    .replace(/\s+/g, '_') // 空格替换为下划线
    .trim()
}

/**
 * 生成文件名：{作者名}_{微博前10字}_{序号}.{扩展名}
 */
function generateFilename(
  author: string,
  text: string,
  index: number,
  url: string,
  type: MediaUrl['type'] = 'image',
): string {
  const cleanAuthor = sanitizeFilename(author)
  const cleanText = sanitizeFilename(text)
  const truncated = cleanText.slice(0, 10) || 'untitled'
  const ext = inferExtension(url, type)
  return `${cleanAuthor}_${truncated}_${index}.${ext}`
}

/** 将媒体呈现 module 已经规范化的素材转换为下载候选。 */
export function extractMediaUrls(
  assets: readonly MediaAsset[],
  context: { author: string; text: string },
): MediaUrl[] {
  const urls: MediaUrl[] = []
  const seen = new Set<string>()
  let index = 1

  const add = (url: string | undefined, type: MediaUrl['type'], fallbackUrls?: string[]) => {
    const normalized = normalizeDownloadUrl(url)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    urls.push({
      url: normalized,
      fallbackUrls:
        type === 'image' ? createMediaFallbackUrls(normalized, fallbackUrls, type) : undefined,
      filename: generateFilename(context.author, context.text, index++, normalized, type),
      type,
    })
  }

  for (const asset of assets) {
    if (asset.kind === 'image') {
      add(asset.image.largeUrl, 'image', asset.image.downloadUrls)
      add(asset.image.livePhotoVideoUrl, 'video')
      continue
    }

    if (asset.kind === 'video') {
      add(asset.video.videoDownloadUrl || asset.video.videoStreamUrl, 'video')
      continue
    }

    if (asset.media.type === 'audio' || asset.media.type === 'podcast_audio') {
      add(asset.media.streamUrl, 'audio')
    } else if (asset.media.type === 'live') {
      add(asset.media.replayUrl || asset.media.downloadUrl, 'video')
    } else {
      add(asset.media.downloadUrl || asset.media.streamUrl, 'video')
    }
  }

  return urls
}

const MEDIA_DOWNLOAD_CONCURRENCY = 5

/**
 * 预估总大小（HEAD 请求，限制并发）
 */
export async function estimateTotalSize(urls: MediaUrl[]): Promise<number> {
  let total = 0

  for (let i = 0; i < urls.length; i += MEDIA_DOWNLOAD_CONCURRENCY) {
    const batch = urls.slice(i, i + MEDIA_DOWNLOAD_CONCURRENCY)
    const sizes = await Promise.all(
      batch.map(async (mediaUrl) => {
        try {
          return await estimateMediaSize(mediaUrl.url)
        } catch {
          return 0
        }
      }),
    )
    total += sizes.reduce((sum, size) => sum + size, 0)
  }

  return total
}

/**
 * 下载并打包为 zip
 *
 * Blobs are zip.file'd inside each concurrent batch so we do not retain an outer
 * results array of every Blob until after generateAsync (lower peak memory).
 */
export async function downloadAsZip(
  urls: MediaUrl[],
  zipFilename: string,
  onProgress?: DownloadProgressCallback,
): Promise<DownloadZipResult> {
  if (urls.length === 0) {
    throw new Error('没有可下载的媒体资源')
  }

  const zip = new JSZip()
  let successCount = 0
  let failCount = 0
  const failedUrls: MediaUrl[] = []
  let completedCount = 0

  const reportProgress = (progress: DownloadProgress) => {
    try {
      onProgress?.(progress)
    } catch {
      // Progress reporting must never affect the download itself.
    }
  }

  for (let i = 0; i < urls.length; i += MEDIA_DOWNLOAD_CONCURRENCY) {
    const batch = urls.slice(i, i + MEDIA_DOWNLOAD_CONCURRENCY)
    const batchResults = await Promise.allSettled(batch.map((mediaUrl) => fetchMediaBlob(mediaUrl)))

    for (const [j, mediaUrl] of batch.entries()) {
      const result = batchResults[j]
      if (result?.status === 'fulfilled') {
        zip.file(mediaUrl.filename, result.value)
        successCount++
      } else {
        failCount++
        failedUrls.push(mediaUrl)
      }
      completedCount++
      reportProgress({ stage: 'downloading', completed: completedCount, total: urls.length })
    }
  }

  if (successCount === 0) {
    throw new Error('所有资源下载失败')
  }

  reportProgress({ stage: 'generating-zip' })
  const content = await zip.generateAsync({ type: 'blob' })
  triggerBlobDownload(content, zipFilename)

  return failedUrls.length > 0
    ? { successCount, failCount, failedUrls }
    : { successCount, failCount }
}
