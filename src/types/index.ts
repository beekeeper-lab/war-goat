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
  articleContent?: string;
  hasArticleContent?: boolean;
  articleError?: string;
  excerpt?: string;
  wordCount?: number;
  readingTime?: number;
  isDocumentation?: boolean;
  truncated?: boolean;
  seriesInfo?: SeriesInfo;

  // GitHub specific
  stars?: number;
  language?: string;
  forks?: number;
  topics?: string[];
  license?: string;
  lastCommitDate?: string;
  hasReadme?: boolean;
  readme?: string;
  readmeError?: string;
  ownerAvatar?: string;
  openIssues?: number;
  defaultBranch?: string;
  fullName?: string;

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
  // GitHub specific
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
  license?: string;
  ownerAvatar?: string;
  hasReadme?: boolean;
  lastCommitDate?: string;
  openIssues?: number;
  defaultBranch?: string;
  fullName?: string;
}

export interface UpdateInterestInput {
  title?: string;
  description?: string;
  status?: ItemStatus;
  tags?: string[];
  notes?: string;
  obsidianPath?: string;
  obsidianSyncedAt?: string;
}

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
  article: [],
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
  if (/^https?:\/\//.test(url)) {
    return 'article';
  }
  return 'other';
}

// Obsidian Integration Types
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

// Brave Search Integration Types
export interface SearchResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  publishedDate?: string;
  source: string;
  type: 'web' | 'news' | 'video';
  duration?: string;
  age?: string;
}

export interface SearchOptions {
  query: string;
  type?: 'web' | 'news' | 'video';
  freshness?: 'pd' | 'pw' | 'pm' | 'py';
  count?: number;
  summary?: boolean;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  summary?: string;
  query: string;
  cached?: boolean;
  error?: string;
}

export interface RelatedSearchResponse extends SearchResponse {
  generatedQuery: string;
}

export interface BraveSearchStatus {
  available: boolean;
  error?: string;
}

// Article Summary Types
export interface ArticleSummary {
  summary: string;
  keyPoints: string[];
  suggestedTags: string[];
}
