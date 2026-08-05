import { ArrowLeft } from 'lucide-react'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedMixMediaItem } from '@/lib/weibo/models/feed'

import { VideoPlayer } from '../media-player/video-player'

export function InlineVideoPanel({
  video,
  downloadFilename,
  maxWidth,
  onBack,
}: {
  video: FeedMixMediaItem
  downloadFilename?: string
  maxWidth?: number
  onBack: () => void
}) {
  const vertical = video.videoOrientation === 'vertical'
  const resolvedMaxWidth = maxWidth ?? (vertical ? 560 : 860)

  return (
    <section
      aria-label={video.videoTitle ? `正在播放：${video.videoTitle}` : '正在播放视频'}
      className="relative w-full"
      style={{ maxWidth: `${resolvedMaxWidth}px` }}
      onClick={(event) => event.stopPropagation()}
    >
      <AspectRatio
        ratio={vertical ? 4 / 5 : 16 / 9}
        className={cn(
          'bg-background overflow-hidden rounded-xl',
          'outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
        )}
      >
        <VideoPlayer
          progressiveSrc={video.videoStreamUrl ?? ''}
          poster={video.videoCoverUrl}
          dash={video.videoDash}
          videoOrientation={video.videoOrientation}
          downloadUrl={video.videoDownloadUrl}
          downloadFilename={downloadFilename ?? video.videoTitle}
        />
      </AspectRatio>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="bg-background/80 absolute top-2 left-2 z-40 shadow-sm backdrop-blur"
        onClick={(event) => {
          event.stopPropagation()
          onBack()
        }}
      >
        <ArrowLeft data-icon="inline-start" />
        返回媒体画廊
      </Button>
    </section>
  )
}
