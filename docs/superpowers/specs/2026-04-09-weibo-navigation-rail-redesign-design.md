# Weibo Navigation Rail Redesign Design

Date: 2026-04-09
Status: Approved in conversation, pending user review of written spec

## Goal

Redesign the left navigation rail in the Weibo shell so it feels cleaner, more intentional, and more tool-like while preserving the current content and functionality.

The redesign must keep:
- The existing navigation destinations: `Home` and `Profile`
- The existing bottom controls: rewrite toggle and theme toggle
- Existing routing behavior and callbacks

The redesign must improve:
- Overall visual quality of the left rail
- The visual identity of navigation buttons
- Responsive behavior between narrow and wide layouts
- The logo alignment issue currently exposed by the `logoOnly` state

## Non-Goals

This change will not:
- Add new navigation items or remove existing actions
- Change the meaning of current buttons or page routing
- Redesign the center content area or right rail
- Introduce a new settings model
- Add motion-heavy or decorative behavior that competes with the reading surface

## Product Direction

### Chosen direction

The chosen direction is a minimal tool-rail with strong button identity.

The rail should feel:
- Quiet at the container level
- Clear at the interaction level
- Consistent between compact and expanded widths

The navigation buttons, not the outer frame, are the primary visual anchor.

### Visual thesis

This should read like a calm utility surface where a small number of large, precise controls define the interface rather than a card shell wrapping miscellaneous content.

### Interaction thesis

The main feeling should come from stable proportions and obvious states, not from animation. The active destination should become a solid object. Inactive destinations should remain light and readable. Responsive collapse should feel like the same rail tightening, not a second component mode.

## Current Problems

The current implementation has three structural problems:

1. The rail relies on a `Card`-shaped container and `CardHeader` / `CardContent` / `CardFooter` semantics that make the left rail feel like a stacked panel rather than a navigation tool.
2. `logoOnly` is treated as a separate presentation mode instead of a responsive outcome, which creates duplicated layout logic and visual drift between compact and expanded states.
3. The logo sits inside a structure that exaggerates the underlying SVG's off-center visual weight, making the compact state appear crooked.

## Design Overview

The redesign will replace the current card-based rail with a single responsive navigation component that scales across breakpoints without a separate `logoOnly` mode.

Target structure:
- Top: small brand slot
- Middle: primary navigation button stack
- Bottom: secondary tools group

The component should have one layout language across all sizes:
- Narrow rail: icon-first compact strip
- Wide rail: same buttons, with lightweight labels revealed

There should be no alternative structural branch whose only purpose is "logo only."

## Layout and Composition

### Outer rail

The outer rail should no longer use the shared `Card` component.

Instead, the rail itself is the layout skeleton:
- Full-height vertical flex layout
- Minimal or no background fill
- No mandatory card border
- Spacing and grouping define hierarchy more than surface chrome

This keeps the left side visually lighter and reduces the sense that the user is looking at a floating preferences panel.

### Top brand slot

The top area should be visually restrained.

Rules:
- The brand slot exists to anchor the rail, not to dominate it
- It uses a fixed-size alignment box for the logo
- It keeps the logo as the only always-visible brand element; no extra brand copy is required for this redesign
- The logo is centered by container geometry plus a small visual correction if needed

### Primary navigation stack

This is the core of the redesign.

Rules:
- Navigation items are rendered as large rounded buttons
- The active item becomes a solid, high-contrast pill-like surface
- Inactive items stay lighter and quieter
- Buttons share the same corner radius and footprint in narrow and wide states
- Labels remain present in expanded layout but are visually subdued relative to the icon

Desired reading order:
- User notices the current destination first
- User can still scan the secondary destination quickly
- Labels support recognition but do not become the dominant visual element

### Bottom tools group

The rewrite toggle and theme toggle remain grouped at the bottom as a clearly separate section.

Rules:
- Keep a visible gap or subtle divider between primary navigation and bottom tools
- Use the same button language as the rest of the rail
- In narrow mode, present bottom actions as compact icon-oriented controls
- In wide mode, allow lightweight labels or aligned control rows without creating a heavy "settings card"

## Responsive Strategy

Responsive behavior replaces the current `logoOnly` presentation mode.

### Narrow widths

At shell widths below the current expanded desktop breakpoint (`xl` in the shell layout):
- The rail compresses to a compact strip
- Labels are hidden or visually removed from layout
- Buttons remain large enough to feel deliberate, not cramped
- Logo remains centered within the same brand slot logic used elsewhere

### Wide widths

At the expanded desktop breakpoint and above (`xl` in the shell layout):
- The rail expands horizontally
- Labels become visible beside the icons
- Button proportions remain recognizably the same as the compact rail
- Bottom controls gain slightly more explicit structure without becoming a separate card block

### Implementation rule

The component should be driven by responsive classes and layout constraints rather than a dedicated `logoOnly` branch.

If a small boolean remains for accessibility or measurement reasons, it must not create a second visual architecture. The default target is to remove `logoOnly` entirely from the shell layout.

## Logo Alignment Fix

The logo issue should be fixed as part of the redesign, not patched as an isolated cosmetic tweak.

Approach:
- Place the SVG inside a fixed-size brand container
- Use a predictable alignment context for both compact and expanded states
- Apply a minimal transform or wrapper offset only if necessary after visual verification

The important constraint is consistency:
- The same logo treatment should work across responsive sizes
- The solution should not depend on a special collapsed-only class path

## Component Boundaries

The implementation should stay intentionally small.

### `NavigationRail`

Primary responsibilities:
- Render the rail layout
- Resolve current nav item active state
- Render responsive navigation buttons
- Render the bottom tools group
- Handle brand slot presentation

This component should own the redesign.

### `ShellFrame`

Responsibilities:
- Provide updated grid widths and responsive columns
- Stop treating compact rail as a separate `logoOnly` component mode
- Pass the same functional props to the rail as today

### Supporting components

Existing shared components such as `ThemeModeToggle` and `Button` should be reused where they fit, but the rail should not contort itself to preserve old card semantics.

## Data Flow and Behavior

There is no new data model for this redesign.

Behavior remains:
1. `ShellFrame` renders `NavigationRail`
2. `NavigationRail` computes active nav state from page descriptor and user ID
3. Buttons navigate using the existing `Link` behavior
4. Rewrite toggle calls `onRewriteEnabledChange`
5. Theme toggle calls `onThemeChange`

The redesign is visual and structural, not behavioral.

## Accessibility and Interaction Rules

The redesign must preserve or improve existing interaction clarity.

Requirements:
- Clear focus-visible treatment on every interactive element
- Active item contrast remains obvious in both light and dark themes
- Compact rail still exposes accessible names even when text is visually hidden
- Button hit areas remain comfortable at narrow widths
- No layout shift that makes state changes feel unstable

## Error Handling and Degradation

Because this is primarily a structural UI change, failure modes are limited.

Constraints:
- If responsive label hiding fails, icons and accessible names must still preserve navigation use
- If logo visual correction is removed or ignored, the layout should still remain centered by container geometry
- The redesign must not break when current user ID is unavailable and the profile link falls back to `/`

## Testing Strategy

Testing should cover both behavior preservation and layout intent.

### Component behavior

Verify:
- `Home` active state still works on home and status pages
- `Profile` active state still works for the logged-in user's profile
- Rewrite toggle still flips state through its callback
- Theme toggle still opens and changes theme

### Responsive checks

Verify at minimum:
- Compact rail width used below the wide breakpoint
- Expanded rail width used at the large desktop breakpoint
- Labels hide and reveal without breaking alignment
- Bottom tools remain grouped and reachable in both states

### Visual checks

Verify manually:
- Logo appears centered in compact and expanded states
- Navigation buttons feel like the visual anchor, not the container
- The rail no longer reads as a generic card
- Dark and light themes both keep the active state legible

## Implementation Notes

Expected file scope:
- `src/features/weibo/components/navigation-rail.tsx`
- `src/features/weibo/app/app-shell-layout.tsx`

Optional small scope only if needed:
- local utility classes or small global style support

The implementation should prefer editing the existing component over creating a second navigation system. The final result should reduce branching and make future rail changes easier.

## Open Questions Resolved

The following decisions were resolved in conversation and should be treated as fixed for implementation planning:
- The direction is minimal tool-like rather than brand-heavy
- The navigation buttons are the key memory point
- Labels should be visually weaker than icons
- Bottom tools remain a separate group from primary navigation
- `logoOnly` should be replaced by responsive behavior rather than preserved as a named design mode
