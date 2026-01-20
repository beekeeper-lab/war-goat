import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import { InterestDetail } from '../InterestDetail'
import { createYouTubeItem, createArticleItem, createInterestItem, resetIdCounter } from '../../test/factories/interest'

// Mock API services
vi.mock('../../services/api', () => ({
  fetchTranscript: vi.fn(),
  fetchArticleContent: vi.fn(),
  generateArticleSummary: vi.fn(),
}))

import { fetchTranscript, fetchArticleContent, generateArticleSummary } from '../../services/api'

const mockedFetchTranscript = vi.mocked(fetchTranscript)
const mockedFetchArticleContent = vi.mocked(fetchArticleContent)
const mockedGenerateArticleSummary = vi.mocked(generateArticleSummary)

describe('InterestDetail', () => {
  beforeEach(() => {
    resetIdCounter()
    vi.clearAllMocks()
    mockedFetchTranscript.mockResolvedValue('Test transcript content')
    mockedFetchArticleContent.mockResolvedValue('Test article content')
    mockedGenerateArticleSummary.mockResolvedValue({
      summary: 'Test summary',
      keyPoints: ['Point 1', 'Point 2'],
      mainTheme: 'Test theme',
      suggestedTags: ['tag1', 'tag2'],
      actionItems: [],
    })
  })

  const defaultProps = {
    item: createYouTubeItem({ hasTranscript: true }),
    isOpen: true,
    onClose: vi.fn(),
    onUpdate: vi.fn().mockResolvedValue({}),
  }

  describe('rendering', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(<InterestDetail {...defaultProps} isOpen={false} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders modal when isOpen is true', () => {
      render(<InterestDetail {...defaultProps} />)
      expect(screen.getByRole('heading', { name: defaultProps.item.title })).toBeInTheDocument()
    })

    it('renders item title', () => {
      const item = createYouTubeItem({ title: 'Test Video Title' })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByRole('heading', { name: 'Test Video Title' })).toBeInTheDocument()
    })

    it('renders item type', () => {
      render(<InterestDetail {...defaultProps} />)
      expect(screen.getByText('youtube')).toBeInTheDocument()
    })

    it('renders thumbnail when provided', () => {
      const item = createYouTubeItem({ thumbnail: 'https://example.com/thumb.jpg', title: 'Video' })
      render(<InterestDetail {...defaultProps} item={item} />)
      const img = screen.getByRole('img', { name: 'Video' })
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg')
    })

    it('renders description when provided', () => {
      const item = createYouTubeItem({ description: 'Test description text' })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByText('Test description text')).toBeInTheDocument()
    })

    it('renders author when provided', () => {
      const item = createInterestItem({ author: 'John Author' })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByText('by John Author')).toBeInTheDocument()
    })

    it('renders external link to original', () => {
      render(<InterestDetail {...defaultProps} />)
      expect(screen.getByRole('link', { name: /open original/i })).toBeInTheDocument()
    })

    it('external link has correct href', () => {
      const item = createYouTubeItem({ url: 'https://youtube.com/watch?v=test123' })
      render(<InterestDetail {...defaultProps} item={item} />)
      const link = screen.getByRole('link', { name: /open original/i })
      expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=test123')
      expect(link).toHaveAttribute('target', '_blank')
    })
  })

  describe('form fields', () => {
    it('renders status dropdown with current value', () => {
      const item = createInterestItem({ status: 'in-progress' })
      render(<InterestDetail {...defaultProps} item={item} />)
      const statusSelect = screen.getByRole('combobox')
      expect(statusSelect).toHaveValue('in-progress')
    })

    it('renders tags input with current tags', () => {
      const item = createInterestItem({ tags: ['tag1', 'tag2', 'tag3'] })
      render(<InterestDetail {...defaultProps} item={item} />)
      const tagsInput = screen.getByPlaceholderText('Comma-separated tags')
      expect(tagsInput).toHaveValue('tag1, tag2, tag3')
    })

    it('renders notes textarea with current notes', () => {
      const item = createInterestItem({ notes: 'My test notes' })
      render(<InterestDetail {...defaultProps} item={item} />)
      const notesTextarea = screen.getByPlaceholderText('Add your notes here...')
      expect(notesTextarea).toHaveValue('My test notes')
    })

    it('allows changing status', async () => {
      const { user } = render(<InterestDetail {...defaultProps} />)
      const statusSelect = screen.getByRole('combobox')
      await user.selectOptions(statusSelect, 'completed')
      expect(statusSelect).toHaveValue('completed')
    })

    it('allows typing in notes', async () => {
      const { user } = render(<InterestDetail {...defaultProps} />)
      const notesTextarea = screen.getByPlaceholderText('Add your notes here...')
      await user.clear(notesTextarea)
      await user.type(notesTextarea, 'New notes')
      expect(notesTextarea).toHaveValue('New notes')
    })
  })

  describe('transcript section (YouTube)', () => {
    it('shows transcript toggle when hasTranscript', () => {
      const item = createYouTubeItem({ hasTranscript: true })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByRole('button', { name: /transcript/i })).toBeInTheDocument()
    })

    it('does not show transcript toggle when no transcript', () => {
      const item = createYouTubeItem({ hasTranscript: false, transcript: undefined })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.queryByRole('button', { name: /transcript/i })).not.toBeInTheDocument()
    })

    it('fetches transcript when expanded', async () => {
      const item = createYouTubeItem({ hasTranscript: true, transcript: undefined })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const transcriptToggle = screen.getByRole('button', { name: /transcript/i })
      await user.click(transcriptToggle)

      await waitFor(() => {
        expect(mockedFetchTranscript).toHaveBeenCalledWith(item.id)
      })
    })

    it('shows loading state while fetching', async () => {
      mockedFetchTranscript.mockImplementation(() => new Promise(() => {})) // Never resolves
      const item = createYouTubeItem({ hasTranscript: true, transcript: undefined })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const transcriptToggle = screen.getByRole('button', { name: /transcript/i })
      await user.click(transcriptToggle)

      expect(screen.getByText('Loading transcript...')).toBeInTheDocument()
    })

    it('displays transcript when loaded', async () => {
      mockedFetchTranscript.mockResolvedValue('This is the transcript text')
      const item = createYouTubeItem({ hasTranscript: true, transcript: undefined })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const transcriptToggle = screen.getByRole('button', { name: /transcript/i })
      await user.click(transcriptToggle)

      await waitFor(() => {
        expect(screen.getByText('This is the transcript text')).toBeInTheDocument()
      })
    })

    it('shows transcript unavailable message when fetch fails', async () => {
      mockedFetchTranscript.mockRejectedValue(new Error('Fetch failed'))
      const item = createYouTubeItem({ hasTranscript: true, transcript: undefined })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const transcriptToggle = screen.getByRole('button', { name: /transcript/i })
      await user.click(transcriptToggle)

      await waitFor(() => {
        expect(screen.getByText('Transcript not available')).toBeInTheDocument()
      })
    })

    it('uses existing transcript if already loaded', async () => {
      const item = createYouTubeItem({ hasTranscript: true, transcript: 'Pre-loaded transcript' })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const transcriptToggle = screen.getByRole('button', { name: /transcript/i })
      await user.click(transcriptToggle)

      expect(screen.getByText('Pre-loaded transcript')).toBeInTheDocument()
      expect(mockedFetchTranscript).not.toHaveBeenCalled()
    })
  })

  describe('article content section', () => {
    it('shows article toggle when hasArticleContent', () => {
      const item = createArticleItem({ hasArticleContent: true })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByRole('button', { name: /read article/i })).toBeInTheDocument()
    })

    it('does not show article toggle when no article content', () => {
      const item = createArticleItem({ hasArticleContent: false, articleContent: undefined })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.queryByRole('button', { name: /read article/i })).not.toBeInTheDocument()
    })

    it('fetches content when expanded', async () => {
      const item = createArticleItem({ hasArticleContent: true, articleContent: undefined })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const articleToggle = screen.getByRole('button', { name: /read article/i })
      await user.click(articleToggle)

      await waitFor(() => {
        expect(mockedFetchArticleContent).toHaveBeenCalledWith(item.id)
      })
    })

    it('shows truncation warning when truncated', async () => {
      mockedFetchArticleContent.mockResolvedValue('Article content here')
      const item = createArticleItem({ hasArticleContent: true, truncated: true, articleContent: undefined })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const articleToggle = screen.getByRole('button', { name: /read article/i })
      await user.click(articleToggle)

      await waitFor(() => {
        expect(screen.getByText(/content was truncated/i)).toBeInTheDocument()
      })
    })

    it('displays article content when loaded', async () => {
      mockedFetchArticleContent.mockResolvedValue('Full article content text')
      const item = createArticleItem({ hasArticleContent: true, articleContent: undefined })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const articleToggle = screen.getByRole('button', { name: /read article/i })
      await user.click(articleToggle)

      await waitFor(() => {
        expect(screen.getByText('Full article content text')).toBeInTheDocument()
      })
    })
  })

  describe('AI summary', () => {
    it('shows Generate Summary button for articles', () => {
      const item = createArticleItem({ hasArticleContent: true })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByRole('button', { name: /generate summary/i })).toBeInTheDocument()
    })

    it('does not show Generate Summary for non-articles without article content', () => {
      const item = createYouTubeItem({ hasArticleContent: false })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.queryByRole('button', { name: /generate summary/i })).not.toBeInTheDocument()
    })

    it('calls generateArticleSummary when clicked', async () => {
      const item = createArticleItem({ hasArticleContent: true })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const generateButton = screen.getByRole('button', { name: /generate summary/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(mockedGenerateArticleSummary).toHaveBeenCalledWith(item.id)
      })
    })

    it('shows loading state while generating', async () => {
      mockedGenerateArticleSummary.mockImplementation(() => new Promise(() => {})) // Never resolves
      const item = createArticleItem({ hasArticleContent: true })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const generateButton = screen.getByRole('button', { name: /generate summary/i })
      await user.click(generateButton)

      expect(screen.getByText('Generating...')).toBeInTheDocument()
    })

    it('displays summary when generated', async () => {
      mockedGenerateArticleSummary.mockResolvedValue({
        summary: 'This is the AI generated summary',
        keyPoints: [],
        mainTheme: '',
        suggestedTags: [],
        actionItems: [],
      })
      const item = createArticleItem({ hasArticleContent: true })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const generateButton = screen.getByRole('button', { name: /generate summary/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('This is the AI generated summary')).toBeInTheDocument()
      })
    })

    it('shows key points when available', async () => {
      mockedGenerateArticleSummary.mockResolvedValue({
        summary: 'Summary text',
        keyPoints: ['First key point', 'Second key point'],
        mainTheme: '',
        suggestedTags: [],
        actionItems: [],
      })
      const item = createArticleItem({ hasArticleContent: true })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const generateButton = screen.getByRole('button', { name: /generate summary/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Key Points')).toBeInTheDocument()
        expect(screen.getByText('First key point')).toBeInTheDocument()
        expect(screen.getByText('Second key point')).toBeInTheDocument()
      })
    })

    it('shows suggested tags when available', async () => {
      mockedGenerateArticleSummary.mockResolvedValue({
        summary: 'Summary text',
        keyPoints: [],
        mainTheme: '',
        suggestedTags: ['react', 'typescript'],
        actionItems: [],
      })
      const item = createArticleItem({ hasArticleContent: true })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const generateButton = screen.getByRole('button', { name: /generate summary/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Suggested Tags')).toBeInTheDocument()
        expect(screen.getByText('react')).toBeInTheDocument()
        expect(screen.getByText('typescript')).toBeInTheDocument()
      })
    })

    it('handles generation error', async () => {
      mockedGenerateArticleSummary.mockRejectedValue(new Error('Generation failed'))
      const item = createArticleItem({ hasArticleContent: true })
      const { user } = render(<InterestDetail {...defaultProps} item={item} />)

      const generateButton = screen.getByRole('button', { name: /generate summary/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument()
      })
    })
  })

  describe('save action', () => {
    it('calls onUpdate with form data when Save clicked', async () => {
      const onUpdate = vi.fn().mockResolvedValue({})
      const item = createInterestItem({ status: 'backlog', notes: '', tags: [] })
      const { user } = render(<InterestDetail {...defaultProps} item={item} onUpdate={onUpdate} />)

      // Change status
      const statusSelect = screen.getByRole('combobox')
      await user.selectOptions(statusSelect, 'in-progress')

      // Add notes
      const notesTextarea = screen.getByPlaceholderText('Add your notes here...')
      await user.type(notesTextarea, 'New notes')

      // Add tags
      const tagsInput = screen.getByPlaceholderText('Comma-separated tags')
      await user.type(tagsInput, 'tag1, tag2')

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(item.id, {
          status: 'in-progress',
          notes: 'New notes',
          tags: ['tag1', 'tag2'],
        })
      })
    })

    it('shows saving state', async () => {
      const onUpdate = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
      const { user } = render(<InterestDetail {...defaultProps} onUpdate={onUpdate} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      expect(saveButton).toBeDisabled()
    })

    it('calls onClose after successful save', async () => {
      const onClose = vi.fn()
      const onUpdate = vi.fn().mockResolvedValue({})
      const { user } = render(<InterestDetail {...defaultProps} onClose={onClose} onUpdate={onUpdate} />)

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('handles tags as comma-separated string', async () => {
      const onUpdate = vi.fn().mockResolvedValue({})
      const item = createInterestItem({ tags: [] })
      const { user } = render(<InterestDetail {...defaultProps} item={item} onUpdate={onUpdate} />)

      const tagsInput = screen.getByPlaceholderText('Comma-separated tags')
      await user.type(tagsInput, '  tag1 , tag2 ,  tag3  ')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(
          item.id,
          expect.objectContaining({
            tags: ['tag1', 'tag2', 'tag3'],
          })
        )
      })
    })
  })

  describe('cancel action', () => {
    it('calls onClose when Cancel clicked', async () => {
      const onClose = vi.fn()
      const { user } = render(<InterestDetail {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when X button clicked', async () => {
      const onClose = vi.fn()
      const { user } = render(<InterestDetail {...defaultProps} onClose={onClose} />)

      // X button is the first button with just the icon
      const closeButtons = screen.getAllByRole('button')
      const xButton = closeButtons.find(btn => btn.querySelector('.lucide-x'))
      await user.click(xButton!)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('export to Obsidian', () => {
    it('renders export button when onExportToObsidian provided', () => {
      render(
        <InterestDetail
          {...defaultProps}
          onExportToObsidian={vi.fn()}
        />
      )
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    })

    it('does not render export button when onExportToObsidian not provided', () => {
      render(<InterestDetail {...defaultProps} />)
      // Only should have Cancel and Save Changes buttons (plus close X)
      const exportButton = screen.queryByRole('button', { name: /^export$/i })
      expect(exportButton).not.toBeInTheDocument()
    })

    it('disables export when obsidianConnected false', () => {
      render(
        <InterestDetail
          {...defaultProps}
          onExportToObsidian={vi.fn()}
          obsidianConnected={false}
        />
      )
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toBeDisabled()
    })

    it('enables export when obsidianConnected true', () => {
      render(
        <InterestDetail
          {...defaultProps}
          onExportToObsidian={vi.fn()}
          obsidianConnected={true}
        />
      )
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).not.toBeDisabled()
    })

    it('calls onExportToObsidian when clicked', async () => {
      const onExportToObsidian = vi.fn()
      const { user } = render(
        <InterestDetail
          {...defaultProps}
          onExportToObsidian={onExportToObsidian}
          obsidianConnected={true}
        />
      )

      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)

      expect(onExportToObsidian).toHaveBeenCalled()
    })
  })

  describe('article metadata', () => {
    it('renders site name when provided', () => {
      const item = createArticleItem({ siteName: 'Tech Blog' })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByText('Tech Blog')).toBeInTheDocument()
    })

    it('renders reading time when provided', () => {
      const item = createArticleItem({ readingTime: 5 })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByText('5 min read')).toBeInTheDocument()
    })

    it('renders word count when provided', () => {
      const item = createArticleItem({ wordCount: 1500 })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByText('1,500 words')).toBeInTheDocument()
    })

    it('renders documentation badge when isDocumentation', () => {
      const item = createArticleItem({ isDocumentation: true })
      render(<InterestDetail {...defaultProps} item={item} />)
      expect(screen.getByText('Documentation')).toBeInTheDocument()
    })
  })
})
