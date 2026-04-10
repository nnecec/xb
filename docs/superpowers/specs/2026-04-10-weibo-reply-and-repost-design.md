# Weibo Reply And Repost Design

Date: 2026-04-10
Status: Approved in conversation, pending user review of written spec

## Goal

Add a unified reply and repost workflow to the Weibo rewrite experience so users can:

- Click a feed card to navigate to the Weibo detail page
- Open one shared modal for comment and repost flows
- Comment on a status, a comment, or a nested reply inside the detail page
- Repost from a status entry point using the same modal
- Pick emoticons from a grouped dropdown picker
- Reuse recent emoticons from a persisted top-10 history
- Refresh detail data after successful detail-page comment actions
- Receive toast feedback after submission succeeds or fails

## Non-Goals

This iteration will not:

- Implement real like submission
- Support image upload in the modal
- Guarantee a working production repost API if the final Weibo repost endpoint is still unknown
- Do timeline-level optimistic count updates after submission
- Rebuild the existing comment tree shape returned by Weibo

## Product Rules

### Feed card navigation

Every feed card should navigate to the status detail page when the user clicks the card body.

Interactive descendants must not trigger navigation:

- Author profile links
- Image preview triggers
- Long-text expand button
- Comment action
- Repost action
- Like action

The current comment click behavior on cards should become status-detail navigation for the whole card, not just the comment icon.

### Action hover behavior

The comment, repost, and like actions should each have a colored hover state.

Expected behavior:

- Comment hover colors the comment icon and label
- Repost hover colors the repost icon and label
- Like hover colors the like icon and label

The hover treatment should be consistent between timeline cards and status detail cards if they share the same action component.

### One shared modal

There should be one reusable modal component for both reply and repost.

The modal must switch behavior by mode:

- `comment`
- `repost`

Mode-specific checkbox rules:

- Opening from reply/comment shows a checkbox labeled `同时转发`
- Opening from repost shows a checkbox labeled `同时回复`

The modal title, primary action text, and helper copy should all derive from the current mode and target type.

### Comment targets

The system must support opening the modal for:

- A status
- A top-level comment on a status
- A nested reply under a comment

For nested replies, the UI should treat the clicked reply item as the direct target and still preserve the root status id for mutation and refresh.

### Detail refresh behavior

After a successful submission from the detail page:

- Refetch the status detail query
- Refetch the status comments query from page 1
- Keep the user on the current detail page

The first page should be fetched fresh rather than only appending to existing infinite-query pages.

### Toast feedback

After submit:

- Success shows a toast with mode-specific copy
- Failure shows a toast with the best available error message

Recommended copy:

- Comment success: `回复成功`
- Repost success: `转发成功`
- Generic failure fallback: `发送失败，请稍后重试`

## Interaction Design

## Shared modal layout

The shared `CommentModal` should contain:

- A multi-line text input
- An emoticon picker trigger
- One mode-specific checkbox for the optional secondary action
- Cancel and submit actions

The modal should also show compact context so the user knows what they are replying to or reposting, for example:

- Status author name
- Target kind such as `回复微博` or `回复评论`
- Optional excerpt of the target text if already available

### Input behavior

The text field should:

- Autofocus when the modal opens
- Preserve line breaks
- Support inserting emoticon phrase tokens like `[色]`
- Disable submit while a request is in flight

For this iteration, emoticon insertion can append at the current textarea value end if cursor-range insertion is not already implemented. Cursor-perfect insertion is not required.

### Emoticon picker

The emoticon picker should be implemented as a dropdown menu containing tabs.

Structure:

- One tab for `最近`
- Remaining tabs from the Weibo emoticon config groups
- Each tab renders a clickable grid of emoticons

Selection behavior:

- Clicking an emoticon inserts its phrase into the textarea
- The selection closes the dropdown
- The chosen emoticon moves to the front of recent history
- Recent history deduplicates by phrase and keeps at most 10 items

## Recent emoticon persistence

Recent emoticons should be stored in global state with persistence.

Recommended storage shape:

```ts
type RecentEmoticonEntry = {
  phrase: string
  url: string
}
```

Recommended behavior:

- Persist in the existing app settings storage style or another existing lightweight persisted store
- Keep only the latest 10 unique phrases
- If an emoticon appears again, move it to the front
- If the current config no longer contains a phrase, the recent item can still render from its cached url

## Data Modeling

## Submission context

The shared modal needs one normalized target model so the UI and repository do not branch on raw component shape.

Recommended internal shape:

```ts
type ComposeMode = 'comment' | 'repost'

type ComposeTarget =
  | {
      kind: 'status'
      mode: ComposeMode
      statusId: string
      targetCommentId: null
      authorName: string
      excerpt: string
    }
  | {
      kind: 'comment'
      mode: ComposeMode
      statusId: string
      targetCommentId: string
      authorName: string
      excerpt: string
    }
```

This model is enough to drive:

- Modal copy
- API endpoint choice
- Query refresh
- Analytics or logging later if needed

### Submission payload

Recommended repository input:

```ts
type SubmitComposeInput = {
  target: ComposeTarget
  text: string
  alsoSecondaryAction: boolean
}
```

The repository implementation should translate this model into endpoint-specific form data.

## API design

## Confirmed comment APIs

The user-provided captures confirm two write endpoints:

### Comment on a status

Endpoint:

```txt
POST /ajax/comments/create
```

Form fields observed:

```ts
{
  id: string // status id
  comment: string
  pic_id: string
  is_repost: 0 | 1
  comment_ori: 0 | 1
  is_comment: 0 | 1
}
```

Interpretation for this project:

- `id` is the root status id
- `comment` is the raw textarea content including emoticon phrases like `[色]`
- `is_repost` should be driven by the `同时转发` checkbox in comment mode
- `comment_ori` and `is_comment` should default to `0` unless later captures prove they are needed for a specific branch
- `pic_id` stays empty in this iteration

### Reply to a comment or nested reply

Endpoint:

```txt
POST /ajax/comments/reply
```

Form fields observed:

```ts
{
  id: string // root status id
  cid: string // direct target comment id
  comment: string
  pic_id: string
  is_repost: 0 | 1
  comment_ori: 0 | 1
  is_comment: 0 | 1
}
```

Interpretation for this project:

- `id` remains the root status id
- `cid` is the clicked direct target comment id
- The same endpoint should be used for replying to top-level comments and deeper nested replies
- `is_repost` should be driven by the `同时转发` checkbox in comment mode

### Repost API

The repost write endpoint is still unconfirmed by capture.

The implementation should therefore:

- Define a repository method for repost submission now
- Keep its request builder isolated behind one function
- Return a clear fallback error if the real endpoint is still not wired

Recommended placeholder:

```ts
async function submitStatusRepost(input: SubmitComposeInput): Promise<void> {
  throw new Error('weibo-repost-endpoint-not-configured')
}
```

If a repost capture is supplied later, only this branch should need replacement.

## Client and request requirements

Write requests should use the same axios client as reads, with additions needed for form submission:

- `Content-Type: application/x-www-form-urlencoded`
- `X-XSRF-Token` from the current cookie or the client default xsrf configuration

The request builder should prefer `URLSearchParams` so the payload matches the observed browser form body.

## Query And Refresh Architecture

## Modal state owner

The modal state should live high enough to be opened from:

- Timeline feed cards
- Profile posts
- Status detail card
- Any comment card in the detail page

Recommended owner:

- `AppShell` or a nearby shell-level controller that already coordinates navigation and page data

This avoids duplicating modal state in both the detail page and comment tree.

## Detail query refresh

When a detail-page submission succeeds:

- Call `statusDetailQuery.refetch()`
- Call `statusCommentsQuery.refetch()`

The comments query should not rely only on invalidation because the current page already has direct query handles available in the shell.

For submissions initiated outside the detail page, no forced refresh is required in this iteration.

## Component Architecture

Recommended new or changed components:

- `FeedCard`
  Make the card surface navigable and split action buttons into non-bubbling controls.
- `FeedActions`
  Reuse for status cards, add hover color states, and expose comment/repost callbacks.
- `StatusDetailPage`
  Accept reply/repost handlers and pass them into the status card and comment tree.
- `CommentList`
  Thread action callbacks through every comment depth.
- `CommentCard`
  Add reply action controls for the main comment and nested replies.
- `CommentModal`
  New shared compose modal with textarea, emoticon dropdown, checkbox, and submit handling.
- `EmoticonPicker`
  New dropdown-plus-tabs picker fed by cached emoticon config and recent history.

## Error Handling

Failure expectations:

- Unknown repost endpoint: show toast error and keep modal open
- Comment endpoint request failure: show toast error and keep modal open
- Emoticon config unavailable: picker still renders `最近` when available, otherwise a simple empty state
- Empty text submit in comment mode: block submit on the client
- Empty text submit in repost mode: allow only if later captures confirm empty repost is valid; until then require non-empty text to keep behavior explicit

## Testing Strategy

Tests should cover:

- Feed card click navigates to detail
- Action buttons stop propagation and do not trigger navigation
- Hover classes render for comment, repost, and like actions
- Shared modal copy changes by mode
- Status comment submit chooses `/ajax/comments/create`
- Comment reply submit chooses `/ajax/comments/reply`
- Nested reply uses root status id plus clicked comment id
- Detail-page success triggers detail and comments refetch
- Success and failure toasts render expected messages
- Emoticon picker inserts phrases and updates persisted recent history with a maximum of 10

## Open Questions Resolved For This Iteration

- Comments on statuses use `/ajax/comments/create`
- Replies to comments use `/ajax/comments/reply`
- Nested replies will use the same reply endpoint with the clicked reply id as `cid`
- Repost remains intentionally isolated behind a placeholder repository method until a capture is available
- Recent emoticons should be global and persisted, capped at 10 items
