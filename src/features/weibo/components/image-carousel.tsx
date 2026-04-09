import { useEffect, useState } from 'react'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ImageCarouselProps {
  images: { id: string; thumbnailUrl: string; largeUrl: string }[]
  startIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageCarousel({ images, startIndex, open, onOpenChange }: ImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi | undefined>()
  const [current, setCurrent] = useState(startIndex)

  useEffect(() => {
    if (!api || !open) return
    api.scrollTo(startIndex, true)
    setCurrent(startIndex)
  }, [api, open, startIndex])

  useEffect(() => {
    if (!api) return
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="sr-only">图片预览</DialogTitle>
        <DialogDescription className="sr-only">
          第 {current + 1} 张，共 {images.length} 张
        </DialogDescription>
      </DialogHeader>
      <DialogContent className="sm:max-w-6xl border-none bg-transparent p-0 shadow-none">
        <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-8 text-sm text-white/70">
          {current + 1} / {images.length}
        </span>

        <Carousel className="w-full" opts={{ loop: true, startIndex }} setApi={setApi}>
          <CarouselContent>
            {images.map((image) => (
              <CarouselItem key={image.id} className="flex items-center justify-center">
                <img src={image.largeUrl} alt="" className="max-h-[85vh] w-full object-contain" />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 [&_svg]:size-6" />
          <CarouselNext className="right-2 [&_svg]:size-6" />
        </Carousel>
      </DialogContent>
    </Dialog>
  )
}
