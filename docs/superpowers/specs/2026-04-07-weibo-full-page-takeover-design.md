# Weibo Full-Page Takeover Design

Date: 2026-04-07
Status: Drafted from approved conversation direction, pending user review

## Goal

Adjust the Weibo rewrite takeover behavior so that enabling xb hides the full host application shell instead of only the main content region.

This specifically means:
- The original Weibo `header` must disappear when the rewrite is enabled
- The React ShadowRoot app becomes the only visible application shell
- Disabling the rewrite restores the original Weibo page exactly as before

## Current Problem

The content script currently finds a `contentRoot` and applies takeover only to that node.

Current behavior:
- The extension UI mounts into a ShadowRoot attached under `body`
- `applyPageTakeover` hides only the main content region
- Weibo's native `header` remains visible because it lives outside the hidden region

This creates a split shell where the extension replaces the page body but the host header still leaks through.

## Chosen Approach

Promote takeover from "main content region" to "full host app root".

The selector layer should resolve the highest safe Weibo host node that represents the entire visible application shell. The takeover layer should hide that host node while leaving the extension mount node visible.

The extension UI will continue to mount separately through `createShadowRootUi` so the ShadowRoot isolation model does not change.

## Why This Approach

This is the smallest change that produces correct full-page replacement behavior.

Benefits:
- Removes the native `header` together with the rest of the host UI
- Preserves the existing ShadowRoot rendering model
- Keeps fallback behavior simple because one node is hidden and later restored
- Avoids coupling the extension to multiple brittle selectors for header, main, and other shell fragments

Rejected alternatives:
- Hiding only an extra header selector still leaves other host shell regions at risk of leaking through
- Mounting React inside the Weibo root would weaken DOM and style isolation and increase collision risk

## Implementation Design

### Host region discovery

Update `findWeiboHostRegions` so it resolves a full-page takeover root instead of only a content root.

Expected API shape:
- Return a node representing the highest safe application root available on current Weibo pages
- Keep selector fallback order explicit and narrow

The returned field should describe the real responsibility clearly, for example `appRoot` rather than `contentRoot`.

### Takeover binding

Update the content script binding so `bindShellState` applies takeover to the full-page root.

Enabled:
- Hide the resolved host app root
- Keep the extension ShadowRoot container active

Disabled or cleanup:
- Restore the hidden host app root

### Restore guarantees

The restore path remains attribute-based:
- Save previous inline `display`
- Set `aria-hidden`
- Hide with `display: none`
- Remove takeover attributes and restore the previous inline `display` value on cleanup

No additional global CSS or body-level mutations should be introduced for this change.

## Testing Scope

Update tests to cover the new behavior:
- `host-selectors.test.ts` should assert that the resolved node represents the full host shell, not just the central content node
- `page-takeover.test.ts` should continue to verify hide/restore symmetry
- If needed, add or extend a content-script-level test to prove the chosen region is the node being hidden

## Risks and Constraints

Primary risk:
- Weibo DOM selectors may vary between layouts, so the full-page root selector should be conservative and support fallback candidates

Constraint:
- The extension mount node must remain outside the hidden host root or the takeover would hide the extension itself

## Expected Outcome

When rewrite is enabled on supported pages, the user should see only the xb React shell, including its own navigation and header-like structure. When rewrite is disabled, the original Weibo shell, including the native header, should reappear without layout residue.
