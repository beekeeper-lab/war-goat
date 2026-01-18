import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Loader2, AlertCircle, Globe, Newspaper, Video } from 'lucide-react';
import type { SearchResult, SearchResponse } from '../types';
import { search } from '../services/api';
import { SearchResultCard } from './SearchResultCard';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToInterests: (result: SearchResult) => void;
  initialQuery?: string;
}

type SearchType = 'web' | 'news' | 'video';
type Freshness = 'pd' | 'pw' | 'pm' | 'py' | undefined;

const TYPE_OPTIONS: { value: SearchType; label: string; icon: typeof Globe }[] = [
  { value: 'web', label: 'Web', icon: Globe },
  { value: 'news', label: 'News', icon: Newspaper },
  { value: 'video', label: 'Video', icon: Video },
];

const FRESHNESS_OPTIONS: { value: Freshness; label: string }[] = [
  { value: undefined, label: 'Any time' },
  { value: 'pd', label: 'Past day' },
  { value: 'pw', label: 'Past week' },
  { value: 'pm', label: 'Past month' },
  { value: 'py', label: 'Past year' },
];

const MAX_QUERY_LENGTH = 400;

export function SearchModal({
  isOpen,
  onClose,
  onAddToInterests,
  initialQuery = '',
}: SearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<SearchType>('web');
  const [freshness, setFreshness] = useState<Freshness>(undefined);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setResults([]);
      setError(null);
      setSummary(null);
      setTruncated(false);

      // Auto-search if initial query provided
      if (initialQuery) {
        performSearch(initialQuery, type, freshness);
      }

      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialQuery]);

  const performSearch = useCallback(
    async (searchQuery: string, searchType: SearchType, searchFreshness: Freshness) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setError(null);
        setSummary(null);
        return;
      }

      setLoading(true);
      setError(null);

      // Check if query needs truncation
      const wasTruncated = searchQuery.length > MAX_QUERY_LENGTH;
      setTruncated(wasTruncated);

      try {
        const response: SearchResponse = await search({
          query: searchQuery.slice(0, MAX_QUERY_LENGTH),
          type: searchType,
          freshness: searchFreshness,
          count: 10,
          summary: searchType === 'web',
        });

        if (response.success) {
          setResults(response.results);
          setSummary(response.summary || null);
          setError(null);
        } else {
          setResults([]);
          setSummary(null);
          setError(response.error || 'Search failed');
        }
      } catch (err) {
        setResults([]);
        setSummary(null);
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search on query change
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      performSearch(newQuery, type, freshness);
    }, 500);
  };

  // Immediate search on type/freshness change
  const handleTypeChange = (newType: SearchType) => {
    setType(newType);
    if (query.trim()) {
      performSearch(query, newType, freshness);
    }
  };

  const handleFreshnessChange = (newFreshness: Freshness) => {
    setFreshness(newFreshness);
    if (query.trim()) {
      performSearch(query, type, newFreshness);
    }
  };

  // Manual search trigger
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    performSearch(query, type, freshness);
  };

  const handleAddToInterests = (result: SearchResult) => {
    onAddToInterests(result);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-olive-600" />
            <h2 className="text-lg font-semibold">Search the Web</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search for articles, videos, news..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-lg"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-olive-500 animate-spin" />
            )}
          </div>

          {/* Truncation warning */}
          {truncated && (
            <p className="text-amber-600 text-sm mt-2">
              Query was truncated to {MAX_QUERY_LENGTH} characters
            </p>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4 mt-3">
            {/* Type filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTypeChange(option.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      type === option.value
                        ? 'bg-white text-olive-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            {/* Freshness filter */}
            <select
              value={freshness || ''}
              onChange={(e) =>
                handleFreshnessChange((e.target.value || undefined) as Freshness)
              }
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            >
              {FRESHNESS_OPTIONS.map((option) => (
                <option key={option.value || 'any'} value={option.value || ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Search unavailable</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="p-4 bg-olive-50 text-olive-800 rounded-lg">
              <p className="text-sm font-medium mb-1">AI Summary</p>
              <p className="text-sm">{summary}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Searching...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="w-12 h-12 mb-3 opacity-50" />
              <p>No results found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}

          {/* Initial state */}
          {!loading && !error && !query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Search className="w-12 h-12 mb-3 opacity-50" />
              <p>Enter a search term to find content</p>
              <p className="text-sm text-gray-400 mt-1">
                Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Cmd+K</kbd> anytime to search
              </p>
            </div>
          )}

          {/* Results list */}
          {results.map((result, index) => (
            <SearchResultCard
              key={`${result.url}-${index}`}
              result={result}
              onAddToInterests={() => handleAddToInterests(result)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
          Powered by Brave Search
        </div>
      </div>
    </div>
  );
}
