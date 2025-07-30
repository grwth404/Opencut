import '@testing-library/jest-dom'

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock IndexedDB for storage tests
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
}

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

// Mock OPFS (Origin Private File System)
Object.defineProperty(navigator, 'storage', {
  value: {
    getDirectory: vi.fn(),
  },
  writable: true,
})

// Global test utilities
global.mockRouter = mockRouter

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks()
  
  // Suppress console output unless VITEST_VERBOSE is set
  if (!process.env.VITEST_VERBOSE) {
    console.log = vi.fn()
    console.error = vi.fn()
    console.warn = vi.fn()
  }
})

afterEach(() => {
  // Restore console if it was mocked
  if (!process.env.VITEST_VERBOSE) {
    console.log = originalConsoleLog
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  }
})
