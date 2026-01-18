import { useState, useEffect, useCallback } from 'react';
import type { BraveSearchStatus } from '../types';
import { getSearchStatus } from '../services/api';

/**
 * Hook to check Brave Search availability
 * Polls status periodically like useObsidianStatus
 */
export function useSearchStatus(pollInterval = 30000) {
  const [status, setStatus] = useState<BraveSearchStatus>({ available: false });
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const result = await getSearchStatus();
      setStatus(result);
    } catch {
      setStatus({ available: false, error: 'Failed to check status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, pollInterval);
    return () => clearInterval(interval);
  }, [checkStatus, pollInterval]);

  return {
    isAvailable: status.available,
    error: status.error,
    loading,
    refresh: checkStatus,
  };
}

export default useSearchStatus;
