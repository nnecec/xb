'use client'

import '@videojs/react/video/skin.css'
import { createPlayer, Poster, videoFeatures } from '@videojs/react'
import { VideoSkin, Video } from '@videojs/react/video'

const Player = createPlayer({ features: [...videoFeatures] })

interface VideoPlayerProps {
  src: string
  poster?: string
}

export function VideoPlayer({ src, poster }: VideoPlayerProps) {
  return (
    <Player.Provider>
      <VideoSkin>
        <Video src={src} playsInline />
        <Poster src={poster} />
      </VideoSkin>
    </Player.Provider>
  )
}
