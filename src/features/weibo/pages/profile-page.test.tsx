import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProfilePage } from '@/features/weibo/pages/profile-page'

describe('ProfilePage', () => {
  it('renders the header and posts tab', () => {
    render(
      <ProfilePage
        activeTab="posts"
        posts={{
          items: [
            {
              id: '501',
              text: 'profile post',
              createdAtLabel: 'today',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 1, comments: 1, reposts: 0 },
            },
          ],
          nextCursor: null,
        }}
        profile={{ id: '1', name: 'Alice', bio: 'bio', avatarUrl: null, bannerUrl: null }}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Alice' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Posts' })).toBeInTheDocument()
    expect(screen.getByText('profile post')).toBeInTheDocument()
  })
})
