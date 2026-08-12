import type { MediaPlayerClass } from 'dashjs'
import { describe, expect, it, vi } from 'vitest'

import { applyDashQuality, getPreferredQualityId } from './video-playback-quality'

const options = [
  { id: '1080p', label: '超清', preferenceKey: '1080p' },
  { id: '720p', label: '高清', preferenceKey: '720p' },
  { id: '360p', label: '流畅', preferenceKey: '360p' },
]

describe('getPreferredQualityId', () => {
  it('defaults to the highest available quality', () => {
    expect(getPreferredQualityId(options, null)).toBe('1080p')
  })

  it('uses a remembered quality when the current video provides it', () => {
    expect(getPreferredQualityId(options, '720p')).toBe('720p')
  })

  it('falls back to the highest available quality without replacing the preference', () => {
    expect(getPreferredQualityId(options, '4k')).toBe('1080p')
  })
})

describe('applyDashQuality', () => {
  it('switches the DASH video representation selected from the quality menu', () => {
    const updateSettings = vi.fn()
    const setRepresentationForTypeById = vi.fn()
    const player = {
      getRepresentationsByType: vi.fn(() => [{ id: 'dash_2160p60' }, { id: 'dash_720p' }]),
      setRepresentationForTypeById,
      updateSettings,
    } as unknown as MediaPlayerClass

    applyDashQuality(player, 'dash_720p')

    expect(updateSettings).toHaveBeenCalledWith({
      streaming: {
        abr: { autoSwitchBitrate: { video: false, audio: true } },
      },
    })
    expect(setRepresentationForTypeById).toHaveBeenCalledWith('video', 'dash_720p', true)
  })

  it('falls back to adaptive quality when the remembered resolution is unavailable', () => {
    const updateSettings = vi.fn()
    const player = {
      getRepresentationsByType: vi.fn(() => [{ id: 'dash_720p' }]),
      setRepresentationForTypeById: vi.fn(),
      updateSettings,
    } as unknown as MediaPlayerClass

    applyDashQuality(player, 'dash_2160p60')

    expect(updateSettings).toHaveBeenCalledWith({
      streaming: {
        abr: { autoSwitchBitrate: { video: true, audio: true } },
      },
    })
  })
})
