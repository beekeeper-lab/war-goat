import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '../../test/utils'
import { InterestList } from '../InterestList'
import { createInterestItem, resetIdCounter } from '../../test/factories/interest'

// Mock InterestCard to isolate InterestList tests
vi.mock('../InterestCard', () => ({
  InterestCard: ({ item, onClick, onStatusChange, onDelete, onExportToObsidian, onFindRelated, obsidianConnected, searchAvailable }: any) => (
    <div
      data-testid={`interest-card-${item.id}`}
      data-obsidian-connected={obsidianConnected}
      data-search-available={searchAvailable}
      data-has-export={!!onExportToObsidian}
      data-has-find-related={!!onFindRelated}
      onClick={onClick}
    >
      <span data-testid="card-title">{item.title}</span>
      <button data-testid="status-btn" onClick={() => onStatusChange(item.id, 'in-progress')}>Status</button>
      <button data-testid="delete-btn" onClick={() => onDelete(item.id)}>Delete</button>
      {onExportToObsidian && <button data-testid="export-btn" onClick={onExportToObsidian}>Export</button>}
      {onFindRelated && <button data-testid="find-related-btn" onClick={onFindRelated}>Find Related</button>}
    </div>
  ),
}))

describe('InterestList', () => {
  beforeEach(() => {
    resetIdCounter()
    vi.clearAllMocks()
  })

  const defaultProps = {
    items: [] as ReturnType<typeof createInterestItem>[],
    loading: false,
    error: null as string | null,
    onStatusChange: vi.fn(),
    onDelete: vi.fn(),
    onItemClick: vi.fn(),
  }

  describe('loading state', () => {
    it('shows loading spinner when loading is true', () => {
      render(<InterestList {...defaultProps} loading={true} />)
      // The Loader2 component renders with animate-spin class
      const loader = document.querySelector('.animate-spin')
      expect(loader).toBeInTheDocument()
    })

    it('does not show items when loading', () => {
      const items = [createInterestItem()]
      render(<InterestList {...defaultProps} items={items} loading={true} />)
      expect(screen.queryByTestId('interest-card-test-1')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message when error is provided', () => {
      render(<InterestList {...defaultProps} error="Something went wrong" />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('displays the error text in red', () => {
      render(<InterestList {...defaultProps} error="Error message" />)
      const errorText = screen.getByText('Error message')
      expect(errorText).toHaveClass('text-red-600')
    })
  })

  describe('empty state', () => {
    it('shows empty state when items array is empty', () => {
      render(<InterestList {...defaultProps} items={[]} />)
      expect(screen.getByText('No interests found')).toBeInTheDocument()
    })

    it('displays "No interests found" message', () => {
      render(<InterestList {...defaultProps} items={[]} />)
      expect(screen.getByText('No interests found')).toBeInTheDocument()
    })

    it('shows helpful instruction text', () => {
      render(<InterestList {...defaultProps} items={[]} />)
      expect(screen.getByText('Add your first interest to get started')).toBeInTheDocument()
    })
  })

  describe('with items', () => {
    it('renders InterestCard for each item', () => {
      const items = [
        createInterestItem({ title: 'Item 1' }),
        createInterestItem({ title: 'Item 2' }),
        createInterestItem({ title: 'Item 3' }),
      ]
      render(<InterestList {...defaultProps} items={items} />)
      expect(screen.getByTestId('interest-card-test-1')).toBeInTheDocument()
      expect(screen.getByTestId('interest-card-test-2')).toBeInTheDocument()
      expect(screen.getByTestId('interest-card-test-3')).toBeInTheDocument()
    })

    it('passes correct props to each InterestCard', () => {
      const items = [createInterestItem({ title: 'Test Title' })]
      render(<InterestList {...defaultProps} items={items} />)
      const card = screen.getByTestId('interest-card-test-1')
      expect(within(card).getByTestId('card-title')).toHaveTextContent('Test Title')
    })

    it('renders items in a grid layout', () => {
      const items = [createInterestItem(), createInterestItem()]
      const { container } = render(<InterestList {...defaultProps} items={items} />)
      const grid = container.querySelector('.grid')
      expect(grid).toBeInTheDocument()
      expect(grid).toHaveClass('md:grid-cols-2')
    })
  })

  describe('callbacks', () => {
    it('passes onStatusChange to InterestCard', async () => {
      const items = [createInterestItem()]
      const onStatusChange = vi.fn()
      const { user } = render(<InterestList {...defaultProps} items={items} onStatusChange={onStatusChange} />)

      const statusBtn = screen.getByTestId('status-btn')
      await user.click(statusBtn)
      expect(onStatusChange).toHaveBeenCalledWith('test-1', 'in-progress')
    })

    it('passes onDelete to InterestCard', async () => {
      const items = [createInterestItem()]
      const onDelete = vi.fn()
      const { user } = render(<InterestList {...defaultProps} items={items} onDelete={onDelete} />)

      const deleteBtn = screen.getByTestId('delete-btn')
      await user.click(deleteBtn)
      expect(onDelete).toHaveBeenCalledWith('test-1')
    })

    it('calls onItemClick with item when card clicked', async () => {
      const item = createInterestItem({ title: 'Click Me' })
      const onItemClick = vi.fn()
      const { user } = render(<InterestList {...defaultProps} items={[item]} onItemClick={onItemClick} />)

      const card = screen.getByTestId('interest-card-test-1')
      await user.click(card)
      expect(onItemClick).toHaveBeenCalledWith(item)
    })
  })

  describe('optional features', () => {
    it('passes obsidianConnected to cards', () => {
      const items = [createInterestItem()]
      render(<InterestList {...defaultProps} items={items} obsidianConnected={true} />)
      const card = screen.getByTestId('interest-card-test-1')
      expect(card).toHaveAttribute('data-obsidian-connected', 'true')
    })

    it('passes searchAvailable to cards', () => {
      const items = [createInterestItem()]
      render(<InterestList {...defaultProps} items={items} searchAvailable={true} />)
      const card = screen.getByTestId('interest-card-test-1')
      expect(card).toHaveAttribute('data-search-available', 'true')
    })

    it('passes onExportToObsidian when provided', async () => {
      const items = [createInterestItem()]
      const onExportToObsidian = vi.fn()
      const { user } = render(
        <InterestList {...defaultProps} items={items} onExportToObsidian={onExportToObsidian} />
      )

      const card = screen.getByTestId('interest-card-test-1')
      expect(card).toHaveAttribute('data-has-export', 'true')

      const exportBtn = screen.getByTestId('export-btn')
      await user.click(exportBtn)
      expect(onExportToObsidian).toHaveBeenCalledWith(items[0])
    })

    it('passes onFindRelated when provided', async () => {
      const items = [createInterestItem()]
      const onFindRelated = vi.fn()
      const { user } = render(
        <InterestList {...defaultProps} items={items} onFindRelated={onFindRelated} />
      )

      const card = screen.getByTestId('interest-card-test-1')
      expect(card).toHaveAttribute('data-has-find-related', 'true')

      const findRelatedBtn = screen.getByTestId('find-related-btn')
      await user.click(findRelatedBtn)
      expect(onFindRelated).toHaveBeenCalledWith(items[0])
    })

    it('does not pass onExportToObsidian when not provided', () => {
      const items = [createInterestItem()]
      render(<InterestList {...defaultProps} items={items} />)
      const card = screen.getByTestId('interest-card-test-1')
      expect(card).toHaveAttribute('data-has-export', 'false')
    })

    it('does not pass onFindRelated when not provided', () => {
      const items = [createInterestItem()]
      render(<InterestList {...defaultProps} items={items} />)
      const card = screen.getByTestId('interest-card-test-1')
      expect(card).toHaveAttribute('data-has-find-related', 'false')
    })
  })
})
