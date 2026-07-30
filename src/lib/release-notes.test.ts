import { generateNotes } from '@semantic-release/release-notes-generator'
import { describe, expect, it } from 'vitest'

describe('release notes', () => {
  it('includes conventional commits in the generated GitHub Release body', async () => {
    const notes = await generateNotes(
      { preset: 'conventionalcommits' },
      {
        commits: [
          {
            hash: '0123456789abcdef',
            message: 'feat(feed): 支持自动查看全文',
          },
          {
            hash: 'fedcba9876543210',
            message: 'fix(xb): 修复转发微博操作栏',
          },
        ],
        lastRelease: { gitHead: '1111111111111111', gitTag: 'v1.21.0' },
        nextRelease: {
          gitHead: '2222222222222222',
          gitTag: 'v1.22.0',
          version: '1.22.0',
        },
        options: { repositoryUrl: 'https://github.com/nnecec/xb.git' },
        cwd: process.cwd(),
      },
    )

    expect(notes).toContain('支持自动查看全文')
    expect(notes).toContain('修复转发微博操作栏')
  })
})
