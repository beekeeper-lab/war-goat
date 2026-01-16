import type { InterestItem, EnrichedCreateInput, UpdateInterestInput } from '../types';
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
