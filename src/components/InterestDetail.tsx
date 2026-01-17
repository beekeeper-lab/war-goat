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
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import type { InterestItem, ItemStatus, UpdateInterestInput, ArticleSummary } from '../types';
import { fetchTranscript, fetchArticleContent, generateArticleSummary } from '../services/api';

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
  // Article state
  const [articleExpanded, setArticleExpanded] = useState(false);
  const [articleContent, setArticleContent] = useState<string | null>(item.articleContent || null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [summary, setSummary] = useState<ArticleSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const TypeIcon = TYPE_ICONS[item.type];
  const hasTranscript = item.hasTranscript || item.transcript;
  const hasArticleContent = item.hasArticleContent || item.articleContent;

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

  // Fetch article content on-demand when expanded
  useEffect(() => {
    if (articleExpanded && !articleContent && hasArticleContent) {
      setArticleLoading(true);
      fetchArticleContent(item.id)
        .then((data) => {
          setArticleContent(data);
        })
        .catch((err) => {
          console.error('Failed to fetch article content:', err);
        })
        .finally(() => {
          setArticleLoading(false);
        });
    }
  }, [articleExpanded, articleContent, hasArticleContent, item.id]);

  // Handle generating AI summary
  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await generateArticleSummary(item.id);
      setSummary(result);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

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
            {/* Article metadata */}
            {(item.siteName || item.readingTime || item.wordCount) && (
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                {item.siteName && (
                  <span>{item.siteName}</span>
                )}
                {item.readingTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.readingTime} min read
                  </span>
                )}
                {item.wordCount && (
                  <span>{item.wordCount.toLocaleString()} words</span>
                )}
                {item.isDocumentation && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    Documentation
                  </span>
                )}
              </div>
            )}
          </div>

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

            {/* Article Reader Section */}
            {hasArticleContent && (
              <div className="rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setArticleExpanded(!articleExpanded)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Read Article
                  </span>
                  {articleExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {articleExpanded && (
                  <div className="border-t border-gray-200">
                    {articleLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Loading article content...</span>
                      </div>
                    ) : articleContent ? (
                      <div className="p-4 max-h-96 overflow-y-auto">
                        <div className="prose prose-sm prose-gray max-w-none">
                          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {articleContent}
                          </p>
                        </div>
                        {item.truncated && (
                          <div className="mt-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
                            Content was truncated. The original article may be longer.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4">
                        <p className="text-sm text-gray-500 italic">Article content not available</p>
                        {item.articleError && (
                          <p className="text-sm text-red-600 mt-2">{item.articleError}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI Summary Section */}
            {hasArticleContent && (
              <div className="rounded-lg border border-gray-200">
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Summary
                    </span>
                    {!summary && (
                      <button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={summaryLoading}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 flex items-center gap-1"
                      >
                        {summaryLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Generate Summary'
                        )}
                      </button>
                    )}
                  </div>
                  {summaryError && (
                    <p className="text-sm text-red-600 mt-2">{summaryError}</p>
                  )}
                  {summary && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-sm text-gray-700">{summary.summary}</p>
                      </div>
                      {summary.keyPoints && summary.keyPoints.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Key Points</h4>
                          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                            {summary.keyPoints.map((point, i) => (
                              <li key={i}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {summary.suggestedTags && summary.suggestedTags.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Suggested Tags</h4>
                          <div className="flex flex-wrap gap-1">
                            {summary.suggestedTags.map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
