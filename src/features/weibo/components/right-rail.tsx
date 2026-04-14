import { SiGithub } from '@icons-pack/react-simple-icons'
import { CircleDot } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HotSearchCard } from '@/features/weibo/components/hotsearch-list'
import { useAppSettings } from '@/lib/app-settings-store'

export function RightRail() {
  const showHotSearchCard = useAppSettings((state) => state.showHotSearchCard)

  return (
    <div className="flex w-full flex-col gap-4">
      {showHotSearchCard && <HotSearchCard className="gap-2 p-2" />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">反馈</CardTitle>
          <CardDescription>正在 beta 测试阶段，反馈问题以帮助我们改进</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <a
            href="https://github.com/nnecec/xb/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <CircleDot className="h-4 w-4" />
            <span>反馈问题</span>
          </a>
          <a
            href="https://github.com/nnecec/xb"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <SiGithub className="h-4 w-4" />
            <span>开源仓库</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
