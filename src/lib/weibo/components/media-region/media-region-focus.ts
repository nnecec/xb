export interface MediaRegionFocus {
  focusedAssetId: string | null
  showsOverview: boolean
  retainsPlayback: boolean
  overviewAssetId: string | null
}

export function createMediaRegionFocus(): MediaRegionFocus {
  return {
    focusedAssetId: null,
    showsOverview: true,
    retainsPlayback: false,
    overviewAssetId: null,
  }
}

export function rememberMediaRegionOverviewAsset(
  focus: MediaRegionFocus,
  assetId: string,
): MediaRegionFocus {
  return { ...focus, overviewAssetId: assetId }
}

export function focusMediaRegionAsset(focus: MediaRegionFocus, assetId: string): MediaRegionFocus {
  return {
    ...focus,
    focusedAssetId: assetId,
    showsOverview: false,
  }
}

export function backToMediaRegionOverview(focus: MediaRegionFocus): MediaRegionFocus {
  return {
    ...focus,
    showsOverview: true,
    focusedAssetId: focus.retainsPlayback ? focus.focusedAssetId : null,
  }
}

export function setMediaRegionPictureInPicture(
  focus: MediaRegionFocus,
  active: boolean,
): MediaRegionFocus {
  if (active) return { ...focus, retainsPlayback: true }
  return {
    ...focus,
    retainsPlayback: false,
    focusedAssetId: focus.showsOverview ? null : focus.focusedAssetId,
  }
}
