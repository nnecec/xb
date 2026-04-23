import React from 'react'
import { PhotoProvider, PhotoView } from 'react-photo-view'

import { getUiPortalContainer } from '@/components/ui/portal'

import 'react-photo-view/dist/react-photo-view.css'
import { useAppSettings } from '@/lib/app-settings-store'

interface ImageCarouselProps {
  images: { id: string; thumbnailUrl: string; largeUrl: string }[]
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const container = React.useMemo(() => getUiPortalContainer(), [])
  const darkModeImageDim = useAppSettings((s) => s.darkModeImageDim)

  if (images.length === 0) {
    return null
  }

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <PhotoProvider portalContainer={container}>
        <div
          className={`grid gap-2 ${
            images.length <= 4 ? 'grid-cols-2' : images.length <= 9 ? 'grid-cols-3' : 'grid-cols-4'
          }`}
        >
          {images.map((image, index) => (
            <PhotoView key={index} src={image.largeUrl}>
              <div className="border-foreground/10 relative overflow-hidden rounded-xl border">
                {darkModeImageDim && (
                  <div className="absolute top-0 right-0 bottom-0 left-0 dark:bg-neutral-500/20" />
                )}
                <img
                  src={image.thumbnailUrl}
                  className="aspect-square w-full object-cover"
                  alt=""
                />
              </div>
            </PhotoView>
          ))}
        </div>
      </PhotoProvider>
    </div>
  )
}
