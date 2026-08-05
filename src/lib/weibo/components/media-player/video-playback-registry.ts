/**
 * Global registry that ensures only one video plays at a time.
 *
 * When a video starts playing, any previously-playing video is paused
 * and exits Picture-in-Picture mode (if active).
 */
let playingVideo: HTMLVideoElement | null = null

export function registerPlayingVideo(video: HTMLVideoElement): void {
  if (playingVideo === video) return

  const previous = playingVideo
  playingVideo = video

  if (previous) {
    void exitVideoPictureInPicture(previous)
    previous.pause()
  }
}

export function unregisterPlayingVideo(video: HTMLVideoElement): void {
  if (playingVideo === video) {
    playingVideo = null
  }
}

export async function exitVideoPictureInPicture(video: HTMLVideoElement): Promise<void> {
  try {
    const root = video.getRootNode() as
      | Document
      | (ShadowRoot & {
          pictureInPictureElement?: Element | null
        })
    const rootPictureInPictureElement =
      'pictureInPictureElement' in root ? root.pictureInPictureElement : null
    const pictureInPictureElement = rootPictureInPictureElement ?? document.pictureInPictureElement

    if (pictureInPictureElement === video && typeof document.exitPictureInPicture === 'function') {
      await document.exitPictureInPicture()
    }
  } catch {
    // ignore PiP exit failures
  }
}
