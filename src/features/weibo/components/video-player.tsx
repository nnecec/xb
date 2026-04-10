'use client'

import { createPlayer } from '@videojs/react'
import { MinimalVideoSkin, Video, videoFeatures } from '@videojs/react/video'

import '@videojs/react/video/minimal-skin.css'

const Player = createPlayer({ features: [...videoFeatures] })

interface VideoPlayerProps {
  src: string
  poster?: string
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <Player.Provider>
      <MinimalVideoSkin poster={poster}>
        <Video src={src} playsInline />
      </MinimalVideoSkin>
    </Player.Provider>
  )
}
