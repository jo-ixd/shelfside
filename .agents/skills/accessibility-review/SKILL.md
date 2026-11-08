---
name: accessibility-review
description: "A specialised review gate checking UI changes against WCAG 2.2 AA. Scope is strictly the changed components plus any screenshot evidence — never a whole-app audit"
---

Check the changed UI against WCAG 2.2 level AA. Scope discipline is the whole game here: review only the components the diff touches, in full, plus the screenshot evidence if it exists. Never audit the whole app, never re-report barriers the diff didn't create.

This app builds on shadcn/base-ui primitives in `src/components/ui`, which supply semantics for free — focus your findings on usage: missing labels, aria overrides, custom markup that drops roles, and wiring that strands keyboard users.

## The checklist

**New in 2.2 — most likely to regress quietly**

- **2.4.11 Focus Not Obscured (min)** — sticky headers, footers, or floating bars must not cover the focused element.
- **2.5.7 Dragging Movements** — drag-only interactions (reordering a collection, for instance) need a non-drag alternative.
- **2.5.8 Target Size (min)** — interactive targets at least 24×24 CSS px, or equivalent spacing.
- **3.3.7 Redundant Entry** — multi-step forms must not re-ask for information already given.
- **3.3.8 Accessible Authentication** — no cognitive puzzles to sign in; paste-friendly password fields.
- **3.2.6 Consistent Help** — help entry points in the same place across pages.

**Core AA that most often regresses in diffs**

- **1.1.1** — meaningful images have honest alt text; decorative images have `alt=""`.
- **1.3.1** — heading levels in order, labelled form fields, real lists and tables.
- **1.4.3** — text contrast 4.5:1 (3:1 for large text); check from the screenshots.
- **2.1.1 / 2.4.3 / 2.4.7** — every interactive element keyboard-reachable, operable, in a sensible order, with visible focus.
- **3.3.1 / 3.3.2** — errors identified and described in text, next to the input, with labels or instructions.
- **4.1.2** — icon-only buttons have accessible names; aria attributes match the real semantics.

## Evidence

If screenshot evidence exists (`evidence/*.png` from `npm run screenshot` — desktop and mobile per page), and your model can view images, read them for contrast, target sizes, and focus-obscuring chrome — a screenshot answers in one look what would otherwise cost a DOM crawl. If you cannot view images, review from the code alone and note that the evidence awaits human eyes. If there is no evidence at all, review from the code and note that too.

## Severity anchors

- 8–10 — a keyboard or screen-reader user is blocked: focus trap, no keyboard path to an action, unlabelled inputs, drag-only operation.
- 4–7 — partial barrier: contrast miss, target too small, heading level skip, vague error.
- 1–3 — polish: suboptimal alt wording, decorative detail.

## Report

Under 300 words. One finding per issue: severity, the WCAG criterion, `file:line`, what the barrier is, and the smallest fix. End with a verdict line: worst severity, and whether the gate passes — any finding at 8 or above fails the gate. The orchestrator posts this as the PR comment; end it with the signature line from the `pr-filing` skill.
