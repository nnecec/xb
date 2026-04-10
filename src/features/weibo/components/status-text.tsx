import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useEmoticonConfigQuery } from '@/features/weibo/app/emoticon-query'
import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import type { WeiboEmoticonItem } from '@/features/weibo/models/emoticon'
import type { FeedItem, FeedTopicEntity, FeedUrlEntity } from '@/features/weibo/models/feed'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `@name` followed by `:` or whitespace or end — matches Weibo `text_raw` mention style (e.g. `//@AIMIKKKK:`). */
const MENTION_PATTERN = /@([A-Za-z0-9_\u4e00-\u9fff-]+)(?=[:\s]|$)/g
const EMOTICON_PATTERN = /\[[^[\]]+\]/g
const LINK_TEXT_CLASS_NAME = 'text-primary underline underline-offset-2'
const INLINE_EMOTICON_CLASS_NAME = 'inline h-[1.2em] w-auto align-[-0.22em]'
const EMPTY_COMMENT_LABEL = 'No content.'
const EMPTY_STATUS_LABEL = 'No text content.'

function renderMentionLink(screenName: string, key: string) {
  return (
    <UserHoverCard key={key} screenName={screenName}>
      <Link to={`/n/${encodeURIComponent(screenName)}`} className={LINK_TEXT_CLASS_NAME}>
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
    <a key={key} href={entity.url} target="_blank" rel="noreferrer" className={LINK_TEXT_CLASS_NAME}>
      #{entity.title}#
    </a>
  )
}

function renderTextWithEntities(
  text: string,
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
    return [<span key="chunk-0">{renderTextWithMentionsAndEmoticons(text, 'c0', phraseMap)}</span>]
  }

  const pattern = patternParts.join('|')
  const chunks = text.split(new RegExp(`(${pattern})`, 'g'))

  return chunks.map((chunk, index) => {
    const urlEntity = urlEntityMap.get(chunk)
    if (urlEntity) {
      return renderEntityLink(urlEntity, `url-${index}`)
    }

    const topicEntity = topicEntityMap.get(chunk)
    if (topicEntity) {
      return renderTopicLink(topicEntity, `topic-${index}`)
    }

    return (
      <span key={`chunk-${index}`}>
        {renderTextWithMentionsAndEmoticons(chunk, `c${index}`, phraseMap)}
      </span>
    )
  })
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
  item: Pick<FeedItem, 'urlEntities' | 'topicEntities'>
  text: string
}) {
  const emoticonQuery = useEmoticonConfigQuery()
  const phraseMap = emoticonQuery.data?.phraseMap ?? {}
  const raw = text ?? ''
  if (!raw) {
    return <>{EMPTY_STATUS_LABEL}</>
  }

  const hasUrlEntities = Boolean(item.urlEntities && item.urlEntities.length > 0)
  const hasTopicEntities = Boolean(item.topicEntities && item.topicEntities.length > 0)

  if (!hasUrlEntities && !hasTopicEntities) {
    return (
      <span className="whitespace-pre-wrap">
        {renderTextWithMentionsAndEmoticons(raw, 'm', phraseMap)}
      </span>
    )
  }

  return (
    <span className="whitespace-pre-wrap">
      {renderTextWithEntities(raw, item.urlEntities ?? [], item.topicEntities ?? [], phraseMap)}
    </span>
  )
}
