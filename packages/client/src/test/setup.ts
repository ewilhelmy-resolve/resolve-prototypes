import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Initialize i18n for tests
i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  resources: {
    en: {
      common: {
        actions: {
          cancel: 'Cancel',
          save: 'Save',
          delete: 'Delete',
          edit: 'Edit',
          close: 'Close',
          submit: 'Submit',
          confirm: 'Confirm',
          update: 'Update',
          connect: 'Connect',
          configure: 'Configure',
          manage: 'Manage',
          retry: 'Try Again',
          goBack: 'Go Back',
          goToLogin: 'Go to Login',
          resend: 'Resend',
          disconnect: 'Disconnect',
          previous: 'Previous',
          next: 'Next',
          clear: 'Clear',
          clearAll: 'Clear All',
          selectAll: 'Select All',
          search: 'Search',
          rename: 'Rename',
          enable: 'Enable',
          disable: 'Disable',
          dismiss: 'Dismiss',
        },
        states: {
          loading: 'Loading...',
          saving: 'Saving...',
          deleting: 'Deleting...',
          connecting: 'Connecting...',
          updating: 'Updating...',
          processing: 'Processing...',
          noResults: 'No results found',
          noOptions: 'No options selected',
        },
        labels: {
          email: 'Email',
          firstName: 'First name',
          lastName: 'Last name',
          organization: 'Organization',
          required: '*',
          name: 'Name',
          role: 'Role',
          description: 'Description',
          selectOption: 'Select option',
          selectRole: 'Select role',
          morePages: 'More pages',
          more: 'More',
        },
        placeholders: {
          search: 'Search...',
          searchOptions: 'Search options...',
          selectOptions: 'Select options',
        },
        accessibility: {
          close: 'Close',
          closeNotification: 'Close notification',
          dismissBanner: 'Dismiss banner',
          toggleSidebar: 'Toggle Sidebar',
          goToPreviousPage: 'Go to previous page',
          goToNextPage: 'Go to next page',
          breadcrumb: 'breadcrumb',
          removeFromSelection: 'Remove {{item}} from selection',
          clearAllSelected: 'Clear all {{count}} selected options',
          searchOptions: 'Search through available options',
          selectAllOptions: 'Select all {{count}} options',
          optionSelected: '{{option}}, selected',
          optionNotSelected: '{{option}}, not selected',
        },
        multiSelect: {
          instructions: 'Multi-select dropdown. Use arrow keys to navigate, Enter to select, and Escape to close.',
          searchHelp: 'Type to filter options. Use arrow keys to navigate results.',
          optionsCount: '{{count}} options',
        },
        command: {
          paletteTitle: 'Command Palette',
          paletteDescription: 'Search for a command to run...',
        },
      },
    },
  },
  interpolation: {
    escapeValue: false,
  },
})

// Mock katex CSS to prevent import errors
vi.mock('katex/dist/katex.min.css', () => ({}))

// Mock rehype-katex to prevent CSS import issues
vi.mock('rehype-katex', () => ({
  default: () => () => {},
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any
