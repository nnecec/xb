import { adaptCommentsResponse, type WeiboCommentsPayload } from '@/lib/weibo/data/io/comments'
import { adaptLikes, type WeiboLikesPayload } from '@/lib/weibo/data/io/likes'
import { adaptMentionsResponse, type WeiboMentionsPayload } from '@/lib/weibo/data/io/mentions'
import type { NotificationsPage } from '@/lib/weibo/models/notification'
import type { RelationPage, WeiboFriendsPayload } from '@/lib/weibo/models/user-relation'
function adaptFriendsResponse(payload: WeiboFriendsPayload): RelationPage {
  return {
    items: (payload.users ?? []).map((raw) => ({
      id: raw.idstr,
      name: raw.name,
      screenName: raw.screen_name,
      avatarUrl: raw.profile_image_url,
      avatarLarge: raw.avatar_large,
      description: raw.description,
      followersCount: raw.followers_count,
      followersCountStr: raw.followers_count_str,
      friendsCount: raw.friends_count,
      following: raw.following,
      followMe: raw.follow_me,
      verified: raw.verified,
      verifiedType: raw.verified_type,
      verifiedReason: raw.verified_reason,
      location: raw.location,
      createdAt: raw.created_at,
    })),
    nextPage: payload.next_cursor > 0 ? payload.next_cursor : null,
    totalNumber: payload.total_number,
    errorMsg: payload.ok === 0 ? payload.msg : undefined,
  }
}
import { wbGet } from '@/lib/weibo/services/client'
import { WEIBO_ENDPOINTS } from '@/lib/weibo/services/endpoints'
import { mweiboFetch } from '@/lib/weibo/services/m-weibo-client'

export async function loadMentions(cursor?: string | null): Promise<NotificationsPage> {
  const payload = await wbGet<WeiboMentionsPayload>(WEIBO_ENDPOINTS.mentions, {
    ...(cursor ? { max_id: cursor } : { since_id: '0' }),
    count: 20,
  })
  return adaptMentionsResponse(payload)
}

export async function loadComments(cursor?: string | null) {
  const payload = await wbGet<WeiboCommentsPayload>(WEIBO_ENDPOINTS.comments, {
    ...(cursor ? { max_id: cursor } : {}),
    count: 20,
  })
  return adaptCommentsResponse(payload)
}

export async function loadLikes(cursor?: string | null) {
  const payload = await wbGet<WeiboLikesPayload>(WEIBO_ENDPOINTS.likes, {
    ...(cursor ? { max_id: cursor } : {}),
    count: 20,
  })
  return adaptLikes(payload)
}

// ─── Unread Notifications ───

export interface UnreadCounts {
  mentions: number
  comments: number
  likes: number
  dm: number
}

export async function checkUnreadNotifications(): Promise<UnreadCounts> {
  try {
    const payload = await mweiboFetch<{
      ok: number
      data?: {
        mention_cmt?: number
        mention_status?: number
        cmt?: number
        attitude?: number
        dm?: number
        group?: number
        msgbox?: number
        notice?: number
      }
    }>(WEIBO_ENDPOINTS.mweiboRemind)
    const data = payload?.data
    return {
      mentions: (data?.mention_cmt ?? 0) + (data?.mention_status ?? 0),
      comments: data?.cmt ?? 0,
      likes: data?.attitude ?? 0,
      dm: (data?.dm ?? 0) + (data?.group ?? 0) + (data?.msgbox ?? 0) + (data?.notice ?? 0),
    }
  } catch {
    return { mentions: 0, comments: 0, likes: 0, dm: 0 }
  }
}

// ─── Friends / Followers & Following ───

interface LoadFriendsOptions {
  page?: number
  relate?: 'fans'
  count?: number
}

export async function loadFriends(
  uid: string,
  options: LoadFriendsOptions = {},
): Promise<RelationPage> {
  const { page = 1, relate, count = 20 } = options

  const params: Record<string, string | number> = {
    uid,
    page,
  }

  if (relate === 'fans') {
    params.relate = 'fans'
    params.count = count
    params.type = 'fans'
    params.fansSortType = 'followTime'
  }

  const payload = await wbGet<WeiboFriendsPayload>(WEIBO_ENDPOINTS.friends, params)
  return adaptFriendsResponse(payload)
}
