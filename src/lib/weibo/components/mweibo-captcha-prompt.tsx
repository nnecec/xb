import { ExternalLinkIcon, ShieldAlertIcon, TriangleAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { buildMweiboTopicPageUrl } from '@/lib/weibo/services/m-weibo-client'

interface MweiboTopicRecoveryPromptProps {
  topic: string
  channelType?: string
  onRetry: () => void
}

interface MweiboRecoveryCardProps extends MweiboTopicRecoveryPromptProps {
  title: string
  description: ReactNode
  icon: ReactNode
}

function MweiboRecoveryCard({
  topic,
  channelType,
  title,
  description,
  icon,
  onRetry,
}: MweiboRecoveryCardProps) {
  const originalTopicUrl = buildMweiboTopicPageUrl(topic, channelType)

  return (
    <Card className="mx-4 my-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <a
          href={originalTopicUrl}
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

/** Guides the user through m.weibo.cn's captcha recovery flow. */
export function MweiboCaptchaPrompt(props: MweiboTopicRecoveryPromptProps) {
  return (
    <MweiboRecoveryCard
      {...props}
      title="需要人机验证"
      description="微博移动端要求验证，xb 暂时无法加载这个话题。请先打开微博原话题页完成验证，然后返回此处重新加载。"
      icon={<ShieldAlertIcon aria-hidden="true" className="size-4 text-amber-500" />}
    />
  )
}

/** Explains a non-success topic response without presenting it as an empty feed. */
export function MweiboUnavailablePrompt(props: MweiboTopicRecoveryPromptProps) {
  return (
    <MweiboRecoveryCard
      {...props}
      title="话题内容暂时不可用"
      description="微博移动端暂时没有返回可用数据，这通常由访问限制或登录状态失效引起。请先打开微博原话题页，再返回此处重新加载。若仍无法加载，可在设置中关闭「话题页打开方式」。"
      icon={<TriangleAlertIcon aria-hidden="true" className="size-4 text-amber-500" />}
    />
  )
}
