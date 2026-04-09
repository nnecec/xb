import type { FeedImage } from '@/features/weibo/models/feed'

export function ImageGrid({
  images,
  onImageClick,
  className = 'grid grid-cols-3 gap-2',
}: {
  images: FeedImage[]
  onImageClick: (index: number) => void
  className?: string
}) {
  if (images.length === 0) {
    return null
  }

  return (
    <div className={className}>
      {images.slice(0, 9).map((image, index) => (
        <button
          key={image.id}
          type="button"
          className="overflow-hidden rounded-lg border border-border/70"
          onClick={() => onImageClick(index)}
        >
          <img src={image.thumbnailUrl} alt="" className="aspect-square w-full object-cover" />
        </button>
      ))}
    </div>
  )
}
