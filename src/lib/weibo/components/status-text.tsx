import { ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { useEmoticonConfigQuery } from '@/lib/weibo/app/emoticon-query'
import { ImageCarousel } from '@/lib/weibo/components/image-carousel'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import type { WeiboEmoticonItem } from '@/lib/weibo/models/emoticon'
import type { FeedImage, FeedItem, FeedTopicEntity, FeedUrlEntity } from '@/lib/weibo/models/feed'
import { normalizeSafeExternalUrl } from '@/lib/weibo/utils/safe-url'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `@name` followed by `:` or whitespace or end — matches Weibo `text_raw` mention style (e.g. `//@AIMIKKKK:`). */
const MENTION_PATTERN = /@([A-Za-z0-9_\u4e00-\u9fff-]+)(?=[:\s]|$)/g
const EMOTICON_PATTERN = /\[[^[\]]+\]/g
const REPLY_CHAIN_MARKER_PATTERN = /\/\/@([A-Za-z0-9_\u4e00-\u9fff-]+):/g
const LINK_TEXT_CLASS_NAME = 'text-primary underline underline-offset-2'
const MENTION_TEXT_CLASS_NAME = 'text-primary'
const INLINE_EMOTICON_CLASS_NAME = 'inline h-[1.2em] w-auto align-[-0.22em]'
const EMPTY_COMMENT_LABEL = 'No content.'
const EMPTY_STATUS_LABEL = 'No text content.'

function sanitizeMarkdownText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<span\b(?=[^>]*\bclass=(["'])[^"']*\bexpand\b[^"']*\1)[^>]*>.*?<\/span>/gi, '')
}

function withoutMarkdownNode<T extends { node?: unknown }>(props: T): Omit<T, 'node'> {
  const { node, ...rest } = props
  void node
  return rest
}

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
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .trim()

    return { strippedText: stripped, images: matchedImages }
  }
}

function renderMentionLink(screenName: string, key: string) {
  return (
    <UserHoverCard key={key} screenName={screenName}>
      <Link to={`/n/${encodeURIComponent(screenName)}`} className={MENTION_TEXT_CLASS_NAME}>
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
      width={20}
      height={20}
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
  const href = normalizeSafeExternalUrl(entity.url)
  if (!href) {
    return <span key={key}>{entity.title}</span>
  }

  return (
    <a key={key} href={href} target="_blank" rel="noreferrer" className={LINK_TEXT_CLASS_NAME}>
      {entity.title}
    </a>
  )
}

function TopicLink({ entity, topicKey }: { entity: FeedTopicEntity; topicKey: string }) {
  const xbTopicPage = useAppSettings((s) => s.xbTopicPage)

  if (!xbTopicPage) {
    return (
      <a
        key={topicKey}
        href={`https://s.weibo.com/weibo?q=${encodeURIComponent(`#${entity.title}#`)}`}
        target="_blank"
        rel="noreferrer"
        className={LINK_TEXT_CLASS_NAME}
      >
        #{entity.title}#
      </a>
    )
  }

  return (
    <Link key={topicKey} to={entity.url} className={LINK_TEXT_CLASS_NAME}>
      #{entity.title}#
    </Link>
  )
}

function renderTopicLink(entity: FeedTopicEntity, key: string) {
  return <TopicLink entity={entity} topicKey={key} />
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

function MarkdownText({ text }: { text: string }) {
  const safeText = sanitizeMarkdownText(text)

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        a: ({ className, href, children, ...props }) => (
          <a
            {...withoutMarkdownNode(props)}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={cn('font-medium text-primary underline underline-offset-4', className)}
          >
            {children}
          </a>
        ),
        blockquote: ({ className, children, ...props }) => (
          <blockquote
            {...withoutMarkdownNode(props)}
            className={cn('mt-4 border-l-2 pl-4 italic', className)}
          >
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => (
          <code
            {...withoutMarkdownNode(props)}
            className={cn(
              'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
              className,
            )}
          >
            {children}
          </code>
        ),
        h1: ({ className, children, ...props }) => (
          <h1
            {...withoutMarkdownNode(props)}
            className={cn(
              'mt-5 scroll-m-20 text-xl font-semibold text-balance first:mt-0',
              className,
            )}
          >
            {children}
          </h1>
        ),
        h2: ({ className, children, ...props }) => (
          <h2
            {...withoutMarkdownNode(props)}
            className={cn(
              'mt-5 scroll-m-20 border-b pb-1.5 text-lg font-semibold first:mt-0',
              className,
            )}
          >
            {children}
          </h2>
        ),
        h3: ({ className, children, ...props }) => (
          <h3
            {...withoutMarkdownNode(props)}
            className={cn('mt-4 scroll-m-20 text-[1.0625rem] font-semibold first:mt-0', className)}
          >
            {children}
          </h3>
        ),
        h4: ({ className, children, ...props }) => (
          <h4
            {...withoutMarkdownNode(props)}
            className={cn('mt-3 scroll-m-20 text-base font-semibold first:mt-0', className)}
          >
            {children}
          </h4>
        ),
        hr: ({ className, ...props }) => (
          <hr {...withoutMarkdownNode(props)} className={cn('border-border my-3', className)} />
        ),
        img: () => null,
        li: ({ className, children, ...props }) => (
          <li {...withoutMarkdownNode(props)} className={className}>
            {children}
          </li>
        ),
        ol: ({ className, children, ...props }) => (
          <ol
            {...withoutMarkdownNode(props)}
            className={cn('my-4 ml-6 list-decimal [&>li]:mt-1.5', className)}
          >
            {children}
          </ol>
        ),
        p: ({ className, children, ...props }) => (
          <p
            {...withoutMarkdownNode(props)}
            className={cn('leading-7 [&:not(:first-child)]:mt-4', className)}
          >
            {children}
          </p>
        ),
        pre: ({ className, children, ...props }) => (
          <pre
            {...withoutMarkdownNode(props)}
            className={cn(
              'bg-muted my-2 overflow-x-auto rounded-md p-3 font-mono text-[0.92em] whitespace-pre',
              className,
            )}
          >
            {children}
          </pre>
        ),
        caption: ({ className, children, ...props }) => (
          <TableCaption {...withoutMarkdownNode(props)} className={className}>
            {children}
          </TableCaption>
        ),
        table: ({ className, children, ...props }) => (
          <div className="my-4 w-full overflow-y-auto">
            <Table {...withoutMarkdownNode(props)} className={cn('w-full', className)}>
              {children}
            </Table>
          </div>
        ),
        tbody: ({ className, children, ...props }) => (
          <TableBody {...withoutMarkdownNode(props)} className={className}>
            {children}
          </TableBody>
        ),
        td: ({ className, children, ...props }) => (
          <TableCell
            {...withoutMarkdownNode(props)}
            className={cn(
              'border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right',
              className,
            )}
          >
            {children}
          </TableCell>
        ),
        th: ({ className, children, ...props }) => (
          <TableHead
            {...withoutMarkdownNode(props)}
            className={cn(
              'border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right',
              className,
            )}
          >
            {children}
          </TableHead>
        ),
        thead: ({ className, children, ...props }) => (
          <TableHeader {...withoutMarkdownNode(props)} className={className}>
            {children}
          </TableHeader>
        ),
        tr: ({ className, children, ...props }) => (
          <TableRow
            {...withoutMarkdownNode(props)}
            className={cn('m-0 border-t p-0 even:bg-muted', className)}
          >
            {children}
          </TableRow>
        ),
        ul: ({ className, children, ...props }) => (
          <ul
            {...withoutMarkdownNode(props)}
            className={cn('my-4 ml-6 list-disc [&>li]:mt-1.5', className)}
          >
            {children}
          </ul>
        ),
      }}
    >
      {safeText}
    </ReactMarkdown>
  )
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
    <blockquote
      key={`chain-${segment.screenName}-${index}`}
      className="flex-col items-stretch border-l-2 pl-6 italic"
    >
      {renderMentionLink(segment.screenName, `chain-label-${index}`)}
      {strippedText ? (
        <span>
          :{' '}
          {renderInlineText(strippedText, `chain-${index}`, urlEntities, topicEntities, phraseMap)}
        </span>
      ) : null}
      {images.length > 0 ? <ImageCarousel images={images} /> : null}
    </blockquote>
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
        {renderReplyChainItem(secondItem, 1, urlEntities, topicEntities, phraseMap, extractImages)}
        {middleItems.length > 0 ? (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="group mt-2 flex w-fit items-center gap-1"
                onClick={(event) => event.stopPropagation()}
              >
                <ChevronRightIcon className="size-3 transition-transform group-data-[state=open]:rotate-90" />
                <span className="text-xs">{middleItems.length} 条引用</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent data-testid="reply-chain" className="flex flex-col gap-2">
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
            </CollapsibleContent>
          </Collapsible>
        ) : null}
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
      <div data-testid="reply-chain" className="flex flex-col gap-2">
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
      </div>
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
  mode = 'plain',
  hideMedia = false,
}: {
  item: Pick<
    FeedItem,
    'emoticons' | 'urlEntities' | 'topicEntities' | 'imageEntities' | 'isMarkdown' | 'markdownText'
  >
  text: string
  mode?: 'plain' | 'markdown'
  hideMedia?: boolean
}) {
  const emoticonQuery = useEmoticonConfigQuery()
  const collapseRepliesEnabled = useAppSettings((s) => s.collapseRepliesEnabled)
  const renderReplyChainEnabled = useAppSettings((s) => s.renderReplyChainEnabled)
  const phraseMap = {
    ...(hideMedia ? {} : emoticonQuery.data?.phraseMap),
    ...(hideMedia ? {} : item.emoticons),
  }
  const raw = text ?? ''
  if (!raw) {
    return <>{EMPTY_STATUS_LABEL}</>
  }

  if (mode === 'markdown' && item.isMarkdown && item.markdownText) {
    return <MarkdownText text={item.markdownText} />
  }

  const hasUrlEntities = Boolean(item.urlEntities && item.urlEntities.length > 0)
  const hasTopicEntities = Boolean(item.topicEntities && item.topicEntities.length > 0)
  const imageEntities = item.imageEntities ?? {}
  const extractImages: ImageExtractor = hideMedia
    ? (value) => ({ strippedText: value, images: [] })
    : createImageExtractor(imageEntities)
  const parsedReplyChain = parseReplyChainText(raw)
  const shouldRenderAsReplyChain =
    renderReplyChainEnabled && parsedReplyChain.kind === 'reply-chain'

  if (shouldRenderAsReplyChain) {
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
