declare module '@semantic-release/release-notes-generator' {
  interface Release {
    gitHead: string
    gitTag: string
    version?: string
  }

  interface ReleaseNotesContext {
    commits: Array<{
      hash: string
      message: string
    }>
    lastRelease: Release
    nextRelease: Release & {
      version: string
    }
    options: {
      repositoryUrl: string
    }
    cwd: string
  }

  export function generateNotes(
    pluginConfig: { preset: string },
    context: ReleaseNotesContext,
  ): Promise<string>
}
