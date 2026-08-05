import { useIntersectionObserver, useInterval } from '@reactuses/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { useAppSettings, useShallow } from '@/lib/app-settings-store'

import { getPlaybackPositionStore } from './video-playback-position-store'
import {
  exitVideoPictureInPicture,
  registerPlayingVideo,
  unregisterPlayingVideo,
} from './video-playback-registry'
import {
  applyStoredVideoVolume,
  registerVideoVolumeElement,
  rememberVideoVolumeFromElement,
} from './video-volume-store'

export type VideoPlaybackMode = 'video' | 'replay' | 'live'

interface PlaybackContinuity {
  currentTime: number
  playbackRate: number
  shouldResume: boolean
}

interface UseVideoPlaybackSessionOptions {
  mediaRef: RefObject<HTMLVideoElement | null>
  sessionId: string
  mode: VideoPlaybackMode
  onPlay?: () => void
  onPictureInPictureChange?: (active: boolean) => void
}

function isValidDuration(video: HTMLVideoElement) {
  return Number.isFinite(video.duration) && video.duration > 0
}

function savePlaybackPosition(sessionId: string, video: HTMLVideoElement) {
  if (video.currentTime <= 1 || !isValidDuration(video)) return
  getPlaybackPositionStore().getState().savePosition(sessionId, video.currentTime, video.duration)
}

export function useVideoPlaybackSession({
  mediaRef,
  sessionId,
  mode,
  onPlay,
  onPictureInPictureChange,
}: UseVideoPlaybackSessionOptions) {
  const resumable = mode !== 'live'
  const remembersRate = mode !== 'live'
  const [shouldLoad, setShouldLoad] = useState(mode === 'replay')
  const pendingContinuityRef = useRef<PlaybackContinuity | null>(null)
  const isInPictureInPictureRef = useRef(false)
  const appliedPlaybackRateRef = useRef(false)
  const onPlayRef = useRef(onPlay)
  const onPictureInPictureChangeRef = useRef(onPictureInPictureChange)

  onPlayRef.current = onPlay
  onPictureInPictureChangeRef.current = onPictureInPictureChange

  const { rememberPlaybackRate, savedPlaybackRate, updateSettings } = useAppSettings(
    useShallow((settings) => ({
      rememberPlaybackRate: settings.rememberPlaybackRate,
      savedPlaybackRate: settings.playbackRate,
      updateSettings: settings.updateSettings,
    })),
  )
  const rememberPlaybackRateRef = useRef(rememberPlaybackRate)
  const savedPlaybackRateRef = useRef(savedPlaybackRate)
  const lastWrittenPlaybackRateRef = useRef(savedPlaybackRate)

  useEffect(() => {
    rememberPlaybackRateRef.current = rememberPlaybackRate
  }, [rememberPlaybackRate])

  useEffect(() => {
    savedPlaybackRateRef.current = savedPlaybackRate
    lastWrittenPlaybackRateRef.current = savedPlaybackRate
  }, [savedPlaybackRate])

  useEffect(() => {
    pendingContinuityRef.current = null
    appliedPlaybackRateRef.current = false
    isInPictureInPictureRef.current = false
    setShouldLoad(mode === 'replay')
  }, [mode, sessionId])

  const ensureLoaded = useCallback(() => {
    setShouldLoad(true)
  }, [])

  const requestPlay = useCallback(() => {
    ensureLoaded()
    const video = mediaRef.current
    if (!video) return
    applyStoredVideoVolume(video)
    void video.play().catch(() => {})
  }, [ensureLoaded, mediaRef])

  const prepareSourceChange = useCallback(() => {
    const video = mediaRef.current
    if (!video) return
    pendingContinuityRef.current = {
      currentTime: video.currentTime,
      playbackRate: video.playbackRate,
      shouldResume: !video.paused && !video.ended,
    }
  }, [mediaRef])

  const handleLoadedMetadata = useCallback(() => {
    const video = mediaRef.current
    if (!video) return

    applyStoredVideoVolume(video)
    if (!resumable) return

    const pendingContinuity = pendingContinuityRef.current
    if (!pendingContinuity) {
      const savedPosition = getPlaybackPositionStore().getState().getPosition(sessionId)
      if (savedPosition && savedPosition.currentTime > 1 && isValidDuration(video)) {
        const seekTo = Math.min(savedPosition.currentTime, Math.max(video.duration - 0.5, 0))
        if (seekTo > 1) video.currentTime = seekTo
      }

      if (
        remembersRate &&
        !appliedPlaybackRateRef.current &&
        rememberPlaybackRateRef.current &&
        Number.isFinite(savedPlaybackRateRef.current) &&
        savedPlaybackRateRef.current > 0
      ) {
        const target = savedPlaybackRateRef.current
        lastWrittenPlaybackRateRef.current = target
        appliedPlaybackRateRef.current = true
        video.playbackRate = target
      }
      return
    }

    if (Number.isFinite(pendingContinuity.currentTime)) {
      const latestTime = isValidDuration(video)
        ? Math.max(video.duration - 0.25, 0)
        : pendingContinuity.currentTime
      video.currentTime = Math.min(pendingContinuity.currentTime, latestTime)
    }
    if (Number.isFinite(pendingContinuity.playbackRate) && pendingContinuity.playbackRate > 0) {
      lastWrittenPlaybackRateRef.current = pendingContinuity.playbackRate
      video.playbackRate = pendingContinuity.playbackRate
    }
    if (pendingContinuity.shouldResume) {
      void video.play().catch(() => {})
    }
    pendingContinuityRef.current = null
  }, [mediaRef, remembersRate, resumable, sessionId])

  useIntersectionObserver(
    mediaRef,
    ([entry]) => {
      if (!entry) return
      const video = mediaRef.current
      if (
        video &&
        !entry.isIntersecting &&
        !video.paused &&
        !video.ended &&
        !isInPictureInPictureRef.current
      ) {
        video.pause()
      }
    },
    { threshold: 0 },
  )

  useEffect(() => {
    const video = mediaRef.current
    if (!video) return

    const unregisterVolume = registerVideoVolumeElement(video)
    const handlePlay = () => {
      setShouldLoad(true)
      registerPlayingVideo(video)
      onPlayRef.current?.()
    }
    const handlePause = () => {
      if (resumable) savePlaybackPosition(sessionId, video)
      unregisterPlayingVideo(video)
    }
    const handleEnded = () => {
      if (resumable) getPlaybackPositionStore().getState().removePosition(sessionId)
      unregisterPlayingVideo(video)
    }
    const handleVolumeChange = () => {
      rememberVideoVolumeFromElement(video)
    }
    const handleRateChange = () => {
      if (!remembersRate || !rememberPlaybackRateRef.current) return
      if (pendingContinuityRef.current) return
      const next = video.playbackRate
      if (!Number.isFinite(next) || next <= 0) return
      if (Math.abs(next - lastWrittenPlaybackRateRef.current) < 0.001) return
      lastWrittenPlaybackRateRef.current = next
      void updateSettings({ playbackRate: next })
    }
    const handleEnterPictureInPicture = () => {
      isInPictureInPictureRef.current = true
      onPictureInPictureChangeRef.current?.(true)
    }
    const handleLeavePictureInPicture = () => {
      isInPictureInPictureRef.current = false
      onPictureInPictureChangeRef.current?.(false)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('ratechange', handleRateChange)
    video.addEventListener('enterpictureinpicture', handleEnterPictureInPicture)
    video.addEventListener('leavepictureinpicture', handleLeavePictureInPicture)

    return () => {
      if (resumable) savePlaybackPosition(sessionId, video)
      unregisterPlayingVideo(video)
      unregisterVolume()
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('ratechange', handleRateChange)
      video.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture)
      video.removeEventListener('leavepictureinpicture', handleLeavePictureInPicture)
      if (!video.paused) video.pause()
      if (isInPictureInPictureRef.current) {
        isInPictureInPictureRef.current = false
        onPictureInPictureChangeRef.current?.(false)
      }
      void exitVideoPictureInPicture(video)
    }
  }, [mediaRef, remembersRate, resumable, sessionId, updateSettings])

  useInterval(() => {
    const video = mediaRef.current
    if (resumable && video && !video.paused && !video.ended) {
      savePlaybackPosition(sessionId, video)
    }
  }, 5000)

  return {
    ensureLoaded,
    handleLoadedMetadata,
    prepareSourceChange,
    requestPlay,
    shouldLoad,
  }
}
