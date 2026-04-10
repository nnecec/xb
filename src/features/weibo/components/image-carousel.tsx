import React from 'react'
import { PhotoProvider, PhotoView } from 'react-photo-view'

import { getUiPortalContainer } from '@/components/ui/portal'

import 'react-photo-view/dist/react-photo-view.css'

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
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <PhotoView key={index} src={image.largeUrl}>
              <img src={image.thumbnailUrl} className="aspect-square w-full object-cover" alt="" />
            </PhotoView>
          ))}
        </div>
      </PhotoProvider>
    </div>
  )
}
