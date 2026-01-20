import { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  Save,
  Youtube,
  Book,
  Headphones,
  FileText,
  Podcast,
  Github,
  Link,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileDown,
  Star,
  GitFork,
  Circle,
} from 'lucide-react';
import type { InterestItem, ItemStatus, UpdateInterestInput } from '../types';
import { fetchTranscript } from '../services/api';

interface InterestDetailProps {
  item: InterestItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateInterestInput) => Promise<InterestItem>;
  onExportToObsidian?: () => void;
  obsidianConnected?: boolean;
}

const TYPE_ICONS = {
  youtube: Youtube,
  book: Book,
  audiobook: Headphones,
  article: FileText,
  podcast: Podcast,
  github: Github,
  other: Link,
};

// Language colors matching GitHub's language colors
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
};

function formatStarCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

export function InterestDetail({
  item,
  isOpen,
  onClose,
  onUpdate,
  onExportToObsidian,
  obsidianConnected = false,
}: InterestDetailProps) {
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [notes, setNotes] = useState(item.notes || '');
  const [tags, setTags] = useState(item.tags.join(', '));
  const [saving, setSaving] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(item.transcript || null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // GitHub README state
  const [readmeExpanded, setReadmeExpanded] = useState(false);

  const TypeIcon = TYPE_ICONS[item.type];
  const hasTranscript = item.hasTranscript || item.transcript;
  const hasReadme = item.hasReadme || item.readme;

  // Fetch transcript on-demand when expanded
  useEffect(() => {
    if (transcriptExpanded && !transcript && hasTranscript) {
      setTranscriptLoading(true);
      fetchTranscript(item.id)
        .then((data) => {
          setTranscript(data);
        })
        .catch((err) => {
          console.error('Failed to fetch transcript:', err);
        })
        .finally(() => {
          setTranscriptLoading(false);
        });
    }
  }, [transcriptExpanded, transcript, hasTranscript, item.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, {
        status,
        notes,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-500 capitalize">{item.type}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {item.thumbnail && (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
            {item.author && (
              <p className="text-gray-600 mt-1">by {item.author}</p>
            )}
          </div>

          {/* GitHub Stats */}
          {item.type === 'github' && item.stars !== undefined && (
            <div className="flex items-center gap-4 text-sm bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-gray-700">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-medium">{formatStarCount(item.stars)}</span>
              </div>
              {item.forks !== undefined && item.forks > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <GitFork className="w-4 h-4" />
                  <span>{formatStarCount(item.forks)}</span>
                </div>
              )}
              {item.language && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Circle
                    className="w-3 h-3"
                    style={{
                      fill: LANGUAGE_COLORS[item.language] || '#858585',
                      color: LANGUAGE_COLORS[item.language] || '#858585',
                    }}
                  />
                  <span>{item.language}</span>
                </div>
              )}
              {item.license && (
                <span className="text-gray-500">{item.license}</span>
              )}
            </div>
          )}

          {/* GitHub Topics */}
          {item.type === 'github' && item.topics && item.topics.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.topics.map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {item.description && (
            <p className="text-gray-700">{item.description}</p>
          )}

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-olive-600 hover:text-olive-800"
          >
            <ExternalLink className="w-4 h-4" />
            Open original
          </a>

          <div className="border-t border-gray-200 pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
              >
                <option value="backlog">Backlog</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated tags"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Add your notes here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500"
              />
            </div>

            {hasTranscript && (
              <div className="rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700">Transcript</span>
                  {transcriptExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {transcriptExpanded && (
                  <div className="bg-gray-50 p-3 rounded-b-lg max-h-48 overflow-y-auto border-t border-gray-200">
                    {transcriptLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Loading transcript...</span>
                      </div>
                    ) : transcript ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {transcript}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Transcript not available</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* GitHub README */}
            {item.type === 'github' && hasReadme && (
              <div className="rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setReadmeExpanded(!readmeExpanded)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700">README</span>
                  {readmeExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {readmeExpanded && (
                  <div className="bg-gray-50 p-3 rounded-b-lg max-h-64 overflow-y-auto border-t border-gray-200">
                    {item.readme ? (
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {item.readme}
                      </pre>
                    ) : (
                      <p className="text-sm text-gray-500 italic">README not available</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            {onExportToObsidian && (
              <button
                onClick={onExportToObsidian}
                disabled={!obsidianConnected}
                className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 disabled:opacity-50 flex items-center gap-2"
                title={obsidianConnected ? 'Export to Obsidian' : 'Obsidian not connected'}
              >
                <FileDown className="w-4 h-4" />
                Export
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
