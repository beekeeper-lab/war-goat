import { Plus, RefreshCw } from 'lucide-react';
import { ObsidianStatus } from './ObsidianStatus';

interface HeaderProps {
  onAddClick: () => void;
  onSyncClick?: () => void;
  syncing?: boolean;
  obsidianConnected?: boolean;
}

export function Header({ onAddClick, onSyncClick, syncing, obsidianConnected }: HeaderProps) {
  return (
    <header className="bg-olive-900 border-b border-olive-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/war-goat-logo.png"
            alt="War Goat"
            className="w-12 h-12 rounded-full object-cover border-2 border-tactical-tan"
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-tactical-tan tracking-wide">War Goat</h1>
            <span className="text-xs text-olive-300 italic">Always Remember What's Next!</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ObsidianStatus />
          {onSyncClick && obsidianConnected && (
            <button
              onClick={onSyncClick}
              disabled={syncing}
              className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
              title="Sync all to Obsidian"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </button>
          )}
          <button
            onClick={onAddClick}
            className="flex items-center gap-2 bg-olive-600 text-white px-4 py-2 rounded-lg hover:bg-olive-500 transition-colors border border-olive-500"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>
    </header>
  );
}
