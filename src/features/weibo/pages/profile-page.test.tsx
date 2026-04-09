import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { ProfilePage } from '@/features/weibo/pages/profile-page'

describe('ProfilePage', () => {
  it('renders the header and posts tab', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProfilePage
            posts={{
              items: [
                {
                  id: '501',
                  isLongText: false,
                  mblogId: null,
                  text: 'profile post',
                  createdAtLabel: 'today',
                  author: { id: '1', name: 'Alice', avatarUrl: null },
                  stats: { likes: 1, comments: 1, reposts: 0 },
                  images: [],
                  media: null,
                  regionName: '',
                  source: '',
                },
              ],
              nextCursor: null,
            }}
            profile={{
              id: '1',
              name: 'Alice',
              bio: 'bio',
              avatarUrl: null,
              bannerUrl: null,
              followersCount: null,
              friendsCount: null,
              ipLocation: null,
              descText: null,
              createdAt: null,
              mutualFollowers: [],
              mutualFollowerTotal: null,
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '微博' })).toBeInTheDocument()
    expect(screen.getByText('profile post')).toBeInTheDocument()
  })
})
