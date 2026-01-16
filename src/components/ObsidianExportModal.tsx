import { useState } from 'react';
import { X, FileDown, AlertTriangle, Loader2 } from 'lucide-react';
import type { InterestItem, ObsidianExportOptions } from '../types';
import { useObsidianSettings } from '../hooks/useObsidianSettings';

interface ObsidianExportModalProps {
  item: InterestItem;
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ObsidianExportOptions) => Promise<{ success: boolean; existed?: boolean; error?: string }>;
}

/**
 * Modal dialog for exporting an interest to Obsidian
 * Shows options and handles duplicate detection
 */
export function ObsidianExportModal({
  item,
  isOpen,
  onClose,
  onExport,
}: ObsidianExportModalProps) {
  const { settings } = useObsidianSettings();
  const [folder, setFolder] = useState(settings.defaultFolder);
  const [generateStudyNotes, setGenerateStudyNotes] = useState(settings.generateStudyNotes);
  const [includeTranscript, setIncludeTranscript] = useState(settings.includeTranscript);
  const [forceOverwrite, setForceOverwrite] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await onExport({
        folder,
        generateStudyNotes,
        includeTranscript,
        forceOverwrite,
      });

      if (result.success) {
        onClose();
      } else if (result.existed && !forceOverwrite) {
        setShowDuplicateWarning(true);
      } else {
        setError(result.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOverwrite = async () => {
    setForceOverwrite(true);
    setShowDuplicateWarning(false);
    // Re-trigger export with forceOverwrite
    setLoading(true);
    try {
      const result = await onExport({
        folder,
        generateStudyNotes,
        includeTranscript,
        forceOverwrite: true,
      });

      if (result.success) {
        onClose();
      } else {
        setError(result.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-purple-600" />
            <span className="font-medium">Export to Obsidian</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Export <strong>{item.title}</strong> to your Obsidian vault
            </p>
          </div>

          {/* Duplicate Warning */}
          {showDuplicateWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Note already exists
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  A note for this item already exists in Obsidian. Do you want to overwrite it?
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleOverwrite}
                    disabled={loading}
                    className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50"
                  >
                    Overwrite
                  </button>
                  <button
                    onClick={() => setShowDuplicateWarning(false)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Options */}
          {!showDuplicateWarning && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder
                </label>
                <input
                  type="text"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="War Goat"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="space-y-3">
                {item.hasTranscript && (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTranscript}
                        onChange={(e) => setIncludeTranscript(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Include transcript</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generateStudyNotes}
                        onChange={(e) => setGenerateStudyNotes(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">
                        Generate AI study notes
                        <span className="text-gray-400 ml-1">(summary, key concepts)</span>
                      </span>
                    </label>
                  </>
                )}

                {item.obsidianPath && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceOverwrite}
                      onChange={(e) => setForceOverwrite(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Overwrite existing note</span>
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!showDuplicateWarning && (
          <div className="flex gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ObsidianExportModal;
