# Contributing

## Setup

```bash
git clone https://github.com/louisschumacher-ops/PDFforge.git
cd PDFforge
nvm use          # Node version pinned in .nvmrc
npm install       # also installs the git hooks (husky, via the "prepare" script)
```

`npm install` alone is enough to get a fully working local setup — no manual hook
install step, no extra config.

## Scripts

| Command                 | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `npm run build`         | Build ESM + CJS bundles with type declarations via tsup        |
| `npm run dev`           | Build in watch mode                                            |
| `npm run typecheck`     | Type-check without emitting                                    |
| `npm run lint`          | ESLint                                                         |
| `npm run format`        | Prettier write                                                 |
| `npm run format:check`  | Prettier check (used in CI)                                    |
| `npm test`              | Run tests once (Vitest)                                        |
| `npm run test:watch`    | Vitest in watch mode                                           |
| `npm run test:coverage` | Run tests with coverage                                        |
| `npm run verify`        | lint + typecheck + test + build — run this before opening a PR |
| `npm run changeset`     | Record a changelog entry for your change                       |

## Module boundaries

Read [`docs/architecture.md`](./docs/architecture.md) before touching `src/`. The
pipeline (`parser -> graph -> layout -> grid -> routing -> pagination -> render`) is
strictly one-directional: a module only ever consumes the previous module's output
type, never reaches into JSON or PDFKit internals it doesn't own, and each has its own
test file (`src/<module>/index.test.ts`). Keep new code inside that structure rather
than adding cross-module shortcuts.

## Testing philosophy

Prefer deterministic, golden-style tests over snapshot-everything: assert on the
specific structural property a module is responsible for (e.g. layout tests assert
exact `{row, col}` positions, pagination tests assert no node's row is covered by two
pages). [`fixtures/example-network.json`](./fixtures/example-network.json) is the
shared example network used across modules and for manual PDF checks — extend it
rather than inventing a new one-off fixture unless you're testing something it can't
express.

Before opening a PR: `npm run verify` must be green.

## Changesets

Every user-facing change needs a changeset:

```bash
npm run changeset
```

Follow the prompts (patch/minor/major, short description). Commit the generated file
in `.changeset/` along with your change. CI enforces nothing here yet, but the release
workflow (`.github/workflows/release.yml`) reads these to version and publish — a PR
without one just won't show up in the next changelog.

## Branch / PR workflow

1. Branch from `main`.
2. Make your change, add/update tests, add a changeset if user-facing.
3. `npm run verify`.
4. Open a PR against `main`. CI (`.github/workflows/ci.yml`) runs format-check, lint,
   typecheck, test, and build automatically.
5. Squash-merge once green and approved.

Releases are automated: merges to `main` that include changesets get picked up by the
Changesets GitHub Action, which opens a "Version Packages" PR; merging that PR
publishes to npm. Publishing requires an `NPM_TOKEN` repository secret (Settings →
Secrets and variables → Actions) — set once, not part of the normal contributor flow.
