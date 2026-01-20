import type { InterestItem, SourceType, ItemStatus } from '../../types'

let idCounter = 0

export function createInterestItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  const id = `test-${++idCounter}`
  const now = new Date().toISOString()

  return {
    id,
    url: `https://example.com/${id}`,
    type: 'article' as SourceType,
    title: `Test Item ${id}`,
    description: 'A test item description',
    status: 'backlog' as ItemStatus,
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createYouTubeItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  return createInterestItem({
    type: 'youtube',
    url: 'https://youtube.com/watch?v=abc123',
    thumbnail: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
    hasTranscript: true,
    channelName: 'Test Channel',
    ...overrides,
  })
}

export function createArticleItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  return createInterestItem({
    type: 'article',
    url: 'https://blog.example.com/article',
    hasArticleContent: true,
    siteName: 'Example Blog',
    readingTime: 5,
    wordCount: 1000,
    excerpt: 'This is the article excerpt...',
    ...overrides,
  })
}

export function createBookItem(
  overrides: Partial<InterestItem> = {}
): InterestItem {
  return createInterestItem({
    type: 'book',
    url: 'https://amazon.com/dp/1234567890',
    author: 'Test Author',
    ...overrides,
  })
}

export function resetIdCounter(): void {
  idCounter = 0
}
