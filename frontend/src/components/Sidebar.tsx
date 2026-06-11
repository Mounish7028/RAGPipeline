import React from 'react'
import { useStore } from '../store'
import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Menu, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Plus, 
  Database,
  Cpu
} from 'lucide-react'

export default function Sidebar() {
  const { 
    activeTab, 
    setTab, 
    sidebarOpen, 
    toggleSidebar, 
    documentName,
    clearChat,
    uploadProgress
  } = useStore()

  const navItems = [
    { id: 'dashboard', label: 'Intelligence Hub', icon: LayoutDashboard },
    { id: 'chat', label: 'NexI ChatBot', icon: MessageSquare },
    { id: 'analytics', label: 'Vector Analytics', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ] as const

  return (
    <aside 
      className={`h-screen flex flex-col justify-between border-r border-slate-800 bg-[#070b13] transition-all duration-300 z-20 select-none ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Top Section */}
      <div>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              {/* Pulsing logo icon */}
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-space font-extrabold text-white text-sm shadow-[0_0_12px_rgba(118,185,0,0.4)]">
                N
              </div>
              <span className="font-space font-bold text-md tracking-wider bg-gradient-to-r from-white via-slate-100 to-primary bg-clip-text text-transparent">
                NexI ChatBot
              </span>
            </div>
          ) : (
            <div className="mx-auto h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center font-space font-extrabold text-white text-sm shadow-[0_0_12px_rgba(118,185,0,0.4)]">
              N
            </div>
          )}

          <button 
            onClick={toggleSidebar} 
            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/50 hover:text-white transition-colors"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* New Chat CTA */}
        <div className="p-3">
          {sidebarOpen ? (
            <button
              onClick={clearChat}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-800 hover:border-primary/50 bg-[#0b0f19] hover:bg-primary/10 text-slate-200 hover:text-primary font-medium text-xs tracking-wider uppercase transition-all duration-200 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Reset & New Chat
            </button>
          ) : (
            <button
              onClick={clearChat}
              title="Reset & New Chat"
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 hover:border-primary/50 bg-[#0b0f19] hover:bg-primary/10 text-slate-400 hover:text-primary transition-all duration-200"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl font-medium text-xs tracking-wider uppercase transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary/15 to-transparent text-primary border border-primary/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-0.5 rounded-r bg-primary"></span>
                )}

                <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section - Active Document / Engine Status */}
      <div className="p-4 border-t border-slate-800 bg-[#05080e]/40">
        {sidebarOpen ? (
          <div className="space-y-3">
            {/* Active Document Panel */}
            <div className="rounded-xl border border-slate-800 p-3 bg-[#03060b]">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-space">
                  Active Asset
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-300 truncate">
                {documentName || 'No file parsed'}
              </p>
              {uploadProgress.chunk_count > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                  <Database className="h-3 w-3" />
                  <span>{uploadProgress.chunk_count} Vectors loaded</span>
                </div>
              )}
            </div>

            {/* Model System Panel */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <Cpu className="h-3 w-3 text-slate-600" />
              <span>Model: gemini-1.5-pro</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div 
              title={documentName ? `Active: ${documentName}` : 'No document parsed'} 
              className={`h-8 w-8 rounded-lg flex items-center justify-center border ${
                documentName ? 'border-primary/20 bg-primary/5 text-primary' : 'border-slate-800 bg-slate-900/50 text-slate-600'
              }`}
            >
              <FileText className="h-4 w-4" />
            </div>
            <Cpu className="h-4 w-4 text-slate-600" />
          </div>
        )}
      </div>
    </aside>
  )
}
