import { Heart, MessageCircle, Repeat2 } from 'lucide-react'
import * as React from 'react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

// Stamp perforation holes
function PerforationHoles({
  position,
  bgColor,
  borderColor,
}: {
  position: 'left' | 'right'
  bgColor: string
  borderColor: string
}) {
  const holes = Array.from({ length: 14 })
  return (
    <div
      className={`absolute top-0 bottom-0 flex flex-col justify-between py-3 ${
        position === 'left' ? '-left-2' : '-right-2'
      }`}
    >
      {holes.map((_, i) => (
        <div
          key={i}
          className={`size-2 rounded-full ${position === 'left' ? '-ml-1' : '-mr-1'}`}
          style={{
            backgroundColor: bgColor,
            border: `1.5px solid ${borderColor}`,
          }}
        />
      ))}
    </div>
  )
}

export function CardContrast({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'

  // Paper tones
  const bgColor = isDark ? 'oklch(0.22 0.01 0)' : 'oklch(0.96 0.01 60)'
  const paperColor = isDark ? 'oklch(0.18 0.01 0)' : 'oklch(0.99 0.0 0)'
  const borderColor = isDark ? 'oklch(0.35 0.01 0)' : 'oklch(0.20 0.01 0)'
  const textPrimary = isDark ? 'oklch(0.95 0.0 0)' : 'oklch(0.12 0.01 0)'
  const textSecondary = isDark ? 'oklch(0.60 0.01 0)' : 'oklch(0.50 0.01 0)'

  // Accent colors for the ticket theme
  const highlightBg = isDark ? 'oklch(0.70 0.15 80)' : 'oklch(0.90 0.12 80)'
  const highlightText = isDark ? 'oklch(0.15 0.02 0)' : 'oklch(0.15 0.02 0)'

  const displayImages = data.images

  // Get relative time from createdAt
  const timeLabel = React.useMemo(() => {
    try {
      const now = new Date()
      const created = new Date(data.createdAt)
      const diffMs = now.getTime() - created.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      if (diffDays < 30) return `${diffDays}d`
      return formatDate(data.createdAt)
    } catch {
      return formatDate(data.createdAt)
    }
  }, [data.createdAt])

  return (
    <div
      className="relative overflow-hidden rounded-sm"
      style={{
        width: '640px',
        backgroundColor: bgColor,
        padding: '10px',
        boxShadow: isDark
          ? '6px 6px 0px 0px rgba(0,0,0,0.5)'
          : '6px 6px 0px 0px rgba(26,26,26,0.12)',
      }}
    >
      <div
        className="relative"
        style={{
          backgroundColor: paperColor,
          border: `3px solid ${borderColor}`,
        }}
      >
        <div className="relative z-10">
          {/* Color stripe at top - ticket stub style */}
          <div className="flex h-2" style={{ backgroundColor: borderColor }}>
            <div
              className="flex-1"
              style={{ backgroundColor: isDark ? 'oklch(0.65 0.18 140)' : 'oklch(0.65 0.18 140)' }}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: isDark ? 'oklch(0.70 0.18 60)' : 'oklch(0.70 0.18 60)' }}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: isDark ? 'oklch(0.65 0.18 280)' : 'oklch(0.65 0.18 280)' }}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: isDark ? 'oklch(0.68 0.18 350)' : 'oklch(0.68 0.18 350)' }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <ShareCardAvatar author={data.author} sizeClassName="size-12" />
              <div>
                <p className="font-black" style={{ fontSize: '18px', color: textPrimary }}>
                  {data.author.name}
                </p>
                <p className="text-sm" style={{ color: textSecondary }}>
                  @{data.author.name}
                </p>
              </div>
            </div>
            <div
              className="rounded-full px-4 py-1.5 text-sm font-black"
              style={{
                border: `2px solid ${borderColor}`,
                backgroundColor: highlightBg,
                color: highlightText,
              }}
            >
              {timeLabel}
            </div>
          </div>

          {/* Source info */}
          {(data.source || data.regionName) && (
            <div className="px-6 pb-2">
              <p className="text-xs" style={{ color: textSecondary }}>
                {data.source} {data.regionName}
              </p>
            </div>
          )}

          {/* Content */}
          <div className="px-6 pb-4">
            <p
              className="text-base leading-loose"
              style={{
                color: textPrimary,
                letterSpacing: '0.015em',
                lineHeight: '1.8',
              }}
            >
              <StatusText item={data} text={data.text} />
            </p>
          </div>

          {/* Images */}
          {displayImages.length > 0 && (
            <div className="px-6 pb-4">
              <ShareCardImages
                images={displayImages}
                videoCoverUrl={data.videoCoverUrl}
                showFullImages={showFullImages}
              />
            </div>
          )}

          {/* Retweeted content */}
          {data.retweetedStatus && (
            <div
              className="mx-6 mb-4 rounded-lg border-2 p-4"
              style={{ borderColor, backgroundColor: paperColor }}
            >
              <div className="mb-2 flex items-center gap-2">
                <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-6" />
                <span className="text-sm font-black" style={{ color: textPrimary }}>
                  @{data.retweetedStatus.author.name}
                </span>
                <span className="text-xs" style={{ color: textSecondary }}>
                  {formatDate(data.retweetedStatus.createdAt)}
                </span>
              </div>
              <p className="text-base leading-relaxed" style={{ color: textPrimary }}>
                <StatusText item={data.retweetedStatus} text={data.retweetedStatus.text} />
              </p>
              {data.retweetedStatus.images.length > 0 && (
                <div className="mt-2">
                  <ShareCardImages
                    images={data.retweetedStatus.images}
                    videoCoverUrl={data.retweetedStatus.videoCoverUrl}
                    showFullImages={showFullImages}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tear line divider */}
          <div className="relative px-6 py-4">
            <div className="border-t-2 border-dashed" style={{ borderColor }} />
            {/* Left tear notch */}
            <div
              className="absolute top-1/2 -left-4 size-6 -translate-y-1/2 rounded-r-full border-r-2 border-l-0"
              style={{
                backgroundColor: bgColor,
                borderColor: borderColor,
              }}
            />
            {/* Right tear notch */}
            <div
              className="absolute top-1/2 -right-4 size-6 -translate-y-1/2 rounded-l-full border-r-0 border-l-2"
              style={{ backgroundColor: bgColor, borderColor: borderColor }}
            />
          </div>

          {/* Stats */}
          {showStats && (
            <div className="flex items-center justify-between px-6 pb-4">
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ border: `2px solid ${borderColor}` }}
              >
                <MessageCircle className="size-4" style={{ color: textPrimary }} />
                <span className="text-sm font-black" style={{ color: textPrimary }}>
                  {formatCount(data.stats.comments)}
                </span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ border: `2px solid ${borderColor}` }}
              >
                <Repeat2 className="size-4" style={{ color: textPrimary }} />
                <span className="text-sm font-black" style={{ color: textPrimary }}>
                  {formatCount(data.stats.reposts)}
                </span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ border: `2px solid ${borderColor}` }}
              >
                <Heart className="size-4" style={{ color: textPrimary }} />
                <span className="text-sm font-black" style={{ color: textPrimary }}>
                  {formatCount(data.stats.likes)}
                </span>
              </div>
            </div>
          )}

          {/* Bottom bar */}
          <div className="flex items-end justify-between px-6 pb-6">
            {/* Weibo URL */}
            {data.mblogId && (
              <div className="flex items-center gap-1">
                {showLink && (
                  <span className="text-xs" style={{ color: textSecondary }}>
                    weibo.com/{data.author.id}/{data.mblogId}
                  </span>
                )}
              </div>
            )}
            {/* Weibo logo */}
            <img src={WeiboLogo} alt="微博 Logo" className="size-8" />
          </div>
        </div>
      </div>

      {/* Right side perforations */}
      <PerforationHoles position="right" bgColor={bgColor} borderColor={borderColor} />
    </div>
  )
}
