import { ExternalLinkIcon, ShieldAlertIcon, TriangleAlertIcon } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MweiboTopicRecoveryState } from '@/lib/weibo/data/weibo-data'

export function MweiboTopicRecoveryPrompt({
  recovery,
  onRetry,
}: {
  recovery: MweiboTopicRecoveryState
  onRetry: () => void
}) {
  const captcha = recovery.kind === 'captcha'

  return (
    <Card className="mx-4 my-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {captcha ? (
            <ShieldAlertIcon aria-hidden="true" className="size-4 text-amber-500" />
          ) : (
            <TriangleAlertIcon aria-hidden="true" className="size-4 text-amber-500" />
          )}
          {captcha ? '需要人机验证' : '话题内容暂时不可用'}
        </CardTitle>
        <CardDescription>
          {captcha
            ? '微博移动端要求验证，xb 暂时无法加载这个话题。请先打开微博原话题页完成验证，然后返回此处重新加载。'
            : '微博移动端暂时没有返回可用数据，这通常由访问限制或登录状态失效引起。请先打开微博原话题页，再返回此处重新加载。若仍无法加载，可在设置中关闭「话题页打开方式」。'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <a
          href={recovery.originalTopicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'default', size: 'default' }))}
        >
          <ExternalLinkIcon aria-hidden="true" />
          打开微博原话题页
        </a>
        <Button variant="outline" onClick={onRetry}>
          重新加载
        </Button>
      </CardContent>
    </Card>
  )
}
