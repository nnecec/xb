import { afterEach, describe, expect, it, vi } from 'vitest'

import { exitVideoPictureInPicture } from './video-playback-registry'

describe('exitVideoPictureInPicture', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('finds a picture-in-picture video inside the extension shadow root', async () => {
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const video = document.createElement('video')
    shadowRoot.append(video)
    document.body.append(host)

    Object.defineProperty(shadowRoot, 'pictureInPictureElement', {
      configurable: true,
      value: video,
    })
    const exitPictureInPicture = vi.fn(async () => {})
    Object.defineProperty(document, 'exitPictureInPicture', {
      configurable: true,
      value: exitPictureInPicture,
    })

    await exitVideoPictureInPicture(video)

    expect(exitPictureInPicture).toHaveBeenCalledTimes(1)
    host.remove()
  })
})
