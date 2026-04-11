import { SiGithub } from '@icons-pack/react-simple-icons'
import { CircleDot } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function RightRail() {
  return (
    <div className="flex-col gap-4 flex w-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">热搜</CardTitle>
          <CardDescription>施工中</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">反馈</CardTitle>
          <CardDescription>帮助我们改进</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <a
            href="https://github.com/nnecec/xb/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
            <CircleDot className="h-4 w-4" />
            <span>反馈问题</span>
          </a>
          <a
            href="https://github.com/nnecec/xb"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
            <SiGithub className="h-4 w-4" />
            <span>开源仓库</span>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
