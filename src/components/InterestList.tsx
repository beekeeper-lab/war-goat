import { Loader2, Inbox } from 'lucide-react';
import type { InterestItem, ItemStatus } from '../types';
import { InterestCard } from './InterestCard';

interface InterestListProps {
  items: InterestItem[];
  loading: boolean;
  error: string | null;
  onStatusChange: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
  onItemClick: (item: InterestItem) => void;
  onExportToObsidian?: (item: InterestItem) => void;
  obsidianConnected?: boolean;
}

export function InterestList({
  items,
  loading,
  error,
  onStatusChange,
  onDelete,
  onItemClick,
  onExportToObsidian,
  obsidianConnected = false,
}: InterestListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-olive-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No interests found</p>
        <p className="text-gray-400 text-sm mt-1">
          Add your first interest to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <InterestCard
          key={item.id}
          item={item}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onClick={() => onItemClick(item)}
          onExportToObsidian={onExportToObsidian ? () => onExportToObsidian(item) : undefined}
          obsidianConnected={obsidianConnected}
        />
      ))}
    </div>
  );
}
