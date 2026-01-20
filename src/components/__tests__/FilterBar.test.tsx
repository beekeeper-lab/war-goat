import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { FilterBar } from '../FilterBar'

describe('FilterBar', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    typeFilter: 'all' as const,
    onTypeFilterChange: vi.fn(),
    statusFilter: 'all' as const,
    onStatusFilterChange: vi.fn(),
    categoryFilter: 'all' as const,
    onCategoryFilterChange: vi.fn(),
    availableCategories: [] as string[],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders search input with placeholder', () => {
      render(<FilterBar {...defaultProps} />)
      expect(screen.getByPlaceholderText('Search interests...')).toBeInTheDocument()
    })

    it('renders type filter dropdown with all options', () => {
      render(<FilterBar {...defaultProps} />)
      const selects = screen.getAllByRole('combobox')
      // First select contains type options
      expect(selects[0]).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'All Types' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'YouTube' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Books' })).toBeInTheDocument()
    })

    it('renders status filter dropdown with all options', () => {
      render(<FilterBar {...defaultProps} />)
      const selects = screen.getAllByRole('combobox')
      const statusDropdown = selects.find(s => s.textContent?.includes('All Status'))
      expect(statusDropdown).toBeInTheDocument()
    })

    it('renders category filter only when categories available', () => {
      render(<FilterBar {...defaultProps} availableCategories={['Tech', 'Science']} />)
      const selects = screen.getAllByRole('combobox')
      const categoryDropdown = selects.find(s => s.textContent?.includes('All Categories'))
      expect(categoryDropdown).toBeInTheDocument()
    })

    it('does not render category filter when no categories', () => {
      render(<FilterBar {...defaultProps} availableCategories={[]} />)
      expect(screen.queryByText('All Categories')).not.toBeInTheDocument()
    })
  })

  describe('search input', () => {
    it('displays current search query value', () => {
      render(<FilterBar {...defaultProps} searchQuery="test query" />)
      expect(screen.getByPlaceholderText('Search interests...')).toHaveValue('test query')
    })

    it('calls onSearchChange when typing', async () => {
      const { user } = render(<FilterBar {...defaultProps} />)
      const searchInput = screen.getByPlaceholderText('Search interests...')
      await user.type(searchInput, 'hello')
      expect(defaultProps.onSearchChange).toHaveBeenCalled()
    })
  })

  describe('type filter', () => {
    it('displays current type filter value', () => {
      render(<FilterBar {...defaultProps} typeFilter="youtube" />)
      const selects = screen.getAllByRole('combobox')
      const typeSelect = selects[0] // First select is type
      expect(typeSelect).toHaveValue('youtube')
    })

    it('calls onTypeFilterChange when selecting option', async () => {
      const { user } = render(<FilterBar {...defaultProps} />)
      const selects = screen.getAllByRole('combobox')
      const typeSelect = selects[0]
      await user.selectOptions(typeSelect, 'youtube')
      expect(defaultProps.onTypeFilterChange).toHaveBeenCalledWith('youtube')
    })
  })

  describe('status filter', () => {
    it('displays current status filter value', () => {
      render(<FilterBar {...defaultProps} statusFilter="in-progress" />)
      const selects = screen.getAllByRole('combobox')
      const statusSelect = selects[1] // Second select is status
      expect(statusSelect).toHaveValue('in-progress')
    })

    it('calls onStatusFilterChange when selecting option', async () => {
      const { user } = render(<FilterBar {...defaultProps} />)
      const selects = screen.getAllByRole('combobox')
      const statusSelect = selects[1]
      await user.selectOptions(statusSelect, 'completed')
      expect(defaultProps.onStatusFilterChange).toHaveBeenCalledWith('completed')
    })
  })

  describe('category filter', () => {
    it('shows all provided categories as options', () => {
      render(<FilterBar {...defaultProps} availableCategories={['Tech', 'Science', 'Art']} />)
      expect(screen.getByRole('option', { name: 'Tech' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Science' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Art' })).toBeInTheDocument()
    })

    it('calls onCategoryFilterChange when selecting option', async () => {
      const { user } = render(<FilterBar {...defaultProps} availableCategories={['Tech', 'Science']} />)
      const selects = screen.getAllByRole('combobox')
      const categorySelect = selects[2] // Third select is category
      await user.selectOptions(categorySelect, 'Tech')
      expect(defaultProps.onCategoryFilterChange).toHaveBeenCalledWith('Tech')
    })
  })
})
