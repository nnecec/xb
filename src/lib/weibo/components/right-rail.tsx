import { SiGithub } from '@icons-pack/react-simple-icons'
import { CircleDot } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSettings } from '@/lib/app-settings-store'
import { HotSearchCard } from '@/lib/weibo/components/hotsearch-list'
import { SearchCard } from '@/lib/weibo/components/search-card'

export function RightRail() {
  const showHotSearchCard = useAppSettings((state) => state.showHotSearchCard)

  return (
    <div className="flex w-full flex-col gap-4">
      <SearchCard />
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
            <SiGithub className="h-4 w-4" />
            <span>开源仓库</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
