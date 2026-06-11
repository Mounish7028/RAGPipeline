import React from 'react'
import { useStore } from '../store'
import { 
  Sliders, 
  Cpu, 
  Database, 
  Settings, 
  Monitor, 
  HardDrive, 
  Network 
} from 'lucide-react'

export default function SettingsView() {
  const { uploadProgress } = useStore()
  
  const systemMetrics = [
    { label: 'Host Engine', value: 'Flask WSGI / Python App', icon: Network },
    { label: 'Language Core', value: 'Python 3.12.0', icon: Cpu },
    { label: 'Embedding Spec', value: 'BAAI/bge-large-en-v1.5', icon: Database },
    { label: 'Generative Model', value: 'gemini-2.5-flash', icon: Cpu },
    { label: 'Vector Store', value: 'ChromaDB (hnsw:cosine)', icon: HardDrive },
    { label: 'System Theme', value: 'NexI Dark Theme (Default)', icon: Monitor }
  ]

  return (
    <div className="space-y-6">
      
      {/* Settings Title */}
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-space font-bold text-lg text-slate-200">System Settings</h3>
          <p className="text-xs text-slate-400">View RAG pipelines parameters and backend engine telemetry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: System Telemetry */}
        <div className="md:col-span-2 space-y-4">
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-space font-semibold text-sm text-slate-200 border-b border-slate-800 pb-2">
              Hardware & Environment Specs
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {systemMetrics.map((metric, idx) => {
                const Icon = metric.icon
                return (
                  <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-slate-500">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">
                        {metric.label}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 font-sans">
                        {metric.value}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Model info details */}
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-3">
            <h4 className="font-space font-semibold text-sm text-slate-200">
              Pipeline Parameters
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              NexI ChatBot runs on a strict relevance-gated configuration. The RAG architecture filters queries using a Cosine Distance threshold, reverting to generic knowledge if no high-confidence chunks are retrieved.
            </p>
            
            <div className="bg-[#030712] p-4 rounded-xl border border-slate-900 text-[11px] font-mono text-slate-400 space-y-2">
              <div className="flex justify-between">
                <span>relevance_threshold</span>
                <span className="text-primary font-bold">0.35 (Cosine Distance)</span>
              </div>
              <div className="flex justify-between">
                <span>max_history_turns</span>
                <span className="text-slate-300">10 conversation turns</span>
              </div>
              <div className="flex justify-between">
                <span>embedding_batch_size</span>
                <span className="text-slate-300">32 Chunks / request</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Stats Column */}
        <div className="space-y-4">
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="font-space font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-primary" />
              RAG Constants
            </h4>
            
            {/* Chunk Size slider simulation */}
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Target Chunk Size</span>
                  <span className="text-primary font-bold">800 chars</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full">
                  <div className="h-full bg-primary w-[65%] rounded-full"></div>
                </div>
                <span className="text-[10px] text-slate-500">Overlap boundary: 80 chars</span>
              </div>

              <hr className="border-slate-800/80" />

              {/* Top-K neighbors */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Neighbors Retrieved (K)</span>
                  <span className="text-accent font-bold">6 Chunks</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full">
                  <div className="h-full bg-accent w-[60%] rounded-full"></div>
                </div>
                <span className="text-[10px] text-slate-500">Yields up to 4,800 context chars</span>
              </div>
            </div>
          </div>

          {/* Database Specs Card */}
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-3 bg-[#03060b]/40">
            <h5 className="text-xs font-bold text-slate-300 font-space uppercase">Indices Memory Load</h5>
            
            <div className="flex justify-between items-end">
              <div>
                <span className="text-2xl font-bold font-space text-slate-200">
                  {uploadProgress.chunk_count}
                </span>
                <span className="text-[10px] text-slate-500 block">Active Vectors</span>
              </div>
              <span className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                Active Node
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
