import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

export function CardComic({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'
  const displayImages = data.images

  // Comic book palette
  const bgColor = isDark ? 'oklch(0.08 0.02 50)' : 'oklch(0.95 0.05 55)'
  const bubbleBg = isDark ? 'oklch(0.15 0.02 50)' : 'oklch(1 0 0)'
  const bubbleBorder = isDark ? 'oklch(0.30 0.02 50)' : 'oklch(0.12 0.02 0)'
  const textColor = isDark ? 'oklch(0.98 0.0 50)' : 'oklch(0.12 0.02 0)'
  const textSecondary = isDark ? 'oklch(0.70 0.01 50)' : 'oklch(0.50 0.01 0)'
  const dotColor = isDark ? 'oklch(0.35 0.02 0)' : 'oklch(0.20 0.02 0)'

  // Comic action colors - brighter in dark mode for contrast
  const actionComment = isDark ? 'oklch(0.75 0.18 220)' : 'oklch(0.55 0.15 220)'
  const actionRepost = isDark ? 'oklch(0.75 0.18 140)' : 'oklch(0.55 0.15 140)'
  const actionLike = isDark ? 'oklch(0.75 0.20 350)' : 'oklch(0.55 0.18 350)'

  return (
    <div className="relative overflow-hidden" style={{ width: '640px', backgroundColor: bgColor }}>
      {/* Halftone dots pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${dotColor} 1.5px, transparent 1.5px)`,
          backgroundSize: '16px 16px',
          opacity: isDark ? 0.15 : 0.12,
        }}
      />

      <div className="relative z-10 p-6">
        {/* Comic header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShareCardAvatar author={data.author} sizeClassName="size-12" />
            <div>
              <p className="text-base font-black" style={{ color: textColor }}>
                @{data.author.name}
              </p>
              <p className="text-sm" style={{ color: textSecondary }}>
                {formatDate(data.createdAt)}
              </p>
              {(data.source || data.regionName) && (
                <p className="text-xs" style={{ color: textSecondary }}>
                  {data.source} {data.regionName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded-2xl rounded-tr-none border-4 px-4 py-2"
              style={{
                backgroundColor: bubbleBg,
                borderColor: bubbleBorder,
              }}
            >
              <img src={WeiboLogo} alt="微博 Logo" className="size-8" />
            </div>
          </div>
        </div>

        {/* Speech bubble */}
        <div className="relative mb-6">
          {/* Bubble body */}
          <div
            className="rounded-3xl rounded-bl-none border-4 p-6 shadow-lg"
            style={{
              backgroundColor: bubbleBg,
              borderColor: bubbleBorder,
              boxShadow: isDark
                ? '4px 4px 0px 0px rgba(255,255,255,0.15)'
                : '4px 4px 0px 0px rgba(0,0,0,0.15)',
            }}
          >
            <p
              className="text-xl leading-relaxed font-black"
              style={{ color: textColor, textWrap: 'balance' }}
            >
              <StatusText item={data} text={data.text} />
            </p>
          </div>
          {/* Bubble tail */}
          <div
            className="absolute -bottom-5 left-8 size-0"
            style={{
              borderLeft: '16px solid transparent',
              borderRight: '16px solid transparent',
              borderTop: `20px solid ${bubbleBg}`,
            }}
          />
        </div>

        {/* Images */}
        <ShareCardImages
          images={displayImages}
          videoCoverUrl={data.videoCoverUrl}
          showFullImages={showFullImages}
        />

        {/* Retweeted content */}
        {data.retweetedStatus && (
          <div
            className="mb-6 rounded-2xl rounded-tr-none border-4 p-4"
            style={{
              backgroundColor: bubbleBg,
              borderColor: bubbleBorder,
              boxShadow: isDark
                ? '3px 3px 0px 0px rgba(255,255,255,0.12)'
                : '3px 3px 0px 0px rgba(0,0,0,0.1)',
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-8" />
              <span className="text-sm font-black" style={{ color: textColor }}>
                @{data.retweetedStatus.author.name}
              </span>
              <span className="text-xs" style={{ color: textSecondary }}>
                {formatDate(data.retweetedStatus.createdAt)}
              </span>
            </div>
            <p className="text-base leading-relaxed font-black" style={{ color: textColor }}>
              <StatusText item={data.retweetedStatus} text={data.retweetedStatus.text} />
            </p>
            <div className="mt-2">
              <ShareCardImages
                images={data.retweetedStatus.images}
                videoCoverUrl={data.retweetedStatus.videoCoverUrl}
                showFullImages={showFullImages}
              />
            </div>
          </div>
        )}

        {/* Stats as comic action boxes */}
        {showStats && (
          <div className="mb-4 flex items-center gap-4">
            <div
              className="flex items-center gap-2 rounded-2xl px-5 py-3 shadow-md"
              style={{
                backgroundColor: actionComment,
                boxShadow: isDark
                  ? '3px 3px 0px 0px rgba(255,255,255,0.12)'
                  : '3px 3px 0px 0px rgba(0,0,0,0.15)',
              }}
            >
              <MessageCircle className="size-5 text-white" />
              <span className="text-lg font-black text-white">
                {formatCount(data.stats.comments)}
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-2xl px-5 py-3 shadow-md"
              style={{
                backgroundColor: actionRepost,
                boxShadow: isDark
                  ? '3px 3px 0px 0px rgba(255,255,255,0.12)'
                  : '3px 3px 0px 0px rgba(0,0,0,0.15)',
              }}
            >
              <Repeat2 className="size-5 text-white" />
              <span className="text-lg font-black text-white">
                {formatCount(data.stats.reposts)}
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-2xl px-5 py-3 shadow-md"
              style={{
                backgroundColor: actionLike,
                boxShadow: isDark
                  ? '3px 3px 0px 0px rgba(255,255,255,0.12)'
                  : '3px 3px 0px 0px rgba(0,0,0,0.15)',
              }}
            >
              <Heart className="size-5 text-white" />
              <span className="text-lg font-black text-white">{formatCount(data.stats.likes)}</span>
            </div>
          </div>
        )}

        {showLink && data.mblogId && (
          <div className="flex items-center gap-1" style={{ color: textSecondary }}>
            <Link className="size-3" />
            <span className="text-xs font-medium">
              weibo.com/{data.author.id}/{data.mblogId}
            </span>
          </div>
        )}
      </div>

      {/* Bottom action lines decoration */}
      <div
        className="absolute right-0 bottom-0 left-0 h-1"
        style={{
          background: `linear-gradient(90deg,
            ${actionComment} 33%,
            ${actionRepost} 33%, ${actionRepost} 66%,
            ${actionLike} 66%)`,
        }}
      />
    </div>
  )
}
