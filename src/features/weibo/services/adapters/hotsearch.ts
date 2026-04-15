export interface HotSearchItem {
  word: string
  num: number
  realpos: number
  labelName: string
  icon: string | null
  iconDesc: string
  iconDescColor: string
  topicFlag: number
  is_ad?: number
}

export interface HotSearchGovItem {
  name: string
  word: string
  pos: number
  icon: string
  iconDesc: string
  iconDescColor: string
}

export interface HotSearchPayload {
  data?: {
    realtime?: HotSearchItem[]
    hotgov?: HotSearchGovItem
    hotgovs?: HotSearchGovItem[]
  }
}

export interface HotSearchPage {
  items: HotSearchItem[]
  govItem: HotSearchGovItem | null
  govItems: HotSearchGovItem[]
}

function normalizeLabel(item: HotSearchItem): string {
  if (item.labelName) {
    return item.labelName
  }
  if (item.iconDesc) {
    return item.iconDesc
  }
  return ''
}

export function adaptHotSearchResponse(payload: HotSearchPayload): HotSearchPage {
  const realtime = payload.data?.realtime ?? []
  const govItems = payload.data?.hotgovs ?? []
  const govItem = payload.data?.hotgov ?? null

  return {
    items: realtime
      .filter((item) => item.is_ad !== 1)
      .map((item) => ({
        word: item.word,
        num: item.num,
        realpos: item.realpos,
        labelName: normalizeLabel(item),
        icon: item.icon,
        iconDesc: item.iconDesc ?? '',
        iconDescColor: item.iconDescColor ?? '',
        topicFlag: item.topicFlag,
      })),
    govItem: govItem
      ? {
          name: govItem.name,
          word: govItem.word,
          pos: govItem.pos,
          icon: govItem.icon,
          iconDesc: govItem.iconDesc ?? '',
          iconDescColor: govItem.iconDescColor ?? '',
        }
      : null,
    govItems: govItems.map((item) => ({
      name: item.name,
      word: item.word,
      pos: item.pos,
      icon: item.icon,
      iconDesc: item.iconDesc ?? '',
      iconDescColor: item.iconDescColor ?? '',
    })),
  }
}
