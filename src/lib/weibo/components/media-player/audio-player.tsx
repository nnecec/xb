'use client'

import { Container, createPlayer } from '@videojs/react'
import { Audio, AudioSkin, audioFeatures } from '@videojs/react/audio'

import '@videojs/react/audio/skin.css'

interface AudioPlayerProps {
  src: string
}

const AudioPlayer = createPlayer({ features: audioFeatures })

export function AudioPlayerComponent({ src }: AudioPlayerProps) {
  return (
    <AudioPlayer.Player>
      <Container className="media-default-skin media-default-skin--audio">
        {/* data-xb-media-* 用于外部脚本(如全局播放协调、shadow-root 查询)定位本扩展挂载的媒体元素 */}
        <Audio src={src} preload="metadata" data-xb-media-audio="true" data-xb-media-kind="audio" />
        <AudioSkin />
      </Container>
    </AudioPlayer.Player>
  )
}
