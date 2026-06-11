import React, { useState, useRef, useEffect } from 'react'
import { useStore, RetrievedChunk } from '../store'
import { 
  Send, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Download, 
  BookOpen, 
  Clock, 
  FileArchive,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// Typing Animation helper
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1 px-3 bg-slate-900 rounded-xl w-16 border border-slate-800">
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  )
}

// Collapsible Citation Inspector inside message
function MessageCitationInspector({ retrieved }: { retrieved: RetrievedChunk[] }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!retrieved || retrieved.length === 0) return null

  return (
    <div className="mt-3 border-t border-slate-800/80 pt-2.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono tracking-wider hover:text-primary transition-colors"
      >
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        RETRIVAL FOOTPRINT ({retrieved.length} CHUNKS)
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1.5 pl-2 border-l border-primary/30 animate-fadeIn">
          {retrieved.map((chunk, idx) => (
            <div key={idx} className="bg-slate-950/60 p-2 rounded border border-slate-900 text-[11px] space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>CHUNK #{chunk.chunk_index}</span>
                <span className="text-primary font-bold">Similarity: {(chunk.score * 100).toFixed(1)}%</span>
              </div>
              <p className="text-slate-300 italic">"{chunk.text}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatInterface() {
  const { 
    chatHistory, 
    uploadProgress, 
    uploadFile, 
    submitQuery, 
    documentName 
  } = useStore()

  const [question, setQuestion] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Suggestion chips
  const suggestionChips = [
    'What is the main summary of this document?',
    'Identify any key performance highlights.',
    'Are there any risk items or critical dates mentioned?',
    'What are the core conclusions of the author?'
  ]

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  // Handle Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith('.txt') || file.name.endsWith('.pdf')) {
        await uploadFile(file)
      }
    }
  }

  // Handle Input File Select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0])
    }
  }

  // Trigger File Dialog
  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  // Handle Send Question
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || submitting || !documentName) return

    setSubmitting(true)
    const q = question
    setQuestion('')
    await submitQuery(q)
    setSubmitting(false)
  }

  // Copy to clipboard helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Export chat as markdown file
  const handleExportChat = () => {
    if (chatHistory.length === 0) return
    const mdContent = chatHistory.map(m => `### ${m.role.toUpperCase()}\n${m.content}\n`).join('\n')
    const blob = new Blob([mdContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexi-chat-export-${new Date().toISOString().slice(0,10)}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Parse citations in text like (3) or (Source chunk 4) into hoverable custom tags
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\(\d+\)|Source chunk \d+)/i)
    return parts.map((part, idx) => {
      const isCitation = /\(\d+\)|Source chunk \d+/i.test(part)
      if (isCitation) {
        const num = part.replace(/\D/g, '')
        return (
          <span 
            key={idx} 
            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[10px] font-mono font-extrabold rounded bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all cursor-default select-none"
            title={`Referenced from index chunk ${num}`}
          >
            #{num}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className="flex flex-col h-full bg-[#030712] max-w-5xl mx-auto rounded-2xl border border-slate-800 overflow-hidden relative">
      
      {/* File Dropzone & Processing HUD */}
      {!documentName ? (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex-1 flex flex-col items-center justify-center p-8 transition-all duration-300 ${
            dragActive ? 'bg-primary/5 border-2 border-dashed border-primary scale-[0.99]' : 'bg-[#05080e]/50 border-2 border-dashed border-slate-800/80'
          } rounded-2xl m-4`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".txt,.pdf" 
            className="hidden" 
          />
          
          <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
            <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg group-hover:border-primary/50 transition-all duration-300">
              <Upload className="h-7 w-7 text-slate-500 hover:text-primary transition-colors" />
            </div>
            
            <div>
              <h3 className="font-space font-bold text-lg text-slate-200">Ingest Document Asset</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Drag and drop your financial or research reports (<code className="text-[10px] text-primary">.txt</code> or <code className="text-[10px] text-primary">.pdf</code>) here to begin semantic vector mapping.
              </p>
            </div>

            <button
              onClick={triggerFileSelect}
              className="py-2.5 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold font-space uppercase tracking-wider transition-all duration-200 shadow-md active:scale-95"
            >
              Select Local File
            </button>
          </div>

          {/* Upload Progress Timelines */}
          {uploadProgress.status !== 'idle' && (
            <div className="mt-8 w-full max-w-md bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl animate-fadeIn">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
                  Mapping Pipeline
                </span>
                <span className="font-bold text-primary font-mono">{uploadProgress.progress}%</span>
              </div>
              
              {/* Progress Slider */}
              <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>

              {/* Progress Step Timelines */}
              <div className="space-y-2 text-[11px] font-mono border-t border-slate-850 pt-3">
                <div className="flex items-center justify-between">
                  <span className={uploadProgress.progress >= 15 ? 'text-slate-200' : 'text-slate-600'}>
                    [1] Document Text Extraction
                  </span>
                  {uploadProgress.progress >= 15 && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className={uploadProgress.progress >= 35 ? 'text-slate-200' : 'text-slate-600'}>
                    [2] Dynamic Chunking Slices
                  </span>
                  {uploadProgress.progress >= 35 && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className={uploadProgress.progress >= 50 ? 'text-slate-200' : 'text-slate-600'}>
                    [3] Embeddings Generation
                  </span>
                  {uploadProgress.progress >= 95 && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic text-center">
                "{uploadProgress.message}"
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Active Chat Workspace */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Chat Header HUD */}
          <div className="px-5 py-3.5 border-b border-slate-800 bg-[#070b13]/80 flex justify-between items-center backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="font-space font-semibold text-xs uppercase tracking-wider text-slate-200">
                  NexI Intelligence Workspace
                </h4>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 max-w-[280px] md:max-w-md truncate">
                  <span>Active Doc:</span>
                  <span className="font-semibold text-slate-300 truncate">{documentName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportChat}
                className="p-2 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 hover:text-white transition-colors"
                title="Export Logs"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Message History Scroller */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#05080e]/30">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-8 space-y-3">
                <BookOpen className="h-8 w-8 text-slate-600" />
                <h4 className="font-space font-bold text-sm text-slate-400">Pipeline Loaded Successfully</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  The semantic vectors are indexed. You can use the follow-up prompts below or query anything relative to the content.
                </p>

                {/* Initial suggestion chips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 max-w-lg w-full">
                  {suggestionChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuestion(chip)}
                      className="p-3 text-left rounded-xl border border-slate-800 bg-[#070b13] hover:border-primary/50 text-[11px] text-slate-400 hover:text-primary transition-all duration-200 active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, idx) => {
                const isUser = msg.role === 'user'
                const isSystem = msg.role === 'system'

                if (isSystem) {
                  return (
                    <div key={idx} className="flex justify-center">
                      <div className="text-[10px] font-mono uppercase bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full text-slate-500 flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        {msg.content}
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slideIn`}>
                    <div 
                      className={`max-w-[85%] rounded-2xl p-4 space-y-2 relative border ${
                        isUser 
                          ? 'bg-slate-900/60 border-slate-800/80 text-slate-200' 
                          : 'bg-[#070b13] border-primary/20 hover:border-primary/30 shadow-[0_4px_20px_-4px_rgba(118,185,0,0.05)] text-slate-100'
                      }`}
                    >
                      {/* Message role indicator */}
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-b border-slate-850 pb-1.5 mb-1.5">
                        <span className={`uppercase font-bold tracking-wider ${isUser ? 'text-slate-400' : 'text-primary'}`}>
                          {isUser ? 'User Request' : 'NexI Engine'}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {msg.latency && (
                            <span className="flex items-center gap-0.5 text-accent">
                              <Clock className="h-2.5 w-2.5" />
                              {(msg.latency / 1000).toFixed(2)}s
                            </span>
                          )}
                          <button 
                            onClick={() => handleCopyText(msg.content)}
                            className="hover:text-white transition-colors"
                            title="Copy Content"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Text content with parsed citations */}
                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                        {isUser ? msg.content : renderMessageContent(msg.content)}
                      </p>

                      {/* Expandable chunk reference footprints */}
                      {!isUser && msg.retrieved && (
                        <MessageCitationInspector retrieved={msg.retrieved} />
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Typing Loader animation when loading */}
            {submitting && (
              <div className="flex justify-start animate-slideIn">
                <div className="bg-[#070b13] border border-primary/10 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-[9px] font-mono text-slate-500">
                    <span className="uppercase font-bold tracking-wider text-primary">NexI Engine</span>
                    <span>is thinking...</span>
                  </div>
                  <TypingIndicator />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Question Input Zone */}
          <div className="p-4 border-t border-slate-800 bg-[#070b13]/60 backdrop-blur-md">
            <form onSubmit={handleSend} className="relative flex gap-2">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask NexI intelligence a question about the uploaded document..."
                rows={1}
                required
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary/50 resize-none max-h-24 pr-12 min-h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
              />
              <button
                type="submit"
                disabled={!question.trim() || submitting}
                className="absolute right-2.5 top-2.5 h-7 w-7 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all duration-200 disabled:bg-slate-800 disabled:text-slate-600 disabled:scale-100 active:scale-90"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1">
              <span>Enter to send, Shift+Enter for new line</span>
              <span>Running local vector store queries</span>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
