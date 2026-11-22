import { describe, expect, it } from 'vitest'

import {
  backAuxiliaryColumnReading,
  createAuxiliaryColumnReading,
  followAuxiliaryColumnTarget,
  openAuxiliaryColumnReading,
  replaceAuxiliaryColumnSection,
  restoreAuxiliaryColumnReading,
} from '@/lib/weibo/workspace/auxiliary-column-reading'
import type { ColumnSource } from '@/lib/weibo/workspace/workspace-store'

const home: ColumnSource = { kind: 'home', tab: 'following' }

describe('附加列阅读状态', () => {
  it('打开详情后刷新只恢复当前页和基底页', () => {
    const opened = createAuxiliaryColumnReading({ source: home })
    const onDetail = openAuxiliaryColumnReading(opened, {
      kind: 'status',
      authorId: '5',
      statusId: 'mblog-1',
    })

    expect(onDetail.persisted).toEqual({
      current: { kind: 'status', authorId: '5', statusId: 'mblog-1' },
      base: { kind: 'home', tab: 'following' },
    })
    expect(opened.persisted).toEqual({ current: null, base: null })

    const restored = restoreAuxiliaryColumnReading({
      source: home,
      persisted: onDetail.persisted,
    })

    expect(restored.page).toEqual({ kind: 'status', authorId: '5', statusId: 'mblog-1' })
    expect(restored.canGoBack).toBe(true)
    expect(restored.persisted).toEqual(onDetail.persisted)
  })

  it('刷新丢掉中间页，返回仍回到基底页', () => {
    const profile = openAuxiliaryColumnReading(createAuxiliaryColumnReading({ source: home }), {
      kind: 'profile',
      profileId: '42',
      profileSource: 'u',
      tab: 'posts',
    })
    const detail = openAuxiliaryColumnReading(profile, {
      kind: 'status',
      authorId: '42',
      statusId: '200',
    })

    const restored = restoreAuxiliaryColumnReading({
      source: home,
      persisted: detail.persisted,
    })
    const backHome = backAuxiliaryColumnReading(restored)

    expect(backHome.page).toEqual({ kind: 'home', tab: 'following' })
    expect(backHome.canGoBack).toBe(false)
    expect(backHome.persisted).toEqual({ current: null, base: null })
  })

  it('在首页里换成一个分组时不增加可返回的一层', () => {
    const grouped = replaceAuxiliaryColumnSection(createAuxiliaryColumnReading({ source: home }), {
      kind: 'home',
      tab: 'following',
      groupId: 'group-a',
    })

    expect(grouped.page).toEqual({ kind: 'home', tab: 'following', groupId: 'group-a' })
    expect(grouped.canGoBack).toBe(false)
    expect(grouped.persisted).toEqual({
      current: { kind: 'home', tab: 'following', groupId: 'group-a' },
      base: { kind: 'home', tab: 'following', groupId: 'group-a' },
    })
  })

  it('换了列来源就丢掉原来的阅读状态', () => {
    const onDetail = openAuxiliaryColumnReading(createAuxiliaryColumnReading({ source: home }), {
      kind: 'status',
      authorId: '5',
      statusId: 'mblog-1',
    })

    const topic = restoreAuxiliaryColumnReading({
      source: { kind: 'topic', topic: '新话题' },
      persisted: onDetail.persisted,
    })

    expect(topic.page).toEqual({ kind: 'topic', topic: '新话题' })
    expect(topic.canGoBack).toBe(false)
    expect(topic.persisted).toEqual({ current: null, base: null })
  })

  it('从没有基底页的热搜返回后不再恢复那条详情', () => {
    const hotSearch: ColumnSource = { kind: 'hot-search', type: 'hot' }
    const onTopic = openAuxiliaryColumnReading(
      createAuxiliaryColumnReading({ source: hotSearch }),
      { kind: 'topic', topic: '测试话题' },
    )

    const restored = restoreAuxiliaryColumnReading({
      source: hotSearch,
      persisted: onTopic.persisted,
    })
    expect(restored.page).toEqual({ kind: 'topic', topic: '测试话题' })

    const backToList = backAuxiliaryColumnReading(restored)
    expect(backToList.page).toBeNull()
    expect(backToList.canGoBack).toBe(false)
    expect(backToList.persisted).toEqual({ current: null, base: null })

    const reopened = restoreAuxiliaryColumnReading({
      source: hotSearch,
      persisted: backToList.persisted,
    })
    expect(reopened.page).toBeNull()
  })

  it('再次打开当前页时不改变阅读状态', () => {
    const opened = createAuxiliaryColumnReading({ source: home })
    const again = openAuxiliaryColumnReading(opened, { kind: 'home', tab: 'following' })

    expect(again).toBe(opened)
  })

  it('按地址前进，replace 在同一段里换页', () => {
    const opened = createAuxiliaryColumnReading({ source: home })
    const profile = followAuxiliaryColumnTarget(opened, '/u/42')
    const fans = followAuxiliaryColumnTarget(profile, '/u/page/follow/7?tab=fans')
    const comments = followAuxiliaryColumnTarget(opened, '/comment/inbox', 'replace')

    expect(profile.page).toEqual({
      kind: 'profile',
      profileId: '42',
      profileSource: 'u',
      tab: 'posts',
    })
    expect(fans.page).toEqual({ kind: 'follow', uid: '7', tab: 'fans' })
    expect(fans.canGoBack).toBe(true)
    expect(comments.page).toEqual({ kind: 'notifications', tab: 'comments' })
    expect(comments.canGoBack).toBe(false)
    expect(followAuxiliaryColumnTarget(opened, '/settings')).toBe(opened)
  })

  it('同一用户的关注和粉丝互换时不增加一层', () => {
    const following = createAuxiliaryColumnReading({
      source: { kind: 'follow', uid: '7', tab: 'following' },
    })
    const fans = replaceAuxiliaryColumnSection(following, {
      kind: 'follow',
      uid: '7',
      tab: 'fans',
    })

    expect(fans.page).toEqual({ kind: 'follow', uid: '7', tab: 'fans' })
    expect(fans.canGoBack).toBe(false)
  })
})
