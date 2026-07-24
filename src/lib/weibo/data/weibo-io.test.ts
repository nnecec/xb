import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProfileGroup,
  loadExploreHot,
  loadHomeTimeline,
  loadLikedStatuses,
  loadProfileAssignedGroups,
  loadProfileAvailableGroups,
  loadProfileSearchPosts,
  setSpecialFollowUser,
  setProfileGroups,
  submitComposeAction,
} from '@/lib/weibo/data/weibo-io'
import type { SubmitComposeInput } from '@/lib/weibo/models/compose'

const { wbGet, wbPostForm } = vi.hoisted(() => ({
  wbGet: vi.fn(),
  wbPostForm: vi.fn(),
}))

vi.mock('@/lib/weibo/services/client', () => ({
  wbGet,
  wbPostForm,
}))

describe('weibo-io', () => {
  beforeEach(() => {
    vi.mocked(wbGet).mockReset()
    vi.mocked(wbPostForm).mockReset()
    vi.mocked(wbGet).mockResolvedValue({})
  })

  it('loads the following tab from friendstimeline', async () => {
    await expect(loadHomeTimeline('following')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(wbGet).toHaveBeenCalledWith('/ajax/feed/friendstimeline', {
      count: 20,
      fid: '110001768015440',
      list_id: '110001768015440',
      refresh: 4,
      since_id: '0',
    })
  })

  it('loads the for-you tab from unreadfriendstimeline', async () => {
    await expect(loadHomeTimeline('for-you')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(wbGet).toHaveBeenCalledWith('/ajax/feed/unreadfriendstimeline', {
      since_id: '0',
    })
  })

  it('loads the special-follow tab with the gid from default follow groups', async () => {
    vi.mocked(wbGet)
      .mockResolvedValueOnce({
        groups: [
          {
            title: '默认分组',
            group: [
              { gid: 'special-dynamic', title: '特别关注' },
              { gid: 'friend-dynamic', title: '互相关注' },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({})

    await expect(loadHomeTimeline('special-follow')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(wbGet).toHaveBeenNthCalledWith(1, '/ajax/feed/allGroups', {
      fetch_hot: 1,
      is_new_segment: 1,
    })
    expect(wbGet).toHaveBeenNthCalledWith(2, '/ajax/feed/groupstimeline', {
      count: 25,
      fast_refresh: 1,
      list_id: 'special-dynamic',
      refresh: 4,
    })
  })

  it('loads the friend-circle tab with the mutual follow gid from default follow groups', async () => {
    vi.mocked(wbGet)
      .mockResolvedValueOnce({
        groups: [
          {
            title: '默认分组',
            group: [
              { gid: 'special-dynamic', title: '特别关注' },
              { gid: 'friend-dynamic', title: '互相关注' },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({})

    await expect(loadHomeTimeline('friend-circle')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(wbGet).toHaveBeenNthCalledWith(2, '/ajax/feed/groupstimeline', {
      count: 25,
      fast_refresh: 1,
      list_id: 'friend-dynamic',
      refresh: 4,
    })
  })

  it('loads liked statuses from likelist', async () => {
    await expect(loadLikedStatuses('6393557498')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(wbGet).toHaveBeenCalledWith('/ajax/statuses/likelist', {
      uid: '6393557498',
      page: 1,
      with_total: 'true',
    })
  })

  it('loads later liked status pages without total', async () => {
    await expect(loadLikedStatuses('6393557498', { page: 2 })).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(wbGet).toHaveBeenCalledWith('/ajax/statuses/likelist', {
      uid: '6393557498',
      page: 2,
    })
  })

  it('loads assigned profile groups', async () => {
    vi.mocked(wbGet).mockResolvedValue({
      ok: 1,
      data: [{ id: 5300067436070242, idstr: '5300067436070242', name: '特别厉害' }],
    })

    await expect(loadProfileAssignedGroups('1783497251')).resolves.toEqual([
      {
        id: '5300067436070242',
        idstr: '5300067436070242',
        name: '特别厉害',
        mode: null,
        memberCount: null,
        exist: false,
      },
    ])
    expect(wbGet).toHaveBeenCalledWith('/ajax/profile/getGroupList', {
      uid: '1783497251',
    })
  })

  it('loads available profile groups and filters id zero', async () => {
    vi.mocked(wbGet).mockResolvedValue({
      ok: 1,
      data: {
        lists: [
          { id: 0, idstr: '0', name: '数码', mode: 'private', recom: 1 },
          {
            id: 5300067436070242,
            idstr: '5300067436070242',
            name: '特别厉害',
            mode: 'public',
            member_count: 3,
            exist: 1,
          },
        ],
      },
    })

    await expect(loadProfileAvailableGroups('1783497251')).resolves.toEqual([
      {
        id: '5300067436070242',
        idstr: '5300067436070242',
        name: '特别厉害',
        mode: 'public',
        memberCount: 3,
        exist: true,
      },
    ])
    expect(wbGet).toHaveBeenCalledWith('/ajax/profile/getGroups', {
      target_uid: '1783497251',
      filterType: 'system',
      hasRecom: 'true',
    })
  })

  it('searches profile posts with original profile search params', async () => {
    vi.mocked(wbGet).mockResolvedValue({
      data: {
        total: '436',
        absstr: '烧鸡',
        list: [],
      },
    })

    await expect(
      loadProfileSearchPosts(
        '1783497251',
        {
          query: '烧鸡',
          starttime: 1780588800,
          endtime: 1780848000,
          filters: {
            hasori: true,
            hasret: true,
            hastext: true,
            haspic: true,
            hasvideo: false,
            hasmusic: true,
          },
        },
        1,
      ),
    ).resolves.toEqual({
      items: [],
      nextCursor: null,
      total: '436',
      matchedQuery: '烧鸡',
    })

    expect(wbGet).toHaveBeenCalledWith('/ajax/statuses/searchProfile', {
      uid: '1783497251',
      page: 1,
      q: '烧鸡',
      starttime: 1780588800,
      endtime: 1780848000,
      hasori: 1,
      hasret: 1,
      hastext: 1,
      haspic: 1,
      hasvideo: 0,
      hasmusic: 1,
    })
  })

  it('sets profile groups by posting selected and origin ids', async () => {
    vi.mocked(wbPostForm).mockResolvedValue({ ok: 1 })

    await expect(
      setProfileGroups(
        '1783497251',
        ['5300067436070242'],
        ['5300067436070242', '5300073389099937'],
      ),
    ).resolves.toBeUndefined()

    expect(wbPostForm).toHaveBeenCalledWith('/ajax/profile/setGroup', {
      uids: '1783497251',
      list_ids: '5300067436070242',
      origin_list_ids: '5300067436070242,5300073389099937',
    })
  })

  it('creates a profile group', async () => {
    vi.mocked(wbPostForm).mockResolvedValue({
      ok: 1,
      data: {
        id: 5306878706060026,
        idstr: '5306878706060026',
        name: '超级厉害',
        mode: 'public',
      },
    })

    await expect(createProfileGroup('超级厉害', true)).resolves.toEqual({
      id: '5306878706060026',
      idstr: '5306878706060026',
      name: '超级厉害',
      mode: 'public',
      memberCount: null,
      exist: false,
    })

    expect(wbPostForm).toHaveBeenCalledWith('/ajax/profile/createGroup', {
      name: '超级厉害',
      isOpen: 'true',
    })
  })

  it('sets special follow by posting touid', async () => {
    vi.mocked(wbPostForm).mockResolvedValue({ ok: 1 })

    await expect(setSpecialFollowUser('1694917363', true)).resolves.toBeUndefined()

    expect(wbPostForm).toHaveBeenCalledWith('/ajax/friendships/specialAdd', {
      touid: '1694917363',
    })
  })

  it('cancels special follow by posting touid', async () => {
    vi.mocked(wbPostForm).mockResolvedValue({ ok: 1 })

    await expect(setSpecialFollowUser('1694917363', false)).resolves.toBeUndefined()

    expect(wbPostForm).toHaveBeenCalledWith('/ajax/friendships/specialDestory', {
      touid: '1694917363',
    })
  })
})

describe('submitComposeAction', () => {
  beforeEach(() => {
    vi.mocked(wbPostForm).mockReset()
  })

  it('posts status comments to /ajax/comments/create', async () => {
    vi.mocked(wbPostForm).mockResolvedValue({ ok: 1, msg: '评论成功' })

    const input: SubmitComposeInput = {
      target: {
        kind: 'status',
        mode: 'comment',
        statusId: '5286131038160528',
        targetCommentId: null,
        authorName: '雷军',
        excerpt: '车载相机上线之后',
      },
      text: '太酷了[色]',
      alsoSecondaryAction: true,
    }

    await submitComposeAction(input)

    expect(wbPostForm).toHaveBeenCalledWith('/ajax/comments/create', {
      id: '5286131038160528',
      comment: '太酷了[色]',
      pic_id: '',
      is_repost: '1',
      comment_ori: '0',
      is_comment: '0',
      fp: '',
    })
  })

  it('posts comment replies to /ajax/comments/reply', async () => {
    vi.mocked(wbPostForm).mockResolvedValue({ ok: 1, msg: '回复评论成功' })

    await submitComposeAction({
      target: {
        kind: 'comment',
        mode: 'comment',
        statusId: '5286131038160528',
        targetCommentId: '5286139894171523',
        authorName: 'foccia',
        excerpt: '太酷了[色]',
      },
      text: '[手指比心]',
      alsoSecondaryAction: false,
    })

    expect(wbPostForm).toHaveBeenCalledWith('/ajax/comments/reply', {
      id: '5286131038160528',
      cid: '5286139894171523',
      comment: '[手指比心]',
      pic_id: '',
      is_repost: '0',
      comment_ori: '0',
      is_comment: '0',
      fp: '',
    })
  })

  it('posts status reposts to /ajax/statuses/normal_repost', async () => {
    vi.mocked(wbPostForm).mockResolvedValue({ ok: 1, msg: '转发成功' })

    await submitComposeAction({
      target: {
        kind: 'status',
        mode: 'repost',
        statusId: '5286131038160528',
        targetCommentId: null,
        authorName: '雷军',
        excerpt: '车载相机上线之后',
      },
      text: '转一下',
      alsoSecondaryAction: true,
    })

    expect(wbPostForm).toHaveBeenCalledWith('/ajax/statuses/normal_repost', {
      id: '5286131038160528',
      comment: '转一下',
      pic_id: '',
      is_repost: '0',
      comment_ori: '0',
      is_comment: '1',
      visible: '0',
      share_id: '',
    })
  })

  it('loads explore hot first page with max_id 0 and refresh 0', async () => {
    await expect(loadExploreHot()).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(wbGet).toHaveBeenCalledWith('/ajax/feed/hottimeline', {
      refresh: 0,
      group_id: '102803',
      containerid: '102803',
      extparam: 'discover|new_feed',
      max_id: 0,
      count: 10,
    })
  })

  it('loads explore hot next page with cursor as max_id without +1', async () => {
    await expect(loadExploreHot({ cursor: '42', groupId: 'g', containerid: 'c' })).resolves.toEqual(
      {
        items: [],
        nextCursor: null,
      },
    )

    expect(wbGet).toHaveBeenCalledWith('/ajax/feed/hottimeline', {
      refresh: 2,
      group_id: 'g',
      containerid: 'c',
      extparam: 'discover|new_feed',
      max_id: '42',
      count: 10,
    })
  })
})
