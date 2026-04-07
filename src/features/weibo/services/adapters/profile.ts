import type { UserProfile } from '@/features/weibo/models/profile'

interface ProfileUserPayload {
  avatar_hd?: string
  cover_image_phone?: string
  description?: string
  id?: number | string
  idstr?: string
  profile_image_url?: string
  screen_name?: string
}

interface ProfilePayload {
  data?: {
    user?: ProfileUserPayload
  }
  user?: ProfileUserPayload
}

export function adaptProfileInfoResponse(payload: ProfilePayload): UserProfile {
  const user = payload.data?.user ?? payload.user ?? {}

  return {
    id: String(user.idstr ?? user.id ?? ''),
    name: user.screen_name ?? '',
    bio: user.description ?? '',
    avatarUrl: user.avatar_hd ?? user.profile_image_url ?? null,
    bannerUrl: user.cover_image_phone ?? null,
  }
}
