export interface PlaybackContinuity {
  currentTime: number
  playbackRate: number
  shouldResume: boolean
}

export function isValidMediaDuration(duration: number): boolean {
  return Number.isFinite(duration) && duration > 0
}

export function capturePlaybackContinuity(video: HTMLVideoElement): PlaybackContinuity {
  return {
    currentTime: video.currentTime,
    playbackRate: video.playbackRate,
    shouldResume: !video.paused && !video.ended,
  }
}

export function restorePlaybackContinuity(
  video: HTMLVideoElement,
  continuity: PlaybackContinuity,
): boolean {
  if (Number.isFinite(continuity.currentTime)) {
    const latestTime = isValidMediaDuration(video.duration)
      ? Math.max(video.duration - 0.25, 0)
      : continuity.currentTime
    video.currentTime = Math.min(continuity.currentTime, latestTime)
  }
  if (Number.isFinite(continuity.playbackRate) && continuity.playbackRate > 0) {
    video.playbackRate = continuity.playbackRate
  }
  if (continuity.shouldResume) {
    void video.play().catch(() => {})
  }
  return true
}

export function restoreSavedPlaybackPosition(
  video: HTMLVideoElement,
  currentTime: number,
): boolean {
  if (!isValidMediaDuration(video.duration) || !Number.isFinite(currentTime) || currentTime <= 1) {
    return false
  }
  const seekTo = Math.min(currentTime, Math.max(video.duration - 0.5, 0))
  if (seekTo <= 1) return false
  video.currentTime = seekTo
  return true
}
