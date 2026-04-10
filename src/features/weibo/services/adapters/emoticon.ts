import type {
  WeiboEmoticonConfig,
  WeiboEmoticonGroup,
  WeiboEmoticonItem,
} from '@/features/weibo/models/emoticon'

export interface WeiboEmoticonPayload {
  data?: {
    emoticon?: WeiboEmoticonLocaleGroups
  }
  emoticon?: Record<string, WeiboEmoticonLocaleGroups>
}

type WeiboEmoticonLocaleGroups = Record<string, Array<{ phrase?: string; url?: string }>>

function resolveLocaleGroups(payload: WeiboEmoticonPayload): WeiboEmoticonLocaleGroups {
  const rootEmoticon = payload.emoticon as Record<string, unknown> | undefined
  const nestedEmoticon = payload.data?.emoticon as Record<string, unknown> | undefined

  type EmoticonArray = Array<{ phrase?: string; url?: string }>

  if (nestedEmoticon && 'ZH_CN' in nestedEmoticon) {
    const zhCn = nestedEmoticon.ZH_CN as Record<string, EmoticonArray> | undefined
    if (zhCn && Object.keys(zhCn).length > 0) {
      return zhCn as WeiboEmoticonLocaleGroups
    }
  }

  if (rootEmoticon && 'ZH_CN' in rootEmoticon) {
    const zhCn = rootEmoticon.ZH_CN as Record<string, EmoticonArray> | undefined
    if (zhCn && Object.keys(zhCn).length > 0) {
      return zhCn as WeiboEmoticonLocaleGroups
    }
  }

  if (nestedEmoticon && Object.keys(nestedEmoticon).length > 0) {
    for (const value of Object.values(nestedEmoticon)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as WeiboEmoticonLocaleGroups
      }
    }
  }

  if (
    rootEmoticon &&
    typeof rootEmoticon === 'object' &&
    !Array.isArray(rootEmoticon) &&
    Object.keys(rootEmoticon).length > 0
  ) {
    for (const value of Object.values(rootEmoticon)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as WeiboEmoticonLocaleGroups
      }
    }
  }

  if (nestedEmoticon) {
    const flatGroups = resolveGroupsFromFlatLocale(nestedEmoticon as Record<string, unknown>)
    if (flatGroups) {
      return flatGroups
    }
  }

  return {}
}

function isEmoticonArray(value: unknown): value is Array<{ phrase?: string; url?: string }> {
  return Array.isArray(value) && typeof value[0] === 'object'
}

function resolveGroupsFromFlatLocale(
  nestedEmoticon: Record<string, unknown>,
): WeiboEmoticonLocaleGroups | null {
  const entries = Object.entries(nestedEmoticon)
  for (const [, value] of entries) {
    if (isEmoticonArray(value)) {
      const groupName = entries[0][0]
      const emoticonArray = value as Array<{ phrase?: string; url?: string }>
      return { [groupName]: emoticonArray } as WeiboEmoticonLocaleGroups
    }
  }
  return null
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
  const localeGroups = resolveLocaleGroups(payload)
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
