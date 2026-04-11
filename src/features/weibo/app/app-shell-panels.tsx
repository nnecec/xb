import { useRef } from 'react'

import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'
import type { CommentItem, StatusDetail } from '@/features/weibo/models/status'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import type { HomeTimelineTab } from '@/features/weibo/services/weibo-repository'

function createStatusComposeTarget(item: FeedItem, mode: 'comment' | 'repost'): ComposeTarget {
  return {
    kind: 'status',
    mode,
    statusId: item.id,
    targetCommentId: null,
    authorName: item.author.name,
    excerpt: item.text.trim().slice(0, 80),
  }
}

interface HomeStatusPanelsProps {
  activeTimelineTab: HomeTimelineTab
  isHomePageVisible: boolean
  isStatusPageVisible: boolean
  timelineErrorMessage: string | null
  timelineHasNextPage: boolean
  timelineIsFetchingNextPage: boolean
  timelineIsLoading: boolean
  timelineItems: TimelinePage['items']
  statusComments: CommentItem[]
  statusCommentsHasNextPage: boolean
  statusCommentsIsFetchingNextPage: boolean
  statusDetail: StatusDetail | undefined
  statusDetailErrorMessage: string | null
  statusDetailIsLoading: boolean
  onStatusComment?: (target: ComposeTarget) => void
  onStatusRepost?: (target: ComposeTarget) => void
  onCommentReply?: (target: ComposeTarget) => void
  onCommentClick: (item: FeedItem) => void
  onHomeRetry: () => void
  onHomeTabChange: (tab: HomeTimelineTab) => void
  onLoadNextComments: () => void
  onLoadNextTimeline: () => void
}

export function HomeStatusPanels({
  activeTimelineTab,
  isHomePageVisible,
  isStatusPageVisible,
  timelineErrorMessage,
  timelineHasNextPage,
  timelineIsFetchingNextPage,
  timelineIsLoading,
  timelineItems,
  statusComments,
  statusCommentsHasNextPage,
  statusCommentsIsFetchingNextPage,
  statusDetail,
  statusDetailErrorMessage,
  statusDetailIsLoading,
  onStatusComment,
  onStatusRepost,
  onCommentReply,
  onCommentClick,
  onHomeRetry,
  onHomeTabChange,
  onLoadNextComments,
  onLoadNextTimeline,
}: HomeStatusPanelsProps) {
  return (
    <div className="relative h-full mx-auto">
      <div className={['h-full', isHomePageVisible ? 'block' : 'hidden'].join(' ')}>
        <HomeTimelinePage
          activeTab={activeTimelineTab}
          errorMessage={timelineErrorMessage}
          hasNextPage={timelineHasNextPage}
          isFetchingNextPage={timelineIsFetchingNextPage}
          isLoading={timelineIsLoading}
          onNavigate={onCommentClick}
          onRetry={onHomeRetry}
          onLoadNextPage={onLoadNextTimeline}
          onCommentClick={(item) => onStatusComment?.(createStatusComposeTarget(item, 'comment'))}
          onRepostClick={(item) => onStatusRepost?.(createStatusComposeTarget(item, 'repost'))}
          onTabChange={onHomeTabChange}
          items={timelineItems}
        />
      </div>

      <div
        className={['h-full overflow-y-auto', isStatusPageVisible ? 'block' : 'hidden'].join(' ')}
      >
        {statusDetailIsLoading ? <PageLoadingState label="Loading this Weibo post..." /> : null}
        {!statusDetailIsLoading && statusDetailErrorMessage ? (
          <PageErrorState description={statusDetailErrorMessage} />
        ) : null}
        {!statusDetailIsLoading && !statusDetailErrorMessage && statusDetail ? (
          <StatusDetailPage
            detail={statusDetail}
            comments={statusComments}
            onStatusComment={onStatusComment}
            onStatusRepost={onStatusRepost}
            onCommentReply={onCommentReply}
            hasNextPage={statusCommentsHasNextPage}
            isFetchingNextPage={statusCommentsIsFetchingNextPage}
            onLoadNextPage={onLoadNextComments}
          />
        ) : null}
      </div>
    </div>
  )
}

interface ProfilePanelProps {
  errorMessage: string | null
  isLoading: boolean
  posts: TimelinePage | undefined
  profile: UserProfile | undefined
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
}

export function ProfilePanel({
  errorMessage,
  isLoading,
  posts,
  profile,
  onNavigate,
  onCommentClick,
  onRepostClick,
}: ProfilePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto">
      {isLoading ? <PageLoadingState label="Loading this profile..." /> : null}
      {!isLoading && errorMessage ? <PageErrorState description={errorMessage} /> : null}
      {!isLoading && !errorMessage && profile && posts ? (
        <ProfilePage
          posts={posts}
          profile={profile}
          onNavigate={onNavigate}
          onCommentClick={onCommentClick}
          onRepostClick={onRepostClick}
        />
      ) : null}
    </div>
  )
}
