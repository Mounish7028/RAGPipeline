import React, { useState } from 'react'
import { useStore } from '../store'
import { Terminal, Copy, Check, ChevronDown, ChevronRight, Cpu } from 'lucide-react'

export default function PromptInspector() {
  const { 
    latestQuery, 
    latestPrompt, 
    retrievedChunks, 
    latestLatency, 
    tokenUsageEstimate 
  } = useStore()
  
  const [copied, setCopied] = useState(false)
  const [expandPrompt, setExpandPrompt] = useState(true)

  const handleCopy = () => {
    if (!latestPrompt) return
    navigator.clipboard.writeText(latestPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!latestQuery) {
    return (
      <div className="glass p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
        <Terminal className="h-8 w-8 text-slate-600 mb-2" />
        <p className="font-space text-sm font-semibold text-slate-400">Developer Console Offline</p>
        <p className="text-xs text-slate-500 mt-1 max-w-[280px] text-center">
          Developer console triggers telemetry after a question is asked. Send a message to inspect the prompt assembly.
        </p>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl border border-slate-800 overflow-hidden font-mono text-xs flex flex-col h-[480px]">
      {/* Console Header */}
      <div className="bg-[#03060b] px-4 py-3 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-slate-300 font-semibold uppercase tracking-wider font-space">
            Prompt Assembly Inspector
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <Cpu className="h-3.5 w-3.5" />
            <span>LLM Sandbox</span>
          </span>
          <button
            onClick={handleCopy}
            className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors"
            title="Copy Final Prompt"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Telemetry Stats Bar */}
      <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-900 flex justify-between items-center text-[10px] text-slate-400">
        <div>
          <span className="text-slate-600">Latency:</span>{' '}
          <span className="text-accent">{(latestLatency / 1000).toFixed(3)}s</span>
        </div>
        <div>
          <span className="text-slate-600">Prompt Tokens:</span>{' '}
          <span className="text-slate-300">~{tokenUsageEstimate.promptTokens}</span>
        </div>
        <div>
          <span className="text-slate-600">Completion Tokens:</span>{' '}
          <span className="text-slate-300">~{tokenUsageEstimate.completionTokens}</span>
        </div>
        <div>
          <span className="text-slate-600">Total Tokens:</span>{' '}
          <span className="text-primary font-bold">~{tokenUsageEstimate.total}</span>
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#05080e]/50">
        {/* User Query Block */}
        <div className="space-y-1">
          <div className="text-[10px] text-primary uppercase font-bold tracking-wider font-space">
            [1] Raw User Query
          </div>
          <div className="bg-[#03060b] p-3 rounded-lg border border-slate-900 text-slate-200">
            {latestQuery}
          </div>
        </div>

        {/* Retrieved Chunks Block */}
        <div className="space-y-1">
          <div className="text-[10px] text-accent uppercase font-bold tracking-wider font-space">
            [2] Retrieval Results (Top-K Chunks)
          </div>
          <div className="space-y-2">
            {retrievedChunks.map((chunk, idx) => (
              <div 
                key={idx} 
                className="bg-[#03060b] p-2.5 rounded-lg border border-slate-900/80 text-[11px] space-y-1.5"
              >
                <div className="flex justify-between items-center text-[9px] text-slate-500 border-b border-slate-900 pb-1 font-sans">
                  <span className="font-mono">SOURCE CHUNK {chunk.chunk_index}</span>
                  <span className="text-accent font-mono font-bold">
                    Cosine Score: {chunk.score.toFixed(4)}
                  </span>
                </div>
                <p className="text-slate-300 italic leading-relaxed">
                  "{chunk.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Final Prompt Payload */}
        <div className="space-y-1">
          <button
            onClick={() => setExpandPrompt(!expandPrompt)}
            className="flex items-center gap-1.5 text-[10px] text-purple-400 uppercase font-bold tracking-wider font-space hover:text-purple-300 transition-colors"
          >
            {expandPrompt ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            [3] Assembled System Prompt Payload
          </button>
          
          {expandPrompt && (
            <div className="bg-[#03060b] p-3 rounded-lg border border-slate-900 text-slate-400 leading-relaxed max-h-48 overflow-y-auto select-text">
              <span className="text-purple-400 font-bold"># SYSTEM INSTRUCTION:</span>
              <p className="mt-1 mb-3 text-slate-300">
                You are a strict RAG assistant. Only use the provided document excerpts below to answer. 
                Do NOT use external knowledge. If the answer cannot be found in the excerpts, reply exactly: 
                "I don't know based on the document." Answer concisely and cite source chunk numbers.
              </p>
              
              <span className="text-purple-400 font-bold"># RETRIEVED CONTEXT REFERENCE:</span>
              <div className="mt-1 space-y-1 border-l-2 border-slate-800 pl-3">
                {retrievedChunks.map((chunk) => (
                  <div key={chunk.chunk_index} className="mb-2">
                    <span className="text-slate-500">Source chunk {chunk.chunk_index}:</span>{' '}
                    <span className="text-slate-400 text-gradient-green">{chunk.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
