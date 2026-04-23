export const XB_SOURCE = 'xb'
export const ROUTE_CHANGE_EVENT = 'route-change'

export interface RouteChangeMessage {
  source: typeof XB_SOURCE
  type: typeof ROUTE_CHANGE_EVENT
  href: string
}

export function isRouteChangeMessage(value: unknown): value is RouteChangeMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as RouteChangeMessage).source === XB_SOURCE &&
    (value as RouteChangeMessage).type === ROUTE_CHANGE_EVENT &&
    typeof (value as RouteChangeMessage).href === 'string'
  )
}
