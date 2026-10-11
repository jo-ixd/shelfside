# Plan: Clean up UI, files, and tooling (shelfside)

## Goal

Remove dead prototype files and unused shadcn components, fix the remaining bad custom styles, delete CLAUDE.md, add a test setup, and document lint/format/test commands in AGENTS.md.

## Current context / assumptions

Verified against the repo at commit `9b5d231` ("Merge desktop UI and homepage prototypes into main (#2)"). Worktree: `clean-up-ui-and-files`, clean.

**Stack:** Next.js 16.3.8 (App Router, `src/` layout), React 19, Tailwind v4, shadcn/ui (new `shadcn` package with `@import "shadcn/tailwind.css"`), ESLint 9 flat config. **No test framework. No formatter (no prettier/biome anywhere).** `node_modules` is NOT installed in this worktree — the implementer must run `npm install` first or every later command fails.

**Audit findings (all verified by grep, not guessed):**

1. **Dead prototype chain** — a whole parallel app from the merge:
   - `src/components/library-home.tsx` (150 lines) — imported by _nothing_.
   - `src/components/proto-shared.tsx` (195 lines) — only imported by `library-home` and `proto-collection-view`.
   - `src/components/proto-collection-view.tsx` (164 lines) — only used by `src/app/collection/page.tsx`.
   - `src/lib/proto-library.ts` (222 lines) — a **second, parallel localStorage store** (`subscribeProtoCols` / `getProtoCols` / `getServerProtoCols`) duplicating `src/lib/store.tsx`. This is the overengineered abstraction.
   - `src/app/collection/page.tsx` — the only route using the above. The only link to `/collection?col=…` in the entire codebase is inside the dead `library-home.tsx` (line 73). The live app routes through `src/app/shelf/page.tsx` (`/shelf?col=…&wish=…` from `collections-grid.tsx:38`). Navigation (sidebar + bottom nav) only links `/`, `/wishlist`, `/profile`.
   - `proto-shared.tsx` also duplicates `src/components/book-tile.tsx` almost line-for-line (same `Cover` gradient, same `StatusPill`) — the DRY violation.
2. **Unused shadcn components** in `src/components/ui/` — nothing outside `ui/` imports: `card.tsx`, `progress.tsx`, `separator.tsx`, `switch.tsx`, `tabs.tsx`, `textarea.tsx`. (`library-home.tsx` used `card`/`dialog`, but it is itself dead.) Used and kept: `badge`, `button`, `dialog`, `drawer`, `input`, `label`, `select`, `sonner`.
3. **Unused stock assets:** `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` (create-next-app defaults, zero references). **Keep** `public/covers/` — referenced by `src/lib/library.ts:106`.
4. **Bad custom styles** (`style={{...}}` audit, 6 hits total):
   - `src/components/add-view.tsx:41,159` — `const MATCHED = { bg: "#2a3b2a", border: "#3f5a3f", text: "#a8d8b0" }` hardcoded-hex success banner applied via three inline styles. **Fix:** replace with static Tailwind classes.
   - `src/components/profile-view.tsx:95` — `style={{ background: hex }}` on accent swatches. **Legitimately dynamic** (user-picked hex from `ACCENTS`); keep.
   - `src/components/book-tile.tsx:72` — gradient from the book's colour. **Dynamic per book**; keep.
   - `src/components/shelf-view.tsx:317` — drag ghost positioned at pointer x/y. **Dynamic**; keep.
   - `src/components/book-detail-sheet.tsx:177` — progress bar width + gradient. **Dynamic**; keep.
   - Minor hardcoded hexes in _classNames_ (not inline styles): `bg-[#d4a0d8]` wishlist dot in `book-tile.tsx` and `proto-shared.tsx`; `#f4ead6` cover text colours in `book-tile.tsx`. One-off hexes in Tailwind arbitrary values are acceptable (they're theme-invariant cover-art styling); note but don't churn.
   - `src/app/globals.css` — standard shadcn token setup, no custom junk. Leave alone.
5. **CLAUDE.md** — contains exactly one line: `@AGENTS.md` (an import pointer). Delete it. AGENTS.md stays.
6. **Tooling reality:** Jake said "we have linting and formatting" — we have linting (`npm run lint` → `eslint`), **no formatting tool is configured**. Plan adds Prettier. Testing: none → plan adds Vitest (unit tests only, on `src/lib/library.ts` pure functions — no component testing yet, YAGNI).
7. **Dependencies kept as-is:** `shadcn` (runtime, needed for the CSS import), `@base-ui/react` (shadcn primitives), `@heroicons/react` (app icons) + `lucide-react` (only inside `ui/` components — that split is shadcn's doing, leave it), `cn` package (what `src/lib/utils.ts` re-exports). No dependency changes in this plan except the two devDependency additions below.
8. `node_modules/next/dist/docs/` must be consulted before touching Next-specific code; this plan only deletes files and edits small JSX, so risk is low.

**Assumption:** deleting the `/collection` route is acceptable because it is unreachable from the running app's navigation. Flagged again in Risks.

## Architecture / proposed approach

Three deletion passes (dead prototype app → unused UI components → stock assets + CLAUDE.md), each verified by typecheck/lint/build immediately after, so a deletion that breaks something is caught in the same task. Then two small style fixes (the MATCHED banner), then tooling: add Vitest with tests against `src/lib/library.ts` pure functions (TDD: write tests first against existing behaviour), add Prettier, and document all four commands in AGENTS.md. Commit after every task.

## Step-by-step tasks

Run everything from the worktree root: `/home/jake/Documents/code/shelfside/.worktrees/clean-up-ui-and-files`.

### Task 0 — Install dependencies

```bash
npm install
```

Expected: completes without errors; `node_modules/` exists afterwards (`test -d node_modules && echo ok` prints `ok`).

Baseline check before touching anything:

```bash
npm run lint
```

Expected: no output, exit 0. If the baseline is already red, STOP and report — do not fix pre-existing lint issues in this branch.

Commit: nothing yet.

### Task 1 — Delete the dead prototype app

Delete these five files (they form one connected component; every import edge between them was verified):

```bash
git rm src/components/library-home.tsx \
       src/components/proto-shared.tsx \
       src/components/proto-collection-view.tsx \
       src/app/collection/page.tsx \
       src/lib/proto-library.ts
```

Verify nothing still references them:

```bash
grep -rn "proto-library\|proto-shared\|proto-collection-view\|library-home" src/
```

Expected: no output.

```bash
npx tsc --noEmit && npm run lint
```

Expected: both clean, exit 0. Then `npm run build` — expected: "✓ Compiled successfully", all routes listed: `/`, `/add`, `/collections/new`, `/profile`, `/shelf`, `/wishlist` (no `/collection`).

```bash
git commit -m "chore: remove unreachable prototype app and parallel store"
```

### Task 2 — Remove unused shadcn components

```bash
git rm src/components/ui/card.tsx \
       src/components/ui/progress.tsx \
       src/components/ui/separator.tsx \
       src/components/ui/switch.tsx \
       src/components/ui/tabs.tsx \
       src/components/ui/textarea.tsx
```

Note: do NOT delete `src/components/ui/` wholesale — `badge`, `button`, `dialog`, `drawer`, `input`, `label`, `select`, `sonner` are all live.

Verify:

```bash
grep -rn "components/ui/card\|components/ui/progress\|components/ui/separator\|components/ui/switch\|components/ui/tabs\|components/ui/textarea" src/
```

Expected: no output.

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: all clean.

```bash
git commit -m "chore: drop unused shadcn components"
```

### Task 3 — Remove stock assets and CLAUDE.md

```bash
git rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg CLAUDE.md
```

Verify the kept cover art is still referenced (it should be — this is a sanity check, not a change):

```bash
grep -n "covers/" src/lib/library.ts
```

Expected: line 106 references `/covers/brimstone.png` and `/covers/brimstone-spine.png`.

```bash
npm run build
```

Expected: clean. (`next build` catches broken `public/` references only indirectly, but combined with the grep above the check is sufficient.)

```bash
git commit -m "chore: remove CLAUDE.md pointer and unused stock SVGs"
```

### Task 4 — Replace the MATCHED hex banner with Tailwind classes

The file uses `@heroicons/react` and shadcn `Input`/`Select`; match the existing style.

**In `src/components/add-view.tsx`:**

1. Delete line 41 entirely:
   ```ts
   const MATCHED = { bg: "#2a3b2a", border: "#3f5a3f", text: "#a8d8b0" };
   ```
2. Replace the banner JSX (lines ~155–163):
   ```tsx
   {
     matched ? (
       <p className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-emerald-200">
         <CheckCircleIcon className="size-4 shrink-0" />
         {matched}
       </p>
     ) : null;
   }
   ```

The old hexes map to Tailwind's emerald scale (`#2a3b2a`≈`emerald-950`, `#3f5a3f`≈`emerald-800`, `#a8d8b0`≈`emerald-200`) — same muted-green success look, no inline styles, no custom constants.

Verify:

```bash
grep -n "MATCHED\|style={{" src/components/add-view.tsx
```

Expected: no output.

```bash
npx tsc --noEmit && npm run lint
```

Expected: clean.

```bash
git commit -m "refactor: replace hex banner in add view with tailwind classes"
```

(If Jake disagrees with the emerald choice, the fallback is a one-line chat decision — don't invent a second scheme.)

### Task 5 — Add Vitest (TDD on existing pure functions)

`src/lib/library.ts` is pure TypeScript (data model + helpers: `loadState`, `saveState`, `colourOf`, book/collection helpers) — no React, no DOM beyond guarded `localStorage` access. Test the pure helpers.

1. Install:

   ```bash
   npm install -D vitest
   ```

   Expected: added to `devDependencies` in `package.json`.

2. Create `vitest.config.ts` in the repo root (needed for the `@/` alias used by `library.ts` imports):

   ```ts
   import { defineConfig } from "vitest/config";
   import path from "node:path";

   export default defineConfig({
     resolve: {
       alias: { "@": path.resolve(__dirname, "src") },
     },
     test: {
       environment: "node",
       include: ["src/**/*.test.ts"],
     },
   });
   ```

3. **RED:** read `src/lib/library.ts` first and pick 3–4 pure helpers it actually exports (e.g. `colourOf`, a `saveState`/`loadState` round-trip using a `localStorage` stub, and one collection/book mutation helper). Then write `src/lib/library.test.ts` with one `describe` per helper and assertions against the **current** behaviour (these are regression tests, not new features). Stub localStorage only if a helper touches it:

   ```ts
   const store = new Map<string, string>();
   vi.stubGlobal("localStorage", {
     getItem: (k: string) => store.get(k) ?? null,
     setItem: (k: string, v: string) => void store.set(k, v),
     removeItem: (k: string) => void store.delete(k),
   });
   ```

   Run and confirm the tests execute and pass against current behaviour:

   ```bash
   npx vitest run
   ```

   Expected: `Test Files  1 passed (1)` / `Tests  N passed (N)`. (If any test fails, the test's understanding of the function is wrong — fix the test, not the source. These are green tests of existing behaviour; there is no red→green cycle here because no new code is being written.)

4. Add the script to `package.json` — inside `"scripts"`, after `"lint"`:

   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

5. Verify:

   ```bash
   npm run test
   ```

   Expected: same passing result as `npx vitest run`.

```bash
git commit -m "test: add vitest with unit tests for the library data model"
```

### Task 6 — Add Prettier

```bash
npm install -D prettier
```

Create `.prettierrc` in the repo root (matches the existing code style — double quotes, semicolons, 80 col):

```json
{
  "doubleQuote": true,
  "printWidth": 80
}
```

Create `.prettierignore`:

```
node_modules
.next
package-lock.json
```

Add to `package.json` scripts:

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Verify:

```bash
npm run format:check
```

Expected: likely FAILS on existing files (code was never formatted). If it fails, run `npm run format`, then inspect the diff:

```bash
git diff --stat
```

Expected: formatting-only changes. Then:

```bash
npx tsc --noEmit && npm run lint && npm run test && npm run build
```

Expected: all clean — this proves formatting changed nothing behavioural.

```bash
git add -A && git commit -m "chore: add prettier and format the codebase"
```

### Task 7 — Document lint, format, test in AGENTS.md

Append to `AGENTS.md` (after the existing `nextjs-agent-rules` block):

```markdown
## Commands

Run from the repo root. `npm install` first if `node_modules/` is missing.

- `npm run dev` — dev server on http://localhost:3000
- `npm run lint` — ESLint (flat config, `eslint-config-next`). Must be clean before every commit.
- `npm run format` — Prettier over the whole repo; `npm run format:check` for CI-style verification.
- `npm run test` — Vitest, single run; `npm run test:watch` for watch mode.
- `npm run build` — production build; run after any structural change (new/deleted routes or files).

Expected green before pushing: `npm run lint && npm run format:check && npm run test && npm run build`.

## Conventions

- Styling is Tailwind v4 utility classes only. Inline `style={{...}}` is allowed only for genuinely runtime-dynamic values (per-book colours, drag position, progress width). Never hardcode hex constants in TS files — use Tailwind classes or shadcn theme tokens (`bg-primary`, `text-muted-foreground`, …).
- shadcn components live in `src/components/ui/` and are added with the `shadcn` CLI only when actually needed — don't scaffold unused ones.
- No parallel data stores: `src/lib/store.tsx` is the single app store; helpers live in `src/lib/library.ts`.
```

Verify:

```bash
npm run lint
```

Expected: clean (markdown isn't linted, but confirms nothing broke).

```bash
git commit -am "docs: document lint, format and test commands in AGENTS.md"
```

### Task 8 — Full final verification

```bash
npm run lint && npm run format:check && npm run test && npx tsc --noEmit && npm run build
```

Expected: every command exits 0; build lists exactly these routes: `/`, `/add`, `/collections/new`, `/profile`, `/shelf`, `/wishlist`.

Smoke-test the running app (manual, 2 min): `npm run dev`, open http://localhost:3000, confirm the collections grid renders, the sidebar Add button opens the menu, and `/shelf?col=Living%20Room&wish=0` renders the shelf. The prototype's removal must not have visibly changed the real app.

Final state check:

```bash
git status && git log --oneline 9b5d231..HEAD
```

Expected: clean tree, six commits (Tasks 1–7).

## Tests / validation

- Tasks 1–3 and 4 are deletions/small refactors: each is validated by `npx tsc --noEmit && npm run lint` (plus `npm run build` for structural deletions) immediately in-task, with grep proving no dangling references.
- Task 5 is the test task: tests are written against existing behaviour of `src/lib/library.ts` and must pass on first correct run; any failure means the test is wrong, not the source. Gate: `npm run test` exits 0 with all declared tests passing.
- Task 6 gates formatting on a full `tsc + lint + test + build` run to prove zero behavioural change.
- Task 8 re-runs everything and adds a manual smoke test of the dev server.

## Risks, tradeoffs, and open questions

- **Deleting `/collection` (Task 1):** the strongest judgement call. Evidence it's dead: no nav link, the only inbound href is in a dead file, and its whole data layer (`proto-library.ts`) is a duplicate store. Risk: it may be a kept-for-later prototype. Mitigation: it's one `git revert` away; flag to Jake before the PR if unsure.
- **Prettier reformat churn (Task 6):** `npm run format` will touch most files, polluting the diff. Tradeoff accepted; it's isolated in its own commit so it can be reviewed or dropped independently.
- **`cn` package vs `clsx` + `tailwind-merge`:** `src/lib/utils.ts` re-exports from the niche `cn` package instead of shadcn's standard clsx+tailwind-merge pair. Left alone (works fine, no behavioural gain); noted as a possible follow-up.
- **Two icon libraries** (`@heroicons/react` in app code, `lucide-react` inside shadcn `ui/` components). Consolidating would mean editing vendored shadcn files — worse tradeoff. Kept.
- **Open question for Jake:** none blocking. If Jake actually uses `/collection` by typing the URL, say so before executing Task 1.
- **Manual smoke test** is the one non-scripted step; it's cheap and catches the class of regression grep/tsc cannot (runtime CSS/JSX behaviour after deletions).
