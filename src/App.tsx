import { useState, useMemo, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { InterestList } from './components/InterestList';
import { AddInterestModal } from './components/AddInterestModal';
import { InterestDetail } from './components/InterestDetail';
import { ObsidianExportModal } from './components/ObsidianExportModal';
import { SyncProgress } from './components/SyncProgress';
import { SearchModal } from './components/SearchModal';
import { useInterests } from './hooks/useInterests';
import { useObsidianStatus } from './hooks/useObsidianStatus';
import { useSearchStatus } from './hooks/useSearch';
import { exportToObsidian, syncToObsidian, searchRelated } from './services/api';
import type { InterestItem, SourceType, ItemStatus, EnrichedCreateInput, ObsidianExportOptions, SearchResult } from './types';

export default function App() {
  const {
    interests,
    loading,
    error,
    addInterest,
    updateInterest,
    deleteInterest,
  } = useInterests();

  const { isConnected: obsidianConnected } = useObsidianStatus();
  const { isAvailable: searchAvailable } = useSearchStatus();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InterestItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SourceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

  // Obsidian export state
  const [exportItem, setExportItem] = useState<InterestItem | null>(null);
  const [syncState, setSyncState] = useState<{
    active: boolean;
    current: number;
    total: number;
    currentItem: string;
    status: 'syncing' | 'complete' | 'error';
    result?: { created: number; skipped: number; failed: number };
    error?: string;
  }>({
    active: false,
    current: 0,
    total: 0,
    currentItem: '',
    status: 'syncing',
  });

  // Derive available categories from all items
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    interests.forEach(item => item.categories?.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [interests]);

  const filteredInterests = useMemo(() => {
    return interests.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.author?.toLowerCase().includes(query) ||
          item.transcript?.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (!item.categories?.includes(categoryFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [interests, searchQuery, typeFilter, statusFilter, categoryFilter]);

  const handleStatusChange = async (id: string, status: ItemStatus) => {
    await updateInterest(id, { status });
  };

  const handleAdd = async (input: EnrichedCreateInput) => {
    await addInterest(input);
  };

  // Obsidian export handler
  const handleExportToObsidian = async (options: ObsidianExportOptions) => {
    if (!exportItem) return { success: false, error: 'No item selected' };
    const result = await exportToObsidian(exportItem.id, options);
    if (result.success && result.notePath) {
      // Update the item with the obsidian path
      await updateInterest(exportItem.id, {
        obsidianPath: result.notePath,
        obsidianSyncedAt: new Date().toISOString(),
      });
    }
    return result;
  };

  // Obsidian sync all handler
  const handleSyncAll = async () => {
    setSyncState({
      active: true,
      current: 0,
      total: interests.length,
      currentItem: '',
      status: 'syncing',
    });

    try {
      const result = await syncToObsidian({}, (current, total, itemTitle) => {
        setSyncState((prev) => ({
          ...prev,
          current,
          total,
          currentItem: itemTitle,
        }));
      });

      setSyncState((prev) => ({
        ...prev,
        status: 'complete',
        result: {
          created: result.created,
          skipped: result.skipped,
          failed: result.failed,
        },
      }));
    } catch (err) {
      setSyncState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    }
  };

  const closeSyncProgress = () => {
    setSyncState({
      active: false,
      current: 0,
      total: 0,
      currentItem: '',
      status: 'syncing',
    });
  };

  // Search handlers
  const openSearch = useCallback((initialQuery = '') => {
    setSearchInitialQuery(initialQuery);
    setShowSearchModal(true);
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearchModal(false);
    setSearchInitialQuery('');
  }, []);

  const handleAddFromSearch = useCallback(async (result: SearchResult) => {
    await addInterest({
      url: result.url,
      title: result.title,
      description: result.description,
      thumbnail: result.thumbnail,
      type: result.type === 'video' ? 'youtube' : 'article',
      status: 'backlog',
      tags: [],
    });
  }, [addInterest]);

  const handleFindRelated = useCallback(async (item: InterestItem) => {
    const response = await searchRelated(item.id);
    if (response.success && response.generatedQuery) {
      openSearch(response.generatedQuery);
    }
  }, [openSearch]);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (searchAvailable) {
          openSearch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchAvailable, openSearch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onAddClick={() => setShowAddModal(true)}
        onSearchClick={() => openSearch()}
        onSyncClick={handleSyncAll}
        syncing={syncState.active}
        obsidianConnected={obsidianConnected}
        searchAvailable={searchAvailable}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        availableCategories={availableCategories}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4 text-sm text-gray-500">
          {filteredInterests.length} item{filteredInterests.length !== 1 ? 's' : ''}
          {(typeFilter !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
            <span> (filtered)</span>
          )}
        </div>

        <InterestList
          items={filteredInterests}
          loading={loading}
          error={error}
          onStatusChange={handleStatusChange}
          onDelete={deleteInterest}
          onItemClick={setSelectedItem}
          onExportToObsidian={setExportItem}
          onFindRelated={handleFindRelated}
          obsidianConnected={obsidianConnected}
          searchAvailable={searchAvailable}
        />
      </main>

      <AddInterestModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />

      {selectedItem && (
        <InterestDetail
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={updateInterest}
          onExportToObsidian={() => {
            setExportItem(selectedItem);
            setSelectedItem(null);
          }}
          obsidianConnected={obsidianConnected}
        />
      )}

      {exportItem && (
        <ObsidianExportModal
          item={exportItem}
          isOpen={!!exportItem}
          onClose={() => setExportItem(null)}
          onExport={handleExportToObsidian}
        />
      )}

      <SyncProgress
        isOpen={syncState.active}
        current={syncState.current}
        total={syncState.total}
        currentItem={syncState.currentItem}
        status={syncState.status}
        result={syncState.result}
        error={syncState.error}
        onClose={closeSyncProgress}
      />

      <SearchModal
        isOpen={showSearchModal}
        onClose={closeSearch}
        onAddToInterests={handleAddFromSearch}
        initialQuery={searchInitialQuery}
      />
    </div>
  );
}
