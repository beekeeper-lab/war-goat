import type {
  InterestItem,
  EnrichedCreateInput,
  UpdateInterestInput,
  ObsidianStatus,
  ObsidianExportOptions,
  ObsidianExportResult,
  ObsidianSyncResult,
  SearchOptions,
  SearchResponse,
  RelatedSearchResponse,
  BraveSearchStatus,
} from '../types';
import { categorizeItem } from './categorize';

const API_BASE = '/api';

export async function fetchInterests(): Promise<InterestItem[]> {
  const response = await fetch(`${API_BASE}/interests`);
  if (!response.ok) throw new Error('Failed to fetch interests');
  return response.json();
}

export async function fetchInterest(id: string): Promise<InterestItem> {
  const response = await fetch(`${API_BASE}/interests/${id}`);
  if (!response.ok) throw new Error('Failed to fetch interest');
  return response.json();
}

export async function createInterest(input: EnrichedCreateInput): Promise<InterestItem> {
  const now = new Date().toISOString();
  // Extract transcript to save separately
  const { transcript, ...restInput } = input;

  // Auto-categorize the item based on its content
  const categories = input.categories || categorizeItem({
    title: restInput.title,
    description: restInput.description,
    author: restInput.author,
    channelName: restInput.channelName,
    tags: restInput.tags,
  });

  const newItem: Omit<InterestItem, 'id'> = {
    url: restInput.url,
    type: restInput.type || 'other',
    title: restInput.title || restInput.url,
    description: restInput.description,
    status: restInput.status || 'backlog',
    tags: restInput.tags || [],
    categories,
    notes: restInput.notes || '',
    createdAt: now,
    updatedAt: now,
    // Enriched fields (no transcript - stored separately)
    thumbnail: restInput.thumbnail,
    author: restInput.author,
    channelName: restInput.channelName || restInput.author,
    // Flag indicating transcript exists
    hasTranscript: !!transcript,
  };

  const response = await fetch(`${API_BASE}/interests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newItem),
  });

  if (!response.ok) throw new Error('Failed to create interest');
  const createdItem = await response.json();

  // Save transcript to separate file if provided
  if (transcript && createdItem.id) {
    await saveTranscript(createdItem.id, transcript);
  }

  return createdItem;
}

export async function updateInterest(
  id: string,
  input: UpdateInterestInput
): Promise<InterestItem> {
  const response = await fetch(`${API_BASE}/interests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      updatedAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) throw new Error('Failed to update interest');
  return response.json();
}

export async function deleteInterest(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/interests/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete interest');
}

// Transcript API functions
export async function fetchTranscript(id: string): Promise<string | null> {
  const response = await fetch(`${API_BASE}/transcripts/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to fetch transcript');
  const data = await response.json();
  return data.transcript;
}

export async function saveTranscript(id: string, transcript: string): Promise<void> {
  const response = await fetch(`${API_BASE}/transcripts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok) throw new Error('Failed to save transcript');
}

// ============================================================================
// Obsidian API Functions
// ============================================================================

/**
 * Get Obsidian connection status
 */
export async function getObsidianStatus(): Promise<ObsidianStatus> {
  const response = await fetch(`${API_BASE}/obsidian/status`);
  if (!response.ok) {
    return { connected: false, error: 'Failed to check status' };
  }
  return response.json();
}

/**
 * Export a single interest to Obsidian
 */
export async function exportToObsidian(
  id: string,
  options: ObsidianExportOptions = {}
): Promise<ObsidianExportResult> {
  const response = await fetch(`${API_BASE}/interests/${id}/export-obsidian`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    return { success: false, error: error.error || 'Export failed' };
  }

  return response.json();
}

/**
 * Sync all interests to Obsidian with progress callback
 * Uses Server-Sent Events for progress updates
 */
export async function syncToObsidian(
  options: ObsidianExportOptions = {},
  onProgress?: (current: number, total: number, itemTitle: string) => void
): Promise<ObsidianSyncResult> {
  return new Promise((resolve, reject) => {
    // Use fetch with streaming for SSE
    fetch(`${API_BASE}/sync-obsidian`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    })
      .then(async (response) => {
        if (!response.ok) {
          reject(new Error('Sync failed'));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          reject(new Error('No response body'));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'progress' && onProgress) {
                  onProgress(data.current, data.total, data.item);
                } else if (data.type === 'complete') {
                  resolve(data.result);
                  return;
                } else if (data.type === 'error') {
                  reject(new Error(data.error));
                  return;
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }

        // If we get here without a complete message, something went wrong
        reject(new Error('Connection closed unexpectedly'));
      })
      .catch(reject);
  });
}

// ============================================================================
// Brave Search API Functions
// ============================================================================

/**
 * Get Brave Search availability status
 */
export async function getSearchStatus(): Promise<BraveSearchStatus> {
  try {
    const response = await fetch(`${API_BASE}/search/status`);
    if (!response.ok) {
      return { available: false, error: 'Failed to check status' };
    }
    return response.json();
  } catch (err) {
    return { available: false, error: 'Failed to connect to search service' };
  }
}

/**
 * Perform a search using Brave Search
 */
export async function search(options: SearchOptions): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      results: [],
      query: options.query,
      error: data.error || 'Search failed',
    };
  }

  return data;
}

/**
 * Search for content related to an existing interest
 */
export async function searchRelated(
  interestId: string,
  options: { count?: number; freshness?: string } = {}
): Promise<RelatedSearchResponse> {
  const response = await fetch(`${API_BASE}/search/related/${interestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      results: [],
      query: '',
      generatedQuery: '',
      error: data.error || 'Related search failed',
    };
  }

  return data;
}
