# xb Weibo Redesign Design

Date: 2026-04-07
Status: Approved in conversation, pending user review of written spec

## Goal

Build a browser extension for `weibo.com` that rewrites the main browsing experience into a cleaner, X-like interface while staying on the official Weibo website and reusing the user's logged-in web session.

The first implementation scope is:
- Home timeline
- Status detail page
- User profile page

The extension should:
- Override the original main content area by default
- Render the new UI inside a `ShadowRoot`
- Use a React app mounted from a content script
- Prefer `shadcn/ui` default components and a minimal visual style
- Support dark mode
- Preserve a clear fallback path back to the original Weibo page

## Non-Goals

The first version will not include:
- A standalone backend or proxy service
- A custom login flow outside Weibo
- A complete site-wide redesign beyond the three target page types
- A deep rewrite of the original publish composer, comment composer, or message center
- Full parity for every Weibo interaction surface

## Product Direction

### Layout direction

The chosen layout direction is the denser hybrid approach rather than a literal X clone.

Target structure:
- Left: compact navigation rail
- Center: primary timeline or page content
- Right: trends, contextual summary, or user-related panels

This keeps the content density of Weibo while adopting the navigation rhythm and scrolling behavior of X.

### Page takeover mode

The extension will directly replace the original Weibo main content by default.

Requirements:
- The user lands in the rewritten experience automatically on supported pages
- The original Weibo page can be restored through a visible fallback control
- If takeover fails or a required API breaks, the extension degrades back to the original page rather than partially corrupting layout

## Technical Architecture

The implementation is split into five layers with explicit boundaries.

### 1. Content entrypoint

Responsibilities:
- Determine whether the current URL is a supported Weibo page
- Locate the host page regions that should be hidden or reduced
- Create the extension host element
- Attach a `ShadowRoot`
- Mount the React application into the shadow tree

This layer must stay thin. It should not contain page business logic or API mapping.

### 2. Inject entrypoint

Responsibilities:
- Run in the page's main world only when necessary
- Patch `history.pushState` and `history.replaceState`
- Listen for `popstate`
- Bridge route changes back to the content script
- Optionally observe selected page-native requests if direct fetch access is insufficient

Constraints:
- Keep the injected script minimal
- Do not render UI here
- Do not move application logic here unless the browser context forces it

### 3. React app layer

The React app renders inside the `ShadowRoot` and owns all extension UI.

Core modules:
- `AppShell`
- `HomeTimelinePage`
- `StatusDetailPage`
- `ProfilePage`
- Shared UI components such as feed cards, side rail, right rail, empty states, and error states

Rules:
- Use `shadcn/ui` defaults where available
- Keep styling inside the shadow tree
- Support light and dark appearance modes
- Avoid broad `useEffect` choreography; prefer explicit loaders, event handlers, and derived state

### 4. Service and adapter layer

Responsibilities:
- Encapsulate all Weibo API requests
- Normalize unstable or inconsistent response shapes
- Translate URL changes into internal page state

Planned modules:
- `services/weibo-api/client.ts`
- `services/weibo-api/endpoints.ts`
- `services/weibo-api/adapters/timeline.ts`
- `services/weibo-api/adapters/status.ts`
- `services/weibo-api/adapters/profile.ts`
- `services/router-sync.ts`

### 5. State and settings layer

Responsibilities:
- Persist extension settings in browser storage
- Hold current page data and UI state
- Coordinate route refreshes and fallback transitions

Initial settings:
- Rewrite enabled or disabled
- Appearance: system, light, dark
- Prefer rewritten page by default

State should remain intentionally small in v1. The preferred pattern is page-oriented loaders plus lightweight shared state, not a heavy global store from day one.

## ShadowRoot Strategy

The React application should render into a `ShadowRoot`.

Benefits:
- Isolates `shadcn/ui`, Tailwind tokens, and component styling from Weibo's global CSS
- Prevents Weibo styles from breaking extension layout
- Makes dark mode theming more predictable

Limits:
- `ShadowRoot` isolates DOM and CSS, not JavaScript execution context
- Browser extension code still runs in the content script world
- Any required page-native hooks must still go through the minimal injected bridge

Implementation notes:
- Create a single extension host node in the page
- Attach an open `shadowRoot`
- Mount React into a dedicated app root inside the shadow tree
- Inject the extension stylesheet into the shadow tree rather than depending on page-global styles

## Supported Pages

### Home timeline

Primary goals:
- Recreate the main browsing flow with X-like pacing
- Offer two main tabs: `For You` and `Following`
- Support infinite scrolling

Behavior:
- `For You` maps to the Weibo recommended or home feed
- `Following` maps to the following feed
- Clicking the card body navigates to the status detail page
- Clicking user identity navigates to the profile page
- The page keeps Weibo URLs rather than inventing a parallel router

### Status detail

Primary goals:
- Show the main post clearly
- Provide a readable conversation or reply chain below it
- Preserve a clear back path

Behavior:
- Main status stays pinned at the top of the detail stream
- Comments or related thread content render in a vertical timeline
- If specific detail sub-resources are unstable, the UI presents a fallback action to open the original Weibo detail experience

### Profile page

Primary goals:
- Make profile browsing feel closer to X while keeping Weibo identity data
- Center the user's post stream as the primary content

Behavior:
- Header includes banner, avatar, name, handle-like identifier, and bio area
- Tabs target `Posts`, `Replies`, and `Media`
- `Posts` is required for v1
- `Replies` and `Media` are progressive enhancement and may degrade if the backing endpoints are weak

## Routing and Navigation

The extension will not invent a separate route namespace.

Rules:
- Continue using native Weibo URLs
- Parse the current URL into an internal page descriptor
- When the user navigates inside the extension UI, update browser history with the corresponding native Weibo URL
- React to `pushState`, `replaceState`, and `popstate` through the inject bridge

This avoids a mismatch between page URL, browser history, and the active extension view.

## Data Flow

Each supported page follows this sequence:

1. Content entrypoint detects a supported page and mounts the app.
2. Router sync parses the active URL into an internal page type and params.
3. The page loader requests data through the Weibo API client.
4. Response adapters normalize Weibo responses into internal models.
5. React components render only normalized models.
6. Infinite scroll requests more data using cursor or paging params from the previous response.

Normalized models should cover at least:
- `FeedItem`
- `TimelinePage`
- `StatusDetail`
- `UserProfile`

## API Strategy

The extension will use the logged-in user's existing `weibo.com` session and call the website's private web APIs directly.

Source strategy:
- First inspect public references where available
- Then confirm real request and response shapes from browser network activity
- Do not depend on third-party relays

The API layer should:
- Send requests with the active site session
- Centralize timeout, error handling, and response guards
- Avoid leaking raw Weibo response shapes into the UI

Required endpoint groups for v1:
- Home feed: recommended and following
- Status detail: main post and reply chain
- Profile: user summary and user post stream

## Degradation Rules

The product must degrade predictably when Weibo changes.

Required behavior:
- If authentication fails, show a login or unavailable state and allow reverting to the original page
- If an endpoint changes shape, show an error boundary with a fallback action instead of rendering broken UI
- If a mount point cannot be found, do not inject partial UI

Acceptable v1 degradation:
- `Replies` tab on profile can fall back to the original page
- `Media` tab can be hidden or approximated from available posts if Weibo does not expose a reliable endpoint
- Rich interaction surfaces such as full comment composition or repost composition can delegate back to the original Weibo page
- Right-rail content such as trends or recommendations can ship in simplified form

Product rule:
- Timeline browsing, status reading, and profile browsing must work
- Complex editing and secondary surfaces may route back to the original Weibo UI

## UI and Styling Guidelines

The interface should stay minimal and use `shadcn/ui` defaults whenever possible.

Guidelines:
- Avoid trying to visually clone every X detail
- Favor clean cards, tabs, buttons, badges, separators, alerts, and loading states from `shadcn/ui`
- Use the existing project token system and extend it only as needed
- Support both light and dark mode from day one
- Keep typography and spacing calm and restrained

## Testing and Verification

Minimum verification targets:
- Supported page detection for home, detail, and profile URLs
- Route sync between native Weibo URL changes and extension view state
- Adapter tests for the first stable versions of timeline, status, and profile responses
- Mount and fallback behavior when host selectors fail

Manual verification targets:
- Logged-in browsing flow on Weibo home
- Entering a status detail page from the rewritten timeline
- Entering a profile page from timeline and detail views
- Switching between light and dark modes
- Reverting to the original Weibo page

## Risks

### Private API instability

Weibo may change request names, response fields, pagination parameters, or anti-abuse requirements.

Mitigation:
- Keep adapters isolated
- Guard parsing defensively
- Preserve fallback to the original page

### DOM mount-point drift

Weibo may change page structure and break the takeover selector.

Mitigation:
- Use a small selector strategy module with layered fallback selectors
- Fail closed rather than partially injecting UI

### Mixed-context complexity

History changes and certain page-native behavior may only be observable from the main world.

Mitigation:
- Keep a strict split between content app and inject bridge
- Use message passing instead of leaking app logic into the injected script

## Implementation Order

Recommended implementation sequence:

1. Create the supported-page detector and mount shell with `ShadowRoot`
2. Add route bridge and router sync
3. Implement the home timeline data path and UI
4. Implement status detail data path and UI
5. Implement profile data path and UI
6. Add settings and fallback controls
7. Harden error states, dark mode, and degradation paths
8. Add adapter tests and route tests

## Open Assumptions Resolved In Design

The following assumptions are explicit and should not be reopened during implementation unless new facts force it:
- The first version targets home timeline, status detail, and profile only
- The extension overrides the original page body by default
- The app renders in a `ShadowRoot`
- The data source is the user's existing logged-in Weibo session
- The implementation follows a content-script-first model with a minimal inject bridge
- Main browsing flows must work even if some advanced or secondary features degrade
