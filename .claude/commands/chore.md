# Chore Planning (TDD Approach)

Create a new plan in specs/*.md to resolve the `Chore` using the exact specified markdown `Plan Format`. Follow the `Instructions` to create the plan using **Test-Driven Development** principles where applicable.

## Instructions

- You're writing a plan to complete a chore using **TDD (Test-Driven Development)** where applicable.
- Create the plan in the `specs/*.md` file. Name it appropriately based on the `Chore`.
- Use the `Plan Format` below to create the plan.
- Research the codebase and put together a plan to accomplish the chore.
- IMPORTANT: Replace every <placeholder> in the `Plan Format` with the requested value.
- Use your reasoning model: THINK HARD about the chore and how to ensure zero regressions.

### TDD for Chores

Chores (refactoring, upgrades, cleanup) benefit from TDD because:
1. **Existing tests act as a safety net** - Run them before AND after changes
2. **Write new tests for uncovered code** - Before refactoring, ensure test coverage
3. **Refactor with confidence** - Tests prove behavior hasn't changed

### When to Write Tests for Chores

| Chore Type | Test Approach |
|------------|---------------|
| **Refactoring** | Ensure tests exist BEFORE refactoring; add if missing |
| **Dependency upgrade** | Run existing tests; add tests for new features |
| **Code cleanup** | Run existing tests; no new tests needed |
| **Config changes** | May need integration/E2E tests to verify |
| **Performance optimization** | Add performance benchmarks as tests |

### Using Playwright MCP for Chore Validation

For chores that affect UI (refactoring components, upgrading React, etc.):
- Use Playwright MCP to verify UI still works correctly
- Run through critical user flows
- Compare before/after behavior

```
# Example: Validate UI after refactoring with Playwright MCP
1. Before refactoring: Run E2E tests, note results
2. Perform refactoring
3. After refactoring: Run E2E tests again
4. Verify identical behavior
```

## Relevant Files

Focus on the following files:
- `README.md` - Project overview and instructions
- `docs/work-items/**` - Chore specs
- `src/**` - React frontend application
- `server/**` - Backend API server
- `e2e/**` - E2E test files (Playwright)
- `src/__tests__/**` - Component tests
- `server/__tests__/**` - Unit tests
- `package.json` - Dependencies and scripts
- `.github/workflows/**` - CI/CD workflows

Ignore node_modules, build artifacts, and generated files.

## Plan Format

```md
# Chore: <chore name>

## Chore Description
<describe the chore in detail, including why it's needed>

## Type of Chore
<select one: Refactoring | Dependency Upgrade | Code Cleanup | Config Change | Performance | Documentation | Other>

## Impact Assessment
<describe what parts of the codebase will be affected>

### Files to Modify
<list files that will change>

### Risk Level
<Low | Medium | High - based on scope and potential for regressions>

## Relevant Files
Use these files to accomplish the chore:

<find and list the files relevant to the chore. Describe why they are relevant.>

## Test Strategy (TDD)

### Pre-Chore Test Audit
Before making changes, verify test coverage:

- [ ] Run full test suite: `npm run test` - Note: X tests passing
- [ ] Identify code to be changed
- [ ] Check existing test coverage for affected code
- [ ] If coverage is low, write tests BEFORE making changes

### Tests to Write Before Changes (if needed)
<if the code to be changed lacks test coverage, list tests to write first>

- Test file: `<path to test file>`
- Tests to add:
  - [ ] <test for existing behavior 1>
  - [ ] <test for existing behavior 2>

### Tests to Verify After Changes
<list how you'll verify the chore didn't break anything>

- [ ] All existing unit tests pass
- [ ] All existing component tests pass
- [ ] All existing E2E tests pass
- [ ] New functionality (if any) has tests

### New Tests Needed (for new functionality)
<if the chore adds new behavior, list tests for it>

## Step by Step Tasks
IMPORTANT: Execute every step in order. Follow TDD: verify tests pass → make changes → verify tests still pass.

### Step 1: Baseline - Run All Tests
- Run full test suite: `npm run test`
- Document current test results
- All tests must pass before proceeding

### Step 2: Audit Test Coverage
- Identify code that will be changed
- Check if adequate tests exist
- If not, proceed to Step 3; otherwise skip to Step 4

### Step 3: Write Missing Tests (RED → GREEN)
<if tests are needed before changes>
- Write tests for existing behavior (they should pass)
- This ensures we can detect regressions

### Step 4: Perform the Chore
<list the actual chore steps>
- <change 1>
- <change 2>
- <change 3>

### Step 5: Run Tests After Changes (must stay GREEN)
- Run full test suite: `npm run test`
- All tests must still pass
- If any fail, the chore broke something - fix it!

### Step 6: Write Tests for New Behavior (if applicable)
<if the chore added new functionality>
- Write tests for new behavior
- Verify they pass

### Step 7: Validation
- Run all validation commands
- Manual verification of affected areas
- Verify no regressions

## Acceptance Criteria
- [ ] Chore is complete
- [ ] All tests pass (same as before or more)
- [ ] No regressions introduced
- [ ] Code quality maintained or improved

## Validation Commands
Execute every command to validate the chore is complete with zero regressions.

- `npm run test:unit` - Run unit tests
- `npm run test:components` - Run component tests
- `npm run test:e2e` - Run E2E tests
- `npm run test` - Run full test suite (must pass)
- `npm run build` - Verify build succeeds
- `npm run lint` - Verify no linting errors (if applicable)

## Rollback Plan
<if something goes wrong, how do we revert?>
- Git: `git checkout <branch>` or `git revert <commit>`
- Dependencies: `npm install` from clean package-lock.json

## Notes
<optionally list any additional notes, risks, or follow-up tasks>
```

## Chore
$ARGUMENTS
