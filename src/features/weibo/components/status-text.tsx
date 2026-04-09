import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import type { FeedItem, FeedUrlEntity } from '@/features/weibo/models/feed'

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** `@name` followed by `:` or whitespace or end — matches Weibo `text_raw` mention style (e.g. `//@AIMIKKKK:`). */
const MENTION_PATTERN = /@([A-Za-z0-9_\u4e00-\u9fff-]+)(?=[:\s]|$)/g
const LINK_TEXT_CLASS_NAME = 'text-primary underline underline-offset-2'
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

function renderTextWithMentions(text: string, keyPrefix: string): ReactNode {
  if (!text) {
    return null
  }

  const nodes: ReactNode[] = []
  let last = 0
  let seq = 0
  const re = new RegExp(MENTION_PATTERN.source, MENTION_PATTERN.flags)
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={`${keyPrefix}-t-${seq++}`}>{text.slice(last, match.index)}</span>)
    }
    const screenName = match[1] ?? ''
    nodes.push(renderMentionLink(screenName, `${keyPrefix}-@${seq++}`))
    last = match.index + match[0].length
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
      href={entity.shortUrl}
      target="_blank"
      rel="noreferrer"
      className={LINK_TEXT_CLASS_NAME}
    >
      {entity.title}
    </a>
  )
}

function renderTextWithEntities(text: string, entities: FeedUrlEntity[]) {
  const entityMap = new Map(entities.map((entity) => [entity.shortUrl, entity]))
  const pattern = entities.map((entity) => escapeRegExp(entity.shortUrl)).join('|')
  const chunks = text.split(new RegExp(`(${pattern})`, 'g'))

  return chunks.map((chunk, index) => {
    const entity = entityMap.get(chunk)
    if (entity) {
      return renderEntityLink(entity, `url-${index}`)
    }

    return <span key={`chunk-${index}`}>{renderTextWithMentions(chunk, `c${index}`)}</span>
  })
}

/** Plain text with @昵称 links (e.g. comments — no `urlEntities`). */
export function MentionInlineText({ text }: { text: string }) {
  const raw = text ?? ''
  if (!raw) {
    return <>{EMPTY_COMMENT_LABEL}</>
  }

  return <span className="whitespace-pre-wrap">{renderTextWithMentions(raw, 'c')}</span>
}

export function StatusText({ item, text }: { item: Pick<FeedItem, 'urlEntities'>; text: string }) {
  const raw = text ?? ''
  if (!raw) {
    return <>{EMPTY_STATUS_LABEL}</>
  }

  if (!item.urlEntities || item.urlEntities.length === 0) {
    return <span className="whitespace-pre-wrap">{renderTextWithMentions(raw, 'm')}</span>
  }

  return (
    <span className="whitespace-pre-wrap">{renderTextWithEntities(raw, item.urlEntities)}</span>
  )
}
