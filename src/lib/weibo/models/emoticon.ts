export interface WeiboEmoticonItem {
  phrase: string
  url: string
}

export interface WeiboEmoticonGroup {
  title: string
  items: WeiboEmoticonItem[]
}

export interface WeiboEmoticonConfig {
  groups: WeiboEmoticonGroup[]
  phraseMap: Record<string, WeiboEmoticonItem>
}
