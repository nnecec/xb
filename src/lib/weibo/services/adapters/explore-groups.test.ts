import { describe, expect, it } from 'vitest'

import { getHomeTabForDefaultFollowGroupId } from '@/lib/weibo/models/explore-utils'
import {
  adaptDefaultFollowGroupsResponse,
  adaptFollowGroupsDataResponse,
} from '@/lib/weibo/services/adapters/explore-groups'

describe('explore group adapters', () => {
  const payload = {
    groups: [
      {
        title: '默认分组',
        group: [
          { gid: '100016393557498', title: '全部关注' },
          { gid: '4192852076145461', title: '特别关注' },
          { gid: '100096393557498', title: '互相关注' },
        ],
      },
      {
        title: '我的分组',
        group: [
          { gid: '5300067436070242', title: '特别厉害' },
          { gid: '4192852076538581', title: '同学' },
        ],
      },
    ],
  }

  it('extracts special follow and mutual follow from default groups', () => {
    expect(adaptDefaultFollowGroupsResponse(payload)).toEqual({
      specialFollow: { gid: '4192852076145461', title: '特别关注' },
      friendCircle: { gid: '100096393557498', title: '互相关注' },
    })
  })

  it('keeps custom follow groups separate from default timeline groups', () => {
    expect(adaptFollowGroupsDataResponse(payload)).toEqual({
      groups: [
        { gid: '5300067436070242', title: '特别厉害' },
        { gid: '4192852076538581', title: '同学' },
      ],
      defaultGroups: {
        specialFollow: { gid: '4192852076145461', title: '特别关注' },
        friendCircle: { gid: '100096393557498', title: '互相关注' },
      },
    })
  })

  it('maps default group gids back to home tabs', () => {
    const defaultGroups = adaptDefaultFollowGroupsResponse(payload)

    expect(getHomeTabForDefaultFollowGroupId(defaultGroups, '4192852076145461')).toBe(
      'special-follow',
    )
    expect(getHomeTabForDefaultFollowGroupId(defaultGroups, '100096393557498')).toBe(
      'friend-circle',
    )
    expect(getHomeTabForDefaultFollowGroupId(defaultGroups, '4192852076538581')).toBeNull()
  })
})
