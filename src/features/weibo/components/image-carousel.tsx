import React from 'react'
import { PhotoProvider, PhotoView } from 'react-photo-view'

import { getUiPortalContainer } from '@/components/ui/portal'

import 'react-photo-view/dist/react-photo-view.css'
import { cn } from '@/lib/utils'

interface ImageCarouselProps {
  images: { id: string; thumbnailUrl: string; largeUrl: string }[]
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const container = React.useMemo(() => getUiPortalContainer(), [])

  if (images.length === 0) {
    return null
  }

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <PhotoProvider portalContainer={container}>
        <div
          className={cn('grid gap-2', {
            'grid-cols-2': images.length <= 4,
            'grid-cols-3': images.length > 4 && images.length <= 9,
            'grid-cols-4': images.length > 9,
          })}
        >
          {images.map((image, index) => (
            <PhotoView key={index} src={image.largeUrl}>
              <img
                src={image.thumbnailUrl}
                className="aspect-square w-full object-cover rounded"
                alt=""
              />
            </PhotoView>
          ))}
        </div>
      </PhotoProvider>
    </div>
  )
}
