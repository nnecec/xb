import { useCallback, useRef, useState } from 'react'

import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import type { FeedMixMediaItem } from '@/lib/weibo/models/feed'

import { InlineVideoPanel } from './inline-video-panel'
import type { MediaGalleryItem } from './media-region-model'

export function MediaRegion({
  items,
  downloadFilename,
  onOpen,
  singleMediaMaxWidth,
}: {
  items: MediaGalleryItem[]
  downloadFilename?: string
  onOpen?: () => void
  singleMediaMaxWidth?: number
}) {
  const [activeVideo, setActiveVideo] = useState<FeedMixMediaItem | null>(null)
  const stripIndexRef = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const handleStripIndexChange = useCallback((index: number) => {
    stripIndexRef.current = index
  }, [])

  const handleVideoActivate = useCallback((video: FeedMixMediaItem, index: number) => {
    stripIndexRef.current = index
    setActiveVideo(video)
  }, [])

  const handleBack = useCallback(() => {
    const videoId = activeVideo?.id
    setActiveVideo(null)
    requestAnimationFrame(() => {
      if (!videoId) return
      const triggers = rootRef.current?.querySelectorAll<HTMLElement>('[data-media-video-id]')
      const trigger = Array.from(triggers ?? []).find(
        (element) => element.dataset.mediaVideoId === videoId,
      )
      trigger?.focus()
    })
  }, [activeVideo?.id])

  return (
    <div ref={rootRef}>
      {activeVideo ? (
        <InlineVideoPanel
          video={activeVideo}
          downloadFilename={downloadFilename}
          maxWidth={singleMediaMaxWidth}
          onBack={handleBack}
        />
      ) : (
        <ImageCarousel
          images={[]}
          items={items}
          downloadFilename={downloadFilename}
          onOpen={onOpen}
          singleMediaMaxWidth={singleMediaMaxWidth}
          variant="card"
          initialStripIndex={Math.min(stripIndexRef.current, Math.max(items.length - 1, 0))}
          onStripIndexChange={handleStripIndexChange}
          onVideoActivate={handleVideoActivate}
        />
      )}
    </div>
  )
}
