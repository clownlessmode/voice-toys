---
name: worker-reviewer-tester-pipeline
description: Orchestrates dev work via Task subagents: worker or figma-layout-designer (layout/Figma-only) → reviewer → loop; then after implementation review is clean, tester (tests) → reviewer (tests) → loop. Orchestrator does not write code or tests. Use for /implement, single-scope features, and any pipeline that should ship code plus reviewed tests.
---

# Worker → Reviewer → Tester → Reviewer (tests)

## Orchestrator (non-negotiable)

The agent using this skill is the **orchestrator**. It **only** uses the **Task** tool with the right `subagent_type`.

- **Implementation and fixes after implementation review** → `subagent_type: worker` in the general case, or **`subagent_type: figma-layout-designer`** when the task is **only** layout / Figma-driven markup and styles (no app logic, state, or API wiring; see `.cursor/agents/figma-layout-designer.md`). Use **one** implementing subagent for the same top-level item unless the user splits layout vs behavior (every pass; never patch production code in the orchestrator chat).
- **Tests and fixes after test review** → `subagent_type: tester` (every pass; never add or edit test files in the orchestrator chat).
- **Never** say you are “running worker” or “running tester” unless you **invoke Task** with that `subagent_type` in that turn.
- Read-only reads (plan files, diffs) are fine to build the next Task prompt.

## Phase A — Implementation and code review (unchanged in spirit)

1. **Task** with `subagent_type: worker` **or** `subagent_type: figma-layout-designer` — full implementation of the current scope. Use **figma-layout-designer** when the user gave a Figma link or the work is **strictly** presentational (structure + styles); use **worker** for everything that includes behavior, data, or non-trivial logic.
2. **Task** `subagent_type: reviewer` — review **production / implementation** changes (paths, diff, “review what the last implementing subagent changed”).

3. If the reviewer requires **product-code** follow-up (same bar as before: **CRITICAL**, **HIGH**, material **MEDIUM** / substantive must-fixs), run **Task** with the same implementing subagent type the item used (`worker` or `figma-layout-designer`); for layout-only fixes, prefer **figma-layout-designer** when the original pass was presentational. **Repeat 2–3** until implementation review meets exit (remaining notes **LOW**-only, or no **CRITICAL**/**HIGH** and no mandatory **MEDIUM** per your bar—match prior project convention).

4. **Cap: 3** implementation review cycles per top-level request unless the user extends.

**Do not** start Phase B until Phase A is done (implementation is acceptable to move forward).

## Phase B — Tests, then test review (after a successful implementation pass)

5. **Task** `subagent_type: tester` with a prompt that includes:
   - What was implemented and **which files or areas** to cover
   - Link to the **subtask** or user goal, if any
   - Instruction to add/update tests **and** run the project test command(s)
   - “Do not change product behavior except tiny hooks if the repo already uses that pattern; if a production bug is found, report it.”

6. **Task** `subagent_type: reviewer` with scope **test artifacts only** (explicit: test file paths, `**/*_test.*`, or “review only the test changes from the last tester run”). The reviewer still uses the same severity labels; findings apply to **test quality** (wrong assertions, flakiness, tests that do not test what they claim, etc.).

7. If the **test** review requires follow-up in **test code**:
   - Run **Task** `subagent_type: tester` again with the numbered findings.
   - If a finding implies **product code** must change, run **Task** `subagent_type: worker` or **`figma-layout-designer`** (for layout-only fixes) with that finding, then re-run **reviewer (implementation)** if production code changed, then return to **tester** as needed to align tests (keep cycles bounded).

8. **Repeat 6–7** until test review is clean at **CRITICAL**/**HIGH**, or only **LOW** remain.

9. **Cap: 3** test review cycles (tester → reviewer passes) per top-level request unless the user extends.

## Order summary

`worker|figma-layout-designer → reviewer → (loop impl) → tester → reviewer(tests) → (loop tests; worker|figma-layout-designer only if product change needed)`

## When to move on (orchestration)

- After Phase **A** and **B** complete (or the user says to skip tests—see below), the orchestration may **advance to the next task** (e.g. next subtask file in a plan, or the user’s next item). **Do not** start the next task’s worker until the current item’s test phase is either **done** or **explicitly skipped**.

## What to pass into Task prompts

| Step | `subagent_type` | Give |
|------|-----------------|------|
| Impl | `worker` or `figma-layout-designer` | Full task; Figma link or “layout only” for **figma-layout-designer**; later, reviewer’s implementation findings. |
| Code review | `reviewer` | Intent, changed paths / diff for **implementation** files. |
| Tests | `tester` | What to cover, key scenarios, and paths touched by the feature. |
| Test review | `reviewer` | Paths or diff for **test files only**; say so explicitly. |
| Test follow-up | `tester` | Reviewer’s test findings by severity. |

## Anti-patterns

- Reviewing **tests and implementation in one undifferentiated reviewer** pass when the pipeline is **tester** then **reviewer**—by default, **separate** implementation review and **test** review.
- **Orchestrator** writing tests or production fixes without **Task(tester)** / **Task(worker)** / **Task(figma-layout-designer)**.
- **Skipping** Phase B on a task that should ship tests, unless the user asked for no tests.
- **Ignoring** **CRITICAL**/**HIGH** on the test review to “move on.”

## Optional: one-shot / skip tests

- **No review**: only if the user said so; does not add tests by default.
- **Tests only / tester only**: possible if there is no new implementation in this turn; still use **Task(tester)**.
- **Skip test phase** for a given task: only if the user says **no tests** or **implementation-only**; record that the test phase was skipped.
