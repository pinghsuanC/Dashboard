# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Write tests first** - Turn the feature's requirements into tests before writing the code (see Testing below)
4. **Implement** - Implement the feature/fix in @context/current-feature.md until the new tests pass, with `npm run test:watch` running alongside
5. **Verify** - Run the full `npm run test` and `npm run build`, and check it works in the browser
6. **Iterate** - Iterate and change things if needed. If a requirement changes, change its test first
7. **Commit** - Only after build and tests pass and everything works
8. **Merge** - Merge to main
9. **Delete Branch** - Delete branch after merge
10. **Review** - Review AI-generated code periodically and on demand.
11. Mark as completed in @context/current-feature.md and add to history

Do NOT commit without permission and until the build and tests pass. If build or tests fail, fix the issues first.

## Testing

Tests are written before the code they cover, and run the whole time the feature is being built.

- **Start from requirements, not code.** List the feature's requirements as R1..Rn from @context/current-feature.md, and name each test after the one it checks.
- **Watch them fail first.** Add the new function with its final signature and an empty or placeholder body, then run the tests. Each new test must fail on its assertion, not on a missing import. A test that passes before the code exists is testing nothing.
- **Implement until they pass.** Keep `npm run test:watch` running while building, and run the full `npm run test` before moving on, so changes that break older features show up.
- **Check the tests are tight.** Once green, break each behaviour on purpose (flip a condition, drop a check) and confirm a test goes red. Tighten any test that stays green.
- **Fixes start with a failing test** that reproduces the bug, then the fix makes it pass.
- **Scope:** server actions, route handlers, data loaders and utilities. Components are not unit tested, so UI-only work skips step 3 and is checked in the browser.

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)