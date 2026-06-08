---
name: planner-worker-review-orchestration
description: Runs large multi-step work end-to-end via Task subagents only—task-planner produces a linked plan, then for each subtask: worker or figma-layout-designer (layout/Figma-only), reviewer, then tester and reviewed tests, then next subtask until all are done. Use for large goals or backlogs. For a single feature without a plan, use worker-reviewer-tester-pipeline instead.
---

# Planner → Worker → Reviewer → Tester orchestration

## Role of the agent using this skill

The agent is the **orchestrator**. It **only** coordinates subagents via the **Task** tool.

- **Do not** implement or fix product code in the orchestrator chat. Every such change is **Task** with `subagent_type: worker` **or**, for layout- / Figma-only subtasks, `subagent_type: figma-layout-designer`—per subtask and per review pass.
- **Do not** add or fix tests in the orchestrator chat. Every test pass is **Task** with `subagent_type: tester`, per the test phase rules below.
- **Do not** claim you ran a subagent unless you **actually invoked Task** with the matching `subagent_type` in that step.
- Read-only file reads (e.g. plan index, subtask markdown) are allowed to build the next Task prompt.

## When this applies

Use this skill when the work is **large, cross-cutting, or explicitly a list of tasks** where a written plan and ordered subtasks help execution.

If the request is **already a single bounded change** with no planning step needed, prefer [.cursor/skills/worker-reviewer-tester-pipeline/SKILL.md](../worker-reviewer-tester-pipeline/SKILL.md) (worker → reviewer → tester → test review).

## Subagent identifiers

Use the Task tool with these `subagent_type` values (project agents in `.cursor/agents/`):

| Phase | `subagent_type` | Role |
|-------|-----------------|------|
| Planning | `task-planner` | Produces `docs/plans/<slug>/` with index (`README.md` or `PLAN.md`) and `NN-*.md` subtask files |
| Implementation | `worker` | Default: implements exactly what the current subtask file describes (logic, features, or mixed work) |
| Implementation (layout) | `figma-layout-designer` | **Markup and styles only** from Figma or design specs; **no** app logic, state, or APIs. Use when a subtask is **purely presentational** or driven by a Figma link. |
| Code review | `reviewer` | Reviews **implementation** changes for that subtask (production code) |
| Tests | `tester` | After implementation review is acceptable for the subtask: adds/updates tests and runs the suite (see [worker-reviewer-tester-pipeline](../worker-reviewer-tester-pipeline/SKILL.md)) |
| Test review | `reviewer` | Second pass: **test files only** for the tester’s output; iterate with **tester** per that skill |

## Phase 1 — Planner (once per initiative)

1. Invoke **Task** with `subagent_type: task-planner`.
2. Prompt must include the **full user goal**, constraints, and any task list they gave. Ask the planner to follow its own agent definition (linked index + subtask files under `docs/plans/<short-slug>/`).
3. Wait until the planner finishes. From chat output and/or the repo, record the **plan directory** and the **ordered list of subtask files** (from the index **Tasks** section or `NN-*.md` glob in that folder).

If the user points at an **existing** plan directory and asks to execute it, skip Phase 1 and start from Phase 2 using that path.

## Phase 2 — Execute every subtask (outer loop)

Process subtasks **in numeric filename order** (`01-…`, `02-…`, …) unless the plan explicitly allows parallel branches (default is sequential).

For **each** subtask file:

### 2a — Worker or figma-layout-designer

**Choose the implementing subagent** from the subtask:

- **`worker`** (default) — any implementation that is not “layout from design only.”
- **`figma-layout-designer`** — when the subtask is **only** structure and styling to match a **Figma** (or similar) file and must **not** add hooks, data wiring, or business logic. If the work is split, use **figma-layout-designer** for the presentational subtask and **worker** for wiring or behavior in a **later** subtask.

Invoke **Task** with the chosen `subagent_type` (`worker` or `figma-layout-designer`). The prompt must include:

- Path to the **subtask markdown file** (and optionally its full text if small).
- Path to the **plan index** (`README.md` or `PLAN.md`) for context.
- Instruction to implement **only** that subtask; do not start later subtasks.
- Any global constraints from the user (tests, style, no scope creep).

### 2b — Reviewer (after that subtask’s implementation pass)

Invoke **Task** with `subagent_type: reviewer`. The prompt must scope review to **what the implementing subagent just changed** for this subtask (paths, `git diff`, or “review the work just completed for subtask NN”).

### 2c — Inner loop until the subtask is done

Repeat **implementing subagent → reviewer** for **this same subtask** when the **implementation** reviewer reports issues that require product code changes, following the **same severity and fix rules** as [worker-reviewer-tester-pipeline](../worker-reviewer-tester-pipeline/SKILL.md) (Phase A).

- Re-run **Task** with the **same** implementing subagent type (`worker` or `figma-layout-designer`) the subtask used, unless the follow-up is clearly the other type (e.g. layout is done, next pass is `worker` for wiring—then follow the subtask’s intent); the orchestrator does **not** patch product code.
- Preserve the **3** implementation review cycles per subtask (unless the user extends): same cap logic as the pipeline skill’s Phase A.

Exit the **implementation** inner loop for this subtask when that phase’s exit conditions are met (see pipeline skill), then go to **2d — Tester and test review**.

### 2d — Tester, then test review (same subtask, after implementation is acceptable)

Do **not** advance to the next subtask file until this phase is **done** or the user said **no tests** for this initiative.

1. **Task** `subagent_type: tester`. The prompt must include: subtask file path, what the **implementing subagent** changed (paths/behavior to cover), and the plan index if useful. The tester **writes/runs tests**; see Phase B in [worker-reviewer-tester-pipeline](../worker-reviewer-tester-pipeline/SKILL.md).
2. **Task** `subagent_type: reviewer` with **scope: test files only** for what the tester produced.
3. If the test review requires test-only follow-up, **Task** `subagent_type: tester` with findings. If a finding requires **product** code changes, **Task** `subagent_type: worker` **or** `subagent_type: figma-layout-designer` (if the fix is **layout-only**) with that item, then **re-run implementation reviewer** as needed, then return to **tester** to align tests.
4. Loop **2d** until the test review meets that skill’s exit (or cap: **3** test-review cycles per subtask, same as pipeline), same as [worker-reviewer-tester-pipeline](../worker-reviewer-tester-pipeline/SKILL.md) Phase B.

### 2e — Advance to the next subtask

Move to the **next** subtask file. Continue until **all** subtasks in the plan are complete.

## Phase 3 — Closeout

Summarize for the user:

- Plan directory and subtasks completed.
- Any open LOW notes or deferred items.
- Suggested follow-up (e.g. PR split) only if relevant.

## Anti-patterns

- Starting **worker** before **task-planner** when the user asked for a full large-task pipeline and no plan exists yet.
- Running **reviewer** only once at the end for the whole plan when the user expected **per-subtask** code review (default: **after each** subtask’s **implementation** work) **and** skipping **per-subtask** test+test-review.
- Running **tester** before the **implementation** review loop is **done** (wrong order).
- Implementing planner output or **review** fixes **in the orchestrator** instead of **Task(worker)**, **Task(figma-layout-designer)**, or **Task(tester)**.
- Skipping subtasks or reordering without user approval when the plan defines an order.

## Optional modes

If the user explicitly wants **planner only**, **worker only**, **no review**, **no tests**, or **review only**, honor that and skip the phases they ruled out. If the user said **no tests** for a subtask, skip **2d** for that subtask only.
