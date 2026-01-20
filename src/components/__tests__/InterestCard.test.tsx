import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { InterestCard } from '../InterestCard'
import { createInterestItem, createYouTubeItem, createArticleItem, createBookItem, resetIdCounter } from '../../test/factories/interest'

// Mock ExportToObsidianButton to isolate tests
vi.mock('../ExportToObsidianButton', () => ({
  ExportToObsidianButton: ({ onExport, disabled }: any) => (
    <button
      data-testid="export-to-obsidian-btn"
      onClick={(e) => {
        e.stopPropagation()
        onExport()
      }}
      disabled={disabled}
    >
      Export
    </button>
  ),
}))

// Mock window.confirm
const confirmSpy = vi.spyOn(window, 'confirm')

// Mock window.open
const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

describe('InterestCard', () => {
  beforeEach(() => {
    resetIdCounter()
    vi.clearAllMocks()
    confirmSpy.mockReturnValue(true)
  })

  const defaultProps = {
    item: createInterestItem(),
    onStatusChange: vi.fn(),
    onDelete: vi.fn(),
    onClick: vi.fn(),
  }

  describe('rendering', () => {
    it('renders item title', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ title: 'Test Title' })} />)
      expect(screen.getByText('Test Title')).toBeInTheDocument()
    })

    it('renders item description when provided', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ description: 'Test description' })} />)
      expect(screen.getByText('Test description')).toBeInTheDocument()
    })

    it('does not render description when not provided', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ description: undefined })} />)
      expect(screen.queryByText('Test description')).not.toBeInTheDocument()
    })

    it('renders author when provided', () => {
      render(<InterestCard {...defaultProps} item={createBookItem({ author: 'John Doe' })} />)
      expect(screen.getByText('by John Doe')).toBeInTheDocument()
    })

    it('renders thumbnail image when provided', () => {
      render(<InterestCard {...defaultProps} item={createYouTubeItem({ thumbnail: 'https://example.com/thumb.jpg' })} />)
      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg')
    })

    it('renders type icon when no thumbnail', () => {
      render(<InterestCard {...defaultProps} item={createArticleItem({ thumbnail: undefined })} />)
      // The icon should be present (rendered as SVG within the colored div)
      const iconContainer = document.querySelector('.w-24.h-24')
      expect(iconContainer).toBeInTheDocument()
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument()
    })

    it('renders correct icon for youtube type', () => {
      const { container } = render(<InterestCard {...defaultProps} item={createYouTubeItem({ thumbnail: undefined })} />)
      const iconContainer = container.querySelector('.text-red-500')
      expect(iconContainer).toBeInTheDocument()
    })

    it('renders correct icon for book type', () => {
      const { container } = render(<InterestCard {...defaultProps} item={createBookItem({ thumbnail: undefined })} />)
      const iconContainer = container.querySelector('.text-amber-600')
      expect(iconContainer).toBeInTheDocument()
    })

    it('renders correct icon for article type', () => {
      const { container } = render(<InterestCard {...defaultProps} item={createArticleItem({ thumbnail: undefined })} />)
      const iconContainer = container.querySelector('.text-blue-500')
      expect(iconContainer).toBeInTheDocument()
    })

    it('renders status button with correct label for backlog', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ status: 'backlog' })} />)
      expect(screen.getByRole('button', { name: /backlog/i })).toBeInTheDocument()
    })

    it('renders status button with correct label for in-progress', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ status: 'in-progress' })} />)
      expect(screen.getByRole('button', { name: /in progress/i })).toBeInTheDocument()
    })

    it('renders status button with correct label for completed', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ status: 'completed' })} />)
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument()
    })

    it('renders tags when provided', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ tags: ['tag1', 'tag2'] })} />)
      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
    })

    it('truncates tags to first 3 with count indicator', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] })} />)
      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
      expect(screen.getByText('tag3')).toBeInTheDocument()
      expect(screen.queryByText('tag4')).not.toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('renders categories when provided', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ categories: ['Tech', 'Science'] })} />)
      expect(screen.getByText('Tech')).toBeInTheDocument()
      expect(screen.getByText('Science')).toBeInTheDocument()
    })

    it('truncates categories to first 2 with count indicator', () => {
      render(<InterestCard {...defaultProps} item={createInterestItem({ categories: ['Tech', 'Science', 'Art', 'Music'] })} />)
      expect(screen.getByText('Tech')).toBeInTheDocument()
      expect(screen.getByText('Science')).toBeInTheDocument()
      expect(screen.queryByText('Art')).not.toBeInTheDocument()
      expect(screen.getByText('+2')).toBeInTheDocument()
    })
  })

  describe('status cycling', () => {
    it('cycles from backlog to in-progress', async () => {
      const onStatusChange = vi.fn()
      const item = createInterestItem({ status: 'backlog' })
      const { user } = render(<InterestCard {...defaultProps} item={item} onStatusChange={onStatusChange} />)

      const statusButton = screen.getByRole('button', { name: /backlog/i })
      await user.click(statusButton)
      expect(onStatusChange).toHaveBeenCalledWith(item.id, 'in-progress')
    })

    it('cycles from in-progress to completed', async () => {
      const onStatusChange = vi.fn()
      const item = createInterestItem({ status: 'in-progress' })
      const { user } = render(<InterestCard {...defaultProps} item={item} onStatusChange={onStatusChange} />)

      const statusButton = screen.getByRole('button', { name: /in progress/i })
      await user.click(statusButton)
      expect(onStatusChange).toHaveBeenCalledWith(item.id, 'completed')
    })

    it('cycles from completed to backlog', async () => {
      const onStatusChange = vi.fn()
      const item = createInterestItem({ status: 'completed' })
      const { user } = render(<InterestCard {...defaultProps} item={item} onStatusChange={onStatusChange} />)

      const statusButton = screen.getByRole('button', { name: /completed/i })
      await user.click(statusButton)
      expect(onStatusChange).toHaveBeenCalledWith(item.id, 'backlog')
    })

    it('calls onStatusChange with correct id and status', async () => {
      const onStatusChange = vi.fn()
      const item = createInterestItem({ id: 'test-id-123', status: 'backlog' })
      const { user } = render(<InterestCard {...defaultProps} item={item} onStatusChange={onStatusChange} />)

      const statusButton = screen.getByRole('button', { name: /backlog/i })
      await user.click(statusButton)
      expect(onStatusChange).toHaveBeenCalledWith('test-id-123', 'in-progress')
    })

    it('stops event propagation (does not trigger onClick)', async () => {
      const onClick = vi.fn()
      const item = createInterestItem({ status: 'backlog' })
      const { user } = render(<InterestCard {...defaultProps} item={item} onClick={onClick} />)

      const statusButton = screen.getByRole('button', { name: /backlog/i })
      await user.click(statusButton)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('delete action', () => {
    it('shows confirmation dialog when delete clicked', async () => {
      const { user } = render(<InterestCard {...defaultProps} />)
      const deleteButton = screen.getByTitle('Delete')
      await user.click(deleteButton)
      expect(confirmSpy).toHaveBeenCalledWith('Delete this item?')
    })

    it('calls onDelete when confirmed', async () => {
      confirmSpy.mockReturnValue(true)
      const onDelete = vi.fn()
      const item = createInterestItem()
      const { user } = render(<InterestCard {...defaultProps} item={item} onDelete={onDelete} />)

      const deleteButton = screen.getByTitle('Delete')
      await user.click(deleteButton)
      expect(onDelete).toHaveBeenCalledWith(item.id)
    })

    it('does not call onDelete when cancelled', async () => {
      confirmSpy.mockReturnValue(false)
      const onDelete = vi.fn()
      const { user } = render(<InterestCard {...defaultProps} onDelete={onDelete} />)

      const deleteButton = screen.getByTitle('Delete')
      await user.click(deleteButton)
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('stops event propagation', async () => {
      const onClick = vi.fn()
      const { user } = render(<InterestCard {...defaultProps} onClick={onClick} />)

      const deleteButton = screen.getByTitle('Delete')
      await user.click(deleteButton)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('external link', () => {
    it('opens URL in new tab when external link clicked', async () => {
      const item = createInterestItem({ url: 'https://example.com/test' })
      const { user } = render(<InterestCard {...defaultProps} item={item} />)

      const externalLinkButton = screen.getByTitle('Open in new tab')
      await user.click(externalLinkButton)
      expect(openSpy).toHaveBeenCalledWith('https://example.com/test', '_blank')
    })

    it('stops event propagation', async () => {
      const onClick = vi.fn()
      const { user } = render(<InterestCard {...defaultProps} onClick={onClick} />)

      const externalLinkButton = screen.getByTitle('Open in new tab')
      await user.click(externalLinkButton)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('card click', () => {
    it('calls onClick when card is clicked', async () => {
      const onClick = vi.fn()
      const item = createInterestItem({ title: 'Clickable Item' })
      const { user } = render(<InterestCard {...defaultProps} item={item} onClick={onClick} />)

      const card = screen.getByText('Clickable Item').closest('div[class*="bg-white rounded-lg"]')
      await user.click(card!)
      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('optional buttons', () => {
    it('renders Find Related button when onFindRelated and searchAvailable', () => {
      render(
        <InterestCard
          {...defaultProps}
          onFindRelated={vi.fn()}
          searchAvailable={true}
        />
      )
      expect(screen.getByTitle('Find related content')).toBeInTheDocument()
    })

    it('does not render Find Related when searchAvailable false', () => {
      render(
        <InterestCard
          {...defaultProps}
          onFindRelated={vi.fn()}
          searchAvailable={false}
        />
      )
      expect(screen.queryByTitle('Find related content')).not.toBeInTheDocument()
    })

    it('does not render Find Related when onFindRelated not provided', () => {
      render(
        <InterestCard
          {...defaultProps}
          searchAvailable={true}
        />
      )
      expect(screen.queryByTitle('Find related content')).not.toBeInTheDocument()
    })

    it('calls onFindRelated when Find Related clicked', async () => {
      const onFindRelated = vi.fn()
      const { user } = render(
        <InterestCard
          {...defaultProps}
          onFindRelated={onFindRelated}
          searchAvailable={true}
        />
      )

      const findRelatedButton = screen.getByTitle('Find related content')
      await user.click(findRelatedButton)
      expect(onFindRelated).toHaveBeenCalledTimes(1)
    })

    it('stops event propagation when Find Related clicked', async () => {
      const onClick = vi.fn()
      const { user } = render(
        <InterestCard
          {...defaultProps}
          onClick={onClick}
          onFindRelated={vi.fn()}
          searchAvailable={true}
        />
      )

      const findRelatedButton = screen.getByTitle('Find related content')
      await user.click(findRelatedButton)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('renders Export button when onExportToObsidian provided', () => {
      render(
        <InterestCard
          {...defaultProps}
          onExportToObsidian={vi.fn()}
        />
      )
      expect(screen.getByTestId('export-to-obsidian-btn')).toBeInTheDocument()
    })

    it('does not render Export button when onExportToObsidian not provided', () => {
      render(<InterestCard {...defaultProps} />)
      expect(screen.queryByTestId('export-to-obsidian-btn')).not.toBeInTheDocument()
    })

    it('disables Export button when obsidianConnected false', () => {
      render(
        <InterestCard
          {...defaultProps}
          onExportToObsidian={vi.fn()}
          obsidianConnected={false}
        />
      )
      expect(screen.getByTestId('export-to-obsidian-btn')).toBeDisabled()
    })

    it('enables Export button when obsidianConnected true', () => {
      render(
        <InterestCard
          {...defaultProps}
          onExportToObsidian={vi.fn()}
          obsidianConnected={true}
        />
      )
      expect(screen.getByTestId('export-to-obsidian-btn')).not.toBeDisabled()
    })

    it('calls onExportToObsidian when Export clicked', async () => {
      const onExportToObsidian = vi.fn()
      const { user } = render(
        <InterestCard
          {...defaultProps}
          onExportToObsidian={onExportToObsidian}
          obsidianConnected={true}
        />
      )

      const exportButton = screen.getByTestId('export-to-obsidian-btn')
      await user.click(exportButton)
      expect(onExportToObsidian).toHaveBeenCalledTimes(1)
    })
  })
})
