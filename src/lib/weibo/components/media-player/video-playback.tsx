'use client'

import { Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { sanitizeFilename } from '@/lib/weibo/utils/filename'

import { useInlineFullscreen } from './inline-fullscreen'
import { useVideoPlaybackSession } from './use-video-playback-session'
import { LiveVideoPlayer, OnDemandVideoPlayer } from './video-playback-context'
import { AUTO_QUALITY_ID } from './video-playback-quality'
import {
  getVideoPlaybackMode,
  getVideoQualityOptions,
  UnavailableVideoSource,
  VideoPlaybackSource,
} from './video-playback-source'
import type { PlayableVideoMedia, VideoPlaybackMedia } from './video-playback-types'
import { VideoPlayerSkin } from './video-player-skin'

import '@videojs/react/video/skin.css'
import './video-player.css'

interface VideoDownloadAction {
  url: string
  filename?: string
}

interface VideoPlaybackProps {
  media: VideoPlaybackMedia
  hideInlineFullscreen?: boolean
  download?: VideoDownloadAction
  onPlay?: () => void
  onPictureInPictureChange?: (active: boolean) => void
}

function LiveOverlay({ onLoad, onPlay }: { onLoad: () => void; onPlay: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <button
        type="button"
        className="group flex items-center justify-center"
        onPointerDown={onLoad}
        onClick={onPlay}
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.96] [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02]">
          <Play className="ml-1 size-7 fill-current text-black" />
        </div>
      </button>
    </div>
  )
}

function useVideoDownload(download?: VideoDownloadAction) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!download || downloading) return

    setDownloading(true)
    const name = download.filename
      ? `${sanitizeFilename(download.filename)}.mp4`
      : 'weibo_video.mp4'
    toast.info(`准备下载：${name}`)
    try {
      if (import.meta.env.FIREFOX) {
        const anchor = document.createElement('a')
        anchor.href = download.url
        anchor.download = name
        anchor.target = '_blank'
        anchor.rel = 'noopener'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        toast.success(`视频已下载：${name}`)
        return
      }

      const response = await fetch(download.url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blobUrl = URL.createObjectURL(await response.blob())
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = name
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(blobUrl)
      toast.success(`视频已下载：${name}`)
    } catch {
      toast.error('视频下载失败，请稍后再试')
    } finally {
      setDownloading(false)
    }
  }, [download, downloading])

  return download
    ? {
        loading: downloading,
        onSelect: () => void handleDownload(),
      }
    : undefined
}

function PlayableVideoPlayback({
  media,
  hideInlineFullscreen,
  download,
  onPlay,
  onPictureInPictureChange,
}: Omit<VideoPlaybackProps, 'media'> & { media: PlayableVideoMedia }) {
  const mediaRef = useRef<HTMLVideoElement>(null)
  const [qualityId, setQualityId] = useState(AUTO_QUALITY_ID)
  const [inlineFullscreen, setInlineFullscreen] = useState(false)
  const mode = getVideoPlaybackMode(media)
  const session = useVideoPlaybackSession({
    mediaRef,
    sessionId: media.sessionId,
    mode,
    onPlay,
    onPictureInPictureChange,
  })
  const downloadAction = useVideoDownload(download)
  const qualityOptions = getVideoQualityOptions(media)

  useEffect(() => {
    setQualityId(AUTO_QUALITY_ID)
  }, [media.sessionId])

  useInlineFullscreen(mediaRef, inlineFullscreen, () => setInlineFullscreen(false))

  const handleQualityChange = useCallback(
    (nextQualityId: string) => {
      if (nextQualityId === qualityId) return
      if (media.kind === 'video' && media.dash?.type === 'playback' && session.shouldLoad) {
        session.prepareSourceChange()
      }
      setQualityId(nextQualityId)
    },
    [media, qualityId, session],
  )

  return (
    <VideoPlayerSkin
      mode={mode}
      controlsVisible={mode !== 'live' || session.shouldLoad}
      centerPlayVisible={mode === 'video'}
      quality={
        qualityOptions.length > 0
          ? {
              value: qualityId,
              options: qualityOptions,
              disabled: !session.shouldLoad,
              onValueChange: handleQualityChange,
            }
          : undefined
      }
      download={downloadAction}
      inlineFullscreen={
        hideInlineFullscreen
          ? undefined
          : {
              active: inlineFullscreen,
              onToggle: () => setInlineFullscreen((active) => !active),
            }
      }
      onRetry={() => mediaRef.current?.load()}
    >
      <VideoPlaybackSource
        media={media}
        mediaRef={mediaRef}
        qualityId={qualityId}
        shouldLoad={session.shouldLoad}
        onLoadedMetadata={session.handleLoadedMetadata}
        onPointerDownCapture={session.ensureLoaded}
      />
      {mode === 'live' && !session.shouldLoad ? (
        <LiveOverlay onLoad={session.ensureLoaded} onPlay={session.requestPlay} />
      ) : null}
    </VideoPlayerSkin>
  )
}

function VideoPlaybackContent(props: VideoPlaybackProps) {
  if (props.media.kind === 'unavailable') {
    return (
      <VideoPlayerSkin
        mode="live"
        controlsVisible={false}
        centerPlayVisible={false}
        interactive={false}
      >
        <UnavailableVideoSource media={props.media} />
      </VideoPlayerSkin>
    )
  }

  return <PlayableVideoPlayback {...props} media={props.media} />
}

export function VideoPlayback(props: VideoPlaybackProps) {
  const PlayerProvider =
    props.media.kind === 'live' ? LiveVideoPlayer.Provider : OnDemandVideoPlayer.Provider

  return (
    <div className="relative h-full w-full">
      <PlayerProvider key={`${props.media.kind}:${props.media.sessionId}`}>
        <VideoPlaybackContent {...props} />
      </PlayerProvider>
    </div>
  )
}
