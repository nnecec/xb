import { describe, expect, it } from 'vitest'

import {
  backToMediaRegionOverview,
  createMediaRegionFocus,
  focusMediaRegionAsset,
  rememberMediaRegionOverviewAsset,
  setMediaRegionPictureInPicture,
} from '@/lib/weibo/components/media-region/media-region-focus'

describe('媒体焦点', () => {
  it('选中视频后总览让位，返回后回到原来的位置', () => {
    const focused = focusMediaRegionAsset(
      rememberMediaRegionOverviewAsset(createMediaRegionFocus(), 'image-2'),
      'video-1',
    )

    expect(focused.showsOverview).toBe(false)
    expect(focused.focusedAssetId).toBe('video-1')

    const back = backToMediaRegionOverview(focused)
    expect(back.showsOverview).toBe(true)
    expect(back.focusedAssetId).toBeNull()
    expect(back.retainsPlayback).toBe(false)
    expect(back.overviewAssetId).toBe('image-2')
  })

  it('画中画返回后保留播放，退出画中画后卸下', () => {
    const focused = setMediaRegionPictureInPicture(
      focusMediaRegionAsset(createMediaRegionFocus(), 'video-1'),
      true,
    )
    const back = backToMediaRegionOverview(focused)

    expect(back.showsOverview).toBe(true)
    expect(back.focusedAssetId).toBe('video-1')
    expect(back.retainsPlayback).toBe(true)

    const exited = setMediaRegionPictureInPicture(back, false)
    expect(exited.focusedAssetId).toBeNull()
    expect(exited.retainsPlayback).toBe(false)
    expect(exited.showsOverview).toBe(true)
  })
})
