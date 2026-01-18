export type SourceType =
  | 'youtube'
  | 'book'
  | 'audiobook'
  | 'article'
  | 'podcast'
  | 'github'
  | 'other';

export type ItemStatus = 'backlog' | 'in-progress' | 'completed';

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
