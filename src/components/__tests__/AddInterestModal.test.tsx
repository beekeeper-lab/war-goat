import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import { AddInterestModal } from '../AddInterestModal'

// Mock enrich service
vi.mock('../../services/enrich', () => ({
  enrichUrl: vi.fn(),
  isYouTubeUrl: vi.fn(),
  isArticleUrl: vi.fn(),
}))

// Mock detectSourceType
vi.mock('../../types', async () => {
  const actual = await vi.importActual('../../types')
  return {
    ...actual,
    detectSourceType: vi.fn().mockReturnValue('other'),
  }
})

import { enrichUrl, isYouTubeUrl, isArticleUrl } from '../../services/enrich'
import { detectSourceType } from '../../types'

const mockedEnrichUrl = vi.mocked(enrichUrl)
const mockedIsYouTubeUrl = vi.mocked(isYouTubeUrl)
const mockedIsArticleUrl = vi.mocked(isArticleUrl)
const mockedDetectSourceType = vi.mocked(detectSourceType)

describe('AddInterestModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedIsYouTubeUrl.mockReturnValue(false)
    mockedIsArticleUrl.mockReturnValue(false)
    mockedDetectSourceType.mockReturnValue('other')
  })

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
  }

  describe('rendering', () => {
    it('returns null when isOpen is false', () => {
      const { container } = render(<AddInterestModal {...defaultProps} isOpen={false} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders modal when isOpen is true', () => {
      render(<AddInterestModal {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'Add New Interest' })).toBeInTheDocument()
    })

    it('renders URL input as required', () => {
      render(<AddInterestModal {...defaultProps} />)
      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      expect(urlInput).toBeRequired()
    })

    it('renders type dropdown', () => {
      render(<AddInterestModal {...defaultProps} />)
      const typeSelect = screen.getAllByRole('combobox')[0]
      expect(typeSelect).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'YouTube' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Book' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Article' })).toBeInTheDocument()
    })

    it('renders status dropdown', () => {
      render(<AddInterestModal {...defaultProps} />)
      const selects = screen.getAllByRole('combobox')
      const statusSelect = selects[1]
      expect(statusSelect).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Backlog' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'In Progress' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Completed' })).toBeInTheDocument()
    })

    it('renders title input', () => {
      render(<AddInterestModal {...defaultProps} />)
      expect(screen.getByPlaceholderText('Auto-filled from URL content')).toBeInTheDocument()
    })

    it('renders description textarea', () => {
      render(<AddInterestModal {...defaultProps} />)
      expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument()
    })

    it('renders tags input', () => {
      render(<AddInterestModal {...defaultProps} />)
      expect(screen.getByPlaceholderText(/comma-separated/i)).toBeInTheDocument()
    })

    it('renders Cancel and Add Interest buttons', () => {
      render(<AddInterestModal {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add interest/i })).toBeInTheDocument()
    })
  })

  describe('URL input', () => {
    it('URL input is required', () => {
      render(<AddInterestModal {...defaultProps} />)
      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      expect(urlInput).toBeRequired()
      expect(urlInput).toHaveValue('')
    })

    it('auto-detects type from URL', async () => {
      mockedDetectSourceType.mockReturnValue('youtube')
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abc')

      const typeSelect = screen.getAllByRole('combobox')[0]
      expect(typeSelect).toHaveValue('youtube')
    })
  })

  describe('YouTube URL enrichment', () => {
    beforeEach(() => {
      mockedIsYouTubeUrl.mockReturnValue(true)
      mockedDetectSourceType.mockReturnValue('youtube')
    })

    it('triggers enrichment for YouTube URLs', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'youtube',
        data: { title: 'Test Video', channelName: 'Test Channel' },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        expect(mockedEnrichUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=abcdefghijk')
      })
    })

    it('shows loading state during enrichment', async () => {
      mockedEnrichUrl.mockImplementation(() => new Promise(() => {})) // Never resolves
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        expect(screen.getByText(/fetching video info/i)).toBeInTheDocument()
      })
    })

    it('populates title from enriched data', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'youtube',
        data: { title: 'Auto-Filled Video Title', channelName: 'Channel' },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        const titleInput = screen.getByPlaceholderText('Auto-filled from URL content')
        expect(titleInput).toHaveValue('Auto-Filled Video Title')
      })
    })

    it('populates author from enriched data', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'youtube',
        data: { title: 'Video', author: 'Video Author', channelName: 'Channel Name' },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        expect(screen.getByText('Author/Channel')).toBeInTheDocument()
        // Author field should be visible with the value
        const authorInput = screen.getByDisplayValue('Video Author')
        expect(authorInput).toBeInTheDocument()
      })
    })

    it('shows thumbnail preview', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'youtube',
        data: { title: 'Video', thumbnail: 'https://img.youtube.com/vi/abc/maxres.jpg' },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        const img = screen.getByRole('img', { name: 'Thumbnail' })
        expect(img).toHaveAttribute('src', 'https://img.youtube.com/vi/abc/maxres.jpg')
      })
    })

    it('shows transcript preview', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'youtube',
        data: {
          title: 'Video',
          transcript: 'This is the video transcript content that was auto-fetched.',
        },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        // Look for the transcript text content
        expect(screen.getByText(/video transcript content/i)).toBeInTheDocument()
      })
    })

    it('handles enrichment error', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: false,
        type: 'youtube',
        data: {},
        error: 'Video not found',
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        expect(screen.getByText('Video not found')).toBeInTheDocument()
      })
    })

    it('shows success message when transcript available', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'youtube',
        data: { title: 'Video', transcript: 'Transcript content' },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        expect(screen.getByText(/video info & transcript loaded/i)).toBeInTheDocument()
      })
    })
  })

  describe('article URL enrichment', () => {
    beforeEach(() => {
      mockedIsArticleUrl.mockReturnValue(true)
      mockedIsYouTubeUrl.mockReturnValue(false)
      mockedDetectSourceType.mockReturnValue('article')
    })

    it('triggers enrichment for article URLs', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'article',
        data: { title: 'Article Title' },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://blog.example.com/post')

      await waitFor(() => {
        expect(mockedEnrichUrl).toHaveBeenCalledWith('https://blog.example.com/post')
      })
    })

    it('shows reading time and word count', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'article',
        data: {
          title: 'Article',
          articleContent: 'Content here',
          readingTime: 5,
          wordCount: 1000,
          siteName: 'Tech Blog',
        },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://blog.example.com/post')

      await waitFor(() => {
        expect(screen.getByText('5 min read')).toBeInTheDocument()
        expect(screen.getByText('1,000 words')).toBeInTheDocument()
        expect(screen.getByText('Tech Blog')).toBeInTheDocument()
      })
    })

    it('shows article excerpt', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'article',
        data: {
          title: 'Article',
          articleContent: 'Full content',
          excerpt: 'This is the article excerpt preview.',
        },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://blog.example.com/post')

      await waitFor(() => {
        expect(screen.getByText('Article Excerpt')).toBeInTheDocument()
        expect(screen.getByText('This is the article excerpt preview.')).toBeInTheDocument()
      })
    })

    it('shows truncation warning when applicable', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'article',
        data: {
          title: 'Article',
          articleContent: 'Content',
          excerpt: 'Excerpt text',
          truncated: true,
        },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://blog.example.com/post')

      await waitFor(() => {
        expect(screen.getByText(/content was truncated/i)).toBeInTheDocument()
      })
    })

    it('shows documentation badge when applicable', async () => {
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'article',
        data: {
          title: 'API Docs',
          articleContent: 'Content',
          isDocumentation: true,
          siteName: 'Docs Site',
        },
      })
      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://docs.example.com/api')

      await waitFor(() => {
        expect(screen.getByText('Documentation')).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('calls onAdd with form data', async () => {
      const onAdd = vi.fn().mockResolvedValue(undefined)
      const { user } = render(<AddInterestModal {...defaultProps} onAdd={onAdd} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://example.com/page')

      const titleInput = screen.getByPlaceholderText('Auto-filled from URL content')
      await user.type(titleInput, 'Test Title')

      const addButton = screen.getByRole('button', { name: /add interest/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'https://example.com/page',
            title: 'Test Title',
          })
        )
      })
    })

    it('includes enriched data in submission', async () => {
      mockedIsYouTubeUrl.mockReturnValue(true)
      mockedDetectSourceType.mockReturnValue('youtube')
      mockedEnrichUrl.mockResolvedValue({
        success: true,
        type: 'youtube',
        data: {
          title: 'Video Title',
          author: 'Channel',
          transcript: 'Transcript text',
          thumbnail: 'https://thumb.jpg',
        },
      })

      const onAdd = vi.fn().mockResolvedValue(undefined)
      const { user } = render(<AddInterestModal {...defaultProps} onAdd={onAdd} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      // Wait for enrichment
      await waitFor(() => {
        expect(screen.getByDisplayValue('Video Title')).toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add interest/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            transcript: 'Transcript text',
            thumbnail: 'https://thumb.jpg',
            author: 'Channel',
          })
        )
      })
    })

    it('shows loading state during submission', async () => {
      const onAdd = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
      const { user } = render(<AddInterestModal {...defaultProps} onAdd={onAdd} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://example.com/page')

      const addButton = screen.getByRole('button', { name: /add interest/i })
      await user.click(addButton)

      expect(addButton).toBeDisabled()
    })

    it('calls onClose after successful add', async () => {
      const onClose = vi.fn()
      const onAdd = vi.fn().mockResolvedValue(undefined)
      const { user } = render(<AddInterestModal {...defaultProps} onClose={onClose} onAdd={onAdd} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://example.com/page')

      const addButton = screen.getByRole('button', { name: /add interest/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('shows error message on failure', async () => {
      const onAdd = vi.fn().mockRejectedValue(new Error('Failed to add'))
      const { user } = render(<AddInterestModal {...defaultProps} onAdd={onAdd} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://example.com/page')

      const addButton = screen.getByRole('button', { name: /add interest/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to add')).toBeInTheDocument()
      })
    })

    it('handles tags as comma-separated string', async () => {
      const onAdd = vi.fn().mockResolvedValue(undefined)
      const { user } = render(<AddInterestModal {...defaultProps} onAdd={onAdd} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://example.com/page')

      const tagsInput = screen.getByPlaceholderText(/comma-separated/i)
      await user.type(tagsInput, ' tag1 , tag2 ,  tag3  ')

      const addButton = screen.getByRole('button', { name: /add interest/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith(
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
      const { user } = render(<AddInterestModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when X button clicked', async () => {
      const onClose = vi.fn()
      const { user } = render(<AddInterestModal {...defaultProps} onClose={onClose} />)

      const closeButtons = screen.getAllByRole('button')
      const xButton = closeButtons.find(btn => btn.querySelector('.lucide-x'))
      await user.click(xButton!)

      expect(onClose).toHaveBeenCalled()
    })

    it('disables Add Interest button while enriching', async () => {
      mockedIsYouTubeUrl.mockReturnValue(true)
      mockedDetectSourceType.mockReturnValue('youtube')
      mockedEnrichUrl.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { user } = render(<AddInterestModal {...defaultProps} />)

      const urlInput = screen.getByPlaceholderText(/youtube.com/i)
      await user.type(urlInput, 'https://youtube.com/watch?v=abcdefghijk')

      await waitFor(() => {
        const addButton = screen.getByRole('button', { name: /add interest/i })
        expect(addButton).toBeDisabled()
      })
    })
  })
})
