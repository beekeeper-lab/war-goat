# Code Review

Perform a comprehensive code review of recent changes or the entire codebase.

## Instructions

Conduct a thorough review covering coding practices, security, and documentation. Present findings organized by priority.

## Step 1: Identify Scope

Determine what to review:
- If on a feature branch: Review changes vs main (`git diff main...HEAD`)
- If on main: Ask user for specific files/areas or review recent commits

```bash
git branch --show-current
git log --oneline -10
```

## Step 2: Code Quality Review

Check for:

### Coding Practices
- [ ] Consistent naming conventions (PascalCase for C#, camelCase for TypeScript)
- [ ] No dead code or commented-out code
- [ ] Functions/methods are focused and not too long
- [ ] Proper error handling (try-catch, null checks)
- [ ] No hardcoded values that should be constants/config
- [ ] DRY principle - no unnecessary duplication
- [ ] Proper TypeScript types (no `any` abuse)
- [ ] React best practices (hooks rules, proper dependencies)

### Code Smells
- [ ] No TODO comments without linked issues
- [ ] No console.log statements in production code
- [ ] No unused imports or variables
- [ ] No overly complex conditionals
- [ ] No magic numbers/strings

## Step 3: Security Review

Check for:

### Authentication & Authorization
- [ ] All API endpoints have `[Authorize]` attribute where needed
- [ ] Role-based access properly enforced
- [ ] No sensitive data in logs or error messages
- [ ] Tokens not exposed in URLs or logs

### Input Validation
- [ ] User input validated on both client and server
- [ ] SQL injection prevention (parameterized queries via EF)
- [ ] XSS prevention (output encoding, DOMPurify usage)
- [ ] No dangerous file operations with user input

### Data Protection
- [ ] No secrets in code (connection strings, API keys)
- [ ] Sensitive data not logged
- [ ] HTTPS enforced
- [ ] CORS properly configured

### Dependencies
- [ ] No known vulnerable packages (`npm audit`, `dotnet list package --vulnerable`)
- [ ] Dependencies up to date (check Dependabot)

## Step 4: Documentation Review

Check for:

### Code Documentation
- [ ] Complex functions have explanatory comments
- [ ] Public APIs have XML docs (C#) or JSDoc (TypeScript)
- [ ] README.md is accurate and up to date

### Architecture Documentation
- [ ] `docs/architecture/*.md` reflects current system
- [ ] Data model changes documented in `03-database-design.md`
- [ ] New features documented appropriately

### CLAUDE.md
- [ ] Project guide reflects current conventions
- [ ] Commands are documented
- [ ] No outdated information

## Step 5: Test Coverage Review

Check for:
- [ ] New code has corresponding tests
- [ ] Tests are meaningful (not just coverage padding)
- [ ] Edge cases covered
- [ ] Integration tests for critical paths

## Step 6: Present Findings

Organize findings into priority categories:

### 🔴 Critical (Fix Immediately)
Security vulnerabilities, data exposure risks, broken functionality

### 🟠 High Priority (Fix Soon)
Bugs, significant code quality issues, missing error handling

### 🟡 Medium Priority (Should Fix)
Code smells, minor improvements, documentation gaps

### 🟢 Low Priority (Nice to Have)
Style improvements, optional refactoring, future considerations

## Step 7: Discuss

For each finding:
1. Explain the issue
2. Recommend the fix
3. Ask: "Should we address this now or add to backlog?"

## Step 8: Create Action Items

For items to address now:
- Create a plan in `specs/` if complex
- Or fix directly if simple

For items to defer:
- Suggest creating GitHub issues
- Note in a `BACKLOG.md` or similar

## Step 9: Notify Complete

```bash
spd-say "done"
```

Report summary:
- Critical issues: count
- High priority: count
- Medium priority: count
- Low priority: count
- Items to address now vs deferred
