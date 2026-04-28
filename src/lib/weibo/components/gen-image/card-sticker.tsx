import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'
import * as React from 'react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

// Washi tape decoration
function WashiTape({
  className,
  color,
  rotation,
}: {
  className?: string
  color: string
  rotation: number
}) {
  return (
    <div
      className={`h-7 w-28 rounded-sm ${className}`}
      style={{
        backgroundColor: color,
        opacity: 0.75,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Washi tape pattern */}
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.3) 3px,
            rgba(255,255,255,0.3) 4px
          )`,
        }}
      />
    </div>
  )
}

export function CardSticker({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'
  const displayImages = data.images

  // Paper tones
  const bgColor = isDark ? 'oklch(0.12 0.01 40)' : 'oklch(0.95 0.02 50)'
  const paperColor = isDark ? 'oklch(0.18 0.02 40 / 0.95)' : 'oklch(0.99 0.01 50)'
  const textPrimary = isDark ? 'oklch(0.92 0.01 0)' : 'oklch(0.25 0.01 0)'
  const textSecondary = isDark ? 'oklch(0.65 0.01 0)' : 'oklch(0.45 0.01 0)'
  const textTertiary = isDark ? 'oklch(0.50 0.01 0)' : 'oklch(0.55 0.01 0)'
  const dashedBorderColor = isDark ? 'oklch(0.35 0.02 0)' : 'oklch(0.85 0.01 50)'

  // Washi tape colors
  const tape1Color = isDark ? 'oklch(0.70 0.15 280)' : 'oklch(0.80 0.12 220)'
  const tape2Color = isDark ? 'oklch(0.70 0.18 340)' : 'oklch(0.85 0.15 340)'
  const tape3Color = isDark ? 'oklch(0.65 0.15 160)' : 'oklch(0.75 0.12 160)'
  const tape4Color = isDark ? 'oklch(0.70 0.12 60)' : 'oklch(0.80 0.10 60)'

  return (
    <div className="relative overflow-hidden" style={{ width: '640px', backgroundColor: bgColor }}>
      <div className="relative p-6">
        {/* Washi tape decorations */}
        <div className="absolute -top-3 -left-1">
          <WashiTape color={tape1Color} rotation={-18} />
        </div>
        <div className="absolute top-14 -right-3">
          <WashiTape color={tape2Color} rotation={22} />
        </div>
        <div className="absolute top-3 left-24">
          <WashiTape color={tape3Color} rotation={-8} />
        </div>
        <div className="absolute right-10 bottom-20">
          <WashiTape color={tape4Color} rotation={15} />
        </div>

        {/* Paper card */}
        <div
          className="relative rounded-lg p-6 shadow-md"
          style={{
            backgroundColor: paperColor,
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {/* Dashed border decoration */}
          <div
            className="pointer-events-none absolute inset-3 rounded-md border-2 border-dashed"
            style={{
              borderColor: dashedBorderColor,
            }}
          />

          {/* Header with pin */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShareCardAvatar author={data.author} sizeClassName="size-12" />
              <div>
                <p className="text-base font-bold" style={{ color: textPrimary }}>
                  @{data.author.name}
                </p>
                <p className="text-sm" style={{ color: textSecondary }}>
                  {formatDate(data.createdAt)}
                </p>
                {(data.source || data.regionName) && (
                  <p className="text-xs" style={{ color: textTertiary }}>
                    {data.source} {data.regionName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <img src={WeiboLogo} alt="微博 Logo" className="size-8" />
              <div
                className="size-8 rounded-full shadow-md"
                style={{
                  backgroundColor: isDark ? 'oklch(0.50 0.15 0)' : 'oklch(0.85 0.10 0)',
                  transform: 'rotate(12deg)',
                }}
              >
                <span
                  className="flex size-full items-center justify-center text-sm"
                  style={{ color: isDark ? 'oklch(0.95 0.01 0)' : 'oklch(0.20 0.01 0)' }}
                >
                  📌
                </span>
              </div>
            </div>
          </div>

          {/* Handwritten style text */}
          <div className="mb-6">
            <p
              className="text-xl leading-relaxed"
              style={{
                fontFamily: '"Comic Sans MS", "Marker Felt", cursive',
                textWrap: 'balance',
                color: textPrimary,
              }}
            >
              <StatusText item={data} text={data.text} />
            </p>
          </div>

          {/* Images */}
          <ShareCardImages images={displayImages} showFullImages={showFullImages} />

          {/* Retweeted content */}
          {data.retweetedStatus && (
            <div
              className="mb-6 rounded-lg border-2 border-dashed p-4"
              style={{
                borderColor: dashedBorderColor,
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-6" />
                <span className="text-sm font-bold" style={{ color: textSecondary }}>
                  📎 @{data.retweetedStatus.author.name}
                </span>
                <span className="text-xs" style={{ color: textTertiary }}>
                  {formatDate(data.retweetedStatus.createdAt)}
                </span>
              </div>
              <p
                className="text-base leading-relaxed"
                style={{
                  color: textPrimary,
                  fontFamily: '"Comic Sans MS", "Marker Felt", cursive',
                  textWrap: 'balance',
                }}
              >
                <StatusText item={data.retweetedStatus} text={data.retweetedStatus.text} />
              </p>
              <div className="mt-2">
                <ShareCardImages
                  images={data.retweetedStatus.images}
                  showFullImages={showFullImages}
                />
              </div>
            </div>
          )}

          {/* Stats as stamp style badges */}
          {showStats && (
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm"
                style={{
                  backgroundColor: isDark
                    ? 'oklch(0.30 0.15 350 / 0.4)'
                    : 'oklch(0.95 0.05 350 / 0.8)',
                  color: isDark ? 'oklch(0.80 0.15 350)' : 'oklch(0.60 0.15 350)',
                }}
              >
                <Heart className="size-4" />
                <span className="text-sm font-bold">{formatCount(data.stats.likes)}</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm"
                style={{
                  backgroundColor: isDark
                    ? 'oklch(0.30 0.12 220 / 0.4)'
                    : 'oklch(0.94 0.04 220 / 0.8)',
                  color: isDark ? 'oklch(0.80 0.12 220)' : 'oklch(0.50 0.12 220)',
                }}
              >
                <MessageCircle className="size-4" />
                <span className="text-sm font-bold">{formatCount(data.stats.comments)}</span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2 shadow-sm"
                style={{
                  backgroundColor: isDark
                    ? 'oklch(0.30 0.12 160 / 0.4)'
                    : 'oklch(0.94 0.04 160 / 0.8)',
                  color: isDark ? 'oklch(0.80 0.12 160)' : 'oklch(0.50 0.12 160)',
                }}
              >
                <Repeat2 className="size-4" />
                <span className="text-sm font-bold">{formatCount(data.stats.reposts)}</span>
              </div>
            </div>
          )}

          {showLink && data.mblogId && (
            <div className="flex items-center gap-1">
              <img src={WeiboLogo} alt="微博 Logo" className="size-4" />
              <Link className="size-3" style={{ color: textTertiary }} />
              <span className="text-xs" style={{ color: textTertiary }}>
                weibo.com/{data.author.id}/{data.mblogId}
              </span>
            </div>
          )}
        </div>

        {/* Corner decorations */}
        <div
          className="absolute -right-3 -bottom-3 text-2xl"
          style={{ transform: 'rotate(-10deg)' }}
        >
          ✧
        </div>
        <div className="absolute -bottom-4 left-16 text-xl" style={{ transform: 'rotate(8deg)' }}>
          ✦
        </div>
      </div>
    </div>
  )
}
