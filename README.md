# PDFforge

Generate scalable, semantic PDF documentation from NodeEditor workflow JSON exports.

PDFforge does not reproduce the editor view. It parses the logical graph (nodes, edges,
groups, metadata) from a NodeEditor JSON export, discards the editor's X/Y coordinates,
and computes a fresh hierarchical layout on a virtual grid rooted at a designated root
node (`n1`). The result is rendered as a paginated, print-ready PDF with automatic
cross-page navigation links.

## Status

Early scaffold. See [`docs/architecture.md`](./docs/architecture.md) _(TODO)_ for the
module breakdown: `parser -> graph -> layout -> grid -> routing -> pagination -> render`.

## Install

```bash
npm install
```

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

## Usage (planned)

```bash
npx pdfforge render fixtures/example-network.json out.pdf
```

## License

MIT
