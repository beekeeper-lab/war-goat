import { useState, useEffect, useCallback } from 'react';
import type { InterestItem, EnrichedCreateInput, UpdateInterestInput } from '../types';
import * as api from '../services/api';

export function useInterests() {
  const [interests, setInterests] = useState<InterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInterests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.fetchInterests();
      setInterests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  const addInterest = async (input: EnrichedCreateInput) => {
    const newItem = await api.createInterest(input);
    setInterests((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateInterest = async (id: string, input: UpdateInterestInput) => {
    const updated = await api.updateInterest(id, input);
    setInterests((prev) =>
      prev.map((item) => (item.id === id ? updated : item))
    );
    return updated;
  };

  const deleteInterest = async (id: string) => {
    await api.deleteInterest(id);
    setInterests((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    interests,
    loading,
    error,
    refresh: loadInterests,
    addInterest,
    updateInterest,
    deleteInterest,
  };
}
