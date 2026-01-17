import { useState, useCallback } from 'react';
import { X, Loader2, Sparkles, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import type { EnrichedCreateInput, SourceType, ItemStatus, SeriesInfo } from '../types';
import { detectSourceType } from '../types';
import { enrichUrl, isYouTubeUrl, isArticleUrl } from '../services/enrich';

interface AddInterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (input: EnrichedCreateInput) => Promise<void>;
}

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'book', label: 'Book' },
  { value: 'audiobook', label: 'Audiobook' },
  { value: 'article', label: 'Article' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'github', label: 'GitHub' },
  { value: 'other', label: 'Other' },
];

type EnrichStatus = 'idle' | 'loading' | 'success' | 'error';

export function AddInterestModal({ isOpen, onClose, onAdd }: AddInterestModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<SourceType>('other');
  const [status, setStatus] = useState<ItemStatus>('backlog');
  const [tags, setTags] = useState('');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [author, setAuthor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrichStatus, setEnrichStatus] = useState<EnrichStatus>('idle');
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);
  // Article-specific state
  const [articleContent, setArticleContent] = useState<string | null>(null);
  const [excerpt, setExcerpt] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [readingTime, setReadingTime] = useState<number | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [publishedDate, setPublishedDate] = useState<string | null>(null);
  const [isDocumentation, setIsDocumentation] = useState(false);
  const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
  const [truncated, setTruncated] = useState(false);

  const resetForm = useCallback(() => {
    setUrl('');
    setTitle('');
    setDescription('');
    setType('other');
    setStatus('backlog');
    setTags('');
    setTranscript(null);
    setThumbnail(null);
    setAuthor('');
    setError(null);
    setEnrichStatus('idle');
    setEnrichMessage(null);
    // Reset article-specific state
    setArticleContent(null);
    setExcerpt(null);
    setWordCount(null);
    setReadingTime(null);
    setSiteName(null);
    setPublishedDate(null);
    setIsDocumentation(false);
    setSeriesInfo(null);
    setTruncated(false);
  }, []);

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl);

    if (!newUrl) {
      setEnrichStatus('idle');
      return;
    }

    const detectedType = detectSourceType(newUrl);
    setType(detectedType);

    // Auto-enrich YouTube URLs
    if (isYouTubeUrl(newUrl) && newUrl.length > 20) {
      setEnrichStatus('loading');
      setEnrichMessage('Fetching video info & transcript...');

      try {
        const result = await enrichUrl(newUrl);

        if (result.success && result.data) {
          setTitle(result.data.title || '');
          setAuthor(result.data.author || result.data.channelName || '');
          setThumbnail(result.data.thumbnail || null);

          if (result.data.transcript) {
            setTranscript(result.data.transcript);
            setEnrichStatus('success');
            setEnrichMessage('Video info & transcript loaded!');
          } else if (result.data.transcriptError) {
            setEnrichStatus('success');
            setEnrichMessage(`Video info loaded. Transcript: ${result.data.transcriptError}`);
          } else {
            setEnrichStatus('success');
            setEnrichMessage('Video info loaded (no transcript available)');
          }
        } else {
          setEnrichStatus('error');
          setEnrichMessage(result.error || 'Failed to enrich URL');
        }
      } catch (err) {
        setEnrichStatus('error');
        setEnrichMessage(err instanceof Error ? err.message : 'Enrichment failed');
      }
    }
    // Auto-enrich article URLs
    else if (isArticleUrl(newUrl) && newUrl.length > 10) {
      setEnrichStatus('loading');
      setEnrichMessage('Extracting content...');

      try {
        const result = await enrichUrl(newUrl);

        if (result.success && result.data) {
          setTitle(result.data.title || '');
          setAuthor(result.data.author || '');
          setThumbnail(result.data.thumbnail || null);
          setSiteName(result.data.siteName || null);
          setPublishedDate(result.data.publishedDate || null);

          if (result.data.articleContent) {
            setArticleContent(result.data.articleContent);
            setExcerpt(result.data.excerpt || null);
            setWordCount(result.data.wordCount || null);
            setReadingTime(result.data.readingTime || null);
            setIsDocumentation(result.data.isDocumentation || false);
            setSeriesInfo(result.data.seriesInfo || null);
            setTruncated(result.data.truncated || false);

            const readingInfo = result.data.readingTime ? ` (${result.data.readingTime} min read)` : '';
            setEnrichStatus('success');
            setEnrichMessage(`Article extracted${readingInfo}`);
          } else if (result.data.articleError) {
            setEnrichStatus('error');
            setEnrichMessage(result.data.articleError);
          } else {
            setEnrichStatus('success');
            setEnrichMessage('Article metadata loaded (content not available)');
          }
        } else {
          setEnrichStatus('error');
          setEnrichMessage(result.error || 'Failed to extract article');
        }
      } catch (err) {
        setEnrichStatus('error');
        setEnrichMessage(err instanceof Error ? err.message : 'Extraction failed');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const input: EnrichedCreateInput = {
        url: url.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        type,
        status,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        // Include YouTube enriched data
        transcript: transcript || undefined,
        thumbnail: thumbnail || undefined,
        author: author || undefined,
        // Include article enriched data
        articleContent: articleContent || undefined,
        excerpt: excerpt || undefined,
        wordCount: wordCount || undefined,
        readingTime: readingTime || undefined,
        siteName: siteName || undefined,
        publishedDate: publishedDate || undefined,
        isDocumentation: isDocumentation || undefined,
        seriesInfo: seriesInfo || undefined,
        truncated: truncated || undefined,
      };

      await onAdd(input);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add interest');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Add New Interest</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Paste a YouTube or article URL to auto-extract content
            </p>

            {/* Enrich status indicator */}
            {enrichStatus !== 'idle' && (
              <div
                className={`mt-2 p-2 rounded-lg text-sm flex items-center gap-2 ${
                  enrichStatus === 'loading'
                    ? 'bg-blue-50 text-blue-700'
                    : enrichStatus === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {enrichStatus === 'loading' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {enrichStatus === 'success' && (
                  <CheckCircle className="w-4 h-4" />
                )}
                {enrichStatus === 'error' && (
                  <AlertCircle className="w-4 h-4" />
                )}
                {enrichMessage}
              </div>
            )}
          </div>

          {/* Thumbnail preview */}
          {thumbnail && (
            <div className="relative">
              <img
                src={thumbnail}
                alt="Thumbnail"
                className="w-full h-40 object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Auto-fetched
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SourceType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ItemStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              >
                <option value="backlog">Backlog</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title {title && enrichStatus === 'success' && <span className="text-green-600 text-xs">(auto-filled)</span>}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-filled from URL content"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            />
          </div>

          {/* Article metadata row */}
          {(siteName || wordCount) && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {siteName && (
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {siteName}
                </span>
              )}
              {readingTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {readingTime} min read
                </span>
              )}
              {wordCount && (
                <span className="text-gray-400">
                  {wordCount.toLocaleString()} words
                </span>
              )}
              {isDocumentation && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                  Documentation
                </span>
              )}
            </div>
          )}

          {author && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author/Channel <span className="text-green-600 text-xs">(auto-filled)</span>
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="programming, ai, productivity (comma-separated)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            />
          </div>

          {/* Transcript preview */}
          {transcript && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transcript <span className="text-green-600 text-xs">(auto-fetched via MCP)</span>
              </label>
              <div className="bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-6">
                  {transcript.slice(0, 500)}
                  {transcript.length > 500 && '...'}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {transcript.length.toLocaleString()} characters
              </p>
            </div>
          )}

          {/* Article excerpt preview */}
          {excerpt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Excerpt <span className="text-green-600 text-xs">(auto-extracted)</span>
              </label>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 line-clamp-4">
                  {excerpt}
                </p>
              </div>
              {truncated && (
                <p className="text-xs text-amber-600 mt-1">
                  Content was truncated (original exceeds 100KB)
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || enrichStatus === 'loading'}
              className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Interest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
