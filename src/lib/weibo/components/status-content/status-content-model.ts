import type { WeiboEmoticonItem } from '@/lib/weibo/models/emoticon'
import type { FeedImage, FeedItem, FeedTopicEntity, FeedUrlEntity } from '@/lib/weibo/models/feed'
import { normalizeSafeExternalUrl } from '@/lib/weibo/utils/safe-url'

const MENTION_PATTERN = /@([A-Za-z0-9_\u4e00-\u9fff-]+)(?=[:\s]|$)/g
const EMOTICON_PATTERN = /\[[^[\]]+\]/g
const REPLY_CHAIN_MARKER_PATTERN = /\/\/@([A-Za-z0-9_\u4e00-\u9fff-]+):/g

export type StatusContentToken =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; screenName: string }
  | { kind: 'emoticon'; emoticon: WeiboEmoticonItem }
  | { kind: 'url'; title: string; href: string | null }
  | { kind: 'topic'; entity: FeedTopicEntity }

export interface StatusContentBlock {
  text: string
  tokens: StatusContentToken[]
  images: FeedImage[]
}

export interface InterpretedReplySegment {
  index: number
  screenName: string
  content: StatusContentBlock
}

export type InterpretedReplyChain =
  | {
      kind: 'expanded'
      segments: InterpretedReplySegment[]
    }
  | {
      kind: 'collapsed'
      head: [InterpretedReplySegment, InterpretedReplySegment]
      middle: InterpretedReplySegment[]
      tail: InterpretedReplySegment
    }

export type InterpretedStatusContent =
  | { kind: 'empty' }
  | { kind: 'markdown'; text: string }
  | { kind: 'plain'; content: StatusContentBlock }
  | {
      kind: 'reply-chain'
      leading: StatusContentBlock | null
      chain: InterpretedReplyChain
    }

export type StatusContentSource = Pick<
  FeedItem,
  'urlEntities' | 'topicEntities' | 'imageEntities' | 'isMarkdown' | 'markdownText'
>

interface ReplyChainSegment {
  screenName: string
  text: string
}

type ParsedReplyChainText =
  | { kind: 'plain'; text: string }
  | { kind: 'reply-chain'; leading: string; replyChain: ReplyChainSegment[] }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sanitizeMarkdownText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<span\b(?=[^>]*\bclass=(["'])[^"']*\bexpand\b[^"']*\1)[^>]*>.*?<\/span>/gi, '')
}

function parseReplyChainText(text: string): ParsedReplyChainText {
  if (!text.includes('//@')) return { kind: 'plain', text }
  const matches = Array.from(text.matchAll(REPLY_CHAIN_MARKER_PATTERN))
  if (matches.length === 0) return { kind: 'plain', text }

  const markerIndexes: number[] = []
  let markerSearchStart = 0
  while (true) {
    const markerIndex = text.indexOf('//@', markerSearchStart)
    if (markerIndex === -1) break
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
  if (firstMatchIndex === undefined) return { kind: 'plain', text }

  const replyChain: ReplyChainSegment[] = []
  for (const [index, match] of matches.entries()) {
    const matchIndex = match.index
    const marker = match[0]
    const screenName = match[1]?.trim()
    const nextMatchIndex = matches[index + 1]?.index ?? text.length
    if (matchIndex === undefined || !marker || !screenName) return { kind: 'plain', text }
    replyChain.push({
      screenName,
      text: text.slice(matchIndex + marker.length, nextMatchIndex).trim(),
    })
  }

  if (replyChain.length === 0) return { kind: 'plain', text }
  return {
    kind: 'reply-chain',
    leading: text.slice(0, firstMatchIndex).trimEnd(),
    replyChain,
  }
}

function createImageExtractor(imageEntities: Record<string, FeedImage[]>, hideMedia: boolean) {
  const consumed = new Set<string>()
  return (text: string) => {
    if (hideMedia) return { strippedText: text, images: [] }
    let strippedText = text
    const images: FeedImage[] = []
    const seenIds = new Set<string>()

    for (const [shortUrl, entityImages] of Object.entries(imageEntities)) {
      if (consumed.has(shortUrl) || !strippedText.includes(shortUrl)) continue
      consumed.add(shortUrl)
      for (const image of entityImages) {
        if (seenIds.has(image.id)) continue
        seenIds.add(image.id)
        images.push(image)
      }
      strippedText = strippedText.split(shortUrl).join('')
    }

    strippedText = strippedText
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .trim()

    return { strippedText, images }
  }
}

function tokenizeMentionsAndEmoticons(
  text: string,
  phraseMap: Record<string, WeiboEmoticonItem>,
): StatusContentToken[] {
  if (!text) return []
  const tokenPattern = new RegExp(`${MENTION_PATTERN.source}|${EMOTICON_PATTERN.source}`, 'g')
  const mentionOnlyPattern = new RegExp(`^${MENTION_PATTERN.source}$`)
  const tokens: StatusContentToken[] = []
  let last = 0
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(text)) !== null) {
    if (match.index > last) tokens.push({ kind: 'text', text: text.slice(last, match.index) })
    const value = match[0]
    const mentionMatch = value.match(mentionOnlyPattern)
    if (mentionMatch) {
      tokens.push({ kind: 'mention', screenName: mentionMatch[1] ?? '' })
    } else if (phraseMap[value]) {
      tokens.push({ kind: 'emoticon', emoticon: phraseMap[value] })
    } else {
      tokens.push({ kind: 'text', text: value })
    }
    last = match.index + value.length
  }

  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) })
  return tokens.length > 0 ? tokens : [{ kind: 'text', text }]
}

export function tokenizeStatusText(
  text: string,
  urlEntities: FeedUrlEntity[],
  topicEntities: FeedTopicEntity[],
  phraseMap: Record<string, WeiboEmoticonItem>,
): StatusContentToken[] {
  const urlEntityMap = new Map(urlEntities.map((entity) => [entity.shortUrl, entity]))
  const topicEntityMap = new Map(topicEntities.map((entity) => [`#${entity.title}#`, entity]))
  const patternParts = [
    ...urlEntities.map((entity) => escapeRegExp(entity.shortUrl)),
    ...topicEntities.map((entity) => escapeRegExp(`#${entity.title}#`)),
  ]
  if (patternParts.length === 0) return tokenizeMentionsAndEmoticons(text, phraseMap)

  return text.split(new RegExp(`(${patternParts.join('|')})`, 'g')).flatMap((chunk) => {
    const urlEntity = urlEntityMap.get(chunk)
    if (urlEntity) {
      return [
        { kind: 'url', title: urlEntity.title, href: normalizeSafeExternalUrl(urlEntity.url) },
      ]
    }
    const topicEntity = topicEntityMap.get(chunk)
    if (topicEntity) return [{ kind: 'topic', entity: topicEntity }]
    return tokenizeMentionsAndEmoticons(chunk, phraseMap)
  })
}

export function interpretMentionContent(
  text: string,
  phraseMap: Record<string, WeiboEmoticonItem>,
) {
  return tokenizeMentionsAndEmoticons(text, phraseMap)
}

export function interpretStatusContent({
  source,
  text,
  mode,
  hideMedia,
  renderReplyChain,
  collapseReplies,
  phraseMap,
}: {
  source: StatusContentSource
  text: string
  mode: 'plain' | 'markdown'
  hideMedia: boolean
  renderReplyChain: boolean
  collapseReplies: boolean
  phraseMap: Record<string, WeiboEmoticonItem>
}): InterpretedStatusContent {
  if (!text) return { kind: 'empty' }
  if (mode === 'markdown' && source.isMarkdown && source.markdownText) {
    return { kind: 'markdown', text: sanitizeMarkdownText(source.markdownText) }
  }

  const urlEntities = source.urlEntities ?? []
  const topicEntities = source.topicEntities ?? []
  const effectivePhraseMap = hideMedia ? {} : phraseMap
  const extractImages = createImageExtractor(source.imageEntities ?? {}, hideMedia)
  const interpretBlock = (blockText: string): StatusContentBlock => {
    const { strippedText, images } = extractImages(blockText)
    return {
      text: strippedText,
      tokens: tokenizeStatusText(strippedText, urlEntities, topicEntities, effectivePhraseMap),
      images,
    }
  }
  const parsed = parseReplyChainText(text)
  if (!renderReplyChain || parsed.kind === 'plain') {
    return { kind: 'plain', content: interpretBlock(text) }
  }

  const leading = parsed.leading ? interpretBlock(parsed.leading) : null
  const segments = parsed.replyChain.map((segment, index) => ({
    index,
    screenName: segment.screenName,
    content: interpretBlock(segment.text),
  }))
  if (collapseReplies && segments.length > 2) {
    return {
      kind: 'reply-chain',
      leading,
      chain: {
        kind: 'collapsed',
        head: [segments[0]!, segments[1]!],
        middle: segments.slice(2, -1),
        tail: segments.at(-1)!,
      },
    }
  }

  return { kind: 'reply-chain', leading, chain: { kind: 'expanded', segments } }
}
