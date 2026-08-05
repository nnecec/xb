import { createPlayer } from '@videojs/react'
import { liveVideoFeatures } from '@videojs/react/live-video'
import { videoFeatures } from '@videojs/react/video'

export const OnDemandVideoPlayer = createPlayer({
  features: [...videoFeatures],
  displayName: 'OnDemandVideoPlayer',
})

export const LiveVideoPlayer = createPlayer({
  features: [...liveVideoFeatures],
  displayName: 'LiveVideoPlayer',
})
