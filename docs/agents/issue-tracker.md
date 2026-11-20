# Issue tracker: GitHub

Specs and tickets for this repository live in GitHub Issues. Use the `gh` CLI from the repository clone so the remote selects the repository automatically.

## Conventions

- Publish a spec or ticket with `gh issue create`.
- Read the complete issue body, comments, and labels before acting on an existing issue.
- Apply and remove workflow labels with `gh issue edit`.
- Keep a source issue open when splitting it into implementation tickets.
- Use GitHub's native sub-issue and blocking relationships when available. Otherwise, record `Parent` and `Blocked by` references in each issue body.

## Pull requests as a request surface

PRs as a request surface: no. Pull requests are implementation artifacts, not incoming feature or bug requests for triage.
