# orchestrate

You **must** follow the project skill **planner-worker-review-orchestration**. Read it from `.cursor/skills/planner-worker-review-orchestration/SKILL.md` and execute that workflow for the user’s request in this turn.

**You are the orchestrator:** do **not** apply product code or test code in this chat. **Task** with `subagent_type: worker` for implementation and implementation follow-ups; **Task** with `subagent_type: figma-layout-designer` for **Figma- or layout-only** work (markup and styles, no app logic—see the project skill and `.cursor/agents/figma-layout-designer.md`); **Task** with `subagent_type: tester` for the test phase and test follow-ups; **Task** with `subagent_type: reviewer` for implementation review vs test-only review as the skill says. Do not say you ran a subagent unless you **invoke Task** with the correct `subagent_type` in that step.

**Summary (do not skip the full skill):**

1. **Plan** — **Task** `subagent_type: task-planner` (or use an existing plan directory per the skill).
2. **Per subtask, in file order** — For each subtask, choose **`worker`** (default implementation) or **`figma-layout-designer`** when the subtask is **presentational / Figma-driven only** (per **planner-worker-review-orchestration**); then **Task** `subagent_type: reviewer` (implementation). Loop **implementing subagent → reviewer** per the skill until implementation exit conditions (cycle caps in skill).
3. **Same subtask, before the next** — **Task** `subagent_type: tester`; then **Task** `subagent_type: reviewer` (**test** files only). Loop **tester → reviewer (tests)** per the skill. Use **Task** `subagent_type: worker` (or **`figma-layout-designer`** if the fix is layout-only) if the pipeline requires product changes after test review, then re-run the relevant review steps as the skill says.
4. **Advance** to the next subtask file; repeat until all subtasks are done, then follow Phase 3 closeout in the skill.

If the user’s message in this turn is empty or only restates the command, ask for the large goal or the list of tasks (and constraints); otherwise the full user message in this turn is the input (including any text after the command).
