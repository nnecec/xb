import { CircleDot } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSettings } from '@/lib/app-settings-store'
import { HotSearchCard } from '@/lib/weibo/components/hotsearch-list'
import { SearchCard } from '@/lib/weibo/components/search-card'

type ProfileLookup = { uid: string } | { screenName: string }

interface RightRailProps {
  onNavigateProfile: (lookup: ProfileLookup) => void
}

export function RightRail({ onNavigateProfile }: RightRailProps) {
  const showHotSearchCard = useAppSettings((state) => state.showHotSearchCard)

  return (
    <div className="flex w-full flex-col gap-4">
      <SearchCard onNavigateProfile={onNavigateProfile} />
      {showHotSearchCard && <HotSearchCard className="gap-2 p-2" />}

      <Card className="py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-base">反馈</CardTitle>
          <CardDescription>正在 beta 测试阶段，反馈问题以帮助我们改进</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground flex flex-col gap-3 px-4 text-sm">
          <a
            href="https://github.com/nnecec/xb/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-accent/60 hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <CircleDot className="h-4 w-4" />
            <span>反馈问题</span>
          </a>
          <a
            href="https://github.com/nnecec/xb"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-accent/60 hover:text-foreground focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-label="GitHub"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span>开源仓库</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
