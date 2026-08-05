import { DashVideo } from '@videojs/react/media/dash-video'
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video'
import { Video } from '@videojs/react/video'
import { MediaPlayer } from 'dashjs'
import type { MediaPlayerClass } from 'dashjs'
import { useEffect, useState } from 'react'
import type { PointerEventHandler, RefObject } from 'react'

import type { VideoPlaybackMode } from './use-video-playback-session'
import { OnDemandVideoPlayer } from './video-playback-context'
import { applyDashQuality, getVariantSource } from './video-playback-quality'
import type { PlayableVideoMedia, VideoPlaybackMedia } from './video-playback-types'

interface VideoPlaybackSourceProps {
  media: PlayableVideoMedia
  mediaRef: RefObject<HTMLVideoElement | null>
  qualityId: string
  shouldLoad: boolean
  onLoadedMetadata: () => void
  onPointerDownCapture: PointerEventHandler<HTMLVideoElement>
}

export function getVideoPlaybackMode(media: PlayableVideoMedia): VideoPlaybackMode {
  return media.kind
}

export function getVideoQualityOptions(media: PlayableVideoMedia) {
  if (media.kind !== 'video' || !media.dash) return []
  if (media.dash.type === 'mpd') return media.dash.qualities
  return media.dash.sources.map(({ id, label }) => ({ id, label }))
}

function DashQualityBridge({ qualityId, shouldLoad }: { qualityId: string; shouldLoad: boolean }) {
  const media = OnDemandVideoPlayer.useMedia()

  useEffect(() => {
    if (!shouldLoad || !media || !('engine' in media)) return
    const player = (media as { engine?: MediaPlayerClass }).engine
    if (!player) return

    const applyQuality = () => applyDashQuality(player, qualityId)
    try {
      player.on(MediaPlayer.events.STREAM_INITIALIZED, applyQuality)
      if (player.isReady()) applyQuality()
    } catch {
      return
    }
    return () => {
      try {
        player.off(MediaPlayer.events.STREAM_INITIALIZED, applyQuality)
      } catch {
        // The official adapter may already have destroyed its engine.
      }
    }
  }, [media, qualityId, shouldLoad])

  return null
}

function DashVideoSource({
  manifestXml,
  media,
  mediaRef,
  qualityId,
  shouldLoad,
  onLoadedMetadata,
  onPointerDownCapture,
}: VideoPlaybackSourceProps & { manifestXml: string }) {
  const [manifestUrl, setManifestUrl] = useState('')

  useEffect(() => {
    if (!shouldLoad || !manifestXml.trim()) {
      setManifestUrl('')
      return
    }

    const blob = new Blob([manifestXml], { type: 'application/dash+xml' })
    const url = URL.createObjectURL(blob)
    setManifestUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [manifestXml, shouldLoad])

  return (
    <>
      <DashVideo
        ref={mediaRef}
        src={manifestUrl}
        poster={media.poster}
        preload="none"
        playsInline
        data-xb-media-video="true"
        data-xb-media-kind="video"
        onLoadedMetadata={onLoadedMetadata}
        onPointerDownCapture={onPointerDownCapture}
      />
      <DashQualityBridge qualityId={qualityId} shouldLoad={shouldLoad} />
    </>
  )
}

export function VideoPlaybackSource({
  media,
  mediaRef,
  qualityId,
  shouldLoad,
  onLoadedMetadata,
  onPointerDownCapture,
}: VideoPlaybackSourceProps) {
  if (media.kind === 'live' || media.kind === 'replay') {
    return (
      <HlsJsVideo
        ref={mediaRef}
        src={media.src}
        poster={media.poster}
        preload={media.kind === 'live' ? 'none' : 'metadata'}
        playsInline
        streamType={media.kind === 'live' ? 'live' : 'on-demand'}
        data-xb-media-video="true"
        data-xb-media-kind={media.kind === 'live' ? 'live' : 'live-replay'}
        onLoadedMetadata={onLoadedMetadata}
        onPointerDownCapture={onPointerDownCapture}
      />
    )
  }

  if (media.dash?.type === 'mpd') {
    return (
      <DashVideoSource
        manifestXml={media.dash.manifestXml}
        media={media}
        mediaRef={mediaRef}
        qualityId={qualityId}
        shouldLoad={shouldLoad}
        onLoadedMetadata={onLoadedMetadata}
        onPointerDownCapture={onPointerDownCapture}
      />
    )
  }

  const src =
    media.dash?.type === 'playback'
      ? getVariantSource({
          fallbackSrc: media.src,
          qualityId,
          selectedIndex: media.dash.selectedIndex,
          sources: media.dash.sources,
        })
      : media.src

  return (
    <Video
      ref={mediaRef}
      src={src}
      poster={media.poster}
      preload="none"
      playsInline
      data-xb-media-video="true"
      data-xb-media-kind="video"
      onLoadedMetadata={onLoadedMetadata}
      onPointerDownCapture={onPointerDownCapture}
    />
  )
}

export function UnavailableVideoSource({
  media,
}: {
  media: Extract<VideoPlaybackMedia, { kind: 'unavailable' }>
}) {
  return (
    <Video
      src={undefined}
      poster={media.poster}
      preload="none"
      playsInline
      data-xb-media-video="true"
      data-xb-media-kind="live-unavailable"
    />
  )
}
