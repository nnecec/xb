/**
 * Private Weibo IO implementation (load* / mutations).
 * Not a public seam — import from `@/lib/weibo/data/weibo-data` in production code.
 * Tests may mock this module so queryFn closures and re-exports both see fakes.
 */

export * from './io/timeline'
export * from './io/profile'
export * from './io/status'
export * from './io/mutations'
export * from './io/explore'
export * from './io/social'
export * from './io/topic'
