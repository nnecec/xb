# Weibo Navigation Rail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current card-like Weibo left rail with a single responsive navigation rail that keeps the existing actions, removes the `logoOnly` split mode, and fixes logo alignment.

**Architecture:** Keep the current `NavigationRail` ownership boundary, but refactor it into one responsive component that always renders the same structure and uses responsive classes to collapse or expand. Simplify `ShellFrame` so it mounts one rail instance, lets the rail own compact versus expanded presentation, and verifies the new behavior with focused component tests instead of relying on hidden duplicate markup.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, Lucide, Vitest, Testing Library

---

## File Structure

- `src/features/weibo/components/navigation-rail.tsx`
  Own the new rail structure, active-state visuals, logo alignment wrapper, and bottom tools group.
- `src/features/weibo/components/navigation-rail.test.tsx`
  Verify active states, accessible names, profile fallback behavior, and removal of the old card copy.
- `src/features/weibo/app/app-shell-layout.tsx`
  Remove duplicated rail mounting, keep one responsive rail, and update shell column widths to fit the redesigned rail.
- `src/features/weibo/app/app-shell-layout.test.tsx`
  Verify `ShellFrame` renders one rail instance and preserves its children.

### Task 1: Rebuild `NavigationRail` As One Responsive Component

**Files:**
- Modify: `src/features/weibo/components/navigation-rail.tsx`
- Create: `src/features/weibo/components/navigation-rail.test.tsx`

- [ ] **Step 1: Write the failing component test**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NavigationRail } from '@/features/weibo/components/navigation-rail'
import * as currentUserModule from '@/features/weibo/platform/current-user'

vi.mock('@/features/weibo/platform/current-user', () => ({
  getCurrentUserUid: vi.fn(),
}))

function renderRail({
  pageKind = 'home',
  viewingProfileUserId = null,
  rewriteEnabled = true,
}: {
  pageKind?: 'home' | 'profile' | 'status' | 'unsupported'
  viewingProfileUserId?: string | null
  rewriteEnabled?: boolean
} = {}) {
  const onRewriteEnabledChange = vi.fn()
  const onThemeChange = vi.fn()

  render(
    <MemoryRouter>
      <NavigationRail
        pageKind={pageKind}
        viewingProfileUserId={viewingProfileUserId}
        rewriteEnabled={rewriteEnabled}
        theme="system"
        onRewriteEnabledChange={onRewriteEnabledChange}
        onThemeChange={onThemeChange}
      />
    </MemoryRouter>,
  )

  return { onRewriteEnabledChange, onThemeChange }
}

describe('NavigationRail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(currentUserModule.getCurrentUserUid).mockReturnValue('1969776354')
  })

  it('renders accessible navigation links without the old card description', () => {
    renderRail()

    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/u/1969776354')
    expect(screen.queryByText('随时随地发现新鲜事')).not.toBeInTheDocument()
  })

  it('marks the current destination with aria-current', () => {
    renderRail({ pageKind: 'status' })
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')

    renderRail({ pageKind: 'profile', viewingProfileUserId: '1969776354' })
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page')
  })

  it('falls back to the home route when the current user id is missing', () => {
    vi.mocked(currentUserModule.getCurrentUserUid).mockReturnValue(null)
    renderRail({ rewriteEnabled: false })

    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Toggle xb rewrite' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: '切换主题模式' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/components/navigation-rail.test.tsx`
Expected: FAIL because `NavigationRail` still renders `Card` chrome, still depends on `logoOnly`, and does not expose the new `Primary navigation` landmark or `aria-pressed` rewrite state.

- [ ] **Step 3: Write the minimal responsive implementation**

```tsx
import { House, UserRound, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { Button } from '@/components/ui/button'
import { ThemeModeToggle } from '@/features/weibo/components/theme-mode-toggle'
import { getCurrentUserUid } from '@/features/weibo/platform/current-user'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { AppTheme } from '@/lib/app-settings'
import { cn } from '@/lib/utils'

const RAIL_BUTTON_BASE =
  'group flex min-h-14 items-center justify-center gap-3 rounded-[22px] px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 xl:justify-start xl:px-4'

export function NavigationRail({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
}: {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
}) {
  const currentUserUid = useMemo(() => getCurrentUserUid(), [])

  const navItems = useMemo(() => {
    const profileHref = currentUserUid ? `/u/${currentUserUid}` : '/'
    const isOwnProfileActive =
      pageKind === 'profile' &&
      Boolean(currentUserUid) &&
      Boolean(viewingProfileUserId) &&
      currentUserUid === viewingProfileUserId

    return [
      {
        icon: House,
        label: 'Home',
        href: '/',
        isActive: pageKind === 'home' || pageKind === 'status',
      },
      {
        icon: UserRound,
        label: 'Profile',
        href: profileHref,
        isActive: isOwnProfileActive,
      },
    ]
  }, [currentUserUid, pageKind, viewingProfileUserId])

  return (
    <aside className="flex h-full min-h-0 flex-col px-2 py-3 md:px-3 md:py-4 xl:px-4">
      <div className="flex justify-center xl:justify-start">
        <div className="flex size-14 items-center justify-center rounded-[20px] bg-background/80 ring-1 ring-border/70">
          <img src={WeiboLogo} alt="Weibo" className="h-9 w-auto translate-x-[2px]" />
        </div>
      </div>

      <nav aria-label="Primary navigation" className="mt-6 flex flex-col gap-3">
        {navItems.map(({ icon: Icon, label, href, isActive }) => (
          <Link
            key={label}
            to={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              RAIL_BUTTON_BASE,
              isActive
                ? 'bg-foreground text-background shadow-[0_18px_30px_-18px_rgba(0,0,0,0.45)]'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-[16px] bg-background/70 ring-1 ring-border/60 group-aria-[current=page]:bg-background/10 group-aria-[current=page]:ring-white/10">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-inherit/80 xl:inline">
              {label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-border/70 pt-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground xl:inline">
              Rewrite
            </span>
            <Button
              type="button"
              size="icon-lg"
              variant="secondary"
              aria-label="Toggle xb rewrite"
              aria-pressed={rewriteEnabled}
              onClick={() => onRewriteEnabledChange(!rewriteEnabled)}
              className="shrink-0 rounded-[18px]"
            >
              <Zap className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground xl:inline">
              Theme
            </span>
            <ThemeModeToggle value={theme} onChange={onThemeChange} />
          </div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `bun run test:unit -- src/features/weibo/components/navigation-rail.test.tsx`
Expected: PASS with 3 passing tests covering navigation links, active states, and bottom controls.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/components/navigation-rail.tsx src/features/weibo/components/navigation-rail.test.tsx
git commit -m "feat: redesign weibo navigation rail"
```

### Task 2: Render One Rail In `ShellFrame` And Verify Responsive Wiring

**Files:**
- Modify: `src/features/weibo/app/app-shell-layout.tsx`
- Create: `src/features/weibo/app/app-shell-layout.test.tsx`

- [ ] **Step 1: Write the failing shell-layout test**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ShellFrame } from '@/features/weibo/app/app-shell-layout'

vi.mock('@/features/weibo/components/right-rail', () => ({
  RightRail: () => <div data-testid="right-rail">right rail</div>,
}))

describe('ShellFrame', () => {
  it('renders one navigation rail instance and preserves page content', () => {
    render(
      <ShellFrame
        pageKind="home"
        viewingProfileUserId={null}
        rewriteEnabled
        theme="system"
        onRewriteEnabledChange={vi.fn()}
        onThemeChange={vi.fn()}
      >
        <div>center content</div>
      </ShellFrame>,
    )

    expect(screen.getAllByLabelText('Primary navigation')).toHaveLength(1)
    expect(screen.getByText('center content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/app/app-shell-layout.test.tsx`
Expected: FAIL because the current layout mounts two `NavigationRail` instances and only hides one of them with breakpoint classes.

- [ ] **Step 3: Simplify `ShellFrame` to one responsive rail**

```tsx
export function ShellFrame({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  children,
}: ShellFrameProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="mx-auto grid h-full w-full grid-cols-[88px_minmax(0,1fr)] gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-4 lg:grid-cols-[88px_minmax(360px,1fr)_240px] xl:grid-cols-[248px_minmax(360px,600px)_280px] xl:max-w-[1200px]">
        <div className="min-h-0">
          <NavigationRail
            pageKind={pageKind}
            viewingProfileUserId={viewingProfileUserId}
            rewriteEnabled={rewriteEnabled}
            theme={theme}
            onRewriteEnabledChange={onRewriteEnabledChange}
            onThemeChange={onThemeChange}
          />
        </div>
        <main className="min-w-0 overflow-hidden">{children}</main>
        <div className="hidden lg:flex">
          <RightRail />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the targeted regression suite**

Run: `bun run test:unit -- src/features/weibo/components/navigation-rail.test.tsx src/features/weibo/app/app-shell-layout.test.tsx src/features/weibo/app/app-shell.test.tsx`
Expected: PASS with the new layout test green and no regression in existing app-shell behavior.

- [ ] **Step 5: Run TypeScript compile verification**

Run: `bun run compile`
Expected: PASS with no type errors after removing `logoOnly` from `NavigationRail`.

- [ ] **Step 6: Commit**

```bash
git add src/features/weibo/app/app-shell-layout.tsx src/features/weibo/app/app-shell-layout.test.tsx
git commit -m "refactor: make weibo shell rail fully responsive"
```

### Task 3: Browser QA For Compact And Expanded Rail

**Files:**
- Test: `src/features/weibo/components/navigation-rail.tsx`
- Test: `src/features/weibo/app/app-shell-layout.tsx`

- [ ] **Step 1: Launch the extension in dev mode**

Run: `bun run dev`
Expected: The WXT dev server starts and prints the extension build status without TypeScript or Tailwind errors.

- [ ] **Step 2: Verify compact rail on non-`xl` width**

Check on a supported Weibo page with the shell narrower than the `xl` breakpoint:
- The rail renders once
- Only icons are visually shown for `Home` and `Profile`
- The logo appears visually centered in its brand container
- Bottom rewrite and theme controls remain reachable

- [ ] **Step 3: Verify expanded rail at `xl` width**

Check at the `xl` shell width:
- The same rail widens instead of switching to a second component
- `Home` and `Profile` labels appear as subdued secondary text
- The active destination reads as the strongest visual element
- The rail no longer looks like a generic `Card`

- [ ] **Step 4: Smoke-test behavior**

Confirm:
- `Home` still navigates to `/`
- `Profile` still navigates to `/u/<currentUserUid>` when a current user id is present and falls back to `/` when it is not
- Rewrite toggle still pauses and resumes xb mode
- Theme toggle still opens its menu and changes theme
