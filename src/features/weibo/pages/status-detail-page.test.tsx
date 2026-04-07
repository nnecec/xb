import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'

describe('StatusDetailPage', () => {
  it('renders the main post and replies', () => {
    render(
      <StatusDetailPage
        detail={{
          status: {
            id: '501',
            text: 'main post',
            createdAtLabel: 'today',
            author: { id: '1', name: 'Alice', avatarUrl: null },
            stats: { likes: 1, comments: 1, reposts: 0 },
          },
          replies: [
            {
              id: '601',
              text: 'reply',
              createdAtLabel: 'today',
              author: { id: '2', name: 'Bob', avatarUrl: null },
              stats: { likes: 0, comments: 0, reposts: 0 },
            },
          ],
        }}
      />,
    )

    expect(screen.getByText('main post')).toBeInTheDocument()
    expect(screen.getByText('reply')).toBeInTheDocument()
  })
})
