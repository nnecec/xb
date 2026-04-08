import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import type { FeedItem } from "@/features/weibo/models/feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageCarousel } from "@/features/weibo/components/image-carousel";
import { loadStatusLongText } from "@/features/weibo/services/weibo-repository";

function formatCount(value: number) {
  if (value <= 9999) return String(value);
  return `${(value / 10000).toFixed(1)}万`;
}

export function FeedCard({
  item,
  onCommentClick,
}: {
  item: FeedItem;
  onCommentClick?: (item: FeedItem) => void;
}) {
  console.log("🚀 ~ FeedCard ~ item:", item);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [longTextEnabled, setLongTextEnabled] = useState(false);
  const { data: longText, isLoading: isLongTextLoading } = useQuery({
    queryKey: ["weibo", "longtext", item.mblogId],
    queryFn: () => loadStatusLongText(item.mblogId ?? ""),
    enabled: longTextEnabled && item.isLongText && Boolean(item.mblogId),
  });

  return (
    <>
      <Card className="gap-4 rounded-[28px] border-border/70 bg-card/95 py-4 shadow-none">
        <CardHeader className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 px-4">
          <Avatar className="size-12">
            <AvatarImage src={item.author.avatarUrl ?? undefined} alt={item.author.name} />
            <AvatarFallback className="text-sm font-semibold">
              {item.author.name?.slice(0, 1).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base">{item.author.name}</CardTitle>
              <Badge variant="secondary">{item.createdAtLabel || "Unknown time"}</Badge>
            </div>
            <CardDescription className="text-xs">
              {item.source ? `${item.source}` : ""} {item.regionName ? `· ${item.regionName}` : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4">
          <div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {longTextEnabled && longText ? longText : item.text || "No text content."}
            </p>
            {item.isLongText && !longTextEnabled ? (
              <Button
                className="mt-2"
                size="sm"
                variant="secondary"
                onClick={() => setLongTextEnabled(true)}
                disabled={isLongTextLoading}
              >
                {isLongTextLoading ? "加载中..." : "全文"}
              </Button>
            ) : null}
          </div>

          {item.media ? (
            item.media.type === "audio" ? (
              <audio controls src={item.media.streamUrl} className="w-full" />
            ) : (
              <video
                controls
                src={item.media.streamUrl}
                poster={item.media.coverUrl ?? undefined}
                className="w-full rounded-xl"
              />
            )
          ) : null}

          {item.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {item.images.slice(0, 9).map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-border/70"
                  onClick={() => setActiveImageIndex(index)}
                >
                  <img
                    src={image.thumbnailUrl}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              className="flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 text-left"
              onClick={() => onCommentClick?.(item)}
            >
              <MessageCircle className="size-3.5" />
              <span>{formatCount(item.stats.comments)}</span>
            </button>
            <div className="flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2">
              <Repeat2 className="size-3.5" />
              <span>{formatCount(item.stats.reposts)}</span>
            </div>
            <div className="flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2">
              <Heart className="size-3.5" />
              <span>{formatCount(item.stats.likes)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeImageIndex !== null && (
        <ImageCarousel
          images={item.images}
          activeIndex={activeImageIndex}
          onClose={() => setActiveImageIndex(null)}
          onNavigate={setActiveImageIndex}
        />
      )}
    </>
  );
}
