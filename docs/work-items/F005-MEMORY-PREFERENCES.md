# Feature: Memory & User Preferences

> **ID**: F005
> **Type**: Feature
> **Status**: Planned
> **Priority**: Medium
> **Effort**: M
> **Created**: 2026-01-16
> **MCP Required**: Memory MCP (optional, for Claude integration)

## Overview

Add persistent memory and preference learning to make War Goat smarter over time, remembering user preferences, learning patterns, and providing personalized experiences.

---

## User Stories

### US-1: Remember User Preferences

> As a user, I want War Goat to remember my preferences so that I don't have to configure the same settings repeatedly.

**Acceptance Criteria**:
- [ ] Persist UI preferences:
  - Default view (grid/list)
  - Default sort order
  - Preferred filters
  - Theme (light/dark)
  - Card display density
- [ ] Persist behavior preferences:
  - Auto-enrich YouTube (on/off)
  - Auto-generate summaries (on/off)
  - Default status for new items
  - Default folder for Obsidian export
- [ ] Settings page to view/edit all preferences
- [ ] Export/import preferences (JSON)

### US-2: Learn From My Patterns

> As a user, I want War Goat to learn from my behavior so that it can make smarter suggestions.

**Acceptance Criteria**:
- [ ] Track implicit preferences:
  - Which categories I add most
  - Which authors/channels I follow
  - What time of day I add content
  - How quickly I complete items
- [ ] Surface insights: "You mostly add AI content"
- [ ] Use patterns for:
  - Default category suggestions
  - Discovery feed personalization
  - "You might like" recommendations
- [ ] Privacy: All data stays local, option to clear

### US-3: AI Memory Across Sessions

> As a user, I want Claude to remember context from previous sessions so that I don't have to re-explain my goals.

**Acceptance Criteria**:
- [ ] Claude remembers:
  - Learning goals I've mentioned
  - Topics I'm focusing on
  - Preferences expressed in chat
  - Previous skill executions
- [ ] Memory is scoped to War Goat project
- [ ] Can view what Claude remembers about me
- [ ] Can edit/delete specific memories
- [ ] "Forget everything" option

### US-4: Learning Goals Tracking

> As a user, I want to set learning goals and track progress so that I stay motivated and focused.

**Acceptance Criteria**:
- [ ] Create learning goals with:
  - Title and description
  - Target date (optional)
  - Related categories/tags
  - Success criteria
- [ ] Link interests to goals
- [ ] Progress visualization:
  - Items completed toward goal
  - Time invested
  - Estimated time remaining
- [ ] Goal reminders and check-ins
- [ ] Celebrate goal completion

### US-5: Smart Defaults Based on Context

> As a user, I want War Goat to intelligently set defaults based on what I'm doing.

**Acceptance Criteria**:
- [ ] When adding from specific sites, remember:
  - Last used tags for that site
  - Default category
  - Default status
- [ ] Time-based defaults:
  - Morning → "Quick reads" filter?
  - Weekend → "Deep dives"?
- [ ] After completing an item, suggest:
  - Related content
  - Next in series
  - Same author/channel

---

## Technical Design

### Preference Storage

```typescript
// Types
interface UserPreferences {
  // UI Preferences
  ui: {
    theme: 'light' | 'dark' | 'system';
    viewMode: 'grid' | 'list';
    cardDensity: 'compact' | 'normal' | 'expanded';
    defaultSort: 'date' | 'title' | 'status';
    defaultFilters: {
      type: SourceType | 'all';
      status: ItemStatus | 'all';
      category: string | 'all';
    };
  };

  // Behavior Preferences
  behavior: {
    autoEnrichYouTube: boolean;
    autoGenerateSummary: boolean;
    defaultStatus: ItemStatus;
    showReadingTime: boolean;
    confirmDelete: boolean;
  };

  // Integration Preferences
  integrations: {
    obsidian: {
      enabled: boolean;
      defaultFolder: string;
      autoSync: boolean;
      includeTranscript: boolean;
    };
    github: {
      token: string | null;  // Encrypted
      showPrivateRepos: boolean;
    };
  };

  // Learned Patterns (auto-updated)
  patterns: {
    frequentCategories: string[];
    frequentTags: string[];
    favoriteAuthors: string[];
    preferredSources: string[];
    averageCompletionDays: number;
  };
}

// Storage location
// Option 1: localStorage (simple, client-only)
// Option 2: db.json preferences section (shared across devices if synced)
// Option 3: Separate preferences.json file
```

### Pattern Learning System

```javascript
// server/services/patterns.js

export function updatePatterns(interest, action) {
  const patterns = loadPatterns();

  switch (action) {
    case 'add':
      // Track what types of content user adds
      incrementCounter(patterns.sourceTypes, interest.type);
      incrementCounter(patterns.categories, interest.categories);
      incrementCounter(patterns.authors, interest.author);
      patterns.addTimes.push(new Date().getHours());
      break;

    case 'complete':
      // Track completion patterns
      const daysToComplete = daysBetween(interest.createdAt, new Date());
      patterns.completionTimes.push(daysToComplete);
      break;

    case 'delete':
      // Track what user removes (negative signal)
      incrementCounter(patterns.deletedTypes, interest.type);
      break;
  }

  savePatterns(patterns);
}

export function getInsights(patterns) {
  return {
    topCategories: getTopN(patterns.categories, 3),
    topAuthors: getTopN(patterns.authors, 5),
    peakAddTime: mode(patterns.addTimes),
    avgCompletionDays: average(patterns.completionTimes),
    preferredTypes: getTopN(patterns.sourceTypes, 2)
  };
}
```

### Memory MCP Integration

For Claude to remember across sessions:

```json
// .mcp.json addition (if using Memory MCP)
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-memory"],
      "env": {
        "MEMORY_FILE": "./data/claude-memory.json"
      }
    }
  }
}
```

Memory structure:
```json
{
  "entities": [
    {
      "name": "User Learning Profile",
      "type": "profile",
      "facts": [
        "Interested in AI and machine learning",
        "Learning React and TypeScript",
        "Prefers video tutorials over articles",
        "Goal: Build AI-powered applications by Q2"
      ]
    },
    {
      "name": "War Goat Preferences",
      "type": "preferences",
      "facts": [
        "Prefers dark mode",
        "Likes detailed summaries",
        "Uses Obsidian for note-taking"
      ]
    }
  ]
}
```

### Learning Goals Data Model

```typescript
interface LearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: string | null;
  createdAt: string;
  completedAt: string | null;
  status: 'active' | 'completed' | 'abandoned';

  // Criteria
  criteria: {
    type: 'items_completed' | 'time_spent' | 'custom';
    target: number;  // e.g., 10 items or 20 hours
    current: number;
  };

  // Links
  relatedCategories: string[];
  relatedTags: string[];
  linkedInterests: string[];  // Interest IDs
}
```

### API Endpoints to Add

```
GET /api/preferences
  - Get all user preferences

PUT /api/preferences
  - Update preferences (partial update)

GET /api/patterns
  - Get learned patterns and insights

DELETE /api/patterns
  - Clear all learned patterns

GET /api/goals
  - List learning goals

POST /api/goals
  - Create new goal

PATCH /api/goals/:id
  - Update goal progress

DELETE /api/goals/:id
  - Delete goal

POST /api/goals/:id/link/:interestId
  - Link interest to goal
```

### Frontend Components

1. **PreferencesPage** - Settings UI
   - Tabs: UI, Behavior, Integrations, Privacy
   - Toggle switches, dropdowns
   - Save/Reset buttons

2. **InsightsPanel** - Dashboard widget
   - "Your patterns" summary
   - Top categories visualization
   - Completion trends chart

3. **GoalsManager** - Goals CRUD UI
   - Goal cards with progress bars
   - Link interests to goals
   - Celebrate completions

4. **SmartDefaultsIndicator** - Show when defaults are applied
   - "Based on your patterns" hint
   - "Edit defaults" link

5. **MemoryViewer** - What Claude remembers
   - List of memory facts
   - Edit/delete individual facts
   - "Clear all" option

### Privacy Considerations

```typescript
interface PrivacySettings {
  enablePatternLearning: boolean;
  enableClaudeMemory: boolean;
  shareAnonymousStats: boolean;  // For future analytics
  dataRetentionDays: number;     // Auto-delete old patterns
}

// All data stored locally
// No external transmission
// Clear deletion options
```

---

## Questions to Resolve

1. **Storage location**: localStorage vs file-based vs both?
2. **Sync across devices**: Important? Use cloud storage?
3. **Memory scope**: What should Claude remember vs forget?
4. **Pattern sensitivity**: How much data before patterns are reliable?
5. **Goal types**: What goal structures are most useful?
6. **Privacy defaults**: Opt-in or opt-out for learning?

---

## Dependencies

For Memory MCP:
- `@anthropic/mcp-memory` package
- File system access for memory storage

For pattern learning:
- No external dependencies (pure logic)
- Optional: Chart library for visualizations

For preferences:
- No external dependencies
- Consider: zod for validation

---

## Testing Scenarios

1. Set UI preference → persists across page reload
2. Add 10 items → patterns update correctly
3. Check insights → shows accurate top categories
4. Create goal → link interests → progress updates
5. Complete goal → celebration shown
6. Clear patterns → resets to empty state
7. Claude skill → remembers previous context
8. View Claude memory → shows stored facts
9. Delete memory fact → removed from storage
10. Export preferences → valid JSON output

---

## Implementation Phases

### Phase 1: Basic Preferences
- UI preferences (theme, view mode)
- localStorage storage
- Settings page

### Phase 2: Pattern Learning
- Track add/complete/delete actions
- Calculate insights
- Surface in dashboard

### Phase 3: Learning Goals
- CRUD for goals
- Progress tracking
- Interest linking

### Phase 4: Claude Memory Integration
- Memory MCP setup
- Memory viewer UI
- Skill enhancements

---

## Future Enhancements

- **Habit tracking**: Daily/weekly learning streaks
- **Spaced repetition**: Remind to review old content
- **Social features**: Share goals with accountability partner
- **Templates**: Pre-built goal templates ("Learn React in 30 days")
- **Analytics dashboard**: Detailed learning statistics
- **Export to calendar**: Block learning time
- **Pomodoro integration**: Time-boxed study sessions
- **Gamification**: Points, badges, levels
