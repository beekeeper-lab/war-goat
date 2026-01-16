import { useState, useEffect, useCallback } from 'react';
import type { ObsidianStatus } from '../types';

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * Hook for monitoring Obsidian connection status
 * Polls the status endpoint at regular intervals
 */
export function useObsidianStatus() {
  const [status, setStatus] = useState<ObsidianStatus>({
    connected: false,
  });
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/obsidian/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setStatus({ connected: false, error: 'Failed to check status' });
      }
    } catch (err) {
      setStatus({
        connected: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  // Initial check and polling
  useEffect(() => {
    checkStatus();

    const interval = setInterval(checkStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    setLoading(true);
    await checkStatus();
  }, [checkStatus]);

  return {
    status,
    loading,
    lastChecked,
    refresh,
    isConnected: status.connected,
  };
}

export default useObsidianStatus;
