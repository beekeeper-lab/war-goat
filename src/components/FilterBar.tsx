import { Search } from 'lucide-react';
import type { SourceType, ItemStatus } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: SourceType | 'all';
  onTypeFilterChange: (type: SourceType | 'all') => void;
  statusFilter: ItemStatus | 'all';
  onStatusFilterChange: (status: ItemStatus | 'all') => void;
  categoryFilter: string | 'all';
  onCategoryFilterChange: (category: string | 'all') => void;
  availableCategories: string[];
}

const SOURCE_TYPES: { value: SourceType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'book', label: 'Books' },
  { value: 'audiobook', label: 'Audiobooks' },
  { value: 'article', label: 'Articles' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'github', label: 'GitHub' },
  { value: 'other', label: 'Other' },
];

const STATUSES: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export function FilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
}: FilterBarProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search interests..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as SourceType | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
        >
          {SOURCE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as ItemStatus | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
        >
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        {availableCategories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
