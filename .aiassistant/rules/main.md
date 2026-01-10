---
apply: always
---

Always code in a modular fashion: use components, factor out features in a generalized way, factor out business logic to files, re us business logic as much as possible. DRY.

When we work from a plan e.g. /plan.md, and that plan is sectioned up, e.g. 1.1, 1.2, etc..., never continue with the next section until user confirmation.

Prefer the simplest solution that satisfies the stated requirements; justify complexity when added. Do not trade long-term robustness or maintainability for short-term simplicity.

Never refactor unrelated code unless explicitly requested or required for correctness.

Never remove comments from code all together. Editing is allowed.

Comment your code where applicable..

Actively point out potential bugs, edge cases, and undefined behavior.

Prefer explicitness over cleverness; avoid magic behavior.

Strictly separate business logic, infrastructure (I/O, DB, APIs), and presentation.

If logic is duplicated, prefer extraction over inheritance.

Be verbal. When a prompt is given, first give a rough plan outline. When you have completed a module, mention this quickly. Explain intent, structure, and trade-offs — not line-by-line mechanics.

Avoid “utility dumping grounds”; shared code must have a clear responsibility.

Always code in a modular fashion: use components, factor out features in a generalized way, factor out business logic to files, re us business logic as much as possible. DRY. Make all your code with this in mind, but don't go too far. A single button doesn't need to be generalised.

If a plan section reveals missing requirements or contradictions, stop and request clarification

From prompt to prompt, always re-read files to make sure you're working with the latest version.

When using typescript, pay special attention to working typesafe.