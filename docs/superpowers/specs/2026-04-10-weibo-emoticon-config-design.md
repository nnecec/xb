# Weibo Emoticon Config Design

Date: 2026-04-10
Status: Approved in conversation, pending user review of written spec

## Goal

Fetch Weibo's emoticon config from `/ajax/statuses/config` once per app session, cache it globally through React Query, and use it for two product surfaces:

- Status and comment body rendering: replace matched bracketed phrases such as `[赞]` with inline emoticon images
- Future input-box emoticon picker: keep the categorized config available for later UI work

This iteration implements only the first surface. The second surface is limited to data preparation and cache availability.

## Non-Goals

This change will not:

- Build the input-box emoticon picker UI
- Persist emoticon config to browser storage
- Retry or block page rendering when the emoticon config request fails
- Replace unmatched bracketed text with placeholders
- Change the current mention or topic rendering behavior beyond the minimum needed to support emoticon replacement

## Product Rules

### Single shared config request

The app should fetch `/ajax/statuses/config` only once per page session.

All consumers should read the same cached query result by using the same stable query key.

### Two derived data shapes

The response must be normalized into two shapes:

- Categorized emoticon groups, preserving the tab-like grouping from the API for later picker work
- A flattened phrase lookup keyed by exact bracketed phrase such as `[赞]`

The grouped structure is the source for future picker tabs. The flattened lookup is the source for fast inline body replacement.

### Inline body replacement

When plain text content contains bracketed phrases such as `[赞]`, the renderer should look them up in the flattened emoticon dictionary.

If a phrase matches:
- Render an inline `<img>`
- Keep the image visually close to Weibo native behavior
- Match the surrounding text height
- Align it to the text baseline so it sits naturally inside a sentence

If a phrase does not match:
- Keep the original text as-is

### Silent degradation

If `/ajax/statuses/config` is still loading, fails, or returns incomplete data:
- Status and comment text should continue rendering
- Bracketed phrases should remain as plain text
- No blocking UI or inline error treatment should be introduced for this feature

### `url_struct` link rule

Only `url_struct` items with a truthy `url_type` should be rendered as links.

Any `url_struct` item without `url_type` must remain plain text and must not consume a text segment during link replacement.

This rule is required so normal text and emoticon phrases inside the same body remain eligible for the plain-text replacement pass.

## API And Data Modeling

## `/ajax/statuses/config`

The implementation will add a repository-level loader for `/ajax/statuses/config`.

Expected relevant shape:

```ts
type WeiboEmoticonPayload = {
  emoticon?: {
    ZH_CN?: Record<string, Array<{
      phrase?: string
      url?: string
    }>>
  }
}
```

The implementation should treat missing fields defensively and normalize invalid sections to empty collections.

### Normalized types

Recommended internal model:

```ts
type WeiboEmoticonItem = {
  phrase: string
  url: string
}

type WeiboEmoticonGroup = {
  title: string
  items: WeiboEmoticonItem[]
}

type WeiboEmoticonConfig = {
  groups: WeiboEmoticonGroup[]
  phraseMap: Record<string, WeiboEmoticonItem>
}
```

Normalization rules:

- Read only `emoticon.ZH_CN`
- Keep group order from the payload
- Drop items missing `phrase` or `url`
- Keep exact phrase text, including brackets
- If duplicate phrases appear, the later item in payload order wins in `phraseMap`

## Query Architecture

### Shared query hook

Add a dedicated query hook for emoticon config, for example:

```ts
useEmoticonConfigQuery()
```

The hook must:

- Use a single stable query key dedicated to emoticon config
- Call the repository loader
- Set `staleTime: Infinity`
- Set `gcTime: Infinity`

This makes the query act as global in-memory state for the current app session while still fitting the existing React Query architecture.

### Preload behavior

The app root should prewarm the emoticon query once when the app mounts.

This keeps the cache ready before downstream consumers need it, while still allowing any component to safely call the same hook and receive cached data.

If the root prewarm is missed for any reason, downstream consumers using the same query key should still work correctly.

## Rendering Design

### Render pipeline

The current text renderer already splits content for:

- Mention links
- Topic links
- URL entities

The emoticon replacement pass should be added only for plain-text chunks after non-text entities have already been identified.

Recommended order:

1. Split status text into entity and non-entity chunks
2. Render valid URL entities as links
3. Render topic entities as links
4. For remaining plain-text chunks, parse mentions and emoticon phrases together
5. Replace matched emoticon phrases with inline images
6. Leave unmatched phrases as plain text

This order avoids replacing content inside link entities and keeps the behavior predictable.

### Scope

This rendering behavior should apply to:

- Main status body rendering through `StatusText`
- Comment and other mention-only body rendering through `MentionInlineText`

Both components should share the same plain-text parsing helper so they do not drift.

### Emoticon token matching

Plain text parsing should match bracketed phrases using exact dictionary keys such as `[赞]`.

The parser should:

- Support multiple emoticons in one text node
- Support mixed plain text, mentions, and emoticons in the same sentence
- Preserve whitespace and line breaks exactly as the current renderer does

### Inline image presentation

The inline emoticon image should be rendered as decorative inline content embedded in the sentence flow.

Presentation requirements:

- Height should visually match the current text line height
- Width should follow the image aspect ratio
- Vertical alignment should feel like native inline emoji rather than an image card
- The image should not break wrapping behavior

If an accessible label is needed, use the phrase string as the image `alt`

## URL Entity Filtering

The `url_struct` adaptation layer must be tightened so that only entries with `url_type` become clickable URL entities.

Recommended place for this rule:

- Prefer enforcing it in the adapter layer that converts Weibo payloads to app models

Reasoning:

- The model entering React should already reflect which entities are actionable links
- Rendering code stays simpler and less coupled to raw Weibo payload quirks
- The same rule will then apply consistently across status, comment, and future surfaces

If adapter-level filtering is not feasible in one step, rendering must still avoid turning `url_type`-less entries into links.

## Error Handling

Failure modes and expected behavior:

- Request timeout or request failure: query enters error state, text keeps rendering plain bracketed phrases
- Empty payload: normalized config becomes empty groups and empty phrase map
- Partially invalid items: invalid entries are skipped, valid entries still load

No toast, modal, or empty-state UI should be added for this feature.

## Testing Strategy

Add or update tests in the following areas.

### Emoticon config normalization

Cover:

- Group preservation from `emoticon.ZH_CN`
- Invalid items missing `phrase` or `url` are dropped
- Flattened `phraseMap` is generated correctly
- Empty or malformed payload normalizes safely

### Emoticon query behavior

Cover:

- Stable emoticon query key
- Query uses the repository loader
- `staleTime` is `Infinity`
- `gcTime` is `Infinity`

### Status and comment text rendering

Cover:

- Matched phrase such as `[赞]` renders an inline image
- Unmatched bracketed phrase remains plain text
- Multiple matched phrases in one sentence render correctly
- Mentions and emoticons coexist in the same text chunk
- Plain text line wrapping behavior remains compatible with existing `whitespace-pre-wrap` rendering

### URL entity filtering

Cover:

- `url_struct` item with `url_type` renders as a link
- `url_struct` item without `url_type` stays plain text
- Plain text next to non-link `url_struct` content still passes through emoticon replacement correctly

## Integration Plan

Expected touched areas:

- `src/features/weibo/services/endpoints.ts`
- `src/features/weibo/services/weibo-repository.ts`
- A new emoticon query or adapter module under `src/features/weibo`
- `src/features/weibo/app/app-root.tsx`
- `src/features/weibo/components/status-text.tsx`
- Adapter tests and renderer tests for status text

## Risks And Mitigations

### Raw response shape drift

Risk:
- Weibo may add extra locales or restructure part of the payload

Mitigation:
- Read only the required `emoticon.ZH_CN` subtree
- Normalize defensively and skip invalid records instead of throwing

### Entity parsing order regressions

Risk:
- Adding emoticon replacement could accidentally alter current mention, topic, or URL rendering

Mitigation:
- Keep entity chunking and plain-text replacement as separate steps
- Add focused rendering tests that combine mentions, links, and emoticons

### Hidden duplicate phrases

Risk:
- Multiple groups may define the same bracketed phrase with different images

Mitigation:
- Preserve all grouped entries for picker use
- Use deterministic last-write-wins behavior when building `phraseMap`
