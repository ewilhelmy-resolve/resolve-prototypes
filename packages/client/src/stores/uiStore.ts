import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  // Sidebar state
  isSidebarOpen: boolean
  sidebarWidth: number

  // Theme
  theme: 'light' | 'dark' | 'system'

  // Notification preferences
  enableNotifications: boolean
  enableSounds: boolean

  // Chat UI preferences
  messageGrouping: boolean
  showTimestamps: boolean
  compactMode: boolean

  // Actions
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarWidth: (width: number) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setNotifications: (enabled: boolean) => void
  setSounds: (enabled: boolean) => void
  setMessageGrouping: (enabled: boolean) => void
  setShowTimestamps: (enabled: boolean) => void
  setCompactMode: (enabled: boolean) => void
  reset: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true, // Open on desktop by default
        sidebarWidth: 280,
        theme: 'system',
        enableNotifications: true,
        enableSounds: false,
        messageGrouping: true,
        showTimestamps: true,
        compactMode: false,

        // Actions
        toggleSidebar: () =>
          set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

        setSidebarOpen: (open) =>
          set({ isSidebarOpen: open }),

        setSidebarWidth: (width) =>
          set({ sidebarWidth: width }),

        setTheme: (theme) =>
          set({ theme }),

        setNotifications: (enabled) =>
          set({ enableNotifications: enabled }),

        setSounds: (enabled) =>
          set({ enableSounds: enabled }),

        setMessageGrouping: (enabled) =>
          set({ messageGrouping: enabled }),

        setShowTimestamps: (enabled) =>
          set({ showTimestamps: enabled }),

        setCompactMode: (enabled) =>
          set({ compactMode: enabled }),

        reset: () =>
          set({
            isSidebarOpen: true,
            sidebarWidth: 280,
            theme: 'system',
            enableNotifications: true,
            enableSounds: false,
            messageGrouping: true,
            showTimestamps: true,
            compactMode: false,
          }),
      }),
      {
        name: 'ui-store',
        // Only persist UI preferences, not temporary state
        partialize: (state) => ({
          sidebarWidth: state.sidebarWidth,
          theme: state.theme,
          enableNotifications: state.enableNotifications,
          enableSounds: state.enableSounds,
          messageGrouping: state.messageGrouping,
          showTimestamps: state.showTimestamps,
          compactMode: state.compactMode,
        }),
      }
    ),
    { name: 'ui-store' }
  )
)