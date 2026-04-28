import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

export function CardVogue({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'
  const displayImages = data.images

  // Sophisticated magazine palette
  const bgColor = isDark ? 'oklch(0.10 0.01 0)' : 'oklch(0.97 0.005 60)'
  const textPrimary = isDark ? 'oklch(0.95 0.0 0)' : 'oklch(0.12 0.01 0)'
  const textSecondary = isDark ? 'oklch(0.55 0.01 0)' : 'oklch(0.50 0.01 0)'
  const textTertiary = isDark ? 'oklch(0.45 0.01 0)' : 'oklch(0.60 0.01 0)'
  const borderColor = isDark ? 'oklch(0.25 0.01 0)' : 'oklch(0.88 0.01 0)'
  const accentColor = isDark ? 'oklch(0.75 0.08 280)' : 'oklch(0.60 0.08 280)'

  return (
    <div className="relative" style={{ width: '640px', backgroundColor: bgColor }}>
      <div className="px-12 py-12">
        {/* Magazine-style header with oversized name */}
        <div className="mb-10 flex items-end justify-between border-b pb-6" style={{ borderColor }}>
          <div>
            <p
              className="font-serif text-5xl font-light tracking-wider"
              style={{ color: textPrimary, letterSpacing: '0.15em' }}
            >
              {data.author.name}
            </p>
            <p className="mt-2 text-xs tracking-[0.3em] uppercase" style={{ color: textSecondary }}>
              {formatDate(data.createdAt)}
            </p>
          </div>
          <ShareCardAvatar
            author={data.author}
            sizeClassName="size-8"
            fallbackClassName="text-xs font-semibold"
          />
        </div>

        {/* Main quote */}
        <div className="mb-10">
          <p
            className="font-serif text-3xl leading-tight"
            style={{ color: textPrimary, textWrap: 'balance' }}
          >
            "<StatusText item={data} text={data.text} />"
          </p>
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
            className="mb-10 border-l-4 pl-5"
            style={{
              borderLeftColor: borderColor,
              backgroundColor: isDark ? 'oklch(0.14 0.01 0)' : 'oklch(0.95 0.005 60)',
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-6" />
              <span className="font-serif text-sm" style={{ color: textSecondary }}>
                — @{data.retweetedStatus.author.name}
              </span>
              <span className="text-xs" style={{ color: textTertiary }}>
                {formatDate(data.retweetedStatus.createdAt)}
              </span>
            </div>
            <p className="font-serif text-base leading-relaxed" style={{ color: textPrimary }}>
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

        {/* Stats as elegant line items */}
        {showStats && (
          <div className="mb-4 flex items-center gap-10 border-t pt-6" style={{ borderColor }}>
            <div className="flex items-center gap-3">
              <Heart className="size-4" style={{ color: textSecondary }} />
              <span className="text-sm" style={{ color: textSecondary }}>
                {formatCount(data.stats.likes)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MessageCircle className="size-4" style={{ color: textSecondary }} />
              <span className="text-sm" style={{ color: textSecondary }}>
                {formatCount(data.stats.comments)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Repeat2 className="size-4" style={{ color: textSecondary }} />
              <span className="text-sm" style={{ color: textSecondary }}>
                {formatCount(data.stats.reposts)}
              </span>
            </div>
          </div>
        )}

        <div
          className="mb-4 flex items-center justify-between border-t pt-6"
          style={{ borderColor }}
        >
          <img src={WeiboLogo} alt="微博 Logo" className="size-9" />
          {showLink && data.mblogId && (
            <div className="flex items-center gap-1">
              <Link className="size-3" style={{ color: textTertiary }} />
              <span className="text-xs" style={{ color: textTertiary }}>
                weibo.com/{data.author.id}/{data.mblogId}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />
    </div>
  )
}
