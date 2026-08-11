import { ChevronRightIcon } from 'lucide-react'
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
import type { ContentDisplay, WeiboCardMediaCollapseType } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { useEmoticonConfigQuery } from '@/lib/weibo/app/emoticon-query'
import { CollapsibleMedia } from '@/lib/weibo/components/collapsible-media'
import { buildMediaCollectionItems, MediaCollection } from '@/lib/weibo/components/media-collection'
import { UserHoverCard } from '@/lib/weibo/components/user-hover-card'
import type { WeiboEmoticonItem } from '@/lib/weibo/models/emoticon'
import type { FeedItem, FeedTopicEntity } from '@/lib/weibo/models/feed'

import {
  interpretMentionContent,
  interpretStatusContent,
  type InterpretedReplySegment,
  type InterpretedStatusContent,
  type StatusContentBlock,
  type StatusContentToken,
} from './status-content-model'

const LINK_TEXT_CLASS_NAME = 'text-primary underline underline-offset-2'
const MENTION_TEXT_CLASS_NAME = 'text-primary'
const INLINE_EMOTICON_CLASS_NAME = 'inline h-[1.2em] w-auto align-[-0.22em]'
const EMPTY_COMMENT_LABEL = 'No content.'
const EMPTY_STATUS_LABEL = 'No text content.'

function withoutMarkdownNode<T extends { node?: unknown }>(props: T): Omit<T, 'node'> {
  const { node, ...rest } = props
  void node
  return rest
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

function renderStatusTokens(tokens: StatusContentToken[], keyPrefix: string) {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`
    if (token.kind === 'text') return <span key={key}>{token.text}</span>
    if (token.kind === 'mention') return renderMentionLink(token.screenName, key)
    if (token.kind === 'emoticon') return renderInlineEmoticon(token.emoticon, key)
    if (token.kind === 'topic') return <TopicLink key={key} entity={token.entity} topicKey={key} />
    if (!token.href) return <span key={key}>{token.title}</span>
    return (
      <a
        key={key}
        href={token.href}
        target="_blank"
        rel="noreferrer"
        className={LINK_TEXT_CLASS_NAME}
      >
        {token.title}
      </a>
    )
  })
}

function MarkdownText({ text }: { text: string }) {
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
            className={cn('mt-4 scroll-m-20 text-lg font-semibold first:mt-0', className)}
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
            className={cn('leading-normal [&:not(:first-child)]:mt-4', className)}
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
      {text}
    </ReactMarkdown>
  )
}

function ContentImages({
  block,
  imageDisplay,
  collapsedMediaTypes,
}: {
  block: StatusContentBlock
  imageDisplay: ContentDisplay
  collapsedMediaTypes?: WeiboCardMediaCollapseType[]
}) {
  if (block.images.length === 0) return null
  const display = collapsedMediaTypes?.includes(block.images.length >= 2 ? 'multiple' : 'image')
    ? 'collapsed'
    : imageDisplay
  return (
    <CollapsibleMedia display={display} summary={`此微博包含 ${block.images.length} 张图片`}>
      <MediaCollection items={buildMediaCollectionItems(block.images)} />
    </CollapsibleMedia>
  )
}

function ContentBlockView({
  block,
  keyPrefix,
  imageDisplay,
  collapsedMediaTypes,
}: {
  block: StatusContentBlock
  keyPrefix: string
  imageDisplay: ContentDisplay
  collapsedMediaTypes?: WeiboCardMediaCollapseType[]
}) {
  const textNode = renderStatusTokens(block.tokens, keyPrefix)
  if (block.images.length > 0) {
    return (
      <span className="flex flex-col gap-2">
        {block.text ? <span className="whitespace-pre-wrap">{textNode}</span> : null}
        <ContentImages
          block={block}
          imageDisplay={imageDisplay}
          collapsedMediaTypes={collapsedMediaTypes}
        />
      </span>
    )
  }
  return <span className="whitespace-pre-wrap">{textNode}</span>
}

function ReplySegmentView({
  segment,
  imageDisplay,
  collapsedMediaTypes,
}: {
  segment: InterpretedReplySegment
  imageDisplay: ContentDisplay
  collapsedMediaTypes?: WeiboCardMediaCollapseType[]
}) {
  return (
    <blockquote
      key={`chain-${segment.screenName}-${segment.index}`}
      className="flex-col items-stretch border-l-2 pl-6 italic"
    >
      {renderMentionLink(segment.screenName, `chain-label-${segment.index}`)}
      {segment.content.text ? (
        <span>: {renderStatusTokens(segment.content.tokens, `chain-${segment.index}`)}</span>
      ) : null}
      <ContentImages
        block={segment.content}
        imageDisplay={imageDisplay}
        collapsedMediaTypes={collapsedMediaTypes}
      />
    </blockquote>
  )
}

function ReplyChainView({
  content,
  imageDisplay,
  collapsedMediaTypes,
}: {
  content: Extract<InterpretedStatusContent, { kind: 'reply-chain' }>
  imageDisplay: ContentDisplay
  collapsedMediaTypes?: WeiboCardMediaCollapseType[]
}) {
  const leading = content.leading ? (
    <ContentBlockView
      block={content.leading}
      keyPrefix="leading"
      imageDisplay={imageDisplay}
      collapsedMediaTypes={collapsedMediaTypes}
    />
  ) : null

  if (content.chain.kind === 'collapsed') {
    return (
      <span className="flex flex-col gap-2 whitespace-pre-wrap">
        {leading}
        {content.chain.head.map((segment) => (
          <ReplySegmentView
            key={`chain-${segment.screenName}-${segment.index}`}
            segment={segment}
            imageDisplay={imageDisplay}
            collapsedMediaTypes={collapsedMediaTypes}
          />
        ))}
        {content.chain.middle.length > 0 ? (
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
                <span className="text-xs">{content.chain.middle.length} 条引用</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent data-testid="reply-chain" className="flex flex-col gap-2">
              {content.chain.middle.map((segment) => (
                <ReplySegmentView
                  key={`chain-${segment.screenName}-${segment.index}`}
                  segment={segment}
                  imageDisplay={imageDisplay}
                  collapsedMediaTypes={collapsedMediaTypes}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : null}
        <ReplySegmentView
          segment={content.chain.tail}
          imageDisplay={imageDisplay}
          collapsedMediaTypes={collapsedMediaTypes}
        />
      </span>
    )
  }

  return (
    <span className="flex flex-col gap-2 whitespace-pre-wrap">
      {leading}
      <div data-testid="reply-chain" className="flex flex-col gap-2">
        {content.chain.segments.map((segment) => (
          <ReplySegmentView
            key={`chain-${segment.screenName}-${segment.index}`}
            segment={segment}
            imageDisplay={imageDisplay}
            collapsedMediaTypes={collapsedMediaTypes}
          />
        ))}
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
      {renderStatusTokens(interpretMentionContent(raw, phraseMap), 'c')}
    </span>
  )
}

export function StatusText({
  item,
  text,
  mode = 'plain',
  hideMedia = false,
  imageDisplay = 'expanded',
  collapsedMediaTypes,
}: {
  item: Pick<
    FeedItem,
    'emoticons' | 'urlEntities' | 'topicEntities' | 'imageEntities' | 'isMarkdown' | 'markdownText'
  >
  text: string
  mode?: 'plain' | 'markdown'
  hideMedia?: boolean
  imageDisplay?: ContentDisplay
  collapsedMediaTypes?: WeiboCardMediaCollapseType[]
}) {
  const emoticonQuery = useEmoticonConfigQuery()
  const collapseRepliesEnabled = useAppSettings((s) => s.collapseRepliesEnabled)
  const renderReplyChainEnabled = useAppSettings((s) => s.renderReplyChainEnabled)
  const phraseMap = {
    ...emoticonQuery.data?.phraseMap,
    ...item.emoticons,
  }
  const content = interpretStatusContent({
    source: item,
    text: text ?? '',
    mode,
    hideMedia,
    renderReplyChain: renderReplyChainEnabled,
    collapseReplies: collapseRepliesEnabled,
    phraseMap,
  })

  if (content.kind === 'empty') return <>{EMPTY_STATUS_LABEL}</>
  if (content.kind === 'markdown') return <MarkdownText text={content.text} />
  if (content.kind === 'reply-chain') {
    return (
      <ReplyChainView
        content={content}
        imageDisplay={imageDisplay}
        collapsedMediaTypes={collapsedMediaTypes}
      />
    )
  }
  return (
    <ContentBlockView
      block={content.content}
      keyPrefix="status"
      imageDisplay={imageDisplay}
      collapsedMediaTypes={collapsedMediaTypes}
    />
  )
}
