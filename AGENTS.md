<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commands

Run from the repo root. `npm install` first if `node_modules/` is missing. If `tsc` reports `LayoutProps` or other route types as missing, run `npx next typegen` — they are generated, not checked in.

- `npm run dev` — dev server on http://localhost:3000
- `npm run lint` — ESLint (flat config, `eslint-config-next`). Must be clean before every commit.
- `npm run format` — Prettier over the whole repo; `npm run format:check` verifies without writing.
- `npm run test` — Vitest, single run; `npm run test:watch` for watch mode. Unit tests live next to the module they cover (`src/lib/*.test.ts`).
- `npm run build` — production build; run after any structural change (new/deleted routes or files).

Expected green before pushing: `npm run lint && npm run format:check && npm run test && npm run build`.

## PRs

Never merge a pull request — not even your own, not even when CI is green. The user reviews and merges every PR themselves. Open the PR, link it in chat, and stop.

Labels: when opening a PR or issue, tag it only with labels that already exist in the repo (`gh label list`). Never invent, create, or rename labels — if nothing fits, leave it unlabelled.

## Conventions

- Styling is Tailwind v4 utility classes only. Inline `style={{...}}` is allowed only for genuinely runtime-dynamic values (per-book colours, drag position, progress width). Never hardcode hex constants in TS files — use Tailwind classes or shadcn theme tokens (`bg-primary`, `text-muted-foreground`, …).
- shadcn components live in `src/components/ui/` and are added with the `shadcn` CLI only when actually needed — don't scaffold unused ones.
- No parallel data stores: `src/lib/store.tsx` is the single app store; data-model helpers live in `src/lib/library.ts`.
