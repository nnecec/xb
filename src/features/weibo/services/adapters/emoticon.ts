import type {
  WeiboEmoticonConfig,
  WeiboEmoticonGroup,
  WeiboEmoticonItem,
} from '@/features/weibo/models/emoticon'

export interface WeiboEmoticonPayload {
  emoticon?: {
    ZH_CN?: Record<string, Array<{ phrase?: string; url?: string }>>
  }
}

function normalizeItem(entry: { phrase?: string; url?: string }): WeiboEmoticonItem | null {
  const phrase = entry.phrase?.trim() ?? ''
  const url = entry.url?.trim() ?? ''
  if (!phrase || !url) {
    return null
  }

  return { phrase, url }
}

export function adaptEmoticonConfigResponse(payload: WeiboEmoticonPayload): WeiboEmoticonConfig {
  const localeGroups = payload.emoticon?.ZH_CN ?? {}
  const groups: WeiboEmoticonGroup[] = []
  const phraseMap: Record<string, WeiboEmoticonItem> = {}

  for (const [title, entries] of Object.entries(localeGroups)) {
    const items = (entries ?? [])
      .map((entry) => normalizeItem(entry ?? {}))
      .filter((item): item is WeiboEmoticonItem => item !== null)

    groups.push({ title, items })

    for (const item of items) {
      phraseMap[item.phrase] = item
    }
  }

  return { groups, phraseMap }
}
