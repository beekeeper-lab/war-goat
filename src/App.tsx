import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { InterestList } from './components/InterestList';
import { AddInterestModal } from './components/AddInterestModal';
import { InterestDetail } from './components/InterestDetail';
import { useInterests } from './hooks/useInterests';
import type { InterestItem, SourceType, ItemStatus, EnrichedCreateInput } from './types';

export default function App() {
  const {
    interests,
    loading,
    error,
    addInterest,
    updateInterest,
    deleteInterest,
  } = useInterests();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InterestItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SourceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAddClick={() => setShowAddModal(true)} />

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
        />
      )}
    </div>
  );
}
