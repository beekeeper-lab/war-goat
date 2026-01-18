import {
  Youtube,
  Book,
  Headphones,
  FileText,
  Podcast,
  Github,
  Link,
  Trash2,
  ExternalLink,
  Clock,
  CheckCircle,
  Circle,
  Search,
} from 'lucide-react';
import type { InterestItem, ItemStatus } from '../types';
import { ExportToObsidianButton } from './ExportToObsidianButton';

interface InterestCardProps {
  item: InterestItem;
  onStatusChange: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
  onExportToObsidian?: () => void;
  onFindRelated?: () => void;
  obsidianConnected?: boolean;
  searchAvailable?: boolean;
}

const TYPE_ICONS = {
  youtube: Youtube,
  book: Book,
  audiobook: Headphones,
  article: FileText,
  podcast: Podcast,
  github: Github,
  other: Link,
};

const TYPE_COLORS = {
  youtube: 'text-red-500 bg-red-50',
  book: 'text-amber-600 bg-amber-50',
  audiobook: 'text-purple-500 bg-purple-50',
  article: 'text-blue-500 bg-blue-50',
  podcast: 'text-green-500 bg-green-50',
  github: 'text-gray-700 bg-gray-100',
  other: 'text-gray-500 bg-gray-50',
};

const STATUS_CONFIG = {
  backlog: { icon: Circle, label: 'Backlog', color: 'text-gray-400' },
  'in-progress': { icon: Clock, label: 'In Progress', color: 'text-amber-500' },
  completed: { icon: CheckCircle, label: 'Completed', color: 'text-green-500' },
};

export function InterestCard({
  item,
  onStatusChange,
  onDelete,
  onClick,
  onExportToObsidian,
  onFindRelated,
  obsidianConnected = false,
  searchAvailable = false,
}: InterestCardProps) {
  const TypeIcon = TYPE_ICONS[item.type];
  const typeColor = TYPE_COLORS[item.type];
  const statusConfig = STATUS_CONFIG[item.status];
  const StatusIcon = statusConfig.icon;

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const statuses: ItemStatus[] = ['backlog', 'in-progress', 'completed'];
    const currentIndex = statuses.indexOf(item.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    onStatusChange(item.id, nextStatus);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this item?')) {
      onDelete(item.id);
    }
  };

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(item.url, '_blank');
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex gap-4">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className={`w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor}`}>
            <TypeIcon className="w-10 h-10" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`p-1.5 rounded ${typeColor}`}>
                <TypeIcon className="w-4 h-4" />
              </span>
              <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {onFindRelated && searchAvailable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFindRelated();
                  }}
                  className="p-1.5 text-gray-400 hover:text-olive-600 rounded hover:bg-olive-50"
                  title="Find related content"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
              {onExportToObsidian && (
                <ExportToObsidianButton
                  item={item}
                  onExport={onExportToObsidian}
                  disabled={!obsidianConnected}
                  size="sm"
                />
              )}
              <button
                onClick={handleExternalLink}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          )}

          {item.author && (
            <p className="text-sm text-gray-500 mt-1">by {item.author}</p>
          )}

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button
              onClick={cycleStatus}
              className={`flex items-center gap-1.5 text-sm ${statusConfig.color} hover:opacity-80`}
              title="Click to change status"
            >
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </button>

            {item.categories && item.categories.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {item.categories.slice(0, 2).map((category) => (
                  <span
                    key={category}
                    className="px-2 py-0.5 bg-olive-100 text-olive-700 text-xs rounded-full"
                  >
                    {category}
                  </span>
                ))}
                {item.categories.length > 2 && (
                  <span className="text-xs text-gray-400">+{item.categories.length - 2}</span>
                )}
              </div>
            )}

            {item.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {item.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
