import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { CollapsibleMedia } from '@/lib/weibo/components/collapsible-media'
import { MediaCollection, type MediaCollectionItem } from '@/lib/weibo/components/media-collection'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'
import type { FeedItem, FeedMedia } from '@/lib/weibo/models/feed'

import { AudioPlayerComponent } from '../media-player/audio-player'
import { VideoPlayback } from '../media-player/video-playback'
import { InlineVideoPanel } from './inline-video-panel'
import {
  buildMediaRegionModel,
  getMediaRegionCollapseType,
  type MediaAsset,
} from './media-region-model'

type MediaRegionItem = FeedItem | NonNullable<FeedItem['retweetedStatus']>
type VideoCollectionItem = Extract<MediaCollectionItem, { kind: 'video' }>

function StandaloneMedia({
  item,
  media,
  downloadFilename,
  maxWidth,
  onOpen,
}: {
  item: MediaRegionItem
  media: FeedMedia
  downloadFilename?: string
  maxWidth?: number
  onOpen?: () => void
}) {
  const handlePlay = useCallback(() => {
    if (onOpen) onOpen()
    else browsingHistoryStore.getState().addEntry(item)
  }, [item, onOpen])

  if (media.type === 'audio' || media.type === 'podcast_audio') {
    return (
      <div onClick={(event) => event.stopPropagation()}>
        <AudioPlayerComponent src={media.streamUrl} />
      </div>
    )
  }

  if (media.type === 'live') {
    const playbackMedia =
      media.liveStatus === 1
        ? {
            kind: 'live' as const,
            sessionId: `${item.id}:live`,
            src: media.streamUrl,
            poster: media.coverUrl ?? undefined,
          }
        : media.liveStatus === 3
          ? {
              kind: 'replay' as const,
              sessionId: `${item.id}:replay`,
              src: media.replayUrl ?? '',
              poster: media.coverUrl ?? undefined,
            }
          : {
              kind: 'unavailable' as const,
              sessionId: `${item.id}:live-unavailable`,
              poster: media.coverUrl ?? undefined,
            }

    return (
      <div onClick={(event) => event.stopPropagation()}>
        <AspectRatio
          ratio={16 / 9}
          className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        >
          <VideoPlayback media={playbackMedia} onPlay={handlePlay} />
        </AspectRatio>
      </div>
    )
  }

  return (
    <div
      className="w-full"
      style={maxWidth === undefined ? undefined : { maxWidth: `${maxWidth}px` }}
      onClick={(event) => event.stopPropagation()}
    >
      <AspectRatio
        ratio={media.videoOrientation === 'vertical' ? 4 / 3 : 16 / 9}
        className="overflow-hidden rounded-xl outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
      >
        <VideoPlayback
          media={{
            kind: 'video',
            sessionId: `${item.id}:video`,
            src: media.streamUrl,
            poster: media.coverUrl ?? undefined,
            dash: media.dash,
          }}
          download={
            media.downloadUrl ? { url: media.downloadUrl, filename: downloadFilename } : undefined
          }
          onPlay={handlePlay}
        />
      </AspectRatio>
    </div>
  )
}

export function MediaRegion({
  item,
  downloadFilename,
  onOpen,
}: {
  item: MediaRegionItem
  downloadFilename?: string
  onOpen?: () => void
}) {
  const { collapsedMediaTypes, singleImageMaxWidth, singleVideoMaxWidth } = useAppSettings(
    useShallow((settings) => ({
      collapsedMediaTypes: settings.weiboCardCollapsedMediaTypes,
      singleImageMaxWidth: settings.weiboCardSingleImageMaxWidth,
      singleVideoMaxWidth: settings.weiboCardSingleVideoMaxWidth,
    })),
  )
  const region = useMemo(
    () => buildMediaRegionModel(item, { singleImageMaxWidth, singleVideoMaxWidth }),
    [item, singleImageMaxWidth, singleVideoMaxWidth],
  )
  const [activeVideo, setActiveVideo] = useState<VideoCollectionItem | null>(null)
  const [focusedViewVisible, setFocusedViewVisible] = useState(false)
  const focusedViewVisibleRef = useRef(false)
  const pictureInPictureActiveRef = useRef(false)
  const visibleItemIdRef = useRef<string | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveVideo(null)
    setFocusedViewVisible(false)
    focusedViewVisibleRef.current = false
    pictureInPictureActiveRef.current = false
    visibleItemIdRef.current = undefined
  }, [region?.key])

  const handleVisibleItemChange = useCallback((itemId: string) => {
    visibleItemIdRef.current = itemId
  }, [])

  const handleItemActivate = useCallback((mediaItem: MediaCollectionItem) => {
    if (mediaItem.kind !== 'video' || !mediaItem.playable) return
    visibleItemIdRef.current = mediaItem.id
    setActiveVideo(mediaItem)
    focusedViewVisibleRef.current = true
    setFocusedViewVisible(true)
  }, [])

  const handleBack = useCallback(() => {
    const videoId = activeVideo?.id
    focusedViewVisibleRef.current = false
    setFocusedViewVisible(false)
    if (!pictureInPictureActiveRef.current) setActiveVideo(null)
    requestAnimationFrame(() => {
      if (!videoId) return
      const triggers = rootRef.current?.querySelectorAll<HTMLElement>('[data-media-video-id]')
      const trigger = Array.from(triggers ?? []).find(
        (element) => element.dataset.mediaVideoId === videoId,
      )
      trigger?.focus()
    })
  }, [activeVideo?.id])

  const handlePictureInPictureChange = useCallback((active: boolean) => {
    pictureInPictureActiveRef.current = active
    if (!active && !focusedViewVisibleRef.current) setActiveVideo(null)
  }, [])

  if (!region) return null

  const collapseType = getMediaRegionCollapseType(region)
  const display =
    collapseType && collapsedMediaTypes.includes(collapseType) ? 'collapsed' : 'expanded'

  const galleryItems = region.assets.filter(
    (asset): asset is MediaCollectionItem => asset.kind === 'image' || asset.kind === 'video',
  )
  const standaloneAssets = region.assets.filter(
    (asset): asset is Extract<MediaAsset, { kind: 'standalone' }> => asset.kind === 'standalone',
  )
  const singleVideo =
    region.assets.length === 1 && region.assets[0]?.kind === 'video' ? region.assets[0] : null

  return (
    <CollapsibleMedia display={display} summary={region.summary}>
      <div ref={rootRef} data-media-region={region.key}>
        {singleVideo?.playable ? (
          <InlineVideoPanel
            video={singleVideo.video}
            sessionId={`${item.id}:${singleVideo.id}:video`}
            downloadFilename={downloadFilename}
            maxWidth={region.singleMediaMaxWidth}
            onPlay={onOpen}
          />
        ) : (
          <>
            {activeVideo ? (
              <div
                className={
                  focusedViewVisible
                    ? undefined
                    : 'pointer-events-none absolute size-px overflow-hidden opacity-0'
                }
                aria-hidden={focusedViewVisible ? undefined : true}
                data-media-playback-retained={focusedViewVisible ? undefined : ''}
              >
                <InlineVideoPanel
                  video={activeVideo.video}
                  sessionId={`${item.id}:${activeVideo.id}:video`}
                  downloadFilename={downloadFilename}
                  maxWidth={region.singleMediaMaxWidth}
                  onBack={handleBack}
                  onPictureInPictureChange={handlePictureInPictureChange}
                />
              </div>
            ) : null}
            {!focusedViewVisible ? (
              <div className="flex flex-col gap-2">
                {standaloneAssets.map((asset) => (
                  <StandaloneMedia
                    key={asset.id}
                    item={item}
                    media={asset.media}
                    downloadFilename={downloadFilename}
                    maxWidth={region.singleMediaMaxWidth}
                    onOpen={onOpen}
                  />
                ))}
                {galleryItems.length > 0 ? (
                  <MediaCollection
                    items={galleryItems}
                    onOpen={onOpen}
                    singleMediaMaxWidth={region.singleMediaMaxWidth}
                    presentation="card"
                    initialItemId={visibleItemIdRef.current}
                    onVisibleItemChange={handleVisibleItemChange}
                    onItemActivate={handleItemActivate}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </CollapsibleMedia>
  )
}
