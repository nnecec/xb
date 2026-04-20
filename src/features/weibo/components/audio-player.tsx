'use client'

import { createPlayer } from '@videojs/react'
import { Audio, AudioSkin, audioFeatures } from '@videojs/react/audio'

import '@videojs/react/audio/skin.css'

interface AudioPlayerProps {
  src: string
}

const AudioPlayer = createPlayer({ features: audioFeatures })

export function AudioPlayerComponent({ src }: AudioPlayerProps) {
  return (
    <AudioPlayer.Provider>
      <AudioPlayer.Container className="media-default-skin media-default-skin--audio">
        <Audio src={src} preload="metadata" />
        <AudioSkin />
      </AudioPlayer.Container>
    </AudioPlayer.Provider>
  )
}
