---
name: code-review
description: "A fresh-context review of the diff since a fixed point along two axes: Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue asked for?). No scores and no verdicts — findings reported plainly, plus a recommendation of which review gates should run when the PR opens. One sub-agent; the first stage of the pr-filing pipeline, where it runs in the background while the builder verifies. Also usable standalone."
---

One fresh sub-agent reads the diff and reports findings plainly — no scores, no severities, no verdicts. In the `pr-filing` pipeline it runs while the builder verifies, and its gate recommendation decides which specialised gates run once the PR opens. Standalone, it reviews any diff the user points at.

## Process

### 1. Pin the fixed point

In the `pr-filing` pipeline the fixed point is `main`, no question needed. Standalone, it is whatever the user supplies (a commit SHA, branch, tag, `HEAD~5`); if they didn't specify one, ask.

Capture three things once: the diff (`git diff <fixed-point>...HEAD` — three-dot, so the comparison is against the merge-base), the commit list (`git log <fixed-point>..HEAD --oneline`), and the changed files (`git diff --name-only <fixed-point>...HEAD`).

Before spawning anything, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here, not inside a sub-agent.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, etc.), read from the git log.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the sub-agent reports "no spec available" and skips that heading.

### 3. Identify the standards sources

Search the repo for every file that documents how code should be written. When `CODING_STANDARDS.md` or `CONTRIBUTING.md` exists, it must be on the list.

On top of whatever the repo documents, the sub-agent always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Skip anything tooling already enforces.

Each smell reads _what it is_ → _how to fix_; match it against the diff:

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Spawn the sub-agent

Pipeline mode: spawn it in the background first, then run the verification ladder from `AGENTS.md` in the main session while it works, and collect the report once the ladder is green. Standalone mode: run it in the foreground.

One fresh `opencode-go/glm-5.3-flash` sub-agent. Its prompt carries everything it cannot look up: the diff command, commit list, and changed-file list from step 1; the standards-source files found in step 3 **plus the smell baseline from step 3 pasted in full**; the spec source (path or contents) from step 2; and the brief below.

**The brief:** "Report under three headings, no scores. `## Standards`: (a) every place the diff violates a documented standard — cite the standard's file and rule; (b) any baseline smell you spot — name it and quote the hunk. Baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. `## Spec`: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff nobody asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. If no spec is available, say so and skip this heading. `## Gates`: recommend which review gates this PR needs when it opens — bug hunt (runs regardless of your recommendation), security review (backend, auth, input handling, dependencies), frontend review (UI quality), accessibility review (`src/app/**` or `src/components/**` changes) — with a one-line reason for each, including any you would skip and why. Under 500 words total."

### 5. Hand off

Pipeline mode: the report goes to the builder. Every `## Standards` and `## Spec` finding is fixed or explicitly dismissed with a reason **before the PR opens** — pre-PR fixes are the cheapest there will ever be. The dispositions (fixed in `<sha>` / dismissed: reason) travel to the judge, which re-checks them. The `## Gates` recommendation decides which gates the `pr-filing` pipeline runs; the builder may override it only with a stated reason, which also travels to the judge.

Standalone mode: present the report as-is.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them as separate headings stops one axis from masking the other. The sub-agent must not merge or rerank findings across the two axes.
