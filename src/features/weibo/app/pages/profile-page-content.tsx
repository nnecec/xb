import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'

import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { useProfilePageData } from '@/features/weibo/app/app-shell-queries'
import { BackToTop } from '@/features/weibo/components/back-to-top'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { useAppSettings } from '@/lib/app-settings-store'

export function ProfilePageContent() {
  const ctx = useAppShellContext()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const page = useMemo(
    () =>
      parseWeiboUrl(
        new URL(`${location.pathname}${location.search}`, window.location.origin).href,
      ),
    [location.pathname, location.search],
  )

  const isEnabled = rewriteEnabled && page.kind === 'profile'
  const { profileInfoQuery, profilePostsQuery, isLoading, errorMessage } =
    useProfilePageData({
      page,
      isEnabled,
    })

  useEffect(() => {
    ctx.onProfileUserIdChange(profileInfoQuery.data?.id ?? null)
  }, [ctx.onProfileUserIdChange, profileInfoQuery.data?.id])

  return (
    <div ref={scrollRef} className="relative h-full mx-auto">
      {isLoading ? <PageLoadingState label="Loading this profile..." /> : null}
      {errorMessage ? (
        <PageErrorState description={errorMessage} />
      ) : null}
      {profileInfoQuery.data && profilePostsQuery.data ? (
        <ProfilePage
          posts={profilePostsQuery.data}
          profile={profileInfoQuery.data}
          onNavigate={ctx.navigateToStatusDetail}
          onCommentClick={(item) =>
            ctx.setComposeTarget({
              kind: 'status',
              mode: 'comment',
              statusId: item.id,
              targetCommentId: null,
              authorName: item.author.name,
              excerpt: item.text.trim().slice(0, 80),
            })
          }
          onRepostClick={(item) =>
            ctx.setComposeTarget({
              kind: 'status',
              mode: 'repost',
              statusId: item.id,
              targetCommentId: null,
              authorName: item.author.name,
              excerpt: item.text.trim().slice(0, 80),
            })
          }
        />
      ) : null}
      <BackToTop container={scrollRef.current} />
    </div>
  )
}
