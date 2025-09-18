# Modern React Frontend Migration Plan

## Overview

This document outlines the complete migration strategy from the current vanilla HTML/JS frontend to a modern React-based frontend using React, ShadCN/UI, Tailwind CSS, TanStack Query, and TypeScript.

## Current Frontend Analysis

### **Current Architecture:**
- **Static HTML Pages**: `src/client/pages/*.html` (dashboard, login, admin, etc.)
- **Vanilla JavaScript**: `src/client/components/*.js` and `src/client/js/*.js`
- **CSS Styling**: Custom CSS files in `src/client/styles/`
- **Server-Side Rendering**: Express serves static files directly
- **No Build Process**: Direct file serving from `src/client/`

### **Current Pages & Components:**
```
src/client/
├── pages/
│   ├── dashboard.html          # Main dashboard with chat
│   ├── login.html             # Authentication
│   ├── admin.html             # Admin panel
│   ├── knowledge.html         # Knowledge base management
│   └── completion.html        # Onboarding completion
├── components/
│   ├── quikchat-rag.js       # Chat integration
│   ├── chat-history.js       # Chat history management
│   ├── knowledge-management.js # Document uploads
│   └── mobile-menu.js        # Mobile navigation
└── styles/
    ├── dashboard-styles.css   # Main styling
    └── quikchat.css          # Chat styling
```

## Target Modern Architecture

### **Technology Stack:**
- **React 18** - Modern UI framework with concurrent features
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **ShadCN/UI** - High-quality accessible components
- **TanStack Query** - Server state management
- **React Router** - Client-side routing
- **Zustand** - Simple state management
- **React Hook Form** - Form management
- **Zod** - Runtime type validation

### **Project Structure:**
```
resolve-onboarding/
├── frontend/                   # New React application (at project root)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # ShadCN/UI components
│   │   │   ├── layout/         # Layout components
│   │   │   ├── forms/          # Form components
│   │   │   └── features/       # Feature-specific components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities and configurations
│   │   ├── services/           # API service layer
│   │   ├── stores/             # Zustand stores
│   │   ├── types/              # TypeScript type definitions
│   │   └── App.tsx             # Root component
│   ├── public/                 # Static assets
│   ├── index.html              # Entry point
│   ├── package.json            # Frontend dependencies
│   └── vite.config.ts          # Vite configuration
├── src/                        # Existing backend (unchanged)
│   ├── client/                 # Legacy frontend (keep during migration)
│   ├── routes/                 # API routes
│   └── ...
├── package.json                # Backend dependencies
└── server.js                   # Express server
```

## Implementation Plan

### **Phase 1: Project Setup & Infrastructure**

#### **1.1 Initialize React Project**

```bash
# Create frontend directory at project root
mkdir frontend
cd frontend

# Initialize with Vite + React + TypeScript
npm create vite@latest . -- --template react-ts

# Install core dependencies
npm install
npm install react-router-dom @tanstack/react-query
npm install zustand react-hook-form @hookform/resolvers zod
npm install axios date-fns clsx tailwind-merge
npm install lucide-react @radix-ui/react-slot

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install ShadCN/UI
npx shadcn-ui@latest init
```

#### **1.2 Configure Build Tools**

**frontend/vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
```

**frontend/tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... ShadCN color system
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

#### **1.3 TypeScript Configuration**

**frontend/src/types/api.ts:**
```typescript
// API Response Types
export interface User {
  id: number
  email: string
  full_name: string
  company_name: string
  tenant_id: string
  role: 'user' | 'tenant-admin'
  status: 'active' | 'inactive'
  created_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  message: string
  created_at: string
  response_time_ms?: number
}

export interface Document {
  id: string
  document_id: string
  original_filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  file_size: number
}

export interface Conversation {
  id: string
  conversation_id: string
  user_email: string
  status: string
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SignupData {
  email: string
  password: string
  full_name: string
  company_name: string
}
```

### **Phase 2: Core Infrastructure**

#### **2.1 API Service Layer**

**frontend/src/services/api.ts:**
```typescript
import axios from 'axios'
import type { ApiResponse, User, ChatMessage, Document, Conversation, SignupData } from '@/types/api'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// Request interceptor for auth
api.interceptors.request.use((config) => {
  // Add any auth headers if needed
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<User>>('/auth/login', { email, password }),
  
  signup: (userData: SignupData) =>
    api.post<ApiResponse<User>>('/auth/signup', userData),
  
  logout: () => api.post('/auth/logout'),
  
  getCurrentUser: () => api.get<ApiResponse<User>>('/user/info'),
}

export const chatApi = {
  sendMessage: (message: string, conversationId?: string) =>
    api.post<ApiResponse<ChatMessage>>('/rag/chat', { 
      message, 
      conversation_id: conversationId 
    }),
  
  getConversations: () =>
    api.get<ApiResponse<Conversation[]>>('/rag/conversations'),
  
  getConversationHistory: (conversationId: string) =>
    api.get<ApiResponse<ChatMessage[]>>(`/rag/conversation/${conversationId}`),
}

export const documentsApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('document', file)
    return api.post<ApiResponse<Document>>('/rag/upload-document', formData)
  },
  
  getDocuments: () =>
    api.get<ApiResponse<Document[]>>('/rag/documents'),
  
  deleteDocument: (documentId: string) =>
    api.delete(`/rag/document/${documentId}`),
}

export const adminApi = {
  getUsers: () => api.get<ApiResponse<User[]>>('/admin/users'),
  getMetrics: () => api.get<ApiResponse<any>>('/admin/metrics'),
}

export default api
```

#### **2.2 TanStack Query Setup**

**frontend/src/hooks/useAuth.ts:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

export const useCurrentUser = () => {
  const { setUser, setIsAuthenticated } = useAuthStore()
  
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await authApi.getCurrentUser()
      if (response.data.success && response.data.data) {
        setUser(response.data.data)
        setIsAuthenticated(true)
        return response.data.data
      }
      throw new Error('Not authenticated')
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()
  const { setUser, setIsAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    
    onSuccess: (response) => {
      if (response.data.success && response.data.data) {
        setUser(response.data.data)
        setIsAuthenticated(true)
        queryClient.setQueryData(['currentUser'], response.data.data)
        navigate('/dashboard')
      }
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  const { setUser, setIsAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setUser(null)
      setIsAuthenticated(false)
      queryClient.clear()
      navigate('/login')
    },
  })
}
```

#### **2.3 State Management with Zustand**

**frontend/src/stores/authStore.ts:**
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user }),
      setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
```

**frontend/src/stores/chatStore.ts:**
```typescript
import { create } from 'zustand'
import type { ChatMessage, Conversation } from '@/types/api'

interface ChatState {
  currentConversation: string | null
  messages: ChatMessage[]
  conversations: Conversation[]
  isLoading: boolean
  setCurrentConversation: (id: string | null) => void
  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  setConversations: (conversations: Conversation[]) => void
  setIsLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>((set) => ({
  currentConversation: null,
  messages: [],
  conversations: [],
  isLoading: false,
  setCurrentConversation: (id) => set({ currentConversation: id }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setMessages: (messages) => set({ messages }),
  setConversations: (conversations) => set({ conversations }),
  setIsLoading: (isLoading) => set({ isLoading }),
}))
```

#### **2.4 SSE Hook for Real-time Communication**

**frontend/src/hooks/useSSE.ts:**
```typescript
import { useEffect, useRef } from 'react'

interface UseSSEOptions {
  url: string | null
  onMessage: (data: any) => void
  onError?: (error: Event) => void
  onOpen?: () => void
}

export const useSSE = ({ url, onMessage, onError, onOpen }: UseSSEOptions) => {
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!url) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    // Create new connection
    const eventSource = new EventSource(url)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('SSE connection opened')
      onOpen?.()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      onError?.(error)
    }

    return () => {
      eventSource.close()
    }
  }, [url, onMessage, onError, onOpen])

  return eventSourceRef.current
}
```

### **Phase 3: Component Development**

#### **3.1 Layout Components**

**frontend/src/components/layout/DashboardLayout.tsx:**
```typescript
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileMenu } from './MobileMenu'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar */}
      <MobileMenu open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
```

**frontend/src/components/layout/Header.tsx:**
```typescript
import { Menu, Bell, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { useLogout } from '@/hooks/useAuth'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthStore()
  const logout = useLogout()

  return (
    <header className="border-b bg-background px-4 py-3 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-semibold">Resolve Onboarding</h1>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.full_name} />
                  <AvatarFallback>
                    {user?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.full_name}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout.mutate()}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
```

#### **3.2 Chat Components**

**frontend/src/components/features/chat/ChatInterface.tsx:**
```typescript
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { chatApi } from '@/services/api'
import { useChatStore } from '@/stores/chatStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { useSSE } from '@/hooks/useSSE'
import type { ChatMessage as ChatMessageType } from '@/types/api'

export function ChatInterface() {
  const { 
    currentConversation, 
    messages, 
    setMessages, 
    addMessage 
  } = useChatStore()
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Load conversation history
  const { data: history } = useQuery({
    queryKey: ['conversation', currentConversation],
    queryFn: () => currentConversation 
      ? chatApi.getConversationHistory(currentConversation)
      : null,
    enabled: !!currentConversation,
    onSuccess: (data) => {
      if (data?.data.success && data.data.data) {
        setMessages(data.data.data)
      }
    }
  })

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: ({ message, conversationId }: { 
      message: string; 
      conversationId?: string 
    }) => chatApi.sendMessage(message, conversationId),
    
    onSuccess: (response) => {
      if (response.data.success) {
        // Message will be added via SSE when AI responds
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      }
    },
  })

  // SSE for real-time messages
  useSSE({
    url: currentConversation 
      ? `/api/rag/chat-stream/${currentConversation}` 
      : null,
    onMessage: (data) => {
      if (data.type === 'chat-response') {
        const aiMessage: ChatMessageType = {
          id: data.message_id,
          conversation_id: data.conversation_id,
          role: 'assistant',
          message: data.ai_response,
          created_at: new Date().toISOString(),
          response_time_ms: data.processing_time_ms,
        }
        addMessage(aiMessage)
      }
    },
  })

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = (message: string) => {
    // Add user message immediately
    const userMessage: ChatMessageType = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation || '',
      role: 'user',
      message,
      created_at: new Date().toISOString(),
    }
    addMessage(userMessage)

    // Send to API
    sendMessageMutation.mutate({
      message,
      conversationId: currentConversation || undefined,
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Ask Rita</h2>
        <p className="text-sm text-muted-foreground">
          Build and manage your automation workflows with AI assistance
        </p>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>Hello! I'm your AI assistant. How can I help you today?</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4">
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
        />
      </div>
    </div>
  )
}
```

**frontend/src/components/features/chat/ChatMessage.tsx:**
```typescript
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bot, User } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/api'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      "flex items-start space-x-3",
      isUser ? "flex-row-reverse space-x-reverse" : ""
    )}>
      <Avatar className="h-8 w-8">
        <AvatarFallback>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2",
        isUser 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
        {message.response_time_ms && (
          <p className="text-xs opacity-70 mt-1">
            Response time: {message.response_time_ms}ms
          </p>
        )}
      </div>
    </div>
  )
}
```

**frontend/src/components/features/chat/ChatInput.tsx:**
```typescript
import { useState, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    const trimmedMessage = message.trim()
    if (trimmedMessage && !isLoading) {
      onSendMessage(trimmedMessage)
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex space-x-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask me anything about your workflows..."
        className="min-h-[40px] resize-none"
        disabled={isLoading}
      />
      
      <Button 
        onClick={handleSend}
        disabled={!message.trim() || isLoading}
        size="sm"
        className="px-3"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

#### **3.3 Document Management**

**frontend/src/components/features/documents/DocumentUpload.tsx:**
```typescript
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { documentsApi } from '@/services/api'
import { Upload, FileText, X } from 'lucide-react'

export function DocumentUpload() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: documentsApi.upload,
    onSuccess: (response) => {
      if (response.data.success) {
        toast({
          title: "Document uploaded",
          description: "Your document is being processed.",
        })
        queryClient.invalidateQueries({ queryKey: ['documents'] })
        setUploadProgress(0)
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.response?.data?.error || "Something went wrong",
        variant: "destructive",
      })
      setUploadProgress(0)
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      uploadMutation.mutate(file)
    })
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <div>
              <p className="text-sm font-medium">
                Drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, TXT (max 100MB each)
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadMutation.isPending && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Uploading document...</span>
            </div>
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => uploadMutation.reset()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={uploadProgress} className="mt-2" />
        </div>
      )}
    </div>
  )
}
```

### **Phase 4: Pages & Routing**

#### **4.1 Router Setup**

**frontend/src/App.tsx:**
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AdminPage } from '@/pages/AdminPage'
import { KnowledgePage } from '@/pages/KnowledgePage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false
        return failureCount < 3
      },
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route 
                path="admin" 
                element={
                  <ProtectedRoute requireRole="tenant-admin">
                    <AdminPage />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
      
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

export default App
```

#### **4.2 Protected Route Component**

**frontend/src/components/auth/ProtectedRoute.tsx:**
```typescript
import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requireRole?: 'user' | 'tenant-admin'
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const { data: user, isLoading, error } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
```

#### **4.3 Dashboard Page**

**frontend/src/pages/DashboardPage.tsx:**
```typescript
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatInterface } from '@/components/features/chat/ChatInterface'
import { DocumentUpload } from '@/components/features/documents/DocumentUpload'
import { DocumentList } from '@/components/features/documents/DocumentList'
import { KnowledgeBaseStats } from '@/components/features/knowledge/KnowledgeBaseStats'
import { RecentActivity } from '@/components/features/activity/RecentActivity'
import { ShareAssistant } from '@/components/features/share/ShareAssistant'
import { documentsApi } from '@/services/api'

export function DashboardPage() {
  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.getDocuments().then(res => res.data.data || []),
  })

  return (
    <div className="flex h-full space-x-6">
      {/* Left sidebar - Knowledge Base */}
      <div className="w-80 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Knowledge Base</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <KnowledgeBaseStats />
            <DocumentUpload />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documents || []} />
          </CardContent>
        </Card>
      </div>

      {/* Center - Chat Interface */}
      <div className="flex-1">
        <Card className="h-full">
          <ChatInterface />
        </Card>
      </div>

      {/* Right sidebar - Activity & Share */}
      <div className="w-80 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Share Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareAssistant />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### **Phase 5: Build & Deployment Changes**

#### **5.1 Updated Package.json Scripts**

**Root package.json updates:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:frontend\"",
    "dev:server": "nodemon --watch . --ext js,html,css --ignore node_modules/ --ignore frontend/ --ignore tests/ server.js",
    "dev:frontend": "cd frontend && npm run dev",
    
    "build": "cd frontend && npm run build",
    "build:server": "echo 'Server build complete'",
    "build:check": "cd frontend && npm run type-check",
    
    "start": "npm run build && node server.js",
    "preview": "cd frontend && npm run preview",
    
    "type-check": "cd frontend && npm run type-check",
    "lint": "cd frontend && npm run lint",
    "lint:fix": "cd frontend && npm run lint:fix",
    "test:frontend": "cd frontend && npm run test",
    
    "install:frontend": "cd frontend && npm install",
    "clean": "rm -rf dist && cd frontend && rm -rf dist node_modules"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

**Frontend package.json:**
```json
{
  "name": "resolve-onboarding-frontend",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "type-check": "tsc --noEmit"
  }
}
```

#### **5.2 Backend Changes**

**server.js updates:**
```javascript
const express = require('express')
const path = require('path')

const app = express()

// API routes (existing)
app.use('/api', require('./src/routes/api'))
app.use('/api/auth', require('./src/routes/auth'))
app.use('/api/admin', require('./src/routes/admin'))
app.use('/api/rag', require('./src/routes/ragApi'))

// Feature flag for frontend
const USE_REACT_FRONTEND = process.env.USE_REACT_FRONTEND === 'true'

if (USE_REACT_FRONTEND) {
  // Serve React app static files
  app.use(express.static(path.join(__dirname, 'dist')))
  
  // Catch-all handler for React Router
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
} else {
  // Serve legacy frontend
  app.use(express.static(path.join(__dirname, 'src/client')))
  app.use('/styles', express.static(path.join(__dirname, 'src/client/styles')))
  
  // Legacy routes
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'))
  })
  
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/client/pages/dashboard.html'))
  })
  
  // ... other legacy routes
}

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Frontend: ${USE_REACT_FRONTEND ? 'React' : 'Legacy'}`)
})
```

#### **5.3 Docker Updates**

**Updated Dockerfile:**
```dockerfile
# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies needed for building
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Frontend build stage
FROM base AS frontend-build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Backend dependencies
FROM base AS backend-deps
RUN npm ci --only=production

# Production runtime stage  
FROM node:18-alpine AS production

WORKDIR /app

# Copy backend dependencies
COPY --from=backend-deps /app/node_modules ./node_modules

# Copy backend code
COPY src/ ./src/
COPY server.js ./
COPY package.json ./

# Copy built frontend
COPY --from=frontend-build /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs logs uploads dist

USER nodejs

# Enable React frontend
ENV USE_REACT_FRONTEND=true

EXPOSE 5000

CMD ["node", "server.js"]
```

### **Phase 6: Migration Strategy**

#### **6.1 Gradual Migration Approach**

**Week 1-2: Foundation**
- [ ] Set up React project structure
- [ ] Configure build tools and TypeScript
- [ ] Create basic component library with ShadCN
- [ ] Implement authentication pages (login/signup)

**Week 3-4: Core Features**  
- [ ] Build dashboard layout and navigation
- [ ] Implement chat interface with SSE
- [ ] Add document upload functionality
- [ ] Create user management components

**Week 5-6: Feature Completion**
- [ ] Migrate admin panel functionality  
- [ ] Implement knowledge base management
- [ ] Add real-time notifications
- [ ] Build responsive mobile experience

**Week 7-8: Testing & Polish**
- [ ] Update Playwright tests for React components
- [ ] Performance optimization and bundle analysis
- [ ] Accessibility audit and improvements
- [ ] Production deployment and rollback plan

#### **6.2 Feature Flag Implementation**

**Environment Variables:**
```bash
# Development
USE_REACT_FRONTEND=true
REACT_DEV_MODE=true

# Production (gradual rollout)
USE_REACT_FRONTEND=false  # Start with legacy
ENABLE_REACT_BETA=true    # Allow beta users to opt-in
```

**User-based rollout:**
```javascript
// Middleware to check user eligibility
const shouldUseReactFrontend = (user) => {
  if (process.env.USE_REACT_FRONTEND === 'true') return true
  if (process.env.ENABLE_REACT_BETA === 'true') {
    return user?.role === 'tenant-admin' || user?.beta_features === true
  }
  return false
}
```

#### **6.3 Data Migration Considerations**

- **No Database Changes Required** - React frontend uses existing API endpoints
- **Session Compatibility** - Existing session management works with React
- **File Uploads** - Same upload endpoints and file storage
- **Chat History** - Existing conversation data loads seamlessly

### **Phase 7: Testing Strategy**

#### **7.1 Frontend Testing**

**Unit Tests (Vitest):**
```typescript
// frontend/src/components/__tests__/ChatMessage.test.tsx
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '../ChatMessage'

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      message: 'Hello AI',
      conversation_id: 'conv-1',
      created_at: '2024-01-01T00:00:00Z'
    }
    
    render(<ChatMessage message={message} />)
    expect(screen.getByText('Hello AI')).toBeInTheDocument()
  })
})
```

**Integration Tests:**
```typescript
// frontend/src/services/__tests__/api.test.ts
import { describe, it, expect } from 'vitest'
import { authApi } from '../api'

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    // Mock implementation
    const response = await authApi.login('test@example.com', 'password')
    expect(response.data.success).toBe(true)
  })
})
```

#### **7.2 E2E Testing Updates**

**Update Playwright tests for React:**
```typescript
// tests/specs/react-dashboard.spec.js
import { test, expect } from '@playwright/test'

test.describe('React Dashboard', () => {
  test('should display chat interface', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for React to render
    await page.waitForSelector('[data-testid="chat-interface"]')
    
    // Test chat functionality
    await page.fill('[placeholder="Ask me anything about your workflows..."]', 'Hello')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.chat-message').first()).toContainText('Hello')
  })
})
```

### **Benefits of Migration**

#### **1. Developer Experience**
- **TypeScript** - Catch errors at compile time
- **Hot Reload** - Instant feedback during development  
- **Modern Tooling** - VSCode IntelliSense, debugging, refactoring
- **Component Library** - Reusable, tested UI components

#### **2. Performance**
- **Code Splitting** - Load only required JavaScript
- **Tree Shaking** - Remove unused code from bundles
- **Lazy Loading** - Route-based code splitting
- **Optimized Assets** - Automatic image optimization, CSS purging

#### **3. User Experience**
- **Faster Navigation** - Client-side routing eliminates page refreshes
- **Better Responsiveness** - Mobile-first design with Tailwind
- **Improved Accessibility** - ShadCN components follow WCAG guidelines
- **Real-time Updates** - Better SSE integration and state management

#### **4. Maintainability**
- **Component Architecture** - Modular, reusable components
- **Type Safety** - Prevent runtime errors with TypeScript
- **State Management** - Predictable state with Zustand and TanStack Query
- **Testing** - Comprehensive test coverage with modern testing tools

#### **5. Scalability**
- **Team Collaboration** - Clear separation of frontend/backend concerns
- **Feature Development** - Faster iteration with hot reload and type safety
- **Performance Monitoring** - Built-in React DevTools and query devtools
- **Deployment Flexibility** - Can deploy frontend separately if needed

This comprehensive migration plan provides a roadmap for transforming the current vanilla HTML/JS frontend into a modern, scalable React application while maintaining compatibility with the existing backend infrastructure.