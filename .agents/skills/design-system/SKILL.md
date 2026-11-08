---
name: design-system
description: "DORMANT — do not run. A specialised review gate for UI compliance with the design system: tokens, patterns, and components. This repo has no design system yet, so the code-review pre-review never recommends this gate. The skill is kept ready to switch on once tokens and a component inventory are documented."
---

## Status: dormant

There is no design system to review against yet. This gate never runs — the `pr-filing` pre-review must never recommend it — and it must not be revived by an agent on its own judgement. Do not run it, do not improvise a design system mid-review.

## The thinking, for when it activates

The gate is a specialised compliance review, the same shape as the security and accessibility gates: diff-scoped, run by a fresh-context flash sub-agent, findings scored 1–10 with a word cap, returned to the judge.

What it would check, once there is something to check against:

- **Tokens** — every colour, spacing, radius, shadow, and font size in the diff comes from the token source (the Tailwind theme in `src/app/globals.css`). Hardcoded hex values, one-off pixel sizes, and inline `style={{}}` escapes are findings.
- **Components** — UI is assembled from the inventory in `src/components/ui` (shadcn). Re-implementing something the inventory already provides is a finding; so is forking a component's internals instead of using its variant API (cva).
- **Patterns** — recurring interactions follow one documented shape: destructive actions share a button variant, feedback goes through the same toast pattern, pages reuse the same layout shells.

Findings cite the token, component, or pattern breached, the way security findings cite the threat.

## Activation checklist

Reviving the gate needs, in order:

1. Tokens defined in the `src/app/globals.css` theme and documented.
2. The component inventory in `src/components/ui` documented, with usage patterns.
3. The gate listed in the `pr-filing` gate table and allowed in the `code-review` pre-review's recommendations.

A human does all three. Until then, visual quality is covered by the `frontend-design` skill at build time and the accessibility gate at review time.
