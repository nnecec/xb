let cachedUid: string | null = null

export function getCurrentUserUid(): string | null {
  if (cachedUid) return cachedUid

  const tabNav = document.querySelector('.woo-box-flex.woo-tab-nav.woo-tab-nav')
  if (!tabNav) return null

  const fifthChild = tabNav.children[4]
  if (!fifthChild) return null

  const anchor =
    fifthChild.tagName === 'A'
      ? (fifthChild as HTMLAnchorElement)
      : fifthChild.querySelector('a')
  if (!anchor) return null

  const href = anchor.getAttribute('href')
  if (!href) return null

  const match = href.match(/\/u\/(\d+)/)
  cachedUid = match?.[1] ?? null
  return cachedUid
}
