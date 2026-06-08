# implement

You **must** follow the project skill **worker-reviewer-tester-pipeline**. Read it from `.cursor/skills/worker-reviewer-tester-pipeline/SKILL.md` and execute that workflow for the user’s request in this turn.

**You are the orchestrator:** do **not** apply product edits or test edits in this chat. **Every** product change → **Task** with `subagent_type: worker` **unless** the task is **Figma- or layout-only** (markup and styles, no app logic), then **Task** with `subagent_type: figma-layout-designer` (see **worker-reviewer-tester-pipeline** and `.cursor/agents/figma-layout-designer.md`). **Every** test write or test fix pass → **Task** with `subagent_type: tester`. Only use **Task(reviewer)** for code vs test review as in the skill. Do not claim a subagent ran without invoking **Task** with the correct `subagent_type`.

**Summary (read the full skill; caps and loops are there):**

1. **Task** `subagent_type: worker` **or** `subagent_type: figma-layout-designer` — implementation (use **figma-layout-designer** only for layout / Figma scope per the skill).
2. **Task** `subagent_type: reviewer` — review **implementation**; loop **implementing subagent → reviewer** for implementation fixes per the skill (cycle cap in skill).
3. **Task** `subagent_type: tester` — add/update tests and run the suite (after implementation review is acceptable per skill).
4. **Task** `subagent_type: reviewer` — review **test** files only; loop **tester → reviewer (tests)** for test follow-up; use **Task(worker)** or **Task(figma-layout-designer)** for layout-only follow-ups if the test review or tester requires a product change (per skill), then re-run relevant steps.

If the user’s message is empty or only the command, ask what to build; otherwise the full message in this turn is the task (including text after the command).
