import React from 'react'
import { useStore } from '../store'
import { 
  Database, 
  Layers, 
  Binary, 
  Activity, 
  Gauge, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react'

export default function DocumentAnalytics() {
  const { uploadProgress, latencyHistory } = useStore()
  
  const chunkCount = uploadProgress.chunk_count || 0
  const documentUploaded = uploadProgress.status === 'ready'
  
  // Calculate analytics estimates
  const estPages = Math.ceil(chunkCount / 4)
  const avgChunkSizeWords = chunkCount > 0 ? 180 : 0
  const totalEmbeddings = chunkCount
  
  // Latency metrics
  const latestLatency = latencyHistory.length > 0 
    ? latencyHistory[latencyHistory.length - 1].latency 
    : 0
  
  const avgLatency = latencyHistory.length > 0
    ? (latencyHistory.reduce((sum, item) => sum + item.latency, 0) / latencyHistory.length).toFixed(2)
    : '0.00'
  
  const avgSimilarity = latencyHistory.length > 0
    ? (latencyHistory.reduce((sum, item) => sum + item.score, 0) / latencyHistory.length).toFixed(2)
    : '0.00'

  // Generate SVG coordinates for latency chart
  const sparklinePoints = React.useMemo(() => {
    if (latencyHistory.length < 2) return ''
    const maxVal = Math.max(...latencyHistory.map(h => h.latency), 0.5)
    const minVal = Math.min(...latencyHistory.map(h => h.latency), 0)
    const range = maxVal - minVal || 1
    
    const width = 500
    const height = 120
    const padding = 10
    
    return latencyHistory.map((item, idx) => {
      const x = padding + (idx / (latencyHistory.length - 1)) * (width - padding * 2)
      const y = height - padding - ((item.latency - minVal) / range) * (height - padding * 2)
      return `${x},${y}`
    }).join(' ')
  }, [latencyHistory])

  return (
    <div className="space-y-6">
      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pages */}
        <div className="glass p-4 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-primary/30 transition-all duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase tracking-wider font-semibold font-space">Doc Volumes</span>
            <Layers className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <h4 className="text-2xl font-bold font-space text-slate-100">
              {documentUploaded ? estPages : '0'}
            </h4>
            <p className="text-[10px] text-slate-400">Estimated Pages Processed</p>
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-primary/5 rounded-tl-2xl group-hover:bg-primary/10 transition-colors"></div>
        </div>

        {/* Chunks */}
        <div className="glass p-4 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-primary/30 transition-all duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase tracking-wider font-semibold font-space">Indexed Chunks</span>
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-2xl font-bold font-space text-primary">
              {chunkCount}
            </h4>
            <p className="text-[10px] text-slate-400">Vector Slices Generated</p>
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-primary/5 rounded-tl-2xl group-hover:bg-primary/10 transition-colors"></div>
        </div>

        {/* Embeddings */}
        <div className="glass p-4 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-primary/30 transition-all duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase tracking-wider font-semibold font-space">Vector Dimension</span>
            <Binary className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <h4 className="text-2xl font-bold font-space text-slate-100">
              {documentUploaded ? '1,024' : '0'}
            </h4>
            <p className="text-[10px] text-slate-400">Dense Embedding dimensions</p>
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-primary/5 rounded-tl-2xl group-hover:bg-primary/10 transition-colors"></div>
        </div>

        {/* Average Similarity Score */}
        <div className="glass p-4 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden group hover:border-primary/30 transition-all duration-200">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] uppercase tracking-wider font-semibold font-space">Avg Match Score</span>
            <Gauge className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h4 className="text-2xl font-bold font-space text-accent">
              {latencyHistory.length > 0 ? `${(parseFloat(avgSimilarity) * 100).toFixed(0)}%` : '0.00%'}
            </h4>
            <p className="text-[10px] text-slate-400">Cosine Similarity Average</p>
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 bg-accent/5 rounded-tl-2xl group-hover:bg-accent/10 transition-colors"></div>
        </div>
      </div>

      {/* Latency History Chart Panel */}
      <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-primary" />
            <div>
              <h4 className="font-space text-sm font-semibold text-slate-200">Engine Response Performance</h4>
              <p className="text-[11px] text-slate-400">Tracks API query execution latency in seconds</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500">Avg Latency:</span>{' '}
              <span className="text-slate-200 font-semibold">{avgLatency}s</span>
            </div>
            <div>
              <span className="text-slate-500">Latest:</span>{' '}
              <span className="text-slate-200 font-semibold">{latestLatency.toFixed(2)}s</span>
            </div>
          </div>
        </div>

        {/* Chart Window */}
        <div className="h-[140px] w-full bg-[#030712]/60 rounded-xl relative overflow-hidden border border-slate-900/60 flex items-center justify-center">
          {latencyHistory.length >= 2 ? (
            <svg viewBox="0 0 500 120" className="w-full h-full p-2 overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#76b900" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#76b900" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Fill Area */}
              <polygon
                points={`10,110 ${sparklinePoints} 490,110`}
                fill="url(#chartGlow)"
              />
              {/* Line */}
              <polyline
                fill="none"
                stroke="#76b900"
                strokeWidth="2"
                points={sparklinePoints}
              />
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="4,4" />
            </svg>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500 p-4">
              <AlertCircle className="h-5 w-5 text-slate-600" />
              <span className="text-xs font-mono text-center">No telemetry data available. Submit queries inside the NexI Chatbot to log latency records.</span>
            </div>
          )}
        </div>
      </div>

      {/* RAG Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass p-4 rounded-xl space-y-2">
          <h5 className="font-space font-semibold text-xs text-slate-300 uppercase tracking-wider">Storage Index Specs</h5>
          <div className="space-y-1.5 text-xs text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Database Engine</span>
              <span className="text-slate-200">Local Vector Map</span>
            </div>
            <div className="flex justify-between">
              <span>Chunking Configuration</span>
              <span className="text-slate-200">{avgChunkSizeWords} words (overlap 50)</span>
            </div>
            <div className="flex justify-between">
              <span>Embedding Weights</span>
              <span className="text-slate-200">bge-large-en-v1.5</span>
            </div>
          </div>
        </div>

        <div className="glass p-4 rounded-xl space-y-2">
          <h5 className="font-space font-semibold text-xs text-slate-300 uppercase tracking-wider">Retrieval Query Specs</h5>
          <div className="space-y-1.5 text-xs text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Similarity Metric</span>
              <span className="text-slate-200">Cosine Distance (L2)</span>
            </div>
            <div className="flex justify-between">
              <span>Top-K Neighbors (K)</span>
              <span className="text-slate-200">5 Context Chunks</span>
            </div>
            <div className="flex justify-between">
              <span>Context Length Limit</span>
              <span className="text-slate-200">1,500 characters</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
