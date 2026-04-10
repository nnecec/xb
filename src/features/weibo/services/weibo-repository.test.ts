import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SubmitComposeInput } from '@/features/weibo/models/compose'
import { fetchWeiboJson } from '@/features/weibo/services/client'
import { postWeiboForm } from '@/features/weibo/services/client'
import {
  loadHomeTimeline,
  submitComposeAction,
} from '@/features/weibo/services/weibo-repository'

vi.mock('@/features/weibo/services/client', () => ({
  fetchWeiboJson: vi.fn(),
  postWeiboForm: vi.fn(),
}))

describe('weibo-repository', () => {
  beforeEach(() => {
    vi.mocked(fetchWeiboJson).mockReset()
    vi.mocked(postWeiboForm).mockReset()
    vi.mocked(fetchWeiboJson).mockResolvedValue({})
  })

  it('loads the following tab from friendstimeline', async () => {
    await expect(loadHomeTimeline('following')).resolves.toEqual({
      items: [],
      nextCursor: null,
    })

    expect(fetchWeiboJson).toHaveBeenCalledWith('/ajax/feed/friendstimeline', {
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

    expect(fetchWeiboJson).toHaveBeenCalledWith('/ajax/feed/unreadfriendstimeline', {
      since_id: '0',
    })
  })
})

describe('submitComposeAction', () => {
  beforeEach(() => {
    vi.mocked(postWeiboForm).mockReset()
  })

  it('posts status comments to /ajax/comments/create', async () => {
    vi.mocked(postWeiboForm).mockResolvedValue({ ok: 1, msg: '评论成功' })

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

    expect(postWeiboForm).toHaveBeenCalledWith('/ajax/comments/create', {
      id: '5286131038160528',
      comment: '太酷了[色]',
      pic_id: '',
      is_repost: '1',
      comment_ori: '0',
      is_comment: '0',
    })
  })

  it('posts comment replies to /ajax/comments/reply', async () => {
    vi.mocked(postWeiboForm).mockResolvedValue({ ok: 1, msg: '回复评论成功' })

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

    expect(postWeiboForm).toHaveBeenCalledWith('/ajax/comments/reply', {
      id: '5286131038160528',
      cid: '5286139894171523',
      comment: '[手指比心]',
      pic_id: '',
      is_repost: '0',
      comment_ori: '0',
      is_comment: '0',
    })
  })

  it('throws a clear placeholder error for repost mode', async () => {
    await expect(
      submitComposeAction({
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
      }),
    ).rejects.toThrow('weibo-repost-endpoint-not-configured')
  })
})
