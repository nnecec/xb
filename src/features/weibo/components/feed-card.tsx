import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import type { FeedImage, FeedItem } from "@/features/weibo/models/feed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageCarousel } from "@/features/weibo/components/image-carousel";
import { StatusText } from "@/features/weibo/components/status-text";
import { UserHoverCard } from "@/features/weibo/components/user-hover-card";
import { loadStatusLongText } from "@/features/weibo/services/weibo-repository";
import { AspectRatio } from "@/components/ui/aspect-ratio";

function formatCount(value: number) {
  if (value <= 9999) return String(value);
  return `${(value / 10000).toFixed(1)}万`;
}

function FeedMediaBlock({ item }: { item: FeedItem }) {
  if (!item.media) {
    return null;
  }

  return item.media.type === "audio" ? (
    <audio controls src={item.media.streamUrl} className="w-full" />
  ) : (
    <AspectRatio ratio={16 / 9}>
      <video
        controls
        src={item.media.streamUrl}
        poster={item.media.coverUrl ?? undefined}
        className="w-full rounded-xl object-contain h-full"
      />
    </AspectRatio>
  );
}

export function FeedCard({
  item,
  onCommentClick,
}: {
  item: FeedItem;
  onCommentClick?: (item: FeedItem) => void;
}) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [startImageIndex, setStartImageIndex] = useState(0);
  /** When set, preview dialog shows this list (retweet gallery); otherwise main post `item.images`. */
  const [carouselImages, setCarouselImages] = useState<FeedImage[] | null>(null);
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
          <UserHoverCard uid={item.author.id}>
            <button type="button" className="cursor-pointer">
              <Avatar className="size-12">
                <AvatarImage src={item.author.avatarUrl ?? undefined} alt={item.author.name} />
                <AvatarFallback className="text-sm font-semibold">
                  {item.author.name?.slice(0, 1).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </UserHoverCard>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <UserHoverCard uid={item.author.id}>
                <button type="button" className="cursor-pointer">
                  <CardTitle className="truncate text-base hover:underline">
                    {item.author.name}
                  </CardTitle>
                </button>
              </UserHoverCard>
              <Badge variant="secondary">{item.createdAtLabel || "Unknown time"}</Badge>
            </div>
            <CardDescription className="text-xs">
              {item.source ? `${item.source}` : ""} {item.regionName ? `${item.regionName}` : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4">
          <div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              <StatusText item={item} text={longTextEnabled && longText ? longText : item.text} />
            </p>
            {item.isLongText && !longTextEnabled ? (
              <Button
                className="mt-2"
                size="xs"
                variant="secondary"
                onClick={() => setLongTextEnabled(true)}
                disabled={isLongTextLoading}
              >
                {isLongTextLoading ? "加载中..." : "全文"}
              </Button>
            ) : null}
          </div>

          <FeedMediaBlock item={item} />

          {item.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {item.images.slice(0, 9).map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className="overflow-hidden rounded-lg border border-border/70"
                  onClick={() => {
                    setCarouselImages(null);
                    setStartImageIndex(index);
                    setImageDialogOpen(true);
                  }}
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

          {item.retweetedStatus ? (
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
              <div className="mb-3 grid grid-cols-[36px_minmax(0,1fr)] gap-2">
                <UserHoverCard uid={item.retweetedStatus.author.id}>
                  <button type="button" className="cursor-pointer">
                    <Avatar className="size-9">
                      <AvatarImage
                        src={item.retweetedStatus.author.avatarUrl ?? undefined}
                        alt={item.retweetedStatus.author.name}
                      />
                      <AvatarFallback className="text-xs font-semibold">
                        {item.retweetedStatus.author.name?.slice(0, 1).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </UserHoverCard>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserHoverCard uid={item.retweetedStatus.author.id}>
                      <button type="button" className="cursor-pointer text-left">
                        <p className="truncate text-sm font-medium text-foreground hover:underline">
                          @{item.retweetedStatus.author.name}
                        </p>
                      </button>
                    </UserHoverCard>
                    <Badge variant="secondary">
                      {item.retweetedStatus.createdAtLabel || "Unknown time"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.retweetedStatus.source ? `${item.retweetedStatus.source}` : ""}{" "}
                    {item.retweetedStatus.regionName ? `· ${item.retweetedStatus.regionName}` : ""}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                <StatusText item={item.retweetedStatus} text={item.retweetedStatus.text} />
              </p>
              <div className="mt-3">
                <FeedMediaBlock item={item.retweetedStatus} />
              </div>
              {item.retweetedStatus.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {item.retweetedStatus.images.slice(0, 9).map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      className="overflow-hidden rounded-lg border border-border/70"
                      onClick={() => {
                        setCarouselImages(item.retweetedStatus!.images);
                        setStartImageIndex(index);
                        setImageDialogOpen(true);
                      }}
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

      <ImageCarousel
        images={carouselImages ?? item.images}
        startIndex={startImageIndex}
        open={imageDialogOpen}
        onOpenChange={(open) => {
          setImageDialogOpen(open);
          if (!open) setCarouselImages(null);
        }}
      />
    </>
  );
}
