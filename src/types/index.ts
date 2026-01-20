export type SourceType =
  | 'youtube'
  | 'book'
  | 'audiobook'
  | 'article'
  | 'podcast'
  | 'github'
  | 'other';

export type ItemStatus = 'backlog' | 'in-progress' | 'completed';

// Series detection result for article navigation
export interface SeriesInfo {
  isPart: boolean;
  prevUrl?: string;
  nextUrl?: string;
  breadcrumbs?: string[];
}

export interface InterestItem {
  id: string;
  url: string;
  type: SourceType;
  title: string;
  description?: string;
  thumbnail?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
  status: ItemStatus;
  notes?: string;
  tags: string[];
  categories?: string[];

  // YouTube specific
  transcript?: string;
  transcriptError?: string;
  hasTranscript?: boolean;
  duration?: string;
  channelName?: string;

  // Book/Audiobook specific
  isbn?: string;
  pageCount?: number;
  narrator?: string;

  // Article specific
  siteName?: string;
  publishedDate?: string;
  articleContent?: string;      // Stored separately in data/articles/{id}.txt
  hasArticleContent?: boolean;  // Flag for lazy loading
  articleError?: string;        // Extraction failure reason
  excerpt?: string;             // First ~200 chars for preview
  wordCount?: number;           // Total word count
  readingTime?: number;         // Estimated minutes (words / 200)
  isDocumentation?: boolean;    // Documentation site flag
  truncated?: boolean;          // Content was truncated
  seriesInfo?: SeriesInfo;      // Series detection result

  // GitHub specific
  stars?: number;
  language?: string;

  // Obsidian integration
  obsidianPath?: string;
  obsidianSyncedAt?: string;
}

export interface CreateInterestInput {
  url: string;
  title?: string;
  description?: string;
  type?: SourceType;
  status?: ItemStatus;
  tags?: string[];
  notes?: string;
}

export interface EnrichedCreateInput extends CreateInterestInput {
  transcript?: string;
  thumbnail?: string;
  author?: string;
  channelName?: string;
  categories?: string[];
  // Article specific enrichment
  articleContent?: string;
  excerpt?: string;
  wordCount?: number;
  readingTime?: number;
  siteName?: string;
  publishedDate?: string;
  isDocumentation?: boolean;
  seriesInfo?: SeriesInfo;
  truncated?: boolean;
}

export interface UpdateInterestInput {
  title?: string;
  description?: string;
  status?: ItemStatus;
  tags?: string[];
  notes?: string;
  // Obsidian sync tracking
  obsidianPath?: string;
  obsidianSyncedAt?: string;
}

// URL detection patterns
export const URL_PATTERNS: Record<SourceType, RegExp[]> = {
  youtube: [
    /youtube\.com\/watch/,
    /youtu\.be\//,
    /youtube\.com\/shorts/,
  ],
  book: [
    /amazon\.com.*\/dp\//,
    /amazon\.com.*\/gp\/product/,
    /goodreads\.com\/book/,
  ],
  audiobook: [
    /audible\.com/,
    /libro\.fm/,
  ],
  article: [], // Fallback for most URLs
  podcast: [
    /spotify\.com.*episode/,
    /podcasts\.apple\.com/,
    /overcast\.fm/,
  ],
  github: [
    /github\.com\/[\w-]+\/[\w-]+$/,
    /github\.com\/[\w-]+\/[\w-]+\/?$/,
  ],
  other: [],
};

export function detectSourceType(url: string): SourceType {
  for (const [type, patterns] of Object.entries(URL_PATTERNS)) {
    if (type === 'article' || type === 'other') continue;
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return type as SourceType;
      }
    }
  }
  // Default to article for http(s) URLs, other for everything else
  if (/^https?:\/\//.test(url)) {
    return 'article';
  }
  return 'other';
}

// ============================================================================
// Obsidian Integration Types
// ============================================================================

export interface ObsidianSettings {
  enabled: boolean;
  defaultFolder: string;
  includeTranscript: boolean;
  generateStudyNotes: boolean;
  autoSyncOnCreate: boolean;
}

export const DEFAULT_OBSIDIAN_SETTINGS: ObsidianSettings = {
  enabled: true,
  defaultFolder: 'War Goat',
  includeTranscript: true,
  generateStudyNotes: false,
  autoSyncOnCreate: false,
};

export interface ObsidianExportOptions {
  folder?: string;
  generateStudyNotes?: boolean;
  includeTranscript?: boolean;
  forceOverwrite?: boolean;
}

export interface ObsidianExportResult {
  success: boolean;
  notePath?: string;
  existed?: boolean;
  error?: string;
}

export interface ObsidianSyncResult {
  created: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface ObsidianStatus {
  connected: boolean;
  vaultName?: string;
  error?: string;
}

export interface StudyNotes {
  summary: string;
  keyConcepts: Array<{ name: string; description: string }>;
  quotes: Array<{ text: string; timestamp?: string }>;
  relatedTopics: string[];
  actionItems: string[];
}

// ============================================================================
// Article Summary Types
// ============================================================================

/**
 * AI-generated article summary
 */
export interface ArticleSummary {
  summary: string;
  keyPoints: string[];
  mainTheme: string;
  suggestedTags: string[];
  actionItems: string[];
}

// ============================================================================
// Brave Search Integration Types
// ============================================================================

/**
 * Search result from Brave Search API
 */
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  publishedDate?: string;
  source: string;
  type: 'web' | 'news' | 'video';
  // Video-specific
  duration?: string;
  // News-specific
  age?: string;
}

/**
 * Search request options
 */
export interface SearchOptions {
  query: string;
  type?: 'web' | 'news' | 'video';
  freshness?: 'pd' | 'pw' | 'pm' | 'py'; // past day/week/month/year
  count?: number;
  summary?: boolean;
}

/**
 * Search response from the API
 */
export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  summary?: string;
  query: string;
  cached?: boolean;
  error?: string;
}

/**
 * Related search response (includes the generated query)
 */
export interface RelatedSearchResponse extends SearchResponse {
  generatedQuery: string;
}

/**
 * Brave Search service status
 */
export interface BraveSearchStatus {
  available: boolean;
  error?: string;
}

// ============================================================================
// User Preferences Types (F005)
// ============================================================================

/**
 * Theme setting for the application
 */
export type ThemeSetting = 'light' | 'dark' | 'system';

/**
 * View mode for the interest list
 */
export type ViewMode = 'grid' | 'list';

/**
 * Sort order for the interest list
 */
export type SortOrder = 'date' | 'title' | 'status';

/**
 * Privacy settings for user data collection
 */
export interface PrivacySettings {
  trackPatterns: boolean;
  consentGiven: boolean;
  consentDate?: string;
}

/**
 * Default filter state to apply on app load
 */
export interface DefaultFilters {
  type: SourceType | 'all';
  status: ItemStatus | 'all';
  category: string | 'all';
}

/**
 * User preferences - stored in localStorage
 * Schema version enables future migrations
 */
export interface UserPreferences {
  version: number;
  theme: ThemeSetting;
  defaultView: ViewMode;
  defaultSort: SortOrder;
  defaultFilters: DefaultFilters;
  autoEnrich: boolean;
  obsidian: ObsidianSettings;
  privacy: PrivacySettings;
}

/**
 * Default preferences for new users
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  version: 1,
  theme: 'system',
  defaultView: 'grid',
  defaultSort: 'date',
  defaultFilters: {
    type: 'all',
    status: 'all',
    category: 'all',
  },
  autoEnrich: true,
  obsidian: {
    enabled: true,
    defaultFolder: 'War Goat',
    includeTranscript: true,
    generateStudyNotes: false,
    autoSyncOnCreate: false,
  },
  privacy: {
    trackPatterns: false,
    consentGiven: false,
  },
};

// ============================================================================
// Learning Goals Types
// ============================================================================

/**
 * Timeframe for a learning goal
 */
export type GoalTimeframe = 'daily' | 'weekly' | 'monthly' | 'custom';

/**
 * Type of target metric for a goal
 */
export type GoalTargetType = 'items' | 'hours' | 'topics';

/**
 * Status of a learning goal
 */
export type GoalStatus = 'active' | 'completed' | 'abandoned';

/**
 * A learning goal - stored in IndexedDB
 */
export interface LearningGoal {
  id: string;
  title: string;
  description?: string;
  timeframe: GoalTimeframe;
  targetType: GoalTargetType;
  targetValue: number;
  currentValue: number;
  startDate: string;
  endDate?: string;
  tags?: string[];       // Filter matching items by tags
  categories?: string[]; // Filter matching items by categories
  contentTypes?: SourceType[]; // Filter matching items by type
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// User Patterns Types
// ============================================================================

/**
 * User behavior patterns - stored in localStorage
 * Tracks frequency of user interactions
 */
export interface UserPatterns {
  version: number;
  tagFrequency: Record<string, number>;
  typeFrequency: Record<SourceType, number>;
  categoryFrequency: Record<string, number>;
  statusTransitions: Record<string, Record<string, number>>;
  recentTags: string[]; // Last 20 unique tags used
  lastUpdated: string;
}

/**
 * Default patterns for new users
 */
export const DEFAULT_USER_PATTERNS: UserPatterns = {
  version: 1,
  tagFrequency: {},
  typeFrequency: {
    youtube: 0,
    book: 0,
    audiobook: 0,
    article: 0,
    podcast: 0,
    github: 0,
    other: 0,
  },
  categoryFrequency: {},
  statusTransitions: {},
  recentTags: [],
  lastUpdated: new Date().toISOString(),
};

// ============================================================================
// AI Insights Types
// ============================================================================

/**
 * AI-generated insights for an item - stored in IndexedDB
 */
export interface AIInsight {
  id: string;
  interestId: string;
  studyNotes?: StudyNotes;
  summary?: string;
  keyTopics?: string[];
  relatedItemIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Export Data Types
// ============================================================================

/**
 * Complete export of all user data
 */
export interface UserDataExport {
  exportedAt: string;
  version: number;
  preferences: UserPreferences;
  patterns: UserPatterns;
  goals: LearningGoal[];
  insights: AIInsight[];
}
