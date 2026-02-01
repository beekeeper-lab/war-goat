import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PreferencesProvider } from '../contexts/PreferencesContext'

/**
 * Wrapper component that includes all providers needed for tests
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      {children}
    </PreferencesProvider>
  )
}

/**
 * Custom render that includes userEvent setup and all providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
export { userEvent }
