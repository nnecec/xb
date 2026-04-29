export interface ExploreGroup {
  gid: string
  title: string
  containerid: string
}

interface ExploreGroupRaw {
  gid?: string
  title?: string
  containerid?: string
}

interface ExploreGroupsPayloadCategory {
  group?: ExploreGroupRaw[]
  title?: string
}

export interface ExploreGroupsPayload {
  groups?: ExploreGroupsPayloadCategory[]
}

export function adaptExploreGroupsResponse(payload: ExploreGroupsPayload): ExploreGroup[] {
  const list = payload.groups ?? []

  // Try to find "我的频道" category
  const myChannel = list.find((item) => item.title === '我的频道')

  let groups: ExploreGroupRaw[] = []

  if (myChannel && myChannel.group) {
    // Found "我的频道", use its list
    groups = myChannel.group ?? []
  }

  return groups.slice(0, 5) as ExploreGroup[]
}
