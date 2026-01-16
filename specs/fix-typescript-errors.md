# Bug: TypeScript compilation errors in App.tsx and AddInterestModal.tsx

## Bug Description
The project has TypeScript compilation errors that cause `npm run build` to fail:

1. **Error in App.tsx (line 104)**: Type mismatch between `updateInterest` function from `useInterests` hook and the `onUpdate` prop expected by `InterestDetail` component.
   - `useInterests().updateInterest` returns `Promise<InterestItem>`
   - `InterestDetailProps.onUpdate` expects `Promise<void>`

2. **Errors in AddInterestModal.tsx (lines 83, 85)**: The code accesses `result.data.transcriptError` but this property doesn't exist on `Partial<InterestItem>`.
   - The `EnrichResult.data` type is `Partial<InterestItem>`
   - `InterestItem` has no `transcriptError` field
   - The enrichment endpoint appears to return `transcriptError` but it's not typed

**Expected behavior:** `npm run build` should complete successfully with no TypeScript errors.

**Actual behavior:** Build fails with 3 TypeScript errors.

## Problem Statement
There are two type mismatches that need to be fixed:
1. The `InterestDetailProps.onUpdate` return type is too restrictive (`Promise<void>`) when the actual implementation returns `Promise<InterestItem>`
2. The `EnrichResult.data` type doesn't include `transcriptError` which is returned by the enrichment API when transcript fetching fails

## Solution Statement
Fix both type mismatches with minimal changes:
1. Update `InterestDetailProps.onUpdate` return type from `Promise<void>` to `Promise<InterestItem>` to match the actual hook implementation
2. Add `transcriptError?: string` to the `InterestItem` type since it's a valid field returned by the enrichment API

## Steps to Reproduce
1. Run `npm run build`
2. Observe TypeScript compilation errors:
   - `src/App.tsx(104,11): error TS2322`
   - `src/components/AddInterestModal.tsx(83,34): error TS2551`
   - `src/components/AddInterestModal.tsx(85,76): error TS2551`

## Root Cause Analysis
1. **onUpdate type mismatch**: When `InterestDetailProps` was defined, the `onUpdate` return type was specified as `Promise<void>`. However, `useInterests().updateInterest` actually returns the updated `InterestItem`. This is a reasonable design since callers might want the updated item.

2. **transcriptError missing from types**: The enrichment API can return a `transcriptError` field when it successfully fetches video metadata but fails to fetch the transcript. This field was used in `AddInterestModal.tsx` but never added to the type definitions.

## Relevant Files
Use these files to fix the bug:

- **`src/components/InterestDetail.tsx`** (lines 20-22) - Contains `InterestDetailProps` interface where `onUpdate` return type needs to be changed from `Promise<void>` to `Promise<InterestItem>`
- **`src/types/index.ts`** (line 27) - Contains `InterestItem` interface where `transcriptError?: string` needs to be added

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Add transcriptError field to InterestItem type
- Open `src/types/index.ts`
- Add `transcriptError?: string;` after the `transcript?: string;` field (around line 28)
- This allows the enrichment result to include an error message when transcript fetch fails

### 2. Fix onUpdate return type in InterestDetailProps
- Open `src/components/InterestDetail.tsx`
- Change line 22 from `onUpdate: (id: string, input: UpdateInterestInput) => Promise<void>;`
- To: `onUpdate: (id: string, input: UpdateInterestInput) => Promise<InterestItem>;`

### 3. Run validation commands
- Run `npm run build` to verify all TypeScript errors are resolved
- Verify the build completes successfully

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `npm run build` - Verify TypeScript compiles and Vite builds without errors
- `npx tsc --noEmit` - Double-check TypeScript type checking passes

## Notes
- These are minimal, surgical type fixes that align the types with the actual runtime behavior
- The `transcriptError` field is only used during enrichment display - it's not stored in the database
- No logic changes are required, only type definitions
