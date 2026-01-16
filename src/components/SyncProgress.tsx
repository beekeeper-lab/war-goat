import { Loader2, CheckCircle2, XCircle, X } from 'lucide-react';

interface SyncProgressProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentItem: string;
  status: 'syncing' | 'complete' | 'error';
  result?: {
    created: number;
    skipped: number;
    failed: number;
  };
  error?: string;
  onClose: () => void;
}

/**
 * Full-screen overlay showing sync progress
 * Displays progress bar and current item being synced
 */
export function SyncProgress({
  isOpen,
  current,
  total,
  currentItem,
  status,
  result,
  error,
  onClose,
}: SyncProgressProps) {
  if (!isOpen) return null;

  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {status === 'syncing' && 'Syncing to Obsidian...'}
            {status === 'complete' && 'Sync Complete'}
            {status === 'error' && 'Sync Failed'}
          </h2>
          {status !== 'syncing' && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Syncing State */}
        {status === 'syncing' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              <span className="text-sm text-gray-600 truncate flex-1">
                {currentItem || 'Preparing...'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{current} of {total}</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Complete State */}
        {status === 'complete' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-medium">All items processed</span>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.created}</div>
                <div className="text-xs text-gray-500">Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{result.skipped}</div>
                <div className="text-xs text-gray-500">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Done
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <XCircle className="w-6 h-6" />
              <span className="font-medium">Sync failed</span>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error || 'An unknown error occurred'}
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncProgress;
