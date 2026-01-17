import type { InterestItem, SourceType } from '../types';

const API_BASE = '/api';

export interface EnrichResult {
  success: boolean;
  type: SourceType;
  data: Partial<InterestItem>;
  error?: string;
}

export async function enrichUrl(url: string): Promise<EnrichResult> {
  try {
    const response = await fetch(`${API_BASE}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Enrichment failed');
    }

    return response.json();
  } catch (err) {
    console.error('Enrich error:', err);
    return {
      success: false,
      type: 'other',
      data: { url },
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Check if URL is a YouTube URL
export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

// Check if URL is an article URL (http(s) URLs not matching other patterns)
export function isArticleUrl(url: string): boolean {
  if (!url) return false;

  // Must be HTTP or HTTPS
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }

  // Exclude known non-article patterns
  const excludePatterns = [
    /youtube\.com/,
    /youtu\.be/,
    /github\.com\/[\w-]+\/[\w-]+\/?(?:\?.*)?$/,
    /spotify\.com/,
    /podcasts\.apple\.com/,
    /audible\.com/,
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }

  return true;
}
