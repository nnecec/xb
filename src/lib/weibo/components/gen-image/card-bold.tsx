import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

export function CardBold({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'
  const displayImages = data.images

  // Bold, vibrant palette
  const bgColor = isDark ? 'oklch(0.12 0.02 0)' : 'oklch(0.98 0.01 40)'
  const cardBg = isDark ? 'oklch(0.15 0.02 0)' : 'oklch(1 0 0)'
  const textPrimary = isDark ? 'oklch(0.98 0.0 0)' : 'oklch(0.12 0.02 0)'
  const textSecondary = isDark ? 'oklch(0.60 0.01 0)' : 'oklch(0.45 0.01 0)'

  // Vibrant accent colors
  const accent1 = isDark ? 'oklch(0.72 0.18 330)' : 'oklch(0.65 0.20 25)'
  const accent2 = isDark ? 'oklch(0.70 0.15 280)' : 'oklch(0.60 0.18 280)'
  const accent3 = isDark ? 'oklch(0.70 0.18 55)' : 'oklch(0.65 0.18 55)'

  return (
    <div className="relative overflow-hidden" style={{ width: '640px', backgroundColor: bgColor }}>
      {/* Bold geometric decorations */}
      <div
        className="absolute -top-16 -right-16 size-48"
        style={{
          backgroundColor: accent1,
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          opacity: 0.9,
        }}
      />
      <div
        className="absolute -bottom-8 -left-8 size-32"
        style={{
          backgroundColor: accent2,
          clipPath: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
          opacity: 0.8,
        }}
      />
      <div
        className="absolute top-1/2 right-8 size-20 -translate-y-1/2 rounded-full"
        style={{
          backgroundColor: accent3,
          opacity: 0.6,
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <ShareCardAvatar
              author={data.author}
              sizeClassName="size-14"
              fallbackClassName="text-lg font-bold"
            />
            <div>
              <p className="text-xl font-black tracking-tight" style={{ color: textPrimary }}>
                {data.author.name}
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
          <img src={WeiboLogo} alt="微博 Logo" className="size-10" />
        </div>

        {/* Main text */}
        <div className="mb-8">
          <h1
            className="text-3xl leading-tight font-black tracking-tight"
            style={{ color: textPrimary, textWrap: 'balance' }}
          >
            <StatusText item={data} text={data.text} />
          </h1>
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
            className="mb-8 rounded-2xl p-5"
            style={{
              backgroundColor: cardBg,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-8" />
              <span className="font-bold" style={{ color: textPrimary }}>
                @{data.retweetedStatus.author.name}
              </span>
              <span className="text-xs" style={{ color: textSecondary }}>
                {formatDate(data.retweetedStatus.createdAt)}
              </span>
            </div>
            <p className="text-base leading-relaxed" style={{ color: textPrimary }}>
              <StatusText item={data.retweetedStatus} text={data.retweetedStatus.text} />
            </p>
            <div className="mt-3">
              <ShareCardImages
                images={data.retweetedStatus.images}
                videoCoverUrl={data.retweetedStatus.videoCoverUrl}
                showFullImages={showFullImages}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="mb-4 flex items-center gap-4">
            <div
              className="flex items-center gap-3 rounded-2xl px-6 py-3"
              style={{
                backgroundColor: cardBg,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Heart className="size-5" style={{ color: 'oklch(0.65 0.20 350)' }} />
              <span className="text-lg font-black" style={{ color: textPrimary }}>
                {formatCount(data.stats.likes)}
              </span>
            </div>
            <div
              className="flex items-center gap-3 rounded-2xl px-6 py-3"
              style={{
                backgroundColor: cardBg,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <MessageCircle className="size-5" style={{ color: 'oklch(0.60 0.18 280)' }} />
              <span className="text-lg font-black" style={{ color: textPrimary }}>
                {formatCount(data.stats.comments)}
              </span>
            </div>
            <div
              className="flex items-center gap-3 rounded-2xl px-6 py-3"
              style={{
                backgroundColor: cardBg,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Repeat2 className="size-5" style={{ color: 'oklch(0.60 0.18 140)' }} />
              <span className="text-lg font-black" style={{ color: textPrimary }}>
                {formatCount(data.stats.reposts)}
              </span>
            </div>
          </div>
        )}

        {showLink && data.mblogId && (
          <div className="flex items-center gap-1" style={{ color: textSecondary }}>
            <Link className="size-3" />
            <span className="text-xs">
              weibo.com/{data.author.id}/{data.mblogId}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
