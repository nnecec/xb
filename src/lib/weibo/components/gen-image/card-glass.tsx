import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

export function CardGlass({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'
  const displayImages = data.images

  // Deep, rich gradients for glass effect
  const gradientBg = isDark
    ? 'linear-gradient(145deg, oklch(0.25 0.08 280), oklch(0.18 0.10 300), oklch(0.15 0.05 260))'
    : 'linear-gradient(145deg, oklch(0.88 0.03 280), oklch(0.82 0.05 300), oklch(0.78 0.04 260))'

  const glassBg = isDark ? 'oklch(0.20 0.06 280 / 0.6)' : 'oklch(1 0 0 / 0.7)'

  const glassBorder = isDark ? 'oklch(0.35 0.08 280 / 0.4)' : 'oklch(1 0 0 / 0.5)'

  const textPrimary = isDark ? 'oklch(0.95 0.0 0)' : 'oklch(0.15 0.02 280)'
  const textSecondary = isDark ? 'oklch(0.70 0.03 280)' : 'oklch(0.45 0.02 280)'
  const textTertiary = isDark ? 'oklch(0.55 0.03 280)' : 'oklch(0.60 0.02 280)'

  // Accent glow colors
  const glow1Color = isDark ? 'oklch(0.70 0.18 300)' : 'oklch(0.70 0.18 300)'
  const glow2Color = isDark ? 'oklch(0.65 0.18 350)' : 'oklch(0.65 0.18 350)'

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: '640px',
        background: gradientBg,
      }}
    >
      {/* Ambient glow effects */}
      <div
        className="absolute -top-32 -left-32 size-80 rounded-full opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${glow1Color} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute -right-32 -bottom-32 size-80 rounded-full opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${glow2Color} 0%, transparent 70%)`,
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${glow1Color} 0%, transparent 60%)`,
        }}
      />

      {/* Glass card */}
      <div className="relative m-4">
        <div
          className="overflow-hidden rounded-2xl border backdrop-blur-xl"
          style={{
            backgroundColor: glassBg,
            borderColor: glassBorder,
            borderWidth: '1px',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-4 px-6 py-5"
            style={{ borderBottomColor: glassBorder, borderBottomWidth: '1px' }}
          >
            <ShareCardAvatar author={data.author} sizeClassName="size-12" />
            <div>
              <p className="text-sm font-medium" style={{ color: textPrimary }}>
                {data.author.name}
              </p>
              <p className="text-xs" style={{ color: textSecondary }}>
                {formatDate(data.createdAt)}
              </p>
              {(data.source || data.regionName) && (
                <p className="text-xs" style={{ color: textTertiary }}>
                  {data.source} {data.regionName}
                </p>
              )}
            </div>
            <div className="ml-auto">
              <img src={WeiboLogo} alt="微博 Logo" className="size-9" />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="mb-6 text-lg leading-relaxed" style={{ color: textPrimary }}>
              <StatusText item={data} text={data.text} />
            </p>

            {/* Images */}
            <ShareCardImages
              images={displayImages}
              videoCoverUrl={data.videoCoverUrl}
              showFullImages={showFullImages}
            />

            {/* Retweeted content */}
            {data.retweetedStatus && (
              <div
                className="mb-6 rounded-xl p-4"
                style={{
                  backgroundColor: isDark
                    ? 'oklch(0.15 0.05 280 / 0.4)'
                    : 'oklch(0.97 0.01 280 / 0.5)',
                  borderColor: glassBorder,
                  borderWidth: '1px',
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-6" />
                  <span className="text-sm font-medium" style={{ color: textPrimary }}>
                    @{data.retweetedStatus.author.name}
                  </span>
                  <span className="text-xs" style={{ color: textSecondary }}>
                    {formatDate(data.retweetedStatus.createdAt)}
                  </span>
                </div>
                <p className="text-base leading-relaxed" style={{ color: textSecondary }}>
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

            {/* Stats */}
            {showStats && (
              <div className="mb-4 flex items-center gap-6">
                <div className="flex items-center gap-2" style={{ color: textSecondary }}>
                  <MessageCircle className="size-4" />
                  <span className="text-sm">{formatCount(data.stats.comments)}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: textSecondary }}>
                  <Repeat2 className="size-4" />
                  <span className="text-sm">{formatCount(data.stats.reposts)}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: textSecondary }}>
                  <Heart className="size-4" />
                  <span className="text-sm">{formatCount(data.stats.likes)}</span>
                </div>
              </div>
            )}

            {showLink && data.mblogId && (
              <div className="flex items-center gap-1" style={{ color: textTertiary }}>
                <Link className="size-3" />
                <span className="text-xs">
                  weibo.com/{data.author.id}/{data.mblogId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
