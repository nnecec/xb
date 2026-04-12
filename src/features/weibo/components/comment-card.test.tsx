import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { CommentCard } from '@/features/weibo/components/comment-card'
import type { CommentItem } from '@/features/weibo/models/status'

const thumb = 'https://example.com/t.jpg'
const large = 'https://example.com/l.jpg'

describe('CommentCard', () => {
  it('renders comment images once (no duplicate carousels)', () => {
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'hi',
      createdAtLabel: 'now',
      author: { id: '1', name: 'A', avatarUrl: null },
      likeCount: 0,
      images: [
        { id: 'i1', thumbnailUrl: thumb, largeUrl: large },
        { id: 'i2', thumbnailUrl: thumb, largeUrl: large },
      ],
      replyComment: null,
      comments: [],
    }

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard item={item} rootStatusId="s1" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(container.querySelectorAll('img.aspect-square')).toHaveLength(2)
  })
})
