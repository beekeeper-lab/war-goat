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
