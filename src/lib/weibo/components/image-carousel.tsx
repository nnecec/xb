import { PlayIcon } from 'lucide-react'
import React, { memo } from 'react'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import type { PhotoRenderParams } from 'react-photo-view/dist/types'

import 'react-photo-view/dist/react-photo-view.css'
import { getUiPortalContainer } from '@/components/ui/portal'
import { useAppSettings } from '@/lib/app-settings-store'
import type { FeedMixMediaItem } from '@/lib/weibo/models/feed'

import { VideoPlayer } from './media-player/video-player'

interface ImageCarouselProps {
  images: { id: string; thumbnailUrl: string; largeUrl: string }[]
  mixMediaItems?: FeedMixMediaItem[]
  onOpen?: () => void
}

export const ImageCarousel = memo(function ImageCarousel({
  images,
  mixMediaItems,
  onOpen,
}: ImageCarouselProps) {
  const container = React.useMemo(() => getUiPortalContainer(), [])
  const darkModeImageDim = useAppSettings((s) => s.darkModeImageDim)

  const gridItems = React.useMemo(() => {
    const items: Array<{
      id: string
      src: string | null
      thumbnailNode: React.ReactElement
      render: (props: PhotoRenderParams) => React.ReactNode
      width?: number
      height?: number
    }> = []

    for (const img of images) {
      items.push({
        id: img.id,
        src: img.largeUrl,
        thumbnailNode: (
          <div className="border-foreground/10 relative overflow-hidden rounded-xl border">
            {darkModeImageDim && (
              <div className="dark:bg-background/25 absolute top-0 right-0 bottom-0 left-0" />
            )}
            <img
              src={img.thumbnailUrl}
              className="aspect-square w-full object-cover object-center"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        ),
        render: ({ attrs, scale }) => (
          <div {...attrs} style={attrs.style}>
            <img
              src={img.largeUrl}
              className="h-full w-full object-contain"
              alt=""
              style={{ transform: `scale(${scale})` }}
            />
          </div>
        ),
      })
    }

    if (mixMediaItems) {
      for (const item of mixMediaItems) {
        if (item.type === 'pic' && item.image) {
          const image = item.image
          items.push({
            id: item.id,
            src: image.largeUrl,
            width: 640,
            thumbnailNode: (
              <div className="border-foreground/10 relative overflow-hidden rounded-xl border">
                {darkModeImageDim && (
                  <div className="dark:bg-background/25 absolute top-0 right-0 bottom-0 left-0" />
                )}
                <img
                  src={image.thumbnailUrl}
                  className="aspect-square w-full object-cover object-center"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ),
            render: ({ attrs, scale }) => (
              <div {...attrs} style={attrs.style}>
                <img
                  src={image.largeUrl}
                  className="h-full w-full object-contain"
                  alt=""
                  style={{ transform: `scale(${scale})` }}
                />
              </div>
            ),
          })
        } else if (item.type === 'video') {
          items.push({
            id: item.id,
            src: null,
            thumbnailNode: item.videoCoverUrl ? (
              <div className="border-foreground/10 relative overflow-hidden rounded-xl border">
                <PlayIcon className="absolute top-1/2 left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-white" />
                <img
                  src={item.videoCoverUrl}
                  className="aspect-square w-full object-cover object-center"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="border-foreground/10 aspect-square w-full overflow-hidden rounded-xl border" />
            ),
            render: ({ attrs }) => {
              return (
                <div
                  {...attrs}
                  className="flex h-full w-full items-center justify-center"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <VideoPlayer
                    progressiveSrc={item.videoStreamUrl ?? ''}
                    poster={item.videoCoverUrl}
                    dash={item.videoDash}
                    videoOrientation={item.videoOrientation}
                    hideInlineFullScreen={true}
                    downloadUrl={item.videoDownloadUrl}
                    downloadFilename="weibo_video"
                  />
                </div>
              )
            },
            width: item.videoOrientation === 'vertical' ? 600 : 800,
            height: item.videoOrientation === 'vertical' ? 800 : 450,
          })
        }
      }
    }

    return items
  }, [images, mixMediaItems, darkModeImageDim])

  if (gridItems.length === 0) {
    return null
  }

  return (
    <div>
      <PhotoProvider
        portalContainer={container}
        photoClosable={true}
        photoClassName="max-w-[900px]"
        onVisibleChange={(visible) => {
          if (visible) onOpen?.()
        }}
      >
        <div
          className={`grid gap-2 ${
            gridItems.length === 3
              ? 'grid-cols-3'
              : gridItems.length <= 4
                ? 'grid-cols-2'
                : gridItems.length <= 9
                  ? 'grid-cols-3'
                  : 'grid-cols-4'
          }`}
        >
          {gridItems.map((item) => (
            <div key={item.id} onClick={(event) => event.stopPropagation()}>
              {item.src ? (
                <PhotoView key={item.id} src={item.src} render={item.render}>
                  {item.thumbnailNode}
                </PhotoView>
              ) : (
                <PhotoView
                  key={item.id}
                  render={item.render}
                  width={item.width}
                  height={item.height}
                >
                  {item.thumbnailNode}
                </PhotoView>
              )}
            </div>
          ))}
        </div>
      </PhotoProvider>
    </div>
  )
})
