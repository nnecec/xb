import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import { useEmoticonConfigQuery } from '@/features/weibo/app/emoticon-query'
import { ImageCarousel } from '@/features/weibo/components/image-carousel'
import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import type { WeiboEmoticonItem } from '@/features/weibo/models/emoticon'
import type {
  FeedImage,
  FeedItem,
  FeedTopicEntity,
  FeedUrlEntity,
} from '@/features/weibo/models/feed'
import { useAppSettings } from '@/lib/app-settings-store'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `@name` followed by `:` or whitespace or end — matches Weibo `text_raw` mention style (e.g. `//@AIMIKKKK:`). */
const MENTION_PATTERN = /@([A-Za-z0-9_\u4e00-\u9fff-]+)(?=[:\s]|$)/g
const EMOTICON_PATTERN = /\[[^[\]]+\]/g
const REPLY_CHAIN_MARKER_PATTERN = /\/\/@([A-Za-z0-9_\u4e00-\u9fff-]+):/g
const LINK_TEXT_CLASS_NAME = 'text-primary underline underline-offset-2'
const INLINE_EMOTICON_CLASS_NAME = 'inline h-[1.2em] w-auto align-[-0.22em]'
const EMPTY_COMMENT_LABEL = 'No content.'
const EMPTY_STATUS_LABEL = 'No text content.'

type ReplyChainSegment = {
  screenName: string
  text: string
}

type ParsedReplyChainText =
  | {
      kind: 'plain'
      text: string
    }
  | {
      kind: 'reply-chain'
      leading: string
      replyChain: ReplyChainSegment[]
    }

type ImageExtractor = (text: string) => { strippedText: string; images: FeedImage[] }

function createImageExtractor(imageEntities: Record<string, FeedImage[]>): ImageExtractor {
  const consumed = new Set<string>()

  return (text: string) => {
    let stripped = text
    const matchedImages: FeedImage[] = []
    const seenIds = new Set<string>()

    for (const [shortUrl, images] of Object.entries(imageEntities)) {
      if (consumed.has(shortUrl)) continue
      if (!stripped.includes(shortUrl)) continue

      consumed.add(shortUrl)
      for (const image of images) {
        if (!seenIds.has(image.id)) {
          seenIds.add(image.id)
          matchedImages.push(image)
        }
      }
      stripped = stripped.split(shortUrl).join('')
    }

    stripped = stripped
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .trim()

    return { strippedText: stripped, images: matchedImages }
  }
}

function renderMentionLink(screenName: string, key: string, className = LINK_TEXT_CLASS_NAME) {
  return (
    <UserHoverCard key={key} screenName={screenName}>
      <Link to={`/n/${encodeURIComponent(screenName)}`} className={className}>
        @{screenName}
      </Link>
    </UserHoverCard>
  )
}

function renderInlineEmoticon(emoticon: WeiboEmoticonItem, key: string) {
  return (
    <img
      key={key}
      src={emoticon.url}
      alt={emoticon.phrase}
      className={INLINE_EMOTICON_CLASS_NAME}
    />
  )
}

function renderTextWithMentionsAndEmoticons(
  text: string,
  keyPrefix: string,
  phraseMap: Record<string, WeiboEmoticonItem>,
): ReactNode {
  if (!text) {
    return null
  }

  const tokenPattern = new RegExp(`${MENTION_PATTERN.source}|${EMOTICON_PATTERN.source}`, 'g')
  const mentionOnlyPattern = new RegExp(`^${MENTION_PATTERN.source}$`)
  const nodes: ReactNode[] = []
  let last = 0
  let seq = 0

  let match: RegExpExecArray | null
  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={`${keyPrefix}-t-${seq++}`}>{text.slice(last, match.index)}</span>)
    }

    const token = match[0]
    const mentionMatch = token.match(mentionOnlyPattern)
    if (mentionMatch) {
      nodes.push(renderMentionLink(mentionMatch[1] ?? '', `${keyPrefix}-@${seq++}`))
    } else {
      const emoticon = phraseMap[token]
      if (emoticon) {
        nodes.push(renderInlineEmoticon(emoticon, `${keyPrefix}-e-${seq++}`))
      } else {
        nodes.push(<span key={`${keyPrefix}-t-${seq++}`}>{token}</span>)
      }
    }

    last = match.index + token.length
  }

  if (last < text.length) {
    nodes.push(<span key={`${keyPrefix}-t-${seq++}`}>{text.slice(last)}</span>)
  }

  return nodes.length > 0 ? nodes : text
}

function renderEntityLink(entity: FeedUrlEntity, key: string) {
  return (
    <a
      key={key}
      href={entity.url}
      target="_blank"
      rel="noreferrer"
      className={LINK_TEXT_CLASS_NAME}
    >
      {entity.title}
    </a>
  )
}

function renderTopicLink(entity: FeedTopicEntity, key: string) {
  return (
    <a
      key={key}
      href={entity.url}
      target="_blank"
      rel="noreferrer"
      className={LINK_TEXT_CLASS_NAME}
    >
      #{entity.title}#
    </a>
  )
}

function renderTextWithEntities(
  text: string,
  keyPrefix: string,
  urlEntities: FeedUrlEntity[],
  topicEntities: FeedTopicEntity[] = [],
  phraseMap: Record<string, WeiboEmoticonItem>,
) {
  const urlEntityMap = new Map(urlEntities.map((entity) => [entity.shortUrl, entity]))
  const topicEntityMap = new Map(topicEntities.map((entity) => [`#${entity.title}#`, entity]))
  const patternParts = [
    ...urlEntities.map((entity) => escapeRegExp(entity.shortUrl)),
    ...topicEntities.map((entity) => escapeRegExp(`#${entity.title}#`)),
  ]

  if (patternParts.length === 0) {
    return [
      <span key={`${keyPrefix}-chunk-0`}>
        {renderTextWithMentionsAndEmoticons(text, `${keyPrefix}-c0`, phraseMap)}
      </span>,
    ]
  }

  const pattern = patternParts.join('|')
  const chunks = text.split(new RegExp(`(${pattern})`, 'g'))

  return chunks.map((chunk, index) => {
    const urlEntity = urlEntityMap.get(chunk)
    if (urlEntity) {
      return renderEntityLink(urlEntity, `${keyPrefix}-url-${index}`)
    }

    const topicEntity = topicEntityMap.get(chunk)
    if (topicEntity) {
      return renderTopicLink(topicEntity, `${keyPrefix}-topic-${index}`)
    }

    return (
      <span key={`${keyPrefix}-chunk-${index}`}>
        {renderTextWithMentionsAndEmoticons(chunk, `${keyPrefix}-c${index}`, phraseMap)}
      </span>
    )
  })
}

function parseReplyChainText(text: string): ParsedReplyChainText {
  if (!text.includes('//@')) {
    return { kind: 'plain', text }
  }

  const matches = Array.from(text.matchAll(REPLY_CHAIN_MARKER_PATTERN))
  if (matches.length === 0) {
    return { kind: 'plain', text }
  }

  const markerIndexes: number[] = []
  let markerSearchStart = 0
  while (true) {
    const markerIndex = text.indexOf('//@', markerSearchStart)
    if (markerIndex === -1) {
      break
    }
    markerIndexes.push(markerIndex)
    markerSearchStart = markerIndex + 3
  }

  if (
    markerIndexes.length !== matches.length ||
    matches.some((match, index) => match.index !== markerIndexes[index])
  ) {
    return { kind: 'plain', text }
  }

  const firstMatchIndex = matches[0]?.index
  if (firstMatchIndex === undefined) {
    return { kind: 'plain', text }
  }

  const replyChain: ReplyChainSegment[] = []
  const leading = text.slice(0, firstMatchIndex).trimEnd()

  for (const [index, match] of matches.entries()) {
    const matchIndex = match.index
    const marker = match[0]
    const rawScreenName = match[1]
    const nextMatchIndex = matches[index + 1]?.index ?? text.length

    if (matchIndex === undefined || !marker || !rawScreenName) {
      return { kind: 'plain', text }
    }

    const screenName = rawScreenName.trim()
    if (!screenName) {
      return { kind: 'plain', text }
    }

    replyChain.push({
      screenName,
      text: text.slice(matchIndex + marker.length, nextMatchIndex).trim(),
    })
  }

  if (replyChain.length === 0) {
    return { kind: 'plain', text }
  }

  return {
    kind: 'reply-chain',
    leading,
    replyChain,
  }
}

function renderInlineText(
  text: string,
  keyPrefix: string,
  urlEntities: FeedUrlEntity[],
  topicEntities: FeedTopicEntity[],
  phraseMap: Record<string, WeiboEmoticonItem>,
) {
  return renderTextWithEntities(text, keyPrefix, urlEntities, topicEntities, phraseMap)
}

function renderReplyChainItem(
  segment: ReplyChainSegment,
  index: number,
  urlEntities: FeedUrlEntity[],
  topicEntities: FeedTopicEntity[],
  phraseMap: Record<string, WeiboEmoticonItem>,
  extractImages: ImageExtractor,
) {
  const { strippedText, images } = extractImages(segment.text)
  return (
    <Item
      key={`chain-${segment.screenName}-${index}`}
      variant="muted"
      size="sm"
      className="bg-muted/40 flex-col items-stretch"
    >
      <ItemContent>
        <ItemTitle>
          {renderMentionLink(segment.screenName, `chain-label-${index}`, 'text-sm')}
        </ItemTitle>
        {strippedText ? (
          <ItemDescription className="text-sm">
            {renderInlineText(
              strippedText,
              `chain-${index}`,
              urlEntities,
              topicEntities,
              phraseMap,
            )}
          </ItemDescription>
        ) : null}
        {images.length > 0 ? <ImageCarousel images={images} /> : null}
      </ItemContent>
    </Item>
  )
}

function renderReplyChainText(
  parsed: Extract<ParsedReplyChainText, { kind: 'reply-chain' }>,
  urlEntities: FeedUrlEntity[],
  topicEntities: FeedTopicEntity[],
  phraseMap: Record<string, WeiboEmoticonItem>,
  extractImages: ImageExtractor,
  collapseRepliesEnabled: boolean,
) {
  const leading = parsed.leading ? extractImages(parsed.leading) : null
  const chain = parsed.replyChain

  if (collapseRepliesEnabled && chain.length > 2) {
    const firstItem = chain[0]
    const secondItem = chain[1]
    const middleItems = chain.slice(2, chain.length - 1)
    const lastItem = chain[chain.length - 1]

    return (
      <span className="flex flex-col gap-2">
        {leading && leading.strippedText ? (
          <span className="whitespace-pre-wrap">
            {renderInlineText(
              leading.strippedText,
              'leading',
              urlEntities,
              topicEntities,
              phraseMap,
            )}
          </span>
        ) : null}
        {leading && leading.images.length > 0 ? <ImageCarousel images={leading.images} /> : null}
        {renderReplyChainItem(firstItem, 0, urlEntities, topicEntities, phraseMap, extractImages)}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div>
              {renderReplyChainItem(
                secondItem,
                1,
                urlEntities,
                topicEntities,
                phraseMap,
                extractImages,
              )}
              <div className="flex items-center gap-1 px-4 py-1">
                <ChevronDown className="text-muted-foreground size-3 transition-transform data-[state=open]:rotate-180" />
                <span className="text-muted-foreground text-xs">{middleItems.length} 条回复</span>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ItemGroup data-testid="reply-chain">
              {middleItems.map((segment, idx) =>
                renderReplyChainItem(
                  segment,
                  idx + 2,
                  urlEntities,
                  topicEntities,
                  phraseMap,
                  extractImages,
                ),
              )}
            </ItemGroup>
          </CollapsibleContent>
        </Collapsible>
        {renderReplyChainItem(
          lastItem,
          chain.length - 1,
          urlEntities,
          topicEntities,
          phraseMap,
          extractImages,
        )}
      </span>
    )
  }

  return (
    <span className="flex flex-col gap-2">
      {leading && leading.strippedText ? (
        <span className="whitespace-pre-wrap">
          {renderInlineText(leading.strippedText, 'leading', urlEntities, topicEntities, phraseMap)}
        </span>
      ) : null}
      {leading && leading.images.length > 0 ? <ImageCarousel images={leading.images} /> : null}
      <ItemGroup data-testid="reply-chain">
        {chain.map((segment, index) =>
          renderReplyChainItem(
            segment,
            index,
            urlEntities,
            topicEntities,
            phraseMap,
            extractImages,
          ),
        )}
      </ItemGroup>
    </span>
  )
}

/** Plain text with @昵称 links (e.g. comments — no `urlEntities`). */
export function MentionInlineText({ text }: { text: string }) {
  const emoticonQuery = useEmoticonConfigQuery()
  const phraseMap = emoticonQuery.data?.phraseMap ?? {}
  const raw = text ?? ''
  if (!raw) {
    return <>{EMPTY_COMMENT_LABEL}</>
  }

  return (
    <span className="whitespace-pre-wrap">
      {renderTextWithMentionsAndEmoticons(raw, 'c', phraseMap)}
    </span>
  )
}

export function StatusText({
  item,
  text,
}: {
  item: Pick<FeedItem, 'emoticons' | 'urlEntities' | 'topicEntities' | 'imageEntities'>
  text: string
}) {
  const emoticonQuery = useEmoticonConfigQuery()
  const collapseRepliesEnabled = useAppSettings((s) => s.collapseRepliesEnabled)
  const phraseMap = {
    ...emoticonQuery.data?.phraseMap,
    ...item.emoticons,
  }
  const raw = text ?? ''
  if (!raw) {
    return <>{EMPTY_STATUS_LABEL}</>
  }

  const hasUrlEntities = Boolean(item.urlEntities && item.urlEntities.length > 0)
  const hasTopicEntities = Boolean(item.topicEntities && item.topicEntities.length > 0)
  const imageEntities = item.imageEntities ?? {}
  const extractImages = createImageExtractor(imageEntities)
  const parsedReplyChain = parseReplyChainText(raw)

  if (parsedReplyChain.kind === 'reply-chain') {
    return (
      <span className="whitespace-pre-wrap">
        {renderReplyChainText(
          parsedReplyChain,
          item.urlEntities ?? [],
          item.topicEntities ?? [],
          phraseMap,
          extractImages,
          collapseRepliesEnabled,
        )}
      </span>
    )
  }

  const { strippedText, images } = extractImages(raw)
  const hasImages = images.length > 0

  const textNode =
    hasUrlEntities || hasTopicEntities
      ? renderTextWithEntities(
          strippedText,
          'status',
          item.urlEntities ?? [],
          item.topicEntities ?? [],
          phraseMap,
        )
      : renderTextWithMentionsAndEmoticons(strippedText, 'm', phraseMap)

  if (hasImages) {
    return (
      <span className="flex flex-col gap-2">
        {strippedText ? <span className="whitespace-pre-wrap">{textNode}</span> : null}
        <ImageCarousel images={images} />
      </span>
    )
  }

  return <span className="whitespace-pre-wrap">{textNode}</span>
}
