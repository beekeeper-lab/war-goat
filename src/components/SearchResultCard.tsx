import { ExternalLink, Plus, Globe, Newspaper, Video, Clock } from 'lucide-react';
import type { SearchResult } from '../types';

interface SearchResultCardProps {
  result: SearchResult;
  onAddToInterests: () => void;
}

const TYPE_CONFIG = {
  web: {
    icon: Globe,
    color: 'text-blue-500 bg-blue-50',
    label: 'Web',
  },
  news: {
    icon: Newspaper,
    color: 'text-amber-500 bg-amber-50',
    label: 'News',
  },
  video: {
    icon: Video,
    color: 'text-red-500 bg-red-50',
    label: 'Video',
  },
};

export function SearchResultCard({ result, onAddToInterests }: SearchResultCardProps) {
  const config = TYPE_CONFIG[result.type] || TYPE_CONFIG.web;
  const TypeIcon = config.icon;

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Thumbnail for videos, or icon fallback */}
        {result.thumbnail ? (
          <div className="relative flex-shrink-0">
            <img
              src={result.thumbnail}
              alt={result.title}
              className="w-32 h-20 object-cover rounded-lg"
            />
            {result.duration && (
              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {result.duration}
              </span>
            )}
          </div>
        ) : (
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}
          >
            <TypeIcon className="w-8 h-8" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Type badge and source */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}
                >
                  <TypeIcon className="w-3 h-3" />
                  {config.label}
                </span>
                <span className="text-xs text-gray-500 truncate">{result.source}</span>
                {(result.age || result.publishedDate) && (
                  <span className="text-xs text-gray-400">
                    {result.age || result.publishedDate}
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="font-medium text-gray-900 line-clamp-1 hover:text-olive-600">
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {result.title}
                </a>
              </h4>

              {/* Description */}
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{result.description}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleExternalLink}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToInterests();
                }}
                className="flex items-center gap-1 px-2 py-1 text-sm bg-olive-600 text-white rounded hover:bg-olive-500 transition-colors"
                title="Add to Interests"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
