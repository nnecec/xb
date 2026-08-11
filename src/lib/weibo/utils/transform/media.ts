/**
 * Media transformation utilities for Weibo data.
 * Handles video, audio, and live stream media conversion.
 */

import type { FeedDashQuality, FeedDashSource, FeedMixMediaItem } from '@/lib/weibo/models/feed'

import { pickNonEmptyUrl, uniqueNonEmptyUrls } from './helpers'
import { toImagesFromParts } from './images'
import type { WeiboMediaInfo, WeiboStatus } from './types'

/**
 * Gets MPD XML from media info.
 */
function getMpdXml(mediaInfo: WeiboMediaInfo | undefined): string | undefined {
  const raw = mediaInfo?.mpdInfo?.mpdcontent ?? mediaInfo?.mpdInfo?.mpdContent
  const xml = typeof raw === 'string' ? raw.trim() : ''
  return xml || undefined
}

/**
 * Checks if playback item is audio.
 */
function isPlaybackAudioItem(item: NonNullable<WeiboMediaInfo['playback_list']>[number]): boolean {
  const t = item.meta?.type ?? item.play_info?.type
  return t === 2
}

/**
 * Checks if playback item is DASH.
 */
function isPlaybackDashItem(item: NonNullable<WeiboMediaInfo['playback_list']>[number]): boolean {
  return item.play_info?.protocol?.toLowerCase() === 'dash'
}

/**
 * Gets best progressive URL from playback list.
 */
function bestProgressiveFromPlaybackList(mediaInfo: WeiboMediaInfo): string | undefined {
  if (!Array.isArray(mediaInfo.playback_list)) {
    return undefined
  }

  const candidates = mediaInfo.playback_list
    .filter((item) => !isPlaybackAudioItem(item))
    .filter((item) => !isPlaybackDashItem(item))
    .map((item) => ({
      q: Number(item.meta?.quality_index ?? -1),
      url: pickNonEmptyUrl(item.play_info?.url),
    }))
    .filter((item): item is { q: number; url: string } => Boolean(item.url))

  if (candidates.length === 0) {
    return undefined
  }

  candidates.sort((a, b) => b.q - a.q)
  return candidates[0]?.url
}

/**
 * Gets DASH qualities from playback list.
 */
function dashQualitiesFromPlaybackList(mediaInfo: WeiboMediaInfo): FeedDashQuality[] {
  if (!Array.isArray(mediaInfo.playback_list)) {
    return []
  }

  type Row = { id: string; label: string; q: number }
  const rows: Row[] = []

  for (const item of mediaInfo.playback_list) {
    if (isPlaybackAudioItem(item) || !isPlaybackDashItem(item) || item.meta?.is_hidden) {
      continue
    }
    const id = (item.meta?.label ?? item.play_info?.label)?.trim()
    const url = pickNonEmptyUrl(item.play_info?.url)
    if (!id || !url) {
      continue
    }
    const label = (item.meta?.quality_label ?? id).trim()
    const q = Number(item.meta?.quality_index ?? -1)
    rows.push({ id, label, q })
  }

  rows.sort((a, b) => b.q - a.q)

  const seen = new Set<string>()
  const out: FeedDashQuality[] = []
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue
    }
    seen.add(row.id)
    out.push({ id: row.id, label: row.label })
  }

  return out
}

/**
 * Checks if MPD has audio adaptation.
 */
function hasAudioAdaptationInMpd(xml: string): boolean {
  return (
    /<AdaptationSet\b[^>]*\bmimeType="audio\//i.test(xml) ||
    /<AdaptationSet\b[^>]*\bcontentType="audio"/i.test(xml)
  )
}

/**
 * Gets progressive fallback URL.
 */
function progressiveFallbackUrl(mediaInfo: WeiboMediaInfo): string | undefined {
  return (
    pickNonEmptyUrl(mediaInfo.mp4_720p_mp4) ??
    pickNonEmptyUrl(mediaInfo.h265_mp4_hd) ??
    bestProgressiveFromPlaybackList(mediaInfo) ??
    pickNonEmptyUrl(mediaInfo.stream_url_hd) ??
    pickNonEmptyUrl(mediaInfo.stream_url)
  )
}

/**
 * Gets download URL from media info.
 */
function downloadUrlFromMediaInfo(mediaInfo: WeiboMediaInfo): string | undefined {
  return (
    pickNonEmptyUrl(mediaInfo.mp4_720p_mp4) ??
    pickNonEmptyUrl(mediaInfo.h265_mp4_hd) ??
    pickNonEmptyUrl(mediaInfo.mp4_hd_url) ??
    pickNonEmptyUrl(mediaInfo.stream_url_hd) ??
    pickNonEmptyUrl(mediaInfo.stream_url)
  )
}

/**
 * Gets playback sources from list.
 */
function playbackSourcesFromList(
  mediaInfo: WeiboMediaInfo,
): Array<{ id: string; label: string; url: string }> {
  if (!Array.isArray(mediaInfo.playback_list)) {
    return []
  }

  const seen = new Set<string>()
  const out: Array<{ id: string; label: string; url: string }> = []

  for (const item of mediaInfo.playback_list) {
    if (isPlaybackAudioItem(item) || item.meta?.is_hidden) {
      continue
    }
    const id = (item.meta?.label ?? item.play_info?.label)?.trim()
    const url = pickNonEmptyUrl(item.play_info?.url)
    if (!id || !url) {
      continue
    }
    if (seen.has(id)) {
      continue
    }
    seen.add(id)
    const label = (item.meta?.quality_label ?? id).trim()
    out.push({ id, label, url })
  }

  out.sort((a, b) => {
    const qA = Number(
      mediaInfo.playback_list!.find((i) => (i.meta?.label ?? i.play_info?.label)?.trim() === a.id)
        ?.meta?.quality_index ?? -1,
    )
    const qB = Number(
      mediaInfo.playback_list!.find((i) => (i.meta?.label ?? i.play_info?.label)?.trim() === b.id)
        ?.meta?.quality_index ?? -1,
    )
    return qB - qA
  })

  return out
}

/**
 * Converts mix media info to FeedMixMediaItem array.
 */
export function toMixMediaInfo(mixMediaInfo: any): FeedMixMediaItem[] | undefined {
  if (!mixMediaInfo?.items) {
    return undefined
  }

  const results: FeedMixMediaItem[] = []

  for (const item of mixMediaInfo.items) {
    if (item.type === 'video') {
      const mediaInfo = item.data.media_info
      if (!mediaInfo) continue

      const rawMpdXml = getMpdXml(mediaInfo)
      const hasMpd = rawMpdXml && /<AdaptationSet/i.test(rawMpdXml)
      const sources = playbackSourcesFromList(mediaInfo)
      let dash: FeedDashSource | undefined

      if (hasMpd) {
        dash = {
          type: 'mpd',
          manifestXml: rawMpdXml.trim(),
          qualities: dashQualitiesFromPlaybackList(mediaInfo),
        }
      } else if (sources.length > 0) {
        dash = {
          type: 'playback',
          sources,
          selectedIndex: 0,
        }
      }

      const streamUrl = progressiveFallbackUrl(mediaInfo) ?? mediaInfo.stream_url
      if (!streamUrl && !item.data.page_pic && !mediaInfo.big_pic_info?.pic_big?.url) {
        continue
      }

      results.push({
        type: 'video',
        id: item.id,
        videoCoverUrl: item.data.page_pic ?? mediaInfo.big_pic_info?.pic_big?.url,
        videoStreamUrl: streamUrl,
        videoDash: dash,
        videoOrientation: mediaInfo.video_orientation,
        videoDownloadUrl: downloadUrlFromMediaInfo(mediaInfo),
        videoTitle: mediaInfo.video_title ?? item.data.content1 ?? item.data.content2 ?? '',
      })
    } else if (item.type === 'pic') {
      const imageFromPicInfo = toImagesFromParts(
        item.data.pic_id ? [item.data.pic_id] : Object.keys(item.data.pic_infos ?? {}),
        item.data.pic_infos,
      )[0]
      if (imageFromPicInfo) {
        results.push({
          type: 'pic',
          id: item.id,
          image: imageFromPicInfo,
        })
        continue
      }

      const thumbnailImage = item.data.large ?? item.data.bmiddle ?? item.data.thumbnail
      const largeImage =
        item.data.largest ??
        item.data.mw2000 ??
        item.data.original ??
        item.data.large ??
        item.data.bmiddle ??
        item.data.thumbnail
      const thumbnailUrl = thumbnailImage?.url
      const largeUrl = largeImage?.url

      if (!thumbnailUrl || !largeUrl) {
        continue
      }

      const downloadUrls = uniqueNonEmptyUrls([
        item.data.largest?.url,
        item.data.mw2000?.url,
        item.data.original?.url,
        item.data.large?.url,
        item.data.bmiddle?.url,
        item.data.thumbnail?.url,
      ])

      results.push({
        type: 'pic',
        id: item.id,
        image: {
          id: item.id,
          thumbnailUrl,
          largeUrl,
          ...(downloadUrls.length > 1 ? { downloadUrls } : {}),
          width: largeImage?.width,
          height: largeImage?.height,
        },
      })
    }
  }

  return results.length > 0 ? results : undefined
}

/**
 * Converts status to media object (video/audio/live).
 */
export function toMedia(status: WeiboStatus) {
  const mediaInfo = status.page_info?.media_info
  const sourceObjectType = status.page_info?.object_type
  if (!mediaInfo) {
    return null
  }

  if (sourceObjectType === 'live') {
    const pagePicUrl =
      typeof status.page_info?.page_pic === 'string'
        ? status.page_info.page_pic
        : (status.page_info?.page_pic?.url ?? null)

    return {
      type: 'live' as const,
      streamUrl: mediaInfo.live_ld ?? mediaInfo.stream_url ?? '',
      title: mediaInfo.video_title ?? '',
      coverUrl: pagePicUrl ?? mediaInfo.subscribe?.cover ?? null,
      liveStatus: mediaInfo.live_status,
      liveStartTime: mediaInfo.live_start_time,
      replayUrl: mediaInfo.replay_hd,
    }
  }

  const isAudio = sourceObjectType !== 'video'
  const progressiveUrl = progressiveFallbackUrl(mediaInfo)

  if (isAudio) {
    if (!progressiveUrl) {
      return null
    }
    const pagePicUrl =
      typeof status.page_info?.page_pic === 'string'
        ? status.page_info.page_pic
        : (status.page_info?.page_pic?.url ?? null)

    return {
      type: 'audio' as const,
      sourceObjectType: typeof sourceObjectType === 'string' ? sourceObjectType : undefined,
      streamUrl: progressiveUrl,
      title: mediaInfo.video_title ?? '',
      coverUrl: pagePicUrl ?? mediaInfo.big_pic_info?.pic_big?.url ?? null,
    }
  }

  const rawMpdXml = getMpdXml(mediaInfo)
  const dlUrl = downloadUrlFromMediaInfo(mediaInfo)

  const pagePicUrl =
    typeof status.page_info?.page_pic === 'string'
      ? status.page_info.page_pic
      : (status.page_info?.page_pic?.url ?? null)

  if (rawMpdXml) {
    if (hasAudioAdaptationInMpd(rawMpdXml)) {
      const qualities = dashQualitiesFromPlaybackList(mediaInfo)
      if (qualities.length > 0) {
        return {
          type: 'video' as const,
          streamUrl: progressiveUrl ?? '',
          title: mediaInfo.video_title ?? '',
          coverUrl: pagePicUrl ?? mediaInfo.big_pic_info?.pic_big?.url ?? null,
          videoOrientation: mediaInfo.video_orientation,
          downloadUrl: dlUrl,
          dash: {
            type: 'mpd' as const,
            manifestXml: rawMpdXml,
            qualities,
          },
        }
      }
    }

    if (!progressiveUrl) {
      return null
    }

    return {
      type: 'video' as const,
      streamUrl: progressiveUrl,
      title: mediaInfo.video_title ?? '',
      coverUrl: pagePicUrl ?? mediaInfo.big_pic_info?.pic_big?.url ?? null,
      videoOrientation: mediaInfo.video_orientation,
      downloadUrl: dlUrl,
      dash: undefined,
    }
  }

  const sources = playbackSourcesFromList(mediaInfo)
  if (sources.length > 0) {
    return {
      type: 'video' as const,
      streamUrl: progressiveUrl ?? '',
      title: mediaInfo.video_title ?? '',
      coverUrl: pagePicUrl ?? mediaInfo.big_pic_info?.pic_big?.url ?? null,
      videoOrientation: mediaInfo.video_orientation,
      downloadUrl: dlUrl,
      dash: {
        type: 'playback' as const,
        sources,
        selectedIndex: 0,
      },
    }
  }

  if (!progressiveUrl) {
    return null
  }

  return {
    type: 'video' as const,
    streamUrl: progressiveUrl,
    title: mediaInfo.video_title ?? '',
    coverUrl: pagePicUrl ?? mediaInfo.big_pic_info?.pic_big?.url ?? null,
    videoOrientation: mediaInfo.video_orientation,
    downloadUrl: dlUrl,
    dash: undefined,
  }
}
