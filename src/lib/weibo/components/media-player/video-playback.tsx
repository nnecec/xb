'use client'

import { Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { sanitizeFilename } from '@/lib/weibo/utils/filename'

import { useInlineFullscreen } from './inline-fullscreen'
import { useVideoPlaybackSession } from './use-video-playback-session'
import { LiveVideoPlayer, OnDemandVideoPlayer } from './video-playback-context'
import { getPreferredQualityId } from './video-playback-quality'
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

interface MediaFetchResponse {
  ok: boolean
  data?: string
  contentType?: string
  error?: string
}

function base64ToBlob(data: string, contentType = 'video/mp4') {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: contentType })
}

export async function fetchVideoBlob(url: string) {
  let directFetchError: unknown
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.blob()
  } catch (error) {
    directFetchError = error
  }

  if (typeof browser !== 'undefined' && browser.runtime?.sendMessage) {
    const response = (await browser.runtime.sendMessage({
      type: 'media-fetch',
      url,
    })) as MediaFetchResponse
    if (!response.ok || !response.data) {
      throw new Error(response.error || '视频下载失败')
    }
    return base64ToBlob(response.data, response.contentType)
  }

  throw directFetchError instanceof Error ? directFetchError : new Error('视频下载失败')
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

interface VideoDownloadOption extends VideoDownloadAction {
  id: string
  label: string
}

function useVideoDownload(options: VideoDownloadOption[]) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownload = useCallback(
    async (download: VideoDownloadOption) => {
      if (downloadingId) return

      setDownloadingId(download.id)
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

        const blobUrl = URL.createObjectURL(await fetchVideoBlob(download.url))
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
        setDownloadingId(null)
      }
    },
    [downloadingId],
  )

  return options.length > 0
    ? {
        options: options.map((option) => ({
          id: option.id,
          label: option.label,
          loading: option.id === downloadingId,
        })),
        onSelect: (id: string) => {
          const option = options.find((candidate) => candidate.id === id)
          if (option) void handleDownload(option)
        },
      }
    : undefined
}

function getVideoDownloadOptions(
  media: PlayableVideoMedia,
  download?: VideoDownloadAction,
): VideoDownloadOption[] {
  if (media.kind !== 'video') {
    return download ? [{ id: 'source', label: '完整视频', ...download }] : []
  }

  if (media.dash?.type === 'playback') {
    return media.dash.sources.map((source) => ({
      id: source.id,
      label: source.label,
      url: source.url,
      filename: download?.filename ? `${download.filename}-${source.label}` : source.label,
    }))
  }

  return download ? [{ id: 'source', label: '720p 完整视频', ...download }] : []
}

function PlayableVideoPlayback({
  media,
  hideInlineFullscreen,
  download,
  onPlay,
  onPictureInPictureChange,
}: Omit<VideoPlaybackProps, 'media'> & { media: PlayableVideoMedia }) {
  const mediaRef = useRef<HTMLVideoElement>(null)
  const [qualityId, setQualityId] = useState<string | null>(null)
  const [inlineFullscreen, setInlineFullscreen] = useState(false)
  const mode = getVideoPlaybackMode(media)
  const session = useVideoPlaybackSession({
    mediaRef,
    sessionId: media.sessionId,
    mode,
    onPlay,
    onPictureInPictureChange,
  })
  const qualityOptions = getVideoQualityOptions(media)
  const { videoQualityPreference, updateSettings } = useAppSettings(
    useShallow((settings) => ({
      videoQualityPreference: settings.videoQualityPreference,
      updateSettings: settings.updateSettings,
    })),
  )
  const resolvedQualityId =
    qualityId ?? getPreferredQualityId(qualityOptions, videoQualityPreference)
  const downloadAction = useVideoDownload(getVideoDownloadOptions(media, download))

  useEffect(() => {
    setQualityId(null)
  }, [media.sessionId, videoQualityPreference])

  useInlineFullscreen(mediaRef, inlineFullscreen, () => setInlineFullscreen(false))

  const handleQualityChange = useCallback(
    (nextQualityId: string) => {
      if (nextQualityId === resolvedQualityId) return
      if (media.kind === 'video' && media.dash?.type === 'playback' && session.shouldLoad) {
        session.prepareSourceChange()
      }
      setQualityId(nextQualityId)
      const option = qualityOptions.find((candidate) => candidate.id === nextQualityId)
      if (option) void updateSettings({ videoQualityPreference: option.preferenceKey })
    },
    [media, qualityOptions, resolvedQualityId, session, updateSettings],
  )

  return (
    <VideoPlayerSkin
      mode={mode}
      controlsVisible={mode !== 'live' || session.shouldLoad}
      centerPlayVisible={mode === 'video'}
      quality={
        qualityOptions.length > 0
          ? {
              value: resolvedQualityId,
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
        qualityId={resolvedQualityId}
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
