/**
 * Text entity extraction utilities for Weibo data.
 */

import type { WeiboStatus } from '@/lib/weibo/models/weibo-api'

import { normalizeSafeExternalUrl } from '../safe-url'
import { decodeHtmlEntities, normalizeMarkdownText } from './helpers'

/**
 * Gets status ID from various ID fields.
 */
export function getStatusId(status: Pick<WeiboStatus, 'idstr' | 'mid' | 'id'>): string {
  return String(status.idstr ?? status.mid ?? status.id ?? '')
}

/**
 * Gets status text from various text fields.
 */
export function getStatusText(
  status: Pick<WeiboStatus, 'text_raw' | 'text'> & { raw_text?: string },
): string {
  return status.text_raw ?? status.raw_text ?? status.text ?? ''
}

/**
 * Gets markdown text if available.
 */
export function getStatusMarkdownText(
  status: Pick<WeiboStatus, 'text_raw' | 'text'> & { raw_text?: string; isMarkdown?: boolean },
): string | undefined {
  if (!status.isMarkdown) {
    return undefined
  }

  const raw = status.text_raw ?? status.raw_text
  if (raw?.trim()) {
    return raw
  }

  return normalizeMarkdownText(status.text ?? '')
}

/**
 * Converts URL structs to URL entities.
 */
export function toUrlEntities(
  status: Pick<WeiboStatus, 'url_struct' | 'text_raw' | 'text'>,
  options?: { excludeImageEntities?: boolean },
): Array<{ shortUrl: string; title: string; url: string }> {
  if (!Array.isArray(status.url_struct)) {
    return []
  }

  const text = status.text_raw ?? status.text ?? ''

  return status.url_struct
    .map((entity: any) => {
      const shortUrl = entity.short_url?.trim() ?? ''
      const urlTitle = entity.url_title?.trim() ?? ''
      const urlType = Number(entity.url_type ?? 0)

      if (!shortUrl) {
        return null
      }

      if (urlType <= 0) {
        return null
      }

      if (!text.includes(shortUrl)) {
        return null
      }

      const longUrl = entity.long_url ?? entity.ori_url ?? entity.h5_target_url ?? shortUrl
      const safeUrl = normalizeSafeExternalUrl(String(longUrl))
      if (!safeUrl) {
        return null
      }

      if (options?.excludeImageEntities) {
        const hasImages = Array.isArray(entity.pic_ids) && entity.pic_ids.length > 0
        if (hasImages && urlType === 39) {
          return null
        }
      }

      const decodedTitle = urlTitle ? decodeHtmlEntities(urlTitle) : safeUrl
      return {
        shortUrl,
        title: decodedTitle || safeUrl,
        url: safeUrl,
      }
    })
    .filter((entity): entity is { shortUrl: string; title: string; url: string } => entity !== null)
}

/**
 * Converts topic structs to topic entities.
 */
export function toTopicEntities(
  status: Pick<WeiboStatus, 'topic_struct' | 'text_raw' | 'text'>,
): Array<{ title: string; url: string }> {
  if (!Array.isArray(status.topic_struct) || status.topic_struct.length === 0) {
    return []
  }

  const text = status.text_raw ?? status.text ?? ''

  return status.topic_struct
    .map((entity: any) => {
      const title = entity.topic_title?.trim() ?? ''
      if (!title) {
        return null
      }

      const token = `#${title}#`
      if (!text.includes(token)) {
        return null
      }

      return {
        title,
        url: `/topic?q=${encodeURIComponent(title)}`,
      }
    })
    .filter((entity): entity is { title: string; url: string } => entity !== null)
}
