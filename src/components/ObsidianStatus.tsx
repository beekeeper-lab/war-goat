import { useObsidianStatus } from '../hooks/useObsidianStatus';
import { Loader2 } from 'lucide-react';

/**
 * Obsidian connection status indicator
 * Shows green dot when connected, red when disconnected
 */
export function ObsidianStatus() {
  const { status, loading, isConnected } = useObsidianStatus();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking Obsidian...</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 text-sm"
      title={status.error || (isConnected ? `Connected to ${status.vaultName}` : 'Not connected')}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
        {isConnected ? 'Obsidian' : 'Offline'}
      </span>
    </div>
  );
}

export default ObsidianStatus;
