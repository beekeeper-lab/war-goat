import type { InterestItem } from '../types';

// Category patterns - map of category names to keywords that match that category
const CATEGORY_PATTERNS: Record<string, string[]> = {
  'Programming': [
    'code', 'coding', 'programming', 'developer', 'software', 'typescript',
    'javascript', 'python', 'java', 'api', 'git', 'github', 'function',
    'variable', 'algorithm', 'data structure', 'compiler', 'runtime',
  ],
  'AI & Machine Learning': [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'llm',
    'gpt', 'claude', 'neural', 'deep learning', 'transformer', 'model',
    'anthropic', 'openai', 'chatgpt', 'copilot', 'agentic', 'agent',
  ],
  'Productivity': [
    'productivity', 'habits', 'efficiency', 'workflow', 'time management',
    'gtd', 'getting things done', 'organize', 'focus', 'routine',
  ],
  'Architecture': [
    'architecture', 'microservices', 'distributed', 'system design',
    'scalability', 'design patterns', 'monolith', 'event-driven',
    'domain-driven', 'ddd', 'clean architecture',
  ],
  'Self Improvement': [
    'self-improvement', 'self improvement', 'personal development',
    'growth', 'mindset', 'motivation', 'success', 'goals',
    'discipline', 'mental', 'wellness',
  ],
  'DevOps': [
    'devops', 'docker', 'kubernetes', 'ci/cd', 'deployment',
    'infrastructure', 'aws', 'azure', 'gcp', 'cloud', 'terraform',
    'ansible', 'jenkins', 'pipeline',
  ],
  'Web Development': [
    'web', 'frontend', 'backend', 'react', 'vue', 'angular',
    'html', 'css', 'node', 'express', 'next.js', 'nextjs',
    'tailwind', 'responsive', 'browser',
  ],
  'Business': [
    'business', 'startup', 'entrepreneur', 'marketing', 'leadership',
    'management', 'strategy', 'revenue', 'customer', 'sales',
    'product', 'market',
  ],
};

/**
 * Categorizes an item based on its metadata (title, description, tags, author)
 * Returns an array of matching category names, or ['Uncategorized'] if no matches
 */
export function categorizeItem(item: Partial<InterestItem>): string[] {
  // Combine all searchable text
  const searchableText = [
    item.title || '',
    item.description || '',
    item.author || '',
    item.channelName || '',
    ...(item.tags || []),
  ]
    .join(' ')
    .toLowerCase();

  // If no searchable text, return uncategorized
  if (!searchableText.trim()) {
    return ['Uncategorized'];
  }

  const matchedCategories: string[] = [];

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_PATTERNS)) {
    for (const keyword of keywords) {
      // Use word boundary matching for more accurate results
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(searchableText)) {
        matchedCategories.push(category);
        break; // Only add category once even if multiple keywords match
      }
    }
  }

  // Return matched categories or 'Uncategorized' if none matched
  return matchedCategories.length > 0 ? matchedCategories : ['Uncategorized'];
}

/**
 * Get all available category names (for reference)
 */
export function getAllCategoryNames(): string[] {
  return Object.keys(CATEGORY_PATTERNS);
}
