# Feature: Collapsible Transcript Section on Edit Page

## Feature Description
Add a collapsible section to display video transcripts on the Interest Detail (edit) page. When an item has a transcript (typically YouTube videos), users can expand/collapse the transcript section to view or hide the full transcript text. This improves the UI by keeping the edit page clean while still providing access to potentially lengthy transcript content.

## User Story
As a user
I want to see transcripts in a collapsible section on the edit page
So that I can view the transcript when needed without cluttering the interface

## Problem Statement
Currently, the transcript is displayed in a fixed-height scrollable div that is always visible when a transcript exists. For long transcripts, this takes up significant vertical space on the edit page and can make the form feel cluttered. Users may not always need to see the transcript, but when they do, they want easy access to it.

## Solution Statement
Replace the existing static transcript display with a collapsible section using a disclosure pattern (chevron icon + "Transcript" label). The section will be collapsed by default to keep the UI clean. Users can click to expand and view the full transcript. The existing styling (scrollable container with max-height) will be preserved within the collapsible section.

## Relevant Files
Use these files to implement the feature:

- **`src/components/InterestDetail.tsx`** - The edit/detail modal component that currently displays transcripts in a static div (lines 145-156). This is the only file that needs modification.
- **`src/types/index.ts`** - Defines the `InterestItem` type including the optional `transcript` field. Reference only, no changes needed.
- **`lucide-react`** - Icon library already in use. Will use `ChevronDown` and `ChevronUp` icons for the collapse toggle.

## Implementation Plan
### Phase 1: Backend
No backend changes required. The transcript data is already stored and served correctly.

### Phase 2: Frontend
1. Add state to track whether the transcript section is expanded or collapsed
2. Import chevron icons from lucide-react
3. Replace the static transcript div with a collapsible disclosure component
4. Add click handler to toggle the expanded state
5. Animate/transition the expand/collapse for smooth UX
6. Preserve the existing max-height scrollable container for the transcript content

### Phase 3: Integration & Testing
1. Test with items that have transcripts (YouTube videos)
2. Test with items that don't have transcripts (should show nothing)
3. Verify the collapse/expand toggle works correctly
4. Verify the transcript content displays correctly when expanded

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add ChevronDown and ChevronUp icons to imports
- Open `src/components/InterestDetail.tsx`
- Add `ChevronDown` and `ChevronUp` to the lucide-react import statement

### 2. Add state for tracking transcript expansion
- Add a new `useState` hook: `const [transcriptExpanded, setTranscriptExpanded] = useState(false);`
- Place it with the other state declarations at the top of the component

### 3. Replace static transcript section with collapsible section
- Replace the existing transcript conditional block (lines 145-156) with:
  - A clickable header containing the "Transcript" label and chevron icon
  - A conditionally rendered content section that shows when expanded
  - Maintain the existing bg-gray-50, rounded-lg styling
  - Keep the max-h-48 overflow-y-auto scrollable container for the content

### 4. Style the collapsible header
- Use cursor-pointer for the clickable header
- Add hover state for better UX (hover:bg-gray-100)
- Use flex layout to align label and chevron icon
- Show ChevronDown when collapsed, ChevronUp when expanded

### 5. Run validation commands
- Run `npm run build` to verify TypeScript compiles without errors
- Run `npm test` to verify no regressions
- Manually test the collapsible behavior in the browser

## Testing Strategy
### Unit Tests
- No unit tests required for this UI-only change (component uses existing patterns)

### Integration Tests
- Verify collapsible section only appears when item has a transcript
- Verify clicking toggles the expanded state
- Verify transcript content is visible when expanded

### Edge Cases
- Item with no transcript: section should not render at all
- Item with empty string transcript: section should not render
- Item with very long transcript: scrollable container should handle overflow
- Rapid clicking: state should toggle correctly

## Acceptance Criteria
- Transcript section is collapsed by default when viewing an item with a transcript
- Clicking the "Transcript" header expands the section to show the transcript content
- Clicking again collapses the section
- Chevron icon rotates/changes to indicate expanded/collapsed state
- Items without transcripts do not show the transcript section at all
- The transcript content maintains its scrollable behavior for long transcripts
- The styling is consistent with the rest of the application

## Validation Commands
Execute every command to validate the feature works correctly with zero regressions.

- `npm run build` - Verify the TypeScript compiles and the project builds without errors
- `npm test` - Run frontend tests to validate the feature works with zero regressions

## Notes
- The collapsible pattern uses native React state and conditional rendering - no external library needed
- Consider using CSS transitions for smooth expand/collapse animation in a future enhancement
- The feature only affects the InterestDetail modal, not the card list view
- Transcript content will remain read-only as it was before
