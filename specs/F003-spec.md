# F003 - GitHub Repository Enrichment Specification

**Status**: Ready for Implementation
**Architecture Document**: [workflow/F003/2-architecture.md](../workflow/F003/2-architecture.md)

## Summary

Enable War Goat to automatically enrich GitHub repository URLs with comprehensive metadata including repository description, star count, primary language, topics, license, README content, and recent activity.

## Implementation Tasks

Execute in order:

1. **Task 1**: Extend Type Definitions (`src/types/index.ts`)
2. **Task 2**: Create GitHub Service - URL Utilities (`server/services/github.js`)
3. **Task 3**: Create GitHub Service - API Functions
4. **Task 4**: Create GitHub Service - Enrichment Function
5. **Task 5**: Integrate into Enrich Endpoint (`server/index.js`)
6. **Task 6**: Add Frontend URL Detection (`src/services/enrich.ts`)
7. **Task 7**: Create GitHubPreview Component (`src/components/GitHubPreview.tsx`)
8. **Task 8**: Modify AddInterestModal for GitHub
9. **Task 9**: Modify InterestCard for GitHub Display
10. **Task 10**: Modify InterestDetail for README
11. **Task 11**: Final Verification

## Key Files to Create

- `server/services/github.js` - GitHub API service layer
- `src/components/GitHubPreview.tsx` - Preview card component
- `server/__tests__/github.test.js` - Unit tests

## Key Files to Modify

- `server/index.js` - Add GitHub enrichment
- `src/types/index.ts` - Extend InterestItem
- `src/services/enrich.ts` - Add isGitHubUrl()
- `src/components/AddInterestModal.tsx` - GitHub enrichment trigger
- `src/components/InterestCard.tsx` - GitHub badges
- `src/components/InterestDetail.tsx` - README label

## Architecture Decisions

1. **ADR-F003-1**: Direct GitHub API (no MCP)
2. **ADR-F003-2**: Reuse transcript storage for README
3. **ADR-F003-3**: Unauthenticated API by default
4. **ADR-F003-4**: Topics direct mapping to categories

See full architecture document for details.
