# Feature: Intelligent Auto-Categorization

## Feature Description
Add an intelligent categorization system that automatically analyzes each item and assigns it to one or more categories based on its content (title, description, tags, author, type). The system dynamically manages categories - creating new ones when needed for items that don't fit existing categories, and removing categories that have no items. Categories are derived from the item's metadata using keyword analysis and content patterns, not from an LLM.

## User Story
As a user
I want my interest items to be automatically organized into meaningful categories
So that I can browse and discover related content without manually organizing everything

## Problem Statement
Users currently have flat lists of interest items with only manual tags and type filters. As the list grows, it becomes difficult to see thematic groupings or discover related content. Users must manually tag items, which is tedious and often inconsistent. There's no way to see "all my AI-related content" or "programming tutorials" at a glance.

## Solution Statement
Implement an automatic categorization system that:
1. Analyzes item metadata (title, description, tags, author, type) when items are created/updated
2. Assigns items to one or more categories based on keyword matching and content patterns
3. Maintains a dynamic list of categories that grows when new topics appear and shrinks when categories become empty
4. Provides a category filter in the UI alongside existing type and status filters
5. Stores category assignments on each item and derives the category list from items at runtime

## Relevant Files
Use these files to implement the feature:

- **`src/types/index.ts`** - Add `categories` field to `InterestItem` interface
- **`src/services/api.ts`** - Update `createInterest` to call categorization, add category derivation logic
- **`src/App.tsx`** - Add category filter state and derive categories from items
- **`src/components/FilterBar.tsx`** - Add category dropdown filter
- **`src/components/InterestCard.tsx`** - Display category badges on items
- **`server/index.js`** - Add categorization endpoint that analyzes item content

### New Files
- **`src/services/categorize.ts`** - Categorization logic and keyword patterns
- **`server/categorize.js`** - Server-side categorization service (optional, can be client-side)

## Implementation Plan
### Phase 1: Backend
1. Create categorization logic that analyzes item metadata
2. Define category keyword patterns (e.g., "programming" matches ["code", "programming", "developer", "software", "typescript", "javascript", "python"])
3. Add `/api/categorize` endpoint that accepts item data and returns suggested categories
4. Categories are stored as string arrays on items, not as separate entities

### Phase 2: Frontend
1. Add `categories: string[]` field to `InterestItem` type
2. Create `categorize.ts` service with keyword-based categorization logic
3. Update `createInterest` to auto-categorize new items
4. Derive available categories from all items at runtime (no separate category storage)
5. Add category filter to `FilterBar` component
6. Display category badges on `InterestCard` component
7. Add category filter logic to `App.tsx`

### Phase 3: Integration & Testing
1. Test categorization with various item types
2. Verify categories appear/disappear as items are added/removed
3. Test filtering by category
4. Verify items can belong to multiple categories

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add categories field to InterestItem type
- Open `src/types/index.ts`
- Add `categories?: string[];` field to `InterestItem` interface
- Add `categories?: string[];` to `EnrichedCreateInput` interface

### 2. Create categorization service
- Create `src/services/categorize.ts`
- Define `CATEGORY_PATTERNS` - a map of category names to keyword arrays:
  ```typescript
  const CATEGORY_PATTERNS: Record<string, string[]> = {
    'Programming': ['code', 'programming', 'developer', 'software', 'typescript', 'javascript', 'python', 'java', 'api', 'git', 'github'],
    'AI & Machine Learning': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'claude', 'neural', 'deep learning'],
    'Productivity': ['productivity', 'habits', 'efficiency', 'workflow', 'time management', 'gtd'],
    'Architecture': ['architecture', 'microservices', 'distributed', 'system design', 'scalability', 'design patterns'],
    'Self Improvement': ['self-improvement', 'self improvement', 'personal development', 'growth', 'mindset', 'learning'],
    'DevOps': ['devops', 'docker', 'kubernetes', 'ci/cd', 'deployment', 'infrastructure'],
    'Web Development': ['web', 'frontend', 'backend', 'react', 'vue', 'angular', 'html', 'css'],
    'Business': ['business', 'startup', 'entrepreneur', 'marketing', 'leadership', 'management'],
  };
  ```
- Create `categorizeItem(item: Partial<InterestItem>): string[]` function that:
  - Combines title, description, tags, and author into searchable text
  - Converts to lowercase for matching
  - Checks each category's keywords against the text
  - Returns array of matching category names
  - Returns `['Uncategorized']` if no matches found

### 3. Update api.ts to auto-categorize on create
- Import `categorizeItem` from `./categorize`
- In `createInterest`, call `categorizeItem` with the input data
- Add the returned categories to the new item before saving

### 4. Add category filter state to App.tsx
- Add `categoryFilter` state: `useState<string | 'all'>('all')`
- Create `useMemo` to derive `availableCategories` from all items:
  ```typescript
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    interests.forEach(item => item.categories?.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [interests]);
  ```
- Add category filter to `filteredInterests` logic
- Pass `categoryFilter`, `onCategoryFilterChange`, and `availableCategories` to `FilterBar`

### 5. Update FilterBar to include category filter
- Add props: `categoryFilter`, `onCategoryFilterChange`, `availableCategories`
- Add category dropdown after status dropdown
- Style consistently with existing dropdowns

### 6. Display categories on InterestCard
- Open `src/components/InterestCard.tsx`
- Add category badges below or alongside tags
- Use a subtle style (e.g., light gray background, small text) to differentiate from tags

### 7. Migrate existing items to have categories
- Create a one-time migration in the API or run manually
- For each existing item in db.json, compute and add categories
- Update db.json with the categorized items

### 8. Run validation commands
- Run `npm run build` to verify TypeScript compiles
- Run `npm test` to verify no regressions
- Manually test adding new items and verifying auto-categorization

## Testing Strategy
### Unit Tests
- Test `categorizeItem` function with various inputs
- Test that items with no matching keywords get "Uncategorized"
- Test that items can match multiple categories

### Integration Tests
- Test creating an item and verifying categories are assigned
- Test filtering by category
- Test that deleting all items in a category removes it from the filter

### Edge Cases
- Item with no title, description, or tags (should get "Uncategorized")
- Item matching many categories (should show all matches)
- Empty category list after deleting items
- Category names with special characters
- Case-insensitive matching

## Acceptance Criteria
- New items are automatically assigned to 1+ categories based on their content
- A category filter dropdown appears in the FilterBar showing only categories that have items
- Filtering by category shows only items in that category
- Items can belong to multiple categories
- Categories are displayed as small badges on InterestCards
- When all items in a category are deleted, that category disappears from the filter
- When an item is added that matches a new pattern, the appropriate category appears
- Existing items are migrated to have categories

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run build` - Verify TypeScript compiles and the project builds without errors
- `npm test` - Run frontend tests to validate the feature works with zero regressions
- `curl -s http://localhost:3001/api/interests | jq '.[].categories'` - Verify items have categories after migration

## Notes
- Categories are derived client-side from item content, not stored separately in db.json
- The category patterns can be extended over time by adding more keywords
- Items store their categories in a `categories: string[]` field for quick filtering
- A future enhancement could use LLM-based categorization for more intelligent matching
- Consider adding user-defined categories as a future feature
- The "Uncategorized" category acts as a catch-all for items that don't match any patterns
