# PDFforge

[![CI](https://github.com/louisschumacher-ops/PDFforge/actions/workflows/ci.yml/badge.svg)](https://github.com/louisschumacher-ops/PDFforge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Generate scalable, semantic PDF documentation from NodeEditor workflow JSON exports.

PDFforge does not reproduce the editor view. It parses the logical graph (nodes, edges,
groups, metadata) from a NodeEditor JSON export, discards the editor's X/Y coordinates,
and computes a fresh hierarchical layout on a virtual grid rooted at a designated root
node (`n1`). The result is a paginated, print-ready PDF with automatic cross-page
navigation links, scaled by a single central factor and independent of paper format.

## Quick start

```bash
git clone https://github.com/louisschumacher-ops/PDFforge.git
cd PDFforge
nvm use          # matches the Node version in .nvmrc
npm install       # also sets up the git hooks (husky)
npm run verify    # lint + typecheck + test + build
```

## Usage

```bash
npm run build
node dist/cli.js fixtures/example-network.json out.pdf
```

`out.pdf` is a fully paginated PDF: the example network is deliberately larger than one
page, so this also exercises pagination and the cross-page continuation links.

## How it works

Input JSON flows through seven independent, individually-tested modules:

| Module     | `src/<name>`  | Responsibility                                                                                              |
| ---------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| Parser     | `parser/`     | Reads nodes/edges/groups from JSON; editor `x`/`y` are never read                                           |
| Graph      | `graph/`      | Builds the logical graph from root `n1`, computes hierarchy depth                                           |
| Layout     | `layout/`     | Assigns each node a grid row (= depth) and column (sibling order)                                           |
| Grid       | `grid/`       | Turns the layout into physical cell/node/group rectangles for a given scale, paper format, and grid density |
| Routing    | `routing/`    | Computes orthogonal ("elbow") connector paths between nodes                                                 |
| Pagination | `pagination/` | Slices the virtual layout into physical pages without ever splitting a node                                 |
| Render     | `render/`     | Draws everything with PDFKit, including cross-page hyperlinks                                               |

See [`docs/architecture.md`](./docs/architecture.md) for the full breakdown and
[`docs/user-story.md`](./docs/user-story.md) for the requirements this implements
(including what's still open).

## Scripts

| Command                 | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `npm run build`         | Build ESM + CJS bundles with type declarations via tsup |
| `npm run dev`           | Build in watch mode                                     |
| `npm run typecheck`     | Type-check without emitting                             |
| `npm run lint`          | ESLint                                                  |
| `npm run format`        | Prettier write                                          |
| `npm test`              | Run tests once (Vitest)                                 |
| `npm run test:coverage` | Run tests with coverage                                 |
| `npm run verify`        | lint + typecheck + test + build, in that order          |
| `npm run changeset`     | Record a changelog entry before opening a PR            |

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full contributor workflow.

## License

MIT
