export default {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
      },
    ],
    [
      '@semantic-release/github',
      {
        successComment: false,
        failComment: false,
      },
    ],
    [
      '@semantic-release/exec',
      {
        publishCmd: [
          'if [ -n "${GITHUB_OUTPUT:-}" ]; then',
          '  {',
          '    echo "new_release=true"',
          '    echo "release_version=${nextRelease.version}"',
          '    echo "release_git_tag=${nextRelease.gitTag}"',
          '  } >> "$GITHUB_OUTPUT"',
          'fi',
        ].join('\n'),
      },
    ],
  ],
}
