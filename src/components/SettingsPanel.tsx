import { useState, useRef } from 'react';
import { X, Sun, Moon, Monitor, Grid, List, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import { usePatterns } from '../hooks/usePatterns';
import type { ThemeSetting, ViewMode, SortOrder } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    preferences,
    updatePreferences,
    exportData,
    importData,
    clearAllData,
  } = usePreferences();
  const { patterns, isTrackingEnabled, getTopTags, getTopTypes } = usePatterns();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleThemeChange = (theme: ThemeSetting) => {
    updatePreferences({ theme });
  };

  const handleViewChange = (defaultView: ViewMode) => {
    updatePreferences({ defaultView });
  };

  const handleSortChange = (defaultSort: SortOrder) => {
    updatePreferences({ defaultSort });
  };

  const handleTrackingChange = (trackPatterns: boolean) => {
    updatePreferences({
      privacy: { ...preferences.privacy, trackPatterns },
    });
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `war-goat-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      setImportError(null);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const handleClearData = async () => {
    await clearAllData();
    setShowClearConfirm(false);
    onClose();
  };

  const topTags = getTopTags(5);
  const topTypes = getTopTypes(3);

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Theme */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Theme</h3>
            <div className="flex gap-2">
              {[
                { value: 'light' as ThemeSetting, icon: Sun, label: 'Light' },
                { value: 'dark' as ThemeSetting, icon: Moon, label: 'Dark' },
                { value: 'system' as ThemeSetting, icon: Monitor, label: 'System' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    preferences.theme === value
                      ? 'bg-olive-100 border-olive-500 text-olive-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Default View */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Default View</h3>
            <div className="flex gap-2">
              {[
                { value: 'grid' as ViewMode, icon: Grid, label: 'Grid' },
                { value: 'list' as ViewMode, icon: List, label: 'List' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => handleViewChange(value)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    preferences.defaultView === value
                      ? 'bg-olive-100 border-olive-500 text-olive-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Default Sort */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Default Sort</h3>
            <select
              value={preferences.defaultSort}
              onChange={(e) => handleSortChange(e.target.value as SortOrder)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
            >
              <option value="date">Date Added</option>
              <option value="title">Title</option>
              <option value="status">Status</option>
            </select>
          </section>

          {/* Privacy Settings */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Privacy</h3>
            <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={preferences.privacy.trackPatterns}
                onChange={(e) => handleTrackingChange(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-olive-600 focus:ring-olive-500"
              />
              <div>
                <span className="font-medium text-gray-900">Smart Suggestions</span>
                <p className="text-sm text-gray-500">
                  Track usage patterns to provide personalized suggestions
                </p>
              </div>
            </label>
          </section>

          {/* Your Patterns */}
          {isTrackingEnabled && (topTags.length > 0 || topTypes.length > 0) && (
            <section>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Your Patterns</h3>
              <div className="bg-olive-50 border border-olive-200 rounded-lg p-4 space-y-3">
                {topTags.length > 0 && (
                  <div>
                    <p className="text-xs text-olive-600 mb-1">Most used tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {topTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-olive-100 text-olive-700 rounded-full"
                        >
                          {tag} ({patterns.tagFrequency[tag]})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {topTypes.length > 0 && (
                  <div>
                    <p className="text-xs text-olive-600 mb-1">Content types:</p>
                    <div className="flex flex-wrap gap-1">
                      {topTypes.map((type) => (
                        <span
                          key={type}
                          className="px-2 py-0.5 text-xs bg-olive-100 text-olive-700 rounded-full capitalize"
                        >
                          {type} ({patterns.typeFrequency[type]})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Export/Import */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Data Management</h3>
            <div className="space-y-2">
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              {importError && (
                <p className="text-sm text-red-600">{importError}</p>
              )}
            </div>
          </section>

          {/* Clear Data */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Danger Zone</h3>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Are you sure?</p>
                    <p className="text-sm text-red-600">
                      This will permanently delete all your preferences, patterns, and goals.
                      This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Everything
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
