import React from 'react'
import { useStore } from '../store'
import ThreeVisualization from './ThreeVisualization'
import { FileText, Cpu, Database, Award, ArrowRight, Shield, Globe } from 'lucide-react'

// Sub-component for metric cards
function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  colorClass 
}: { 
  icon: React.ComponentType<any>
  title: string
  value: string | number
  subtitle: string
  colorClass: string 
}) {
  return (
    <div className="glass p-5 rounded-2xl border border-slate-800 flex items-center gap-4 relative overflow-hidden group hover:border-primary/20 transition-all duration-200">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold font-space">
          {title}
        </span>
        <h4 className="text-2xl font-bold font-space text-slate-100 leading-tight">
          {value}
        </h4>
        <p className="text-[10px] text-slate-400">
          {subtitle}
        </p>
      </div>
      <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-slate-900/10 rounded-tl-2xl group-hover:bg-slate-900/40 transition-colors"></div>
    </div>
  )
}

export default function HeroDashboard() {
  const { uploadProgress, chatHistory, setTab, documentName } = useStore()
  
  const chunkCount = uploadProgress.chunk_count || 0
  const isDocLoaded = uploadProgress.status === 'ready'
  
  // Stats
  const pagesProcessed = isDocLoaded ? Math.ceil(chunkCount / 4) : 0
  const queryCount = chatHistory.filter(m => m.role === 'user').length

  return (
    <div className="space-y-6">
      
      {/* Hero Section Banner */}
      <div className="relative rounded-2xl overflow-hidden glass p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
        
        {/* Glowing aura effect */}
        <div className="absolute -top-12 -left-12 h-48 w-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 h-48 w-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="space-y-3 z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold font-space uppercase text-primary tracking-wider">
            <Shield className="h-3 w-3" />
            NexI AI Enterprise Node
          </span>
          <h1 className="text-3xl md:text-4xl font-space font-extrabold tracking-tight text-white leading-tight">
            Financial Intelligence <span className="text-gradient-cyan">Powered by AI</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            Perform enterprise-grade semantic querying, document indexing, and RAG tracking through local vector representations. Zero external leaking of financial telemetry data.
          </p>
        </div>

        {/* Action Button CTA */}
        <div className="z-10 flex-shrink-0">
          <button
            onClick={() => setTab(isDocLoaded ? 'chat' : 'dashboard')}
            className="flex items-center gap-2 py-3 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold font-space uppercase tracking-wider transition-all duration-200 shadow-[0_4px_20px_-4px_rgba(118,185,0,0.4)] active:scale-95"
          >
            {isDocLoaded ? 'Enter Chat Console' : 'Upload File to Start'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          title="Pages Parsed"
          value={pagesProcessed}
          subtitle="Estimated Document Pages"
          colorClass="text-slate-400"
        />
        <StatCard
          icon={Database}
          title="Chunks Carved"
          value={chunkCount}
          subtitle="Text partition slices"
          colorClass="text-primary"
        />
        <StatCard
          icon={Cpu}
          title="Embeddings Generated"
          value={chunkCount}
          subtitle="1024-Dimension Vectors"
          colorClass="text-accent"
        />
        <StatCard
          icon={Award}
          title="Queries Solved"
          value={queryCount}
          subtitle="Total prompts resolved"
          colorClass="text-purple-400"
        />
      </div>

      {/* 3D Visualizer Panel */}
      <ThreeVisualization />

      {/* Trust Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4 rounded-xl flex items-start gap-3">
          <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-slate-300 font-space uppercase">Enterprise Compliance</h5>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
              Vector stores run fully in-memory, ensuring raw text extractions expire safely at session shutdown.
            </p>
          </div>
        </div>
        <div className="glass p-4 rounded-xl flex items-start gap-3">
          <Globe className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-slate-300 font-space uppercase">Context Grounding</h5>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
              Model answers are grounded strictly in the source coordinates of matching chunks to prevent hallucinations.
            </p>
          </div>
        </div>
        <div className="glass p-4 rounded-xl flex items-start gap-3">
          <Cpu className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-slate-300 font-space uppercase">Hardware Accelerated</h5>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
              Calculates high-speed cosine similarities locally using numpy matrix norms inside the backend client.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
