import type { TimelinePage } from '@/lib/weibo/models/feed'

import type { WeiboTimelinePayload } from './timeline'
import { adaptTimelineResponse } from './timeline'

export interface ExploreHotPayload extends WeiboTimelinePayload {}

export type ExploreHotTimelinePage = TimelinePage

export function adaptExploreHotResponse(payload: ExploreHotPayload): ExploreHotTimelinePage {
  return adaptTimelineResponse(payload)
}
