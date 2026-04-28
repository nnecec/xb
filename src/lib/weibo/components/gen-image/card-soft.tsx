import { Heart, Link, MessageCircle, Repeat2 } from 'lucide-react'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { StatusText } from '@/lib/weibo/components/status-text'

import { formatCount, formatDate, ShareCardAvatar, ShareCardImages } from './share-card-content'
import type { ShareCardProps } from './types'

// Decorative cloud shape
function Cloud({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 100 60" className={className} fill={color}>
      <ellipse cx="30" cy="40" rx="25" ry="18" />
      <ellipse cx="55" cy="35" rx="30" ry="22" />
      <ellipse cx="75" cy="42" rx="20" ry="15" />
      <ellipse cx="45" cy="25" rx="20" ry="15" />
    </svg>
  )
}

// Sparkle decoration
function Sparkle({ className, color }: { className?: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={color}>
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  )
}

export function CardSoft({
  data,
  theme = 'light',
  showStats = true,
  showLink = false,
  showFullImages = false,
}: ShareCardProps) {
  const isDark = theme === 'dark'
  const displayImages = data.images

  // Soft, dreamy palette
  const bgGradient = isDark
    ? 'linear-gradient(135deg, oklch(0.18 0.05 280), oklch(0.12 0.03 300), oklch(0.15 0.04 260))'
    : 'linear-gradient(135deg, oklch(0.95 0.02 280), oklch(0.93 0.03 320), oklch(0.94 0.02 260))'

  const cardBg = isDark ? 'oklch(0.20 0.03 280 / 0.85)' : 'oklch(0.99 0.0 0 / 0.85)'
  const textPrimary = isDark ? 'oklch(0.92 0.01 280)' : 'oklch(0.25 0.02 280)'
  const textSecondary = isDark ? 'oklch(0.60 0.02 280)' : 'oklch(0.50 0.02 280)'
  const textTertiary = isDark ? 'oklch(0.50 0.02 280)' : 'oklch(0.55 0.02 280)'

  // Soft accent colors
  const cloudColor1 = isDark ? 'oklch(0.35 0.06 300 / 0.3)' : 'oklch(0.85 0.04 320 / 0.5)'
  const cloudColor2 = isDark ? 'oklch(0.30 0.06 260 / 0.3)' : 'oklch(0.82 0.04 280 / 0.5)'
  const cloudColor3 = isDark ? 'oklch(0.32 0.06 340 / 0.3)' : 'oklch(0.88 0.04 340 / 0.5)'
  const sparkleColor = isDark ? 'oklch(0.70 0.10 80 / 0.6)' : 'oklch(0.75 0.10 80 / 0.7)'

  // Stat badge colors
  const likeBg = isDark ? 'oklch(0.30 0.12 350 / 0.3)' : 'oklch(0.95 0.05 350 / 0.5)'
  const likeText = isDark ? 'oklch(0.80 0.15 350)' : 'oklch(0.55 0.15 350)'
  const commentBg = isDark ? 'oklch(0.30 0.10 280 / 0.3)' : 'oklch(0.94 0.04 280 / 0.5)'
  const commentText = isDark ? 'oklch(0.75 0.12 280)' : 'oklch(0.55 0.12 280)'
  const repostBg = isDark ? 'oklch(0.30 0.10 160 / 0.3)' : 'oklch(0.94 0.04 160 / 0.5)'
  const repostText = isDark ? 'oklch(0.75 0.12 160)' : 'oklch(0.55 0.12 160)'

  return (
    <div className="relative overflow-hidden" style={{ width: '640px', background: bgGradient }}>
      {/* Decorative clouds */}
      <Cloud className="absolute -top-12 -left-12 size-40" color={cloudColor1} />
      <Cloud className="absolute -top-6 -right-8 size-32" color={cloudColor2} />
      <Cloud className="absolute right-8 -bottom-12 size-28" color={cloudColor3} />

      {/* Sparkle decorations */}
      <Sparkle className="absolute top-20 right-20 size-4" color={sparkleColor} />
      <Sparkle className="absolute bottom-32 left-20 size-3" color={sparkleColor} />
      <Sparkle className="absolute top-40 right-12 size-3" color={sparkleColor} />
      <Sparkle className="absolute right-32 bottom-20 size-2" color={sparkleColor} />

      {/* Main card */}
      <div className="relative p-6">
        <div
          className="rounded-3xl p-6 shadow-lg"
          style={{
            backgroundColor: cardBg,
            backdropFilter: 'blur(12px)',
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ShareCardAvatar author={data.author} sizeClassName="size-12" />
              <div>
                <p className="text-base font-semibold" style={{ color: textPrimary }}>
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
            <div className="flex items-center gap-3">
              <img src={WeiboLogo} alt="微博 Logo" className="size-8" />
              <span
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{
                  backgroundColor: isDark
                    ? 'oklch(0.30 0.08 80 / 0.4)'
                    : 'oklch(0.92 0.08 80 / 0.6)',
                  color: isDark ? 'oklch(0.80 0.10 80)' : 'oklch(0.45 0.08 80)',
                }}
              >
                ✦
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p
              className="text-xl leading-relaxed"
              style={{ color: textPrimary, textWrap: 'balance' }}
            >
              <StatusText item={data} text={data.text} />
            </p>
          </div>

          {/* Images */}
          <ShareCardImages images={displayImages} showFullImages={showFullImages} />

          {/* Retweeted content */}
          {data.retweetedStatus && (
            <div
              className="mb-6 rounded-2xl p-4"
              style={{
                backgroundColor: isDark
                  ? 'oklch(0.15 0.03 280 / 0.4)'
                  : 'oklch(0.95 0.02 280 / 0.6)',
              }}
            >
              <div className="mb-2 flex items-center gap-2">
                <ShareCardAvatar author={data.retweetedStatus.author} sizeClassName="size-6" />
                <span className="text-sm font-medium" style={{ color: textSecondary }}>
                  @{data.retweetedStatus.author.name}
                </span>
                <span className="text-xs" style={{ color: textTertiary }}>
                  {formatDate(data.retweetedStatus.createdAt)}
                </span>
              </div>
              <p className="text-base leading-relaxed" style={{ color: textPrimary }}>
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

          {/* Stats as soft badges */}
          {showStats && (
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ backgroundColor: likeBg }}
              >
                <Heart className="size-4" style={{ color: likeText }} />
                <span className="text-sm font-medium" style={{ color: likeText }}>
                  {formatCount(data.stats.likes)}
                </span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ backgroundColor: commentBg }}
              >
                <MessageCircle className="size-4" style={{ color: commentText }} />
                <span className="text-sm font-medium" style={{ color: commentText }}>
                  {formatCount(data.stats.comments)}
                </span>
              </div>
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ backgroundColor: repostBg }}
              >
                <Repeat2 className="size-4" style={{ color: repostText }} />
                <span className="text-sm font-medium" style={{ color: repostText }}>
                  {formatCount(data.stats.reposts)}
                </span>
              </div>
            </div>
          )}

          {showLink && data.mblogId && (
            <div className="flex items-center gap-1">
              <Link className="size-3" style={{ color: textTertiary }} />
              <span className="text-xs" style={{ color: textTertiary }}>
                weibo.com/{data.author.id}/{data.mblogId}
              </span>
            </div>
          )}
        </div>

        {/* Bottom sparkle */}
        <Sparkle
          className="absolute bottom-3 left-1/2 size-3 -translate-x-1/2"
          color={sparkleColor}
        />
      </div>
    </div>
  )
}
