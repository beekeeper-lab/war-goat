# Test: Component Tests for React UI

> **ID**: T002
> **Type**: Test
> **Status**: Planned
> **Priority**: High
> **Effort**: M
> **Created**: 2026-01-16
> **Blocked By**: None

## Overview

Add component tests for all React components to verify rendering, user interactions, and state management in isolation.

---

## Test Scope

### Components to Test

#### 1. InterestCard (`src/components/InterestCard.tsx`)

**Test scenarios**:
- [ ] Renders with minimal props (title, url)
- [ ] Renders YouTube-specific fields (author, thumbnail)
- [ ] Renders status badge with correct color
- [ ] Renders category tags
- [ ] Click on card triggers onSelect callback
- [ ] Delete button triggers onDelete callback
- [ ] Truncates long titles appropriately
- [ ] Shows "View Transcript" indicator when hasTranscript is true

#### 2. InterestDetail (`src/components/InterestDetail.tsx`)

**Test scenarios**:
- [ ] Renders all interest fields
- [ ] Status dropdown changes trigger onUpdate
- [ ] Notes textarea updates interest
- [ ] Transcript section shows when available
- [ ] Transcript lazy-loads on expand
- [ ] Close button triggers onClose
- [ ] Loading state while fetching transcript
- [ ] Error state when transcript fetch fails

#### 3. InterestList (`src/components/InterestList.tsx`)

**Test scenarios**:
- [ ] Renders list of InterestCards
- [ ] Empty state message when no interests
- [ ] Loading state while fetching
- [ ] Error state on fetch failure
- [ ] Passes correct props to each card
- [ ] Grid layout renders correctly

#### 4. AddInterestModal (`src/components/AddInterestModal.tsx`)

**Test scenarios**:
- [ ] Modal opens when triggered
- [ ] URL input accepts text
- [ ] Submit button disabled when URL empty
- [ ] Form submission triggers onAdd callback
- [ ] Loading state during enrichment
- [ ] Error message on invalid URL
- [ ] Success closes modal
- [ ] Cancel button closes modal
- [ ] Escape key closes modal

#### 5. FilterBar (`src/components/FilterBar.tsx`)

**Test scenarios**:
- [ ] Renders type filter dropdown
- [ ] Renders status filter dropdown
- [ ] Renders category filter dropdown
- [ ] Filter changes trigger onFilterChange
- [ ] "All" option clears filter
- [ ] Active filters visually indicated
- [ ] Search input filters by text

#### 6. Header (`src/components/Header.tsx`)

**Test scenarios**:
- [ ] Renders War Goat logo and title
- [ ] Renders tagline
- [ ] Add button triggers modal open
- [ ] Navigation links render (if any)

---

## Technical Setup

### Testing Framework

```json
// package.json additions
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^24.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  },
  "scripts": {
    "test:components": "vitest run --dir src/__tests__"
  }
}
```

### Vitest Config

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

### Test Setup

```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

### Test File Structure

```
src/
├── __tests__/
│   ├── setup.ts
│   ├── components/
│   │   ├── InterestCard.test.tsx
│   │   ├── InterestDetail.test.tsx
│   │   ├── InterestList.test.tsx
│   │   ├── AddInterestModal.test.tsx
│   │   ├── FilterBar.test.tsx
│   │   └── Header.test.tsx
│   └── __mocks__/
│       └── interests.ts
└── components/
    └── ...
```

---

## Acceptance Criteria

- [ ] All components have test files
- [ ] Test coverage > 80% for components
- [ ] All user interactions tested
- [ ] All conditional renders tested
- [ ] Tests use Testing Library best practices
- [ ] No implementation details tested (test behavior, not internals)
- [ ] Tests run in < 60 seconds
- [ ] Accessible queries preferred (getByRole, getByLabelText)

---

## Example Tests

```typescript
// src/__tests__/components/InterestCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import InterestCard from '../../components/InterestCard';

const mockInterest = {
  id: '1',
  title: 'Learn React Testing',
  url: 'https://youtube.com/watch?v=test',
  type: 'youtube',
  status: 'backlog',
  author: 'Test Channel',
  categories: ['React', 'Testing'],
  hasTranscript: true,
  createdAt: '2026-01-16T00:00:00Z',
};

describe('InterestCard', () => {
  it('renders the interest title', () => {
    render(<InterestCard interest={mockInterest} onSelect={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Learn React Testing')).toBeInTheDocument();
  });

  it('renders the author name', () => {
    render(<InterestCard interest={mockInterest} onSelect={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Test Channel')).toBeInTheDocument();
  });

  it('renders category tags', () => {
    render(<InterestCard interest={mockInterest} onSelect={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Testing')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<InterestCard interest={mockInterest} onSelect={onSelect} onDelete={vi.fn()} />);

    await user.click(screen.getByRole('article'));

    expect(onSelect).toHaveBeenCalledWith(mockInterest);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(<InterestCard interest={mockInterest} onSelect={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('shows transcript indicator when hasTranscript is true', () => {
    render(<InterestCard interest={mockInterest} onSelect={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(/transcript/i)).toBeInTheDocument();
  });

  it('does not show transcript indicator when hasTranscript is false', () => {
    const interestWithoutTranscript = { ...mockInterest, hasTranscript: false };

    render(<InterestCard interest={interestWithoutTranscript} onSelect={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.queryByText(/transcript/i)).not.toBeInTheDocument();
  });
});
```

```typescript
// src/__tests__/components/AddInterestModal.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddInterestModal from '../../components/AddInterestModal';

describe('AddInterestModal', () => {
  const mockOnAdd = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<AddInterestModal isOpen={true} onAdd={mockOnAdd} onClose={mockOnClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<AddInterestModal isOpen={false} onAdd={mockOnAdd} onClose={mockOnClose} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submit button is disabled when URL is empty', () => {
    render(<AddInterestModal isOpen={true} onAdd={mockOnAdd} onClose={mockOnClose} />);

    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('submit button is enabled when URL is entered', async () => {
    const user = userEvent.setup();

    render(<AddInterestModal isOpen={true} onAdd={mockOnAdd} onClose={mockOnClose} />);

    await user.type(screen.getByRole('textbox'), 'https://youtube.com/watch?v=test');

    expect(screen.getByRole('button', { name: /add/i })).toBeEnabled();
  });

  it('calls onAdd with URL when form is submitted', async () => {
    const user = userEvent.setup();

    render(<AddInterestModal isOpen={true} onAdd={mockOnAdd} onClose={mockOnClose} />);

    await user.type(screen.getByRole('textbox'), 'https://youtube.com/watch?v=test');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(mockOnAdd).toHaveBeenCalledWith('https://youtube.com/watch?v=test');
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(<AddInterestModal isOpen={true} onAdd={mockOnAdd} onClose={mockOnClose} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal on escape key', async () => {
    const user = userEvent.setup();

    render(<AddInterestModal isOpen={true} onAdd={mockOnAdd} onClose={mockOnClose} />);

    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalled();
  });
});
```

---

## Testing Best Practices

1. **Query Priority** (most to least preferred):
   - `getByRole` - accessible queries
   - `getByLabelText` - form elements
   - `getByPlaceholderText` - inputs
   - `getByText` - non-interactive content
   - `getByTestId` - last resort

2. **User Events over fireEvent**:
   ```typescript
   // Preferred
   const user = userEvent.setup();
   await user.click(button);

   // Avoid
   fireEvent.click(button);
   ```

3. **Test Behavior, Not Implementation**:
   ```typescript
   // Good - tests what user sees
   expect(screen.getByText('Success!')).toBeInTheDocument();

   // Bad - tests internal state
   expect(component.state.isSuccess).toBe(true);
   ```

---

## Dependencies

- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- vitest
- jsdom

---

## Notes

- Components should be tested in isolation with mocked props
- API calls should be mocked at the fetch level
- Focus on user-visible behavior, not implementation details
- Use data-testid sparingly and only when necessary
- Consider testing accessibility (aria attributes, keyboard navigation)
