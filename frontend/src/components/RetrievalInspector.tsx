import React from 'react'
import { useStore } from '../store'
import { Layers, Eye, Percent, FileCode, Sliders } from 'lucide-react'

export default function RetrievalInspector() {
  const retrievedChunks = useStore((state) => state.retrievedChunks)
  const documentName = useStore((state) => state.documentName)

  // Calculate total characters in retrieved context
  const totalContextLength = React.useMemo(() => {
    return retrievedChunks.reduce((sum, item) => sum + (item.text?.length || 0), 0)
  }, [retrievedChunks])

  if (!documentName) {
    return (
      <div className="glass p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
        <Layers className="h-8 w-8 text-slate-600 mb-2" />
        <p className="font-space text-sm font-semibold text-slate-400">Inspector Standby</p>
        <p className="text-xs text-slate-500 mt-1 text-center max-w-[240px]">
          Upload a document to index context slices inside the database first.
        </p>
      </div>
    )
  }

  return (
    <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col h-[480px]">
      
      {/* Title Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4.5 w-4.5 text-primary" />
          <div>
            <h4 className="font-space text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Semantic Retrieval Footprint
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">Matched vector partitions for query</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono bg-[#030712] border border-slate-900 px-2 py-1 rounded-md text-slate-400">
          <Sliders className="h-3 w-3 text-primary" />
          <span>Top-K: 5</span>
        </div>
      </div>

      {/* Context Length Summary */}
      <div className="flex justify-between items-center text-[10px] bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 text-slate-400">
        <span className="font-mono">CONTEXT LENGTH:</span>
        <span className="text-slate-200 font-bold font-mono">
          {totalContextLength} Chars (~{Math.round(totalContextLength / 4)} Tokens)
        </span>
      </div>

      {/* Chunks List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {retrievedChunks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center py-12">
            <span className="text-xs font-mono">No vectors matched yet. Run a chat query to prompt database retrieval operations.</span>
          </div>
        ) : (
          retrievedChunks.map((chunk, idx) => {
            const similarityPercent = Math.round(chunk.score * 100)
            
            return (
              <div 
                key={idx} 
                className="bg-slate-950/50 rounded-xl p-3 border border-slate-900 hover:border-slate-800 transition-all duration-150 space-y-2 group"
              >
                {/* Chunk Top Specs */}
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileCode className="h-3.5 w-3.5 text-slate-600" />
                    <span>SLICE #{chunk.chunk_index}</span>
                  </span>
                  
                  {/* Similarity Badge */}
                  <span className="flex items-center gap-1 text-primary font-bold">
                    <Percent className="h-3 w-3" />
                    {similarityPercent}% Match
                  </span>
                </div>

                {/* Similarity score progress bar indicator */}
                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 rounded-full"
                    style={{ width: `${similarityPercent}%` }}
                  ></div>
                </div>

                {/* Chunk Excerpt */}
                <p className="text-xs text-slate-300 leading-relaxed italic group-hover:text-slate-200 transition-colors">
                  "{chunk.text}"
                </p>
                
                {/* Simulated metadata */}
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-900/50">
                  <span>Page Ref: ~{Math.ceil(chunk.chunk_index / 4)}</span>
                  <span>Word Count: {chunk.text.split(' ').length}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
