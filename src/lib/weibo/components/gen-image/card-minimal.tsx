import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

export function CardMinimal({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'
  const displayImages = data.images

  const bgColor = isDark ? 'oklch(0.08 0.01 0)' : 'oklch(0.985 0.005 60)'
  const textPrimary = isDark ? 'oklch(0.92 0.01 0)' : 'oklch(0.15 0.01 0)'
  const textSecondary = isDark ? 'oklch(0.55 0.01 0)' : 'oklch(0.50 0.01 0)'
  const accentLine = isDark ? 'oklch(0.70 0.10 280)' : 'oklch(0.60 0.10 280)'
  const quoteColor = isDark ? 'oklch(0.25 0.02 0)' : 'oklch(0.88 0.01 0)'

  return (
    <div className="relative" style={{ width: '640px', backgroundColor: bgColor }}>
      {/* Subtle top line */}
      <div className="h-px w-full" style={{ backgroundColor: accentLine }} />

      <div className="px-16 py-14">
        {/* Elegant quote mark */}
        <div className="mb-8">
          <span className="font-serif text-9xl leading-none" style={{ color: quoteColor }}>
            "
          </span>
        </div>

        {/* Main text with generous typography */}
        <div className="mb-10">
          <p
            className="font-serif text-2xl leading-relaxed tracking-wide"
            style={{ color: textPrimary, textWrap: 'balance' }}
          >
            <StatusText item={data} text={data.text} />
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
            className="mb-10 rounded-xl p-5"
            style={{
              backgroundColor: isDark ? 'oklch(0.12 0.01 0)' : 'oklch(0.97 0.005 60)',
            }}
          >
            <div className="mb-3 flex items-center gap-3">
              <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-7" />
              <span className="font-serif text-sm" style={{ color: textSecondary }}>
                — @{data.retweetedStatus.author.name}
              </span>
              <span className="text-xs" style={{ color: textSecondary }}>
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

        {/* Divider */}
        <div className="mb-10 flex items-center gap-6">
          <div className="h-px flex-1" style={{ backgroundColor: accentLine }} />
          <div className="size-1.5 rounded-full" style={{ backgroundColor: accentLine }} />
          <div className="h-px flex-1" style={{ backgroundColor: accentLine }} />
        </div>

        {/* Author info */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <ShareCardAvatar
              author={data.author}
              sizeClassName="size-11"
              fallbackClassName="text-sm font-medium"
            />
            <div>
              <p className="text-base font-medium" style={{ color: textPrimary }}>
                @{data.author.name}
              </p>
              <p className="text-xs" style={{ color: textSecondary }}>
                {formatDate(data.createdAt)}
              </p>
              {(data.source || data.regionName) && (
                <p className="text-xs" style={{ color: textSecondary }}>
                  {data.source} {data.regionName}
                </p>
              )}
            </div>
          </div>
          <img src={WeiboLogo} alt="微博 Logo" className="size-8" />
        </div>

        {/* Stats */}
        {showStats && (
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Heart className="size-4" style={{ color: textSecondary }} />
              <span className="text-sm" style={{ color: textSecondary }}>
                {formatCount(data.stats.likes)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4" style={{ color: textSecondary }} />
              <span className="text-sm" style={{ color: textSecondary }}>
                {formatCount(data.stats.comments)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat2 className="size-4" style={{ color: textSecondary }} />
              <span className="text-sm" style={{ color: textSecondary }}>
                {formatCount(data.stats.reposts)}
              </span>
            </div>
          </div>
        )}

        {showLink && data.mblogId && (
          <div className="mt-6 flex items-center gap-1">
            <Link className="size-3" style={{ color: textSecondary }} />
            <span className="text-xs" style={{ color: textSecondary }}>
              weibo.com/{data.author.id}/{data.mblogId}
            </span>
          </div>
        )}
      </div>

      {/* Bottom line */}
      <div className="h-px w-full" style={{ backgroundColor: accentLine }} />
    </div>
  )
}
