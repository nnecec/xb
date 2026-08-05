import { PlayIcon, SquarePlay } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { PhotoView } from 'react-photo-view'
import type { PhotoRenderParams } from 'react-photo-view/dist/types'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FeedImage } from '@/lib/weibo/models/feed'

import type { MediaCollectionItem } from './media-collection-model'

const LONG_IMAGE_RATIO = 2.6

/** Inset media outline: pure black/white only (never tinted neutrals). */
const mediaOutlineClassName =
  'outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10'

function isLongImage(image: FeedImage) {
  return Boolean(image.width && image.height && image.height / image.width >= LONG_IMAGE_RATIO)
}

function ImageOverlay({
  image,
  dim,
  square = true,
}: {
  image: FeedImage
  dim: boolean
  square?: boolean
}) {
  return (
    <>
      {dim ? <div className="dark:bg-background/25 absolute inset-0 z-10" /> : null}
      <img
        src={image.thumbnailUrl}
        className={cn(square && 'aspect-square', 'h-full w-full object-cover object-center')}
        alt=""
        width={image.width ?? 1}
        height={image.height ?? 1}
        loading="lazy"
        decoding="async"
      />
      {image.type === 'livephoto' ? (
        <Badge
          className="absolute bottom-1 left-1 z-20 font-mono text-xs backdrop-blur select-none"
          variant="outline"
        >
          Live
        </Badge>
      ) : null}
      {isLongImage(image) ? (
        <Badge
          className="absolute bottom-1 left-1 z-20 font-mono text-xs backdrop-blur select-none"
          variant="outline"
        >
          长图
        </Badge>
      ) : null}
    </>
  )
}

function RemainingMediaOverlay({ count }: { count: number }) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 text-2xl font-semibold text-white backdrop-grayscale"
      aria-label={`还有 ${count} 项媒体`}
    >
      +{count}
    </div>
  )
}

function LivePhotoPreview({ image, params }: { image: FeedImage; params: PhotoRenderParams }) {
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'))
    })
    return () => cancelAnimationFrame(handle)
  }, [])

  return (
    <div
      {...params.attrs}
      className={cn('relative', params.attrs.className)}
      style={params.attrs.style}
    >
      {isPlaying ? (
        <video
          key={image.livePhotoVideoUrl}
          src={image.livePhotoVideoUrl}
          poster={image.largeUrl}
          className="h-full w-full object-contain"
          autoPlay
          muted
          playsInline
          onEnded={() => setIsPlaying(false)}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
        />
      ) : (
        <img
          src={image.largeUrl}
          className="h-full w-full object-contain"
          alt=""
          width={image.width ?? 1}
          height={image.height ?? 1}
          style={{ transform: `scale(${params.scale})` }}
        />
      )}
      <Button
        type="button"
        aria-label={isPlaying ? '正在播放 Live Photo' : '重新播放 Live Photo'}
        variant="outline"
        className="absolute bottom-4 left-4 z-30 border font-mono font-medium backdrop-blur"
        size="sm"
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!isPlaying) setIsPlaying(true)
        }}
      >
        <SquarePlay className="size-3" />
        Live
      </Button>
    </div>
  )
}

function ImagePhotoView({ image, children }: { image: FeedImage; children: ReactElement }) {
  if (image.type === 'livephoto' && image.livePhotoVideoUrl) {
    return (
      <PhotoView
        width={image.width}
        height={image.height}
        render={(params) => <LivePhotoPreview image={image} params={params} />}
      >
        {children}
      </PhotoView>
    )
  }

  return <PhotoView src={image.largeUrl}>{children}</PhotoView>
}

export function MediaCollectionItemView({
  item,
  ratio,
  roundedClassName,
  horizontal,
  dimImages,
  motionEnabled,
  remainingCount,
  onActivate,
}: {
  item: MediaCollectionItem
  ratio: number
  roundedClassName: string
  horizontal: boolean
  dimImages: boolean
  motionEnabled: boolean
  remainingCount: number
  onActivate?: (item: MediaCollectionItem) => void
}) {
  if (item.kind === 'image') {
    const content = (
      <AspectRatio
        ratio={ratio}
        className={cn(
          'bg-muted relative overflow-hidden',
          horizontal && 'h-full w-full',
          mediaOutlineClassName,
          roundedClassName,
        )}
      >
        <ImageOverlay image={item.image} dim={dimImages} square={!horizontal} />
        {remainingCount > 0 ? <RemainingMediaOverlay count={remainingCount} /> : null}
      </AspectRatio>
    )

    return (
      <ImagePhotoView image={item.image}>
        {horizontal ? (
          <motion.div
            data-testid="media-strip-pressable"
            whileTap={motionEnabled ? { scale: 0.98 } : undefined}
            transition={{ type: 'spring', bounce: 0 }}
            className="relative h-full w-full"
          >
            {content}
          </motion.div>
        ) : (
          content
        )}
      </ImagePhotoView>
    )
  }

  return (
    <button
      type="button"
      data-media-video-id={item.id}
      disabled={!item.playable}
      aria-label={
        !item.playable
          ? '视频暂不可播放'
          : item.video.videoTitle
            ? `播放视频：${item.video.videoTitle}`
            : '播放视频'
      }
      className={cn(
        'block h-full w-full text-left',
        !item.playable && 'cursor-not-allowed opacity-80',
      )}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (item.playable) onActivate?.(item)
      }}
    >
      <AspectRatio
        ratio={ratio}
        className={cn(
          'bg-muted relative overflow-hidden',
          horizontal && 'h-full w-full',
          mediaOutlineClassName,
          roundedClassName,
        )}
      >
        {item.video.videoCoverUrl ? (
          <img
            src={item.video.videoCoverUrl}
            className="h-full w-full object-cover object-center"
            alt=""
            width={item.video.videoOrientation === 'vertical' ? 600 : 960}
            height={item.video.videoOrientation === 'vertical' ? 800 : 540}
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm">
            <PlayIcon className="ml-0.5 size-6 fill-current" />
          </span>
        </div>
        {remainingCount > 0 ? <RemainingMediaOverlay count={remainingCount} /> : null}
      </AspectRatio>
    </button>
  )
}
