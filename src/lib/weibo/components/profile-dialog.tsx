import { useQuery } from '@tanstack/react-query'

import { DialogContainer } from '@/lib/weibo/components/dialog-container'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { ProfileHeader } from '@/lib/weibo/components/profile-header'
import { composeTargetFromFeedItem } from '@/lib/weibo/models/compose'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type { StatusDetailNavigationItem } from '@/lib/weibo/models/feed'
import { ProfilePostsTabs } from '@/lib/weibo/pages/profile-page'
import { loadProfileHoverCard } from '@/lib/weibo/services/weibo-repository'

type ProfileLookup = { uid: string } | { screenName: string }

interface ProfileDialogProps {
  open: boolean
  lookup: ProfileLookup | null
  position: string
  width?: number
  onOpenChange: (open: boolean) => void
  setComposeTarget: (target: ComposeTarget | null) => void
  onNavigateStatusDetail: (item: StatusDetailNavigationItem) => void
}

export function ProfileDialog({
  open,
  lookup,
  position,
  width,
  onOpenChange,
  setComposeTarget,
  onNavigateStatusDetail,
}: ProfileDialogProps) {
  if (!open || !lookup) {
    return null
  }

  const profileQuery = useQuery({
    queryKey: [
      'weibo',
      'profile',
      'info',
      'uid' in lookup ? 'u' : 'n',
      'uid' in lookup ? lookup.uid : lookup.screenName,
    ],
    queryFn: () => loadProfileHoverCard(lookup),
    enabled: !!lookup,
  })

  const profile = profileQuery.data

  return (
    <DialogContainer
      open={open}
      position={position as any}
      width={width}
      onOpenChange={onOpenChange}
    >
      {profileQuery.isLoading ? <PageLoadingState label="正在加载此用户主页..." /> : null}
      {profileQuery.error instanceof Error ? (
        <PageErrorState description={profileQuery.error.message} />
      ) : null}
      {profile ? (
        <div className="flex flex-col gap-4">
          <ProfileHeader profile={profile} />
          <ProfilePostsTabs
            profileId={profile.id}
            onNavigate={onNavigateStatusDetail}
            onCommentClick={(item) => setComposeTarget(composeTargetFromFeedItem(item, 'comment'))}
            onRepostClick={(item) => setComposeTarget(composeTargetFromFeedItem(item, 'repost'))}
          />
        </div>
      ) : null}
    </DialogContainer>
  )
}
