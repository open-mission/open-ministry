# Contributing to OpenMinistry

This repository is public. Commit messages, pull request titles and descriptions
are part of our public engineering showcase, so **everything written for Git must
be in English**. Day-to-day team conversation can stay in Portuguese; Git content
cannot.

## Language rule

Always use English for:

- Commit messages (subject and body)
- Pull request titles and descriptions
- Branch names
- Code comments, identifiers, tests and documentation added to the repository

Never rewrite already-published commit history to translate it. The standard
applies to every new commit and pull request from this point forward.

## Branching

Follow Git Flow, always starting from `develop`:

| Prefix | Use for |
| :--- | :--- |
| `feature/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Maintenance, tooling and documentation |

Use lowercase kebab-case names, for example `feature/song-stage-mode`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<optional scope>): <short imperative summary in English>

Optional body in English explaining why, not what.

Optional footer, e.g. Refs #123
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

Rules:

- Subject in English, imperative mood ("add", not "added" or "adds").
- Keep the subject at or below 72 characters; no trailing period.
- Use a scope when it helps (`ui`, `auth`, `songs`, `workflows`, `db`).
- One logical change per commit. Breaking changes use `!` before the colon.
- Do not add AI tool attribution footers such as `Generated with Claude Code` or
  `Co-authored-by: Claude`.

Examples:

```
feat(songs): add stage mode with two-column chord view
fix(security): set Secure attribute when expiring __Secure- cookies
perf(server): run independent queries in parallel on the home page
docs: define English commit and pull request conventions
```

## Pull requests

- Open the PR from your working branch into `develop` (or `develop` into `main`
  for a release).
- Write the **title as a Conventional Commit in English**, matching the format
  above. CI rejects titles that do not follow it.
- Fill in the PR template in English: what changed, why, how it was tested and
  any remaining risk.
- Link the related issue or task when one exists.
- Keep the PR focused. Split unrelated changes into separate PRs.
- Required checks must pass: PR title validation, lint and typecheck. The full
  test suite is still run locally only, because some test files use global
  `mock.module()` and are not isolated from each other yet.
- Merge with a **merge commit** to preserve the atomic commits and the delivery
  boundary, then delete the head branch.
- Never push directly to `main`, and never deploy without explicit approval.

## Before you open a PR

```bash
bun run lint
bun run typecheck
bun run test
```

Add `bun run build` when the change affects the build, configuration or
production output.
