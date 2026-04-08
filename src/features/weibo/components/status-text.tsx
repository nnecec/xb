import type { ReactNode } from "react";
import { Link } from "react-router";
import type { FeedItem } from "@/features/weibo/models/feed";
import { UserHoverCard } from "@/features/weibo/components/user-hover-card";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `@name` followed by `:` or whitespace or end — matches Weibo `text_raw` mention style (e.g. `//@AIMIKKKK:`). */
const MENTION_PATTERN = /@([A-Za-z0-9_\u4e00-\u9fff-]+)(?=[:\s]|$)/g;

function renderTextWithMentions(text: string, keyPrefix: string): ReactNode {
  if (!text) {
    return null;
  }

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let seq = 0;
  const re = new RegExp(MENTION_PATTERN.source, MENTION_PATTERN.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={`${keyPrefix}-t-${seq++}`}>{text.slice(last, match.index)}</span>);
    }
    const screenName = match[1] ?? "";
    const mentionKey = `${keyPrefix}-@${seq++}`;
    nodes.push(
      <UserHoverCard key={mentionKey} screenName={screenName}>
        <Link
          to={`/n/${encodeURIComponent(screenName)}`}
          className="text-primary underline underline-offset-2"
        >
          @{screenName}
        </Link>
      </UserHoverCard>,
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(<span key={`${keyPrefix}-t-${seq++}`}>{text.slice(last)}</span>);
  }

  return nodes.length > 0 ? nodes : text;
}

/** Plain text with @昵称 links (e.g. comments — no `urlEntities`). */
export function MentionInlineText({ text }: { text: string }) {
  const raw = text ?? "";
  if (!raw) {
    return <>No content.</>;
  }
  return <span className="whitespace-pre-wrap">{renderTextWithMentions(raw, "c")}</span>;
}

export function StatusText({
  item,
  text,
}: {
  item: Pick<FeedItem, "urlEntities">;
  text: string;
}) {
  const raw = text ?? "";
  if (!raw) {
    return <>No text content.</>;
  }

  if (!item.urlEntities || item.urlEntities.length === 0) {
    return <span className="whitespace-pre-wrap">{renderTextWithMentions(raw, "m")}</span>;
  }

  const entityMap = new Map(item.urlEntities.map((entity) => [entity.shortUrl, entity]));
  const pattern = item.urlEntities.map((entity) => escapeRegExp(entity.shortUrl)).join("|");
  const chunks = raw.split(new RegExp(`(${pattern})`, "g"));

  return (
    <span className="whitespace-pre-wrap">
      {chunks.map((chunk, index) => {
        const entity = entityMap.get(chunk);
        if (entity) {
          return (
            <a
              key={`url-${index}`}
              href={entity.shortUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {entity.title}
            </a>
          );
        }
        return <span key={`chunk-${index}`}>{renderTextWithMentions(chunk, `c${index}`)}</span>;
      })}
    </span>
  );
}
