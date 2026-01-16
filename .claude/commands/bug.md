# Bug Planning (TDD Approach)

Create a new plan in specs/*.md to resolve the `Bug` using the exact specified markdown `Plan Format`. Follow the `Instructions` to create the plan using **Test-Driven Development** principles.

## Instructions

- You're writing a plan to fix a bug using **TDD (Test-Driven Development)**.
- Create the plan in the `specs/*.md` file. Name it appropriately based on the `Bug`.
- Use the `Plan Format` below to create the plan.
- Research the codebase to understand the bug, reproduce it, and create a plan to fix it.
- IMPORTANT: Replace every <placeholder> in the `Plan Format` with the requested value.
- Use your reasoning model: THINK HARD about the bug, its root cause, and how to prevent regression.

### TDD for Bug Fixes

The TDD approach for bugs is especially powerful because:
1. **Write a failing test that reproduces the bug** - This proves the bug exists
2. **Fix the bug** - Make the test pass
3. **The test becomes a regression test** - Bug can never return undetected

### Test Types for Bug Fixes

| Test Type | When to Use | Tool |
|-----------|-------------|------|
| **Unit Tests** | Logic bugs, service errors, data transformation | Vitest |
| **Component Tests** | UI rendering bugs, state management issues | Vitest + Testing Library |
| **E2E/UI Tests** | User flow bugs, integration issues | Playwright MCP |

### Using Playwright MCP to Reproduce Bugs

When the bug is UI-related, use Playwright MCP to:
- Navigate through the steps that reproduce the bug
- Capture the exact state when bug occurs
- Write a test that fails due to the bug
- Verify the fix makes the test pass

```
# Example: Reproduce UI bug with Playwright MCP
1. Navigate to the page where bug occurs
2. Perform the steps that trigger the bug
3. Take snapshot/screenshot showing the bug
4. Write test that asserts the correct behavior (will fail)
5. Fix the bug
6. Run test again (should pass)
```

## Relevant Files

Focus on the following files:
- `README.md` - Project overview and instructions
- `docs/work-items/**` - Bug reports and specs
- `src/**` - React frontend application
- `server/**` - Backend API server
- `e2e/**` - E2E test files (Playwright)
- `src/__tests__/**` - Component tests
- `server/__tests__/**` - Unit tests

Ignore node_modules, build artifacts, and generated files.

## Plan Format

```md
# Bug: <bug name>

## Bug Description
<describe the bug in detail, including symptoms and expected vs actual behavior>

## Problem Statement
<clearly define the specific problem that needs to be solved>

## Steps to Reproduce
1. <step 1>
2. <step 2>
3. <step 3>
4. <observe bug>

## Expected Behavior
<what should happen>

## Actual Behavior
<what actually happens (the bug)>

## Root Cause Analysis
<analyze and explain the root cause of the bug after investigation>

## Solution Statement
<describe the proposed solution approach to fix the bug>

## Relevant Files
Use these files to fix the bug:

<find and list the files relevant to the bug. Describe why they are relevant.>

### Files to Modify
<list files that need changes>

### Test Files to Create/Update
<list test files that will be added or modified>

## Test Strategy (TDD)

### Regression Test to Write First
The key TDD principle for bugs: **write a test that fails due to the bug BEFORE fixing it**.

#### Unit Test (if applicable)
- Test file: `server/__tests__/<relevant>.test.js`
- Test case:
  ```javascript
  it('should <expected behavior that currently fails>', () => {
    // Arrange: setup conditions that trigger bug
    // Act: perform the action
    // Assert: verify correct behavior (THIS WILL FAIL until bug is fixed)
  });
  ```

#### Component Test (if applicable)
- Test file: `src/__tests__/components/<Component>.test.tsx`
- Test case:
  ```typescript
  it('should <expected behavior that currently fails>', () => {
    // Render component in buggy state
    // Assert correct behavior (THIS WILL FAIL until bug is fixed)
  });
  ```

#### E2E Test (if applicable)
- Test file: `e2e/tests/<feature>.spec.ts`
- Test case:
  ```typescript
  test('should <expected user flow that currently fails>', async ({ page }) => {
    // Navigate to bug location
    // Perform steps that trigger bug
    // Assert correct behavior (THIS WILL FAIL until bug is fixed)
  });
  ```

## Step by Step Tasks
IMPORTANT: Execute every step in order. Follow TDD: write failing test → fix bug → verify test passes.

### Step 1: Reproduce the Bug
- Follow the steps to reproduce
- Confirm the bug exists
- Document exact error/behavior

### Step 2: Write Failing Test (RED)
- Create test file if needed
- Write test that reproduces the bug
- Run test: verify it FAILS
- This proves the bug exists and is testable

### Step 3: Identify Root Cause
- Analyze the code path
- Find the exact location of the bug
- Understand why it happens

### Step 4: Fix the Bug (GREEN)
- Make the minimal change to fix the bug
- Run the failing test: verify it now PASSES
- The bug is fixed!

### Step 5: Verify No Regressions
- Run full test suite
- Verify no other tests broke
- Test related functionality manually

### Step 6: Refactor (if needed)
- Clean up the fix if needed
- Ensure tests still pass
- Consider if similar bugs could exist elsewhere

### Step 7: Validation
- Run all validation commands
- Manually verify the fix
- Document the fix

## Acceptance Criteria
- [ ] Bug can no longer be reproduced manually
- [ ] Regression test exists and passes
- [ ] No other tests were broken
- [ ] Fix is minimal and surgical

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run test:unit` - Run unit tests
- `npm run test:components` - Run component tests
- `npm run test:e2e` - Run E2E tests
- `npm run test` - Run full test suite (must pass)
- `npm run build` - Verify build succeeds

## Notes
<optionally list any additional notes, similar bugs to watch for, or preventive measures>
```

## Bug
$ARGUMENTS
