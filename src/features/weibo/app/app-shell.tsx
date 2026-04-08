import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";

import type { WeiboPageDescriptor } from "@/features/weibo/route/page-descriptor";
import { parseWeiboUrl } from "@/features/weibo/route/parse-weibo-url";
import { NavigationRail } from "@/features/weibo/components/navigation-rail";
import { RightRail } from "@/features/weibo/components/right-rail";
import { HomeTimelinePage } from "@/features/weibo/pages/home-timeline-page";
import { PageErrorState, PageLoadingState } from "@/features/weibo/components/page-state";
import { ProfilePage } from "@/features/weibo/pages/profile-page";
import { StatusDetailPage } from "@/features/weibo/pages/status-detail-page";
import {
  loadHomeTimeline,
  loadProfileInfo,
  loadProfilePosts,
  loadStatusComments,
  loadStatusDetail,
} from "@/features/weibo/services/weibo-repository";
import type { AppTheme } from "@/lib/app-settings";
import { useAppSettings } from "@/lib/app-settings-store";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PAGE_LABELS: Record<WeiboPageDescriptor["kind"], string> = {
  home: "Home Timeline",
  profile: "Profile",
  status: "Status Detail",
  unsupported: "Unsupported Page",
};

function describePage(page: WeiboPageDescriptor): string {
  switch (page.kind) {
    case "home":
      return `Active tab: ${page.tab}`;
    case "profile":
      return `Profile ${page.profileId} via /${page.profileSource}`;
    case "status":
      return `Status ${page.statusId} by ${page.authorId}`;
    case "unsupported":
      return `Reason: ${page.reason}`;
  }
}

function ShellFrame({
  pageKind,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  children,
}: {
  pageKind: WeiboPageDescriptor["kind"];
  rewriteEnabled: boolean;
  theme: AppTheme;
  onRewriteEnabledChange: (enabled: boolean) => void;
  onThemeChange: (theme: AppTheme) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="grid h-full grid-cols-[280px_minmax(0,1fr)_300px] gap-4 px-4 py-4">
        <div className="contents">
          <NavigationRail
            pageKind={pageKind}
            rewriteEnabled={rewriteEnabled}
            theme={theme}
            onRewriteEnabledChange={onRewriteEnabledChange}
            onThemeChange={onThemeChange}
          />
          <main className="min-w-0 overflow-y-auto">{children}</main>
          <RightRail />
        </div>
      </div>
    </div>
  );
}

function RewritePausedCard({ onResume }: { onResume: () => void }) {
  return (
    <div className="fixed top-4 right-4 z-2147483647 w-[min(24rem,calc(100vw-2rem))]">
      <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-lg shadow-black/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">LoveForXb paused</CardTitle>
          <CardDescription>
            The original Weibo page is visible again. Resume the rewrite when you want the X-style
            layout back.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={onResume}>Resume LoveForXb</Button>
          <p className="text-xs text-muted-foreground">
            Theme selection stays persisted and will be applied the next time the rewrite is
            enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = useMemo(
    () =>
      parseWeiboUrl(
        new URL(`${location.pathname}${location.search}`, window.location.origin).href,
      ),
    [location.pathname, location.search],
  );

  const theme = useAppSettings((state) => state.theme);
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled);
  const activeTimelineTab = useAppSettings((state) => state.homeTimelineTab);
  const setRewriteEnabled = useAppSettings((state) => state.setRewriteEnabled);
  const setHomeTimelineTab = useAppSettings((state) => state.setHomeTimelineTab);
  const setTheme = useAppSettings((state) => state.setTheme);
  const timelineQuery = useInfiniteQuery({
    queryKey: ["weibo", "timeline", activeTimelineTab],
    queryFn: ({ pageParam }) => loadHomeTimeline(activeTimelineTab, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: rewriteEnabled && page.kind === "home",
  });

  const profileInfoQuery = useQuery({
    queryKey: ["weibo", "profile", page.kind === "profile" ? page.profileId : null, "info"],
    queryFn: () => loadProfileInfo(page.kind === "profile" ? page.profileId : ""),
    enabled: rewriteEnabled && page.kind === "profile",
  });
  const profilePostsQuery = useQuery({
    queryKey: ["weibo", "profile", page.kind === "profile" ? page.profileId : null, "posts"],
    queryFn: () => loadProfilePosts(page.kind === "profile" ? page.profileId : ""),
    enabled: rewriteEnabled && page.kind === "profile",
  });

  const statusDetailQuery = useQuery({
    queryKey: ["weibo", "status", page.kind === "status" ? page.statusId : null],
    queryFn: () => loadStatusDetail(page.kind === "status" ? page.statusId : ""),
    enabled: rewriteEnabled && page.kind === "status",
  });
  const statusCommentsQuery = useInfiniteQuery({
    queryKey: ["weibo", "status-comments", page.kind === "status" ? page.statusId : null],
    queryFn: ({ pageParam }) =>
      loadStatusComments(page.kind === "status" ? page.statusId : "", pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: rewriteEnabled && page.kind === "status",
  });

  const timelineItems = useMemo(
    () => timelineQuery.data?.pages.flatMap((timelinePage) => timelinePage.items) ?? [],
    [timelineQuery.data],
  );
  const statusComments = useMemo(
    () => statusCommentsQuery.data?.pages.flatMap((commentsPage) => commentsPage.items) ?? [],
    [statusCommentsQuery.data],
  );
  const navigateToStatusDetail = (item: {
    author: { id: string };
    id: string;
    mblogId: string | null;
  }) => {
    const statusId = item.mblogId ?? item.id;
    if (!item.author.id || !statusId) {
      return;
    }
    navigate(`/${item.author.id}/${statusId}`);
  };

  if (!rewriteEnabled) {
    return <RewritePausedCard onResume={() => void setRewriteEnabled(true)} />;
  }

  if (page.kind === "home") {
    return (
      <ShellFrame
        pageKind={page.kind}
        rewriteEnabled={rewriteEnabled}
        theme={theme}
        onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
        onThemeChange={(nextTheme) => void setTheme(nextTheme)}
      >
        <HomeTimelinePage
          activeTab={activeTimelineTab}
          errorMessage={timelineQuery.error instanceof Error ? timelineQuery.error.message : null}
          hasNextPage={Boolean(timelineQuery.hasNextPage)}
          isFetchingNextPage={timelineQuery.isFetchingNextPage}
          isLoading={timelineQuery.isLoading}
          onRetry={() => void timelineQuery.refetch()}
          onLoadNextPage={() => void timelineQuery.fetchNextPage()}
          onCommentClick={navigateToStatusDetail}
          onTabChange={(tab) => void setHomeTimelineTab(tab)}
          items={timelineItems}
        />
      </ShellFrame>
    );
  }

  if (page.kind === "status") {
    return (
      <ShellFrame
        pageKind={page.kind}
        rewriteEnabled={rewriteEnabled}
        theme={theme}
        onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
        onThemeChange={(nextTheme) => void setTheme(nextTheme)}
      >
        {statusDetailQuery.isLoading ? (
          <PageLoadingState label="Loading this Weibo post..." />
        ) : null}
        {!statusDetailQuery.isLoading && statusDetailQuery.error instanceof Error ? (
          <PageErrorState description={statusDetailQuery.error.message} />
        ) : null}
        {!statusDetailQuery.isLoading && !statusDetailQuery.error && statusDetailQuery.data ? (
          <StatusDetailPage
            detail={statusDetailQuery.data}
            comments={statusComments}
            hasNextPage={Boolean(statusCommentsQuery.hasNextPage)}
            isFetchingNextPage={statusCommentsQuery.isFetchingNextPage}
            onLoadNextPage={() => void statusCommentsQuery.fetchNextPage()}
          />
        ) : null}
      </ShellFrame>
    );
  }

  if (page.kind === "profile") {
    return (
      <ShellFrame
        pageKind={page.kind}
        rewriteEnabled={rewriteEnabled}
        theme={theme}
        onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
        onThemeChange={(nextTheme) => void setTheme(nextTheme)}
      >
        {profileInfoQuery.isLoading || profilePostsQuery.isLoading ? (
          <PageLoadingState label="Loading this profile..." />
        ) : null}
        {!profileInfoQuery.isLoading &&
        !profilePostsQuery.isLoading &&
        (profileInfoQuery.error instanceof Error || profilePostsQuery.error instanceof Error) ? (
          <PageErrorState
            description={
              (profileInfoQuery.error as Error | null)?.message ??
              (profilePostsQuery.error as Error | null)?.message ??
              "Unknown Weibo profile error"
            }
          />
        ) : null}
        {!profileInfoQuery.isLoading &&
        !profilePostsQuery.isLoading &&
        !profileInfoQuery.error &&
        !profilePostsQuery.error &&
        profileInfoQuery.data &&
        profilePostsQuery.data ? (
          <ProfilePage
            activeTab={page.tab}
            posts={profilePostsQuery.data}
            profile={profileInfoQuery.data}
          />
        ) : null}
      </ShellFrame>
    );
  }

  return (
    <ShellFrame
      pageKind={page.kind}
      rewriteEnabled={rewriteEnabled}
      theme={theme}
      onRewriteEnabledChange={(enabled) => void setRewriteEnabled(enabled)}
      onThemeChange={(nextTheme) => void setTheme(nextTheme)}
    >
      <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
        <CardHeader>
          <CardTitle className="text-xl">{PAGE_LABELS[page.kind]}</CardTitle>
          <CardDescription>{describePage(page)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>ShadowRoot shell mounted successfully.</p>
          <p>Route sync is active and listening for main-world history updates.</p>
        </CardContent>
      </Card>
    </ShellFrame>
  );
}
