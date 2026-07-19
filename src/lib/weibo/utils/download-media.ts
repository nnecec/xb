import JSZip from 'jszip'

import type { FeedItem } from '@/lib/weibo/models/feed'

export interface MediaUrl {
  url: string
  fallbackUrls?: string[]
  filename: string
  type: 'image' | 'video'
}

export interface DownloadZipResult {
  successCount: number
  failCount: number
}

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
export function inferExtension(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov)(\?|$)/i)
  if (match) {
    return match[1].toLowerCase()
  }
  // 默认根据类型推断
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
function generateFilename(author: string, text: string, index: number, url: string): string {
  const cleanAuthor = sanitizeFilename(author)
  const cleanText = sanitizeFilename(text)
  const truncated = cleanText.slice(0, 10) || 'untitled'
  const ext = inferExtension(url)
  return `${cleanAuthor}_${truncated}_${index}.${ext}`
}

/**
 * 从 FeedItem 提取所有媒体 URL（仅当前层级）
 */
export function extractMediaUrls(item: FeedItem): MediaUrl[] {
  const urls: MediaUrl[] = []
  const author = item.author.name
  const text = item.text
  let index = 1

  // 1. 处理静态图片和 Live Photo
  for (const image of item.images) {
    // 静态图片
    urls.push({
      url: normalizeDownloadUrl(image.largeUrl) ?? image.largeUrl,
      fallbackUrls: createMediaFallbackUrls(image.largeUrl, image.downloadUrls, 'image'),
      filename: generateFilename(author, text, index++, image.largeUrl),
      type: 'image',
    })

    // Live Photo 视频
    if (image.livePhotoVideoUrl) {
      urls.push({
        url: image.livePhotoVideoUrl,
        filename: generateFilename(author, text, index++, image.livePhotoVideoUrl),
        type: 'video',
      })
    }
  }

  // 2. 处理单视频
  if (item.media) {
    const videoUrl =
      normalizeDownloadUrl(item.media.downloadUrl || item.media.streamUrl) ??
      (item.media.downloadUrl || item.media.streamUrl)
    urls.push({
      url: videoUrl,
      filename: generateFilename(author, text, index++, videoUrl),
      type: 'video',
    })
  }

  // 3. 处理混合媒体
  if (item.mixMediaInfo) {
    for (const mixItem of item.mixMediaInfo) {
      if (mixItem.type === 'pic' && mixItem.image) {
        urls.push({
          url: normalizeDownloadUrl(mixItem.image.largeUrl) ?? mixItem.image.largeUrl,
          fallbackUrls: createMediaFallbackUrls(
            mixItem.image.largeUrl,
            mixItem.image.downloadUrls,
            'image',
          ),
          filename: generateFilename(author, text, index++, mixItem.image.largeUrl),
          type: 'image',
        })

        // 混合媒体中的 Live Photo
        if (mixItem.image.livePhotoVideoUrl) {
          urls.push({
            url: mixItem.image.livePhotoVideoUrl,
            filename: generateFilename(author, text, index++, mixItem.image.livePhotoVideoUrl),
            type: 'video',
          })
        }
      } else if (mixItem.type === 'video') {
        const videoUrl =
          normalizeDownloadUrl(mixItem.videoDownloadUrl || mixItem.videoStreamUrl) ??
          (mixItem.videoDownloadUrl || mixItem.videoStreamUrl)

        if (videoUrl) {
          urls.push({
            url: videoUrl,
            filename: generateFilename(author, text, index++, videoUrl),
            type: 'video',
          })
        } else {
          // do nothing
        }
      }
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
 * 并发下载（限制并发数）
 */
async function downloadWithConcurrency(
  urls: MediaUrl[],
  limit: number,
): Promise<Array<{ url: MediaUrl; result: PromiseSettledResult<Blob> }>> {
  const results: Array<{ url: MediaUrl; result: PromiseSettledResult<Blob> }> = []

  for (let i = 0; i < urls.length; i += limit) {
    const batch = urls.slice(i, i + limit)
    const batchResults = await Promise.allSettled(batch.map((mediaUrl) => fetchMediaBlob(mediaUrl)))

    for (let j = 0; j < batch.length; j++) {
      results.push({
        url: batch[j],
        result: batchResults[j],
      })
    }
  }

  return results
}

/**
 * 下载并打包为 zip
 */
export async function downloadAsZip(
  urls: MediaUrl[],
  zipFilename: string,
): Promise<DownloadZipResult> {
  if (urls.length === 0) {
    throw new Error('没有可下载的媒体资源')
  }

  const zip = new JSZip()

  const results = await downloadWithConcurrency(urls, MEDIA_DOWNLOAD_CONCURRENCY)

  let successCount = 0
  let failCount = 0

  for (const { url, result } of results) {
    if (result.status === 'fulfilled') {
      zip.file(url.filename, result.value)
      successCount++
    } else {
      failCount++
    }
  }

  if (successCount === 0) {
    throw new Error('所有资源下载失败')
  }

  // 生成 zip
  const content = await zip.generateAsync({ type: 'blob' })

  // 触发浏览器下载
  triggerBlobDownload(content, zipFilename)

  return { successCount, failCount }
}
