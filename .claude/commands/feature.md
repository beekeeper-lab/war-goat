# Feature Planning (TDD Approach)

Create a new plan in specs/*.md to implement the `Feature` using the exact specified markdown `Plan Format`. Follow the `Instructions` to create the plan using **Test-Driven Development** principles.

## Instructions

- You're writing a plan to implement a net new feature using **TDD (Test-Driven Development)**.
- Create the plan in the `specs/*.md` file. Name it appropriately based on the `Feature`.
- Use the `Plan Format` below to create the plan.
- Research the codebase to understand existing patterns, architecture, and conventions before planning.
- IMPORTANT: Replace every <placeholder> in the `Plan Format` with the requested value.
- Use your reasoning model: THINK HARD about the feature requirements, tests needed, and implementation approach.

### TDD Workflow (Red → Green → Refactor)

1. **RED**: Write failing tests FIRST that describe the expected behavior
2. **GREEN**: Write minimal code to make tests pass
3. **REFACTOR**: Clean up code while keeping tests green

### Test Types to Consider

| Test Type | When to Use | Tool |
|-----------|-------------|------|
| **Unit Tests** | Service functions, utilities, business logic | Vitest |
| **Component Tests** | React components in isolation | Vitest + Testing Library |
| **E2E/UI Tests** | Full user flows, integration | Playwright MCP |

### Using Playwright MCP for E2E Tests

When writing E2E tests, you can use Playwright MCP to:
- Write tests interactively and validate they work
- Use accessibility-based selectors (self-healing)
- Debug failing tests by inspecting the actual UI

```
# Example: Use Playwright MCP to write and run E2E test
1. Navigate to the app
2. Take accessibility snapshot to understand UI structure
3. Write test based on actual elements found
4. Run test to validate it works
```

## Relevant Files

Focus on the following files:
- `README.md` - Project overview and instructions
- `docs/work-items/**` - Feature requirements and specs
- `docs/architecture/**` - Architecture documentation
- `src/**` - React frontend application
- `src/components/**` - React components
- `server/**` - Backend API server
- `server/services/**` - Backend service layer
- `e2e/**` - E2E test files (Playwright)
- `src/__tests__/**` - Component tests
- `server/__tests__/**` - Unit tests

Ignore node_modules, build artifacts, and generated files.

## Plan Format

```md
# Feature: <feature name>

## Feature Description
<describe the feature in detail, including its purpose and value to users>

## User Story
As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement
<clearly define the specific problem or opportunity this feature addresses>

## Solution Statement
<describe the proposed solution approach and how it solves the problem>

## Relevant Files
Use these files to implement the feature:

<find and list existing files relevant to the feature. Describe why they are relevant.>

### New Files
<list new files that need to be created, including test files>

## Test Strategy (TDD)

### Unit Tests to Write First
<list the unit tests that will be written BEFORE implementation>
- Test file: `server/__tests__/services/<service>.test.js`
- Tests to write:
  - [ ] <test case 1 - describe expected behavior>
  - [ ] <test case 2 - describe expected behavior>
  - [ ] <test case 3 - edge case>

### Component Tests to Write First
<list the component tests that will be written BEFORE implementation>
- Test file: `src/__tests__/components/<Component>.test.tsx`
- Tests to write:
  - [ ] <test case 1 - renders correctly>
  - [ ] <test case 2 - user interaction>
  - [ ] <test case 3 - edge case>

### E2E Tests to Write First
<list the E2E tests that will be written BEFORE implementation>
- Test file: `e2e/tests/<feature>.spec.ts`
- Tests to write:
  - [ ] <test case 1 - happy path user flow>
  - [ ] <test case 2 - error handling>

## Implementation Plan (TDD Phases)

### Phase 1: Write Failing Tests (RED)
<describe which tests to write first - these will all fail initially>

1. Write unit tests for backend services
2. Write component tests for new React components
3. Write E2E test for the main user flow

### Phase 2: Implement Backend (GREEN)
<describe the backend implementation to make unit tests pass>

### Phase 3: Implement Frontend (GREEN)
<describe the frontend implementation to make component tests pass>

### Phase 4: Integration (GREEN)
<connect frontend and backend, make E2E tests pass>

### Phase 5: Refactor
<clean up code, improve patterns, ensure all tests still pass>

## Step by Step Tasks
IMPORTANT: Execute every step in order. Follow TDD: write test → see it fail → implement → see it pass.

### Step 1: Setup Test Infrastructure
- Ensure test frameworks are configured (Vitest, Playwright)
- Create test file structure

### Step 2: Write Unit Tests (RED)
<list specific unit tests to write>
- Write test for <function/service>
- Write test for <function/service>
- Run tests: `npm run test:unit` - verify they FAIL (red)

### Step 3: Implement Backend Services (GREEN)
<list implementation steps>
- Implement <service/function>
- Run tests: `npm run test:unit` - verify they PASS (green)

### Step 4: Write Component Tests (RED)
<list specific component tests to write>
- Write test for <Component>
- Run tests: `npm run test:components` - verify they FAIL (red)

### Step 5: Implement React Components (GREEN)
<list implementation steps>
- Create <Component>
- Connect to services
- Run tests: `npm run test:components` - verify they PASS (green)

### Step 6: Write E2E Test (RED)
<describe E2E test to write>
- Use Playwright MCP to explore the app structure
- Write E2E test for main user flow
- Run: `npm run test:e2e` - verify it FAILS (red)

### Step 7: Integration (GREEN)
<connect all pieces>
- Wire up API endpoints
- Connect frontend to backend
- Run: `npm run test:e2e` - verify it PASSES (green)

### Step 8: Refactor
- Review code for improvements
- Ensure all tests still pass
- Run full test suite

### Step 9: Validation
- Run all validation commands
- Manual testing of edge cases

## Acceptance Criteria
<list specific, measurable criteria - each should have a corresponding test>
- [ ] <criterion 1> (covered by: <test name>)
- [ ] <criterion 2> (covered by: <test name>)
- [ ] <criterion 3> (covered by: <test name>)

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run test:unit` - Run unit tests
- `npm run test:components` - Run component tests
- `npm run test:e2e` - Run E2E tests with Playwright
- `npm run test` - Run full test suite
- `npm run build` - Verify build succeeds

## Notes
<optionally list any additional notes, future considerations, or context>
```

## Feature
$ARGUMENTS
