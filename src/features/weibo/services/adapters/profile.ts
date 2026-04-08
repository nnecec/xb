import type { UserProfile } from '@/features/weibo/models/profile'

interface ProfileUserPayload {
  avatar_hd?: string
  cover_image_phone?: string
  description?: string
  followers_count_str?: string
  friends_count?: number
  id?: number | string
  idstr?: string
  profile_image_url?: string
  screen_name?: string
}

export interface ProfileInfoPayload {
  data?: {
    user?: ProfileUserPayload
  }
  user?: ProfileUserPayload
}

interface ProfileDetailFollowerUser {
  screen_name?: string
  avatar_large?: string
}

export interface ProfileDetailPayload {
  data?: {
    /** 认证信息（如「资深汽车达人」），不是个人简介。 */
    desc_text?: string
    /** 部分返回里与 info 一致的简介字段。 */
    description?: string
    created_at?: string
    ip_location?: string
    followers?: {
      total_number?: number
      users?: ProfileDetailFollowerUser[]
    }
  }
}

export function adaptProfileInfoResponse(payload: ProfileInfoPayload): UserProfile {
  const user = payload.data?.user ?? payload.user ?? {}

  return {
    id: String(user.idstr ?? user.id ?? ''),
    name: user.screen_name ?? '',
    bio: user.description ?? '',
    avatarUrl: user.avatar_hd ?? user.profile_image_url ?? null,
    bannerUrl: user.cover_image_phone?.split(';')[0] ?? null,
    followersCount: user.followers_count_str ?? null,
    friendsCount: user.friends_count ?? null,
    ipLocation: null,
    descText: null,
    createdAt: null,
    mutualFollowers: [],
    mutualFollowerTotal: null,
  }
}

function formatCreatedAtDate(raw: string | undefined): string | null {
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function mergeProfileDetail(
  profile: UserProfile,
  detail: ProfileDetailPayload,
): UserProfile {
  const data = detail.data
  const bioFromDetail = data?.description?.trim()
  return {
    ...profile,
    descText: data?.desc_text ?? null,
    bio: bioFromDetail || profile.bio,
    ipLocation: data?.ip_location ?? null,
    createdAt: formatCreatedAtDate(data?.created_at),
    mutualFollowers: (data?.followers?.users ?? []).map((u) => ({
      screenName: u.screen_name ?? '',
      avatarUrl: u.avatar_large ?? '',
    })),
    mutualFollowerTotal: data?.followers?.total_number ?? null,
  }
}
