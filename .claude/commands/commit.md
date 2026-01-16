# Commit Changes

Run tests, commit changes, and optionally push and create a PR.

## Workflow

### Phase 1: Validate
1. Run `npm test` and `cd backend/** && dotnet build`
2. **If tests fail or build errors: STOP and report issues**

### Phase 2: Present Plan
Show the user:
- Test results summary
- `git status` and `git diff --stat`
- Proposed commit message (descriptive, informative for future sessions)
- Ask: "Commit and push? Also run code review before push?" (Y/N/Review only)

### Phase 3: Execute (after approval)
1. Stage all changes: `git add -A`
2. Commit with the descriptive message
3. If review requested: run `/review`, address any critical/high issues, re-test if changes made
4. Push: `git push -u origin <branch-name>`
5. Create PR: `gh pr create` with descriptive title and body
6. Report PR URL

### Phase 4: Notify
```bash
spd-say "done"
```

Report summary:
- Tests: passed/failed
- Commit: hash and message
- Review: completed/skipped/findings
- PR: URL

## Notes
- Do NOT ask for confirmations during execution - the plan approval covers this
- Only pause for destructive actions or genuine ambiguities
- Write commit messages that help future Claude sessions understand the change
