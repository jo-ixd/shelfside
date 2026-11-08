---
name: frontend-review
description: "A specialised review gate for the UI quality of frontend changes: visual coherence with the rest of the app, responsive behaviour, loading/error/empty states, and interaction feedback. Scope is strictly the changed components plus any screenshot evidence. Runs as a fresh-context flash sub-agent when the code-review pre-review recommends it; invoked by the pr-filing skill. Findings return to the judge — this gate never posts to the PR."
---

Check the changed UI the way a user would experience it: does it work, and does it feel like the rest of the app? Scope discipline is the whole game — review only the components the diff touches, in full, plus the screenshot evidence if it exists. Never review the whole app, never re-report issues the diff didn't create.

Boundaries: WCAG compliance is the `accessibility-review` gate's job, and the `design-system` gate is dormant. This gate covers whether the UI works and coheres.

## Checklist

- **Visual coherence** — spacing, radius, type scale, and colour come from the app's existing patterns (the Tailwind theme and shadcn components in `src/components/ui`), not one-off values. New UI sits next to old UI without looking bolted on.
- **Responsive behaviour** — the mobile layout from the evidence: rails, stacks, and grids at every breakpoint the change claims to support.
- **States** — every new data-bearing surface has loading, empty, and error states; every action has pending and disabled states. A spinner-free wait or a silent failure is a finding.
- **Feedback** — actions confirm (toast, state change, navigation), destructive actions are guarded, and the UI responds within a beat of the click.
- **Copy** — wording matches the app's existing tone; no placeholder text survives.
- **Flow** — the changed flow end to end: can a user actually complete it, or does it dead-end (a save with no confirmation, a back button that loses work)?

## Evidence

If screenshot evidence exists (`evidence/*.png` from `npm run screenshot` — desktop and mobile per page) and your model can view images, read them first: one look answers what a DOM crawl cannot — spacing drift, cramped mobile layouts, visible loading states. If you cannot view images, review from the code alone and note that the evidence awaits human eyes. If there is no evidence at all, review from the code and note that too.

## Severity anchors

- 8–10 — broken UI: layout broken, an action unusable, wrong data displayed, a flow that dead-ends.
- 4–7 — rough: inconsistent spacing or typography, a missing loading/empty/error state, broken at one breakpoint.
- 1–3 — polish: suboptimal copy, minor spacing drift.

## Report

Under 300 words. One finding per issue: severity, `file:line`, what the user experiences, and the smallest fix. End with a verdict line: worst severity found, and whether the gate passes — any finding at 8 or above fails the gate.

Return this report to the orchestrator. You never post to the PR — the judge reads your findings, re-checks them, and decides what reaches the PR.
