import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { Header } from '../Header'

// Mock ObsidianStatus to isolate Header tests
vi.mock('../ObsidianStatus', () => ({
  ObsidianStatus: () => <div data-testid="obsidian-status">Obsidian Status</div>,
}))

describe('Header', () => {
  const defaultProps = {
    onAddClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders app logo', () => {
      render(<Header {...defaultProps} />)
      expect(screen.getByRole('img', { name: 'War Goat' })).toBeInTheDocument()
    })

    it('renders app title "War Goat"', () => {
      render(<Header {...defaultProps} />)
      expect(screen.getByRole('heading', { name: 'War Goat' })).toBeInTheDocument()
    })

    it('renders tagline', () => {
      render(<Header {...defaultProps} />)
      expect(screen.getByText("Always Remember What's Next!")).toBeInTheDocument()
    })

    it('renders Add Item button', () => {
      render(<Header {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument()
    })

    it('renders ObsidianStatus component', () => {
      render(<Header {...defaultProps} />)
      expect(screen.getByTestId('obsidian-status')).toBeInTheDocument()
    })
  })

  describe('Add Item button', () => {
    it('calls onAddClick when clicked', async () => {
      const { user } = render(<Header {...defaultProps} />)
      const addButton = screen.getByRole('button', { name: /add item/i })
      await user.click(addButton)
      expect(defaultProps.onAddClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Search button', () => {
    it('renders when onSearchClick provided and searchAvailable true', () => {
      render(
        <Header
          {...defaultProps}
          onSearchClick={vi.fn()}
          searchAvailable={true}
        />
      )
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('does not render when searchAvailable false', () => {
      render(
        <Header
          {...defaultProps}
          onSearchClick={vi.fn()}
          searchAvailable={false}
        />
      )
      expect(screen.queryByRole('button', { name: /search/i })).not.toBeInTheDocument()
    })

    it('does not render when onSearchClick not provided', () => {
      render(<Header {...defaultProps} searchAvailable={true} />)
      expect(screen.queryByRole('button', { name: /search/i })).not.toBeInTheDocument()
    })

    it('calls onSearchClick when clicked', async () => {
      const onSearchClick = vi.fn()
      const { user } = render(
        <Header
          {...defaultProps}
          onSearchClick={onSearchClick}
          searchAvailable={true}
        />
      )
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)
      expect(onSearchClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Sync button', () => {
    it('renders when onSyncClick provided and obsidianConnected true', () => {
      render(
        <Header
          {...defaultProps}
          onSyncClick={vi.fn()}
          obsidianConnected={true}
        />
      )
      expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument()
    })

    it('does not render when obsidianConnected false', () => {
      render(
        <Header
          {...defaultProps}
          onSyncClick={vi.fn()}
          obsidianConnected={false}
        />
      )
      expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument()
    })

    it('does not render when onSyncClick not provided', () => {
      render(<Header {...defaultProps} obsidianConnected={true} />)
      expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument()
    })

    it('calls onSyncClick when clicked', async () => {
      const onSyncClick = vi.fn()
      const { user } = render(
        <Header
          {...defaultProps}
          onSyncClick={onSyncClick}
          obsidianConnected={true}
        />
      )
      const syncButton = screen.getByRole('button', { name: /sync/i })
      await user.click(syncButton)
      expect(onSyncClick).toHaveBeenCalledTimes(1)
    })

    it('is disabled when syncing', () => {
      render(
        <Header
          {...defaultProps}
          onSyncClick={vi.fn()}
          obsidianConnected={true}
          syncing={true}
        />
      )
      expect(screen.getByRole('button', { name: /sync/i })).toBeDisabled()
    })
  })
})
