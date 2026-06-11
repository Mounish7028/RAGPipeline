import { create } from 'zustand'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: string
  latency?: number
  retrieved?: RetrievedChunk[]
}

export interface RetrievedChunk {
  text: string
  chunk_index: number
  score: number
}

export interface UploadProgress {
  status: 'idle' | 'queued' | 'extracting' | 'chunking' | 'embedding' | 'ready' | 'error'
  progress: number
  message: string
  document_name: string | null
  chunk_count: number
  error: string | null
}

export interface LatencyData {
  time: string
  latency: number
  score: number
}

interface AppState {
  // RAG Platform State
  documentName: string | null
  chatHistory: Message[]
  uploadProgress: UploadProgress
  retrievedChunks: RetrievedChunk[]
  activeTab: 'dashboard' | 'chat' | 'analytics' | 'settings'
  sidebarOpen: boolean
  sessionId: string | null
  
  // Developer/Prompt Inspector details
  latestQuery: string
  latestPrompt: string
  latestLatency: number
  tokenUsageEstimate: { promptTokens: number; completionTokens: number; total: number }
  
  // Performance History (for analytics charts)
  latencyHistory: LatencyData[]
  
  // Actions
  setTab: (tab: 'dashboard' | 'chat' | 'analytics' | 'settings') => void
  toggleSidebar: () => void
  initializeState: () => void
  fetchUploadStatus: () => Promise<void>
  uploadFile: (file: File) => Promise<void>
  submitQuery: (question: string) => Promise<void>
  clearChat: () => void
}

export const useStore = create<AppState>((set, get) => ({
  documentName: null,
  chatHistory: [],
  uploadProgress: {
    status: 'idle',
    progress: 0,
    message: 'No document uploaded.',
    document_name: null,
    chunk_count: 0,
    error: null,
  },
  retrievedChunks: [],
  activeTab: 'dashboard',
  sidebarOpen: true,
  sessionId: null,
  latestQuery: '',
  latestPrompt: '',
  latestLatency: 0,
  tokenUsageEstimate: { promptTokens: 0, completionTokens: 0, total: 0 },
  latencyHistory: [],

  setTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  initializeState: () => {
    // Read from window.__INITIAL_STATE__ if injected
    const win = window as any
    if (win.__INITIAL_STATE__) {
      const docName = win.__INITIAL_STATE__.documentName || null
      const rawHistory = win.__INITIAL_STATE__.chatHistory || []
      
      const parsedHistory: Message[] = rawHistory.map((item: any, idx: number) => ({
        role: item.role,
        content: item.content,
        timestamp: new Date(Date.now() - (rawHistory.length - idx) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }))

      set({
        documentName: docName,
        chatHistory: parsedHistory,
        uploadProgress: docName ? {
          status: 'ready',
          progress: 100,
          message: 'Upload complete. The RAG pipeline is ready.',
          document_name: docName,
          chunk_count: Math.max(12, parsedHistory.length * 3),
          error: null
        } : get().uploadProgress
      })
    }
    
    // Check health endpoint for status of vector store count
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok' && data.chroma_docs > 0) {
          set((state) => ({
            documentName: state.documentName || 'ChromaDB Persisted Store',
            uploadProgress: {
              status: 'ready',
              progress: 100,
              message: `Loaded persisted ChromaDB collection with ${data.chroma_docs} chunks.`,
              document_name: state.documentName || 'Persisted DB Collection',
              chunk_count: data.chroma_docs,
              error: null
            }
          }))
        }
      })
      .catch(e => console.error('Health check fail:', e))
  },

  fetchUploadStatus: async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      
      // Map Flask status ("idle" | "running" | "done" | "error") to react store status
      const mappedStatus = 
        data.status === 'done' ? 'ready' :
        data.status === 'running' ? 'embedding' : // Ingestion step
        data.status === 'error' ? 'error' :
        data.status === 'idle' ? 'idle' : 'idle'

      set((state) => ({
        uploadProgress: {
          status: mappedStatus,
          progress: data.progress || 0,
          message: data.message || '',
          document_name: state.uploadProgress.document_name || state.documentName,
          chunk_count: data.total_chunks || 0,
          error: data.status === 'error' ? data.message : null,
        },
        documentName: data.status === 'done' ? (state.uploadProgress.document_name || 'Annual Report PDF') : state.documentName
      }))
    } catch (err) {
      console.error('Error fetching upload status:', err)
    }
  },

  uploadFile: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    set({
      uploadProgress: {
        status: 'queued',
        progress: 5,
        message: 'Uploading document to Flask...',
        document_name: file.name,
        chunk_count: 0,
        error: null,
      }
    })

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      
      if (response.status >= 400) {
        set({
          uploadProgress: {
            status: 'error',
            progress: 0,
            message: data.error || 'Upload failed',
            document_name: file.name,
            chunk_count: 0,
            error: data.error || 'Upload failed',
          }
        })
        return
      }

      // Start polling status
      const pollInterval = setInterval(async () => {
        await get().fetchUploadStatus()
        const currentStatus = get().uploadProgress.status
        if (currentStatus === 'ready' || currentStatus === 'error') {
          clearInterval(pollInterval)
          if (currentStatus === 'ready') {
            const systemMsg: Message = {
              role: 'system',
              content: `Ingested and parsed document ${file.name} successfully.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
            set((state) => ({
              chatHistory: [...state.chatHistory, systemMsg],
              documentName: file.name
            }))
          }
        }
      }, 800)

    } catch (err: any) {
      set({
        uploadProgress: {
          status: 'error',
          progress: 0,
          message: err.message || 'Network error during upload',
          document_name: file.name,
          chunk_count: 0,
          error: err.message || 'Network error during upload',
        }
      })
    }
  },

  submitQuery: async (question: string) => {
    const startTime = performance.now()
    const userMsg: Message = {
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    set((state) => ({
      chatHistory: [...state.chatHistory, userMsg],
      latestQuery: question
    }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: question,
          session_id: get().sessionId
        }),
      })
      const data = await response.json()
      const endTime = performance.now()
      const latencyMs = Math.round(endTime - startTime)

      if (response.status < 400 && data.answer) {
        // Map backend sources to retrievedChunks structure
        const sources = (data.sources || []) as any[]
        const retrieved: RetrievedChunk[] = sources.map((s, idx) => ({
          text: s.excerpt || '',
          chunk_index: s.page || 0, // In this app we cite page numbers
          score: 1.0 - (idx * 0.05) // Estimate a rank score since distance is not sent to front
        }))

        // Create developer console representation
        const contextStr = retrieved
          .map((r) => `[Chunk / Page ${r.chunk_index}]\n${r.text}`)
          .join('\n\n')
        
        const systemPrompt = `You are NvidiaBot, an expert AI financial analyst assistant...`
        const simulatedPrompt = `CONTEXT FROM ANNUAL REPORT:\n${contextStr}\n\nUSER QUESTION: ${question}`

        // Token estimates
        const promptTokens = Math.round((simulatedPrompt.length + systemPrompt.length) / 4)
        const completionTokens = Math.round(data.answer.length / 4)

        const assistantMsg: Message = {
          role: 'assistant',
          content: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          latency: latencyMs,
          retrieved: retrieved
        }

        const newLatencyHistory: LatencyData = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          latency: latencyMs / 1000,
          score: data.mode === 'rag' ? 0.9 : 0.4
        }

        set((state) => ({
          chatHistory: [...state.chatHistory, assistantMsg],
          retrievedChunks: retrieved,
          sessionId: data.session_id || state.sessionId,
          latestPrompt: systemPrompt + '\n\n' + simulatedPrompt,
          latestLatency: latencyMs,
          tokenUsageEstimate: {
            promptTokens,
            completionTokens,
            total: promptTokens + completionTokens
          },
          latencyHistory: [...state.latencyHistory.slice(-9), newLatencyHistory]
        }))
      } else {
        const assistantErrorMsg: Message = {
          role: 'assistant',
          content: `Query failed: ${data.error || 'Server error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        set((state) => ({
          chatHistory: [...state.chatHistory, assistantErrorMsg]
        }))
      }
    } catch (err: any) {
      const assistantErrorMsg: Message = {
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to contact server'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      set((state) => ({
        chatHistory: [...state.chatHistory, assistantErrorMsg]
      }))
    }
  },

  clearChat: () => {
    // Call clear session endpoint
    const sessId = get().sessionId
    if (sessId) {
      fetch('/api/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session_id: sessId })
      }).catch(e => console.error('Failed to clear session:', e))
    }

    set({
      chatHistory: [],
      retrievedChunks: [],
      latestQuery: '',
      latestPrompt: '',
      latestLatency: 0,
      sessionId: null
    })
  }
}))
