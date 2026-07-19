import type { FeedItem } from '@/lib/weibo/models/feed'
import { sanitizeFilename } from '@/lib/weibo/utils/filename'

export function hasTextSelectionWithin(container: HTMLElement) {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return false
  }

  const range = selection.getRangeAt(0)
  const commonAncestor = range.commonAncestorContainer
  return commonAncestor === container || container.contains(commonAncestor)
}

export function openStatusDetailInNewTab(path: string): void {
  // Use the full URL so the new tab loads at the correct weibo.com path
  // regardless of the current location. The xb content script runs on
  // https://weibo.com/* and react-router picks up the new path on load.
  window.open(`${window.location.origin}${path}`, '_blank', 'noopener,noreferrer')
}

export function getMediaDownloadFilename(item: Pick<FeedItem, 'author' | 'text'>) {
  return `${item.author.name} ${sanitizeFilename(item.text.slice(0, 15))}`
}

export function getStatusCopyText(item: Pick<FeedItem, 'text' | 'markdownText'>) {
  return item.markdownText || item.text
}

export function getStatusDetailPath(item: Pick<FeedItem, 'author' | 'id' | 'mblogId'>) {
  const statusId = item.mblogId ?? item.id
  if (!item.author.id || !statusId) return null
  return `/${item.author.id}/${statusId}`
}
