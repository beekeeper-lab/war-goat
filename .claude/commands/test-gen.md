# Test Generation (UI-First Approach)

Generate tests for the specified component or functionality. **Focus primarily on UI/E2E tests** using Playwright MCP, with unit tests as backup for uncovered logic.

## Instructions

- You're generating tests with a **UI-first approach** using Playwright MCP.
- E2E tests verify real user behavior and catch integration issues.
- Unit tests should already exist - but create them if they're missing.
- Use your reasoning model: THINK HARD about user flows, edge cases, and what could break.

### Test Priority Order

1. **E2E/UI Tests (Primary)** - Test real user flows with Playwright MCP
2. **Component Tests (Secondary)** - Test React components in isolation if needed
3. **Unit Tests (Backup)** - Create only if logic is untested

### Why UI-First?

| Approach | Pros | Cons |
|----------|------|------|
| **UI/E2E Tests** | Tests real user experience, catches integration bugs, self-healing locators | Slower to run |
| **Unit Tests** | Fast, isolated, precise | Can miss integration issues |

**Strategy**: UI tests for user flows, unit tests for complex business logic.

## Testing Stack

This project uses:
- **Playwright MCP** - AI-assisted E2E testing (primary)
- **Playwright** - E2E test framework
- **Vitest** - Unit and component test runner
- **Testing Library** - Component testing utilities

## Using Playwright MCP for Test Generation

Playwright MCP lets you **interactively write and validate tests**:

```
# Workflow for generating E2E tests:
1. Use browser_navigate to open the app
2. Use browser_snapshot to see the accessibility tree
3. Identify elements to interact with (by role/name)
4. Write test steps based on actual UI structure
5. Run the test to verify it works
6. Save as a Playwright test file
```

### Playwright MCP Tools

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URL |
| `browser_click` | Click element (accessibility-based) |
| `browser_type` | Type into input |
| `browser_snapshot` | Get accessibility tree (shows all elements) |
| `browser_screenshot` | Capture current state |
| `browser_wait` | Wait for condition |

### Example: Interactive Test Generation

```
Human: Generate tests for the Add Interest flow

Claude: I'll use Playwright MCP to explore the UI and generate tests.

[browser_navigate to http://localhost:5173]
✓ Page loaded

[browser_snapshot]
Found elements:
- button "Add Interest"
- heading "War Goat"
- list with 5 article items

[browser_click "Add Interest"]
✓ Clicked

[browser_snapshot]
Found elements:
- dialog "Add Interest"
- textbox (URL input)
- button "Add"
- button "Cancel"

Based on this, here's the E2E test:
[generates test file]
```

## Relevant Files

When generating tests, examine:
- `src/components/**` - React components to test
- `server/services/**` - Backend services (check for unit test coverage)
- `e2e/tests/**` - Existing E2E tests for patterns
- `src/__tests__/**` - Existing component tests
- `server/__tests__/**` - Existing unit tests

## Test Formats

### E2E Test Format (Primary - Playwright)

```typescript
// e2e/tests/<feature>.spec.ts
import { test, expect } from '@playwright/test';

test.describe('<Feature Name>', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should <user action and expected outcome>', async ({ page }) => {
    // Arrange - navigate/setup
    // Use accessibility-based selectors (self-healing)

    // Act - perform user actions
    await page.getByRole('button', { name: /add interest/i }).click();
    await page.getByRole('textbox').fill('https://youtube.com/watch?v=test');
    await page.getByRole('button', { name: /^add$/i }).click();

    // Assert - verify expected outcome
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(/video title/i)).toBeVisible();
  });

  test('should handle error when <error condition>', async ({ page }) => {
    // Test error scenarios
  });

  test('should <edge case behavior>', async ({ page }) => {
    // Test edge cases
  });
});
```

### Component Test Format (Secondary - Vitest + Testing Library)

```typescript
// src/__tests__/components/<Component>.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentName } from '../../components/ComponentName';

describe('ComponentName', () => {
  const defaultProps = {
    // default props
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(<ComponentName {...defaultProps} onAction={onAction} />);

    await user.click(screen.getByRole('button'));

    expect(onAction).toHaveBeenCalled();
  });
});
```

### Unit Test Format (Backup - Vitest)

```typescript
// server/__tests__/services/<service>.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { functionToTest } from '../../services/serviceName.js';

describe('functionToTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return expected result for valid input', () => {
    const result = functionToTest('valid input');
    expect(result).toBe('expected output');
  });

  it('should handle edge case', () => {
    const result = functionToTest(null);
    expect(result).toBeNull();
  });

  it('should throw error for invalid input', () => {
    expect(() => functionToTest('invalid')).toThrow('Error message');
  });
});
```

## Generation Workflow

### Step 1: Analyze What to Test
- Read the component/feature code
- Identify user flows and interactions
- Check existing test coverage

### Step 2: Check Existing Coverage
```bash
# Check if unit tests exist
ls server/__tests__/services/
ls src/__tests__/components/

# Check if E2E tests exist
ls e2e/tests/
```

### Step 3: Generate E2E Tests (Primary)
- Use Playwright MCP to explore the UI
- Identify key user flows
- Write tests using accessibility selectors
- Verify tests pass

### Step 4: Generate Unit Tests (If Missing)
- Only if business logic lacks coverage
- Focus on edge cases and error handling
- Mock external dependencies

### Step 5: Validate
```bash
npm run test:e2e    # Run E2E tests
npm run test:unit   # Run unit tests (if created)
npm run test        # Run all tests
```

## Testing Best Practices

### E2E Tests
- Use `getByRole` selectors (accessibility-based, self-healing)
- Test complete user flows, not individual clicks
- Include happy path AND error scenarios
- Keep tests independent (no shared state)

### Selector Priority (Playwright)
```typescript
// Best - accessible and resilient
page.getByRole('button', { name: /submit/i })
page.getByLabel('Email')
page.getByPlaceholder('Enter email')

// Avoid - brittle
page.locator('.btn-primary')
page.locator('#submit-btn')
```

### What to Test
- [ ] Happy path (main user flow)
- [ ] Error handling (invalid input, network errors)
- [ ] Edge cases (empty state, max values)
- [ ] Loading states
- [ ] Accessibility (keyboard navigation)

## Validation Commands

After generating tests, run:
```bash
# Run specific E2E test
npm run test:e2e -- --grep "<test name>"

# Run all E2E tests
npm run test:e2e

# Run unit tests (if created)
npm run test:unit

# Run everything
npm run test
```

## Test Request
$ARGUMENTS
