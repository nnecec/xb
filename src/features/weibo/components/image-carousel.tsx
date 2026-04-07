import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ImageCarouselProps {
  images: { id: string; thumbnailUrl: string; largeUrl: string }[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageCarousel({
  images,
  activeIndex,
  onClose,
  onNavigate,
}: ImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi | undefined>();

  useEffect(() => {
    if (!api) return;
    api.on("select", () => {
      onNavigate(api.selectedScrollSnap());
    });
  }, [api, onNavigate]);

  // Scroll to activeIndex when carousel mounts or activeIndex changes
  useEffect(() => {
    if (!api) return;
    api.scrollTo(activeIndex);
  }, [api, activeIndex]);

  // Keyboard support
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Close button */}
      <button
        type="button"
        aria-label="关闭"
        className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>

      {/* Counter */}
      <span className="absolute left-1/2 top-4 -translate-x-1/2 text-sm text-white/70">
        {activeIndex + 1} / {images.length}
      </span>

      {/* Carousel */}
      <div className="relative w-full max-w-4xl">
        <Carousel
          className="w-full"
          opts={{ loop: true }}
          setApi={setApi}
        >
          <CarouselContent>
            {images.map((image) => (
              <CarouselItem key={image.id}>
                <div className="flex items-center justify-center p-4">
                  <img
                    src={image.largeUrl}
                    alt=""
                    className="max-h-[90vh] w-full object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 text-white hover:bg-white/10 [&_svg]:size-6" />
          <CarouselNext className="right-2 text-white hover:bg-white/10 [&_svg]:size-6" />
        </Carousel>
      </div>
    </div>
  );
}
