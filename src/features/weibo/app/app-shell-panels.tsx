import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'
import type { CommentItem, StatusDetail } from '@/features/weibo/models/status'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import type { HomeTimelineTab } from '@/features/weibo/services/weibo-repository'

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
  onCommentClick,
  onHomeRetry,
  onHomeTabChange,
  onLoadNextComments,
  onLoadNextTimeline,
}: {
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
  onCommentClick: (item: FeedItem) => void
  onHomeRetry: () => void
  onHomeTabChange: (tab: HomeTimelineTab) => void
  onLoadNextComments: () => void
  onLoadNextTimeline: () => void
}) {
  return (
    <div className="h-full mx-auto">
      {/* Home timeline stays mounted to preserve scroll position. */}
      <div className={['h-full overflow-y-auto', isHomePageVisible ? 'block' : 'hidden'].join(' ')}>
        <HomeTimelinePage
          activeTab={activeTimelineTab}
          errorMessage={timelineErrorMessage}
          hasNextPage={timelineHasNextPage}
          isFetchingNextPage={timelineIsFetchingNextPage}
          isLoading={timelineIsLoading}
          onRetry={onHomeRetry}
          onLoadNextPage={onLoadNextTimeline}
          onCommentClick={onCommentClick}
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
            hasNextPage={statusCommentsHasNextPage}
            isFetchingNextPage={statusCommentsIsFetchingNextPage}
            onLoadNextPage={onLoadNextComments}
          />
        ) : null}
      </div>
    </div>
  )
}

export function ProfilePanel({
  errorMessage,
  isLoading,
  posts,
  profile,
  onCommentClick,
}: {
  errorMessage: string | null
  isLoading: boolean
  posts: TimelinePage | undefined
  profile: UserProfile | undefined
  onCommentClick?: (item: FeedItem) => void
}) {
  return (
    <div className="h-full overflow-y-auto">
      {isLoading ? <PageLoadingState label="Loading this profile..." /> : null}
      {!isLoading && errorMessage ? <PageErrorState description={errorMessage} /> : null}
      {!isLoading && !errorMessage && profile && posts ? (
        <ProfilePage posts={posts} profile={profile} onCommentClick={onCommentClick} />
      ) : null}
    </div>
  )
}
