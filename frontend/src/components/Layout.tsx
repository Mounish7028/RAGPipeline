import React, { useState } from 'react'
import { useStore } from '../store'
import Sidebar from './Sidebar'
import HeroDashboard from './HeroDashboard'
import ChatInterface from './ChatInterface'
import DocumentAnalytics from './DocumentAnalytics'
import SettingsView from './SettingsView'
import RetrievalInspector from './RetrievalInspector'
import PromptInspector from './PromptInspector'
import { Eye, Terminal, FileText, LayoutDashboard, BarChart3, Settings } from 'lucide-react'

export default function Layout() {
  const activeTab = useStore((state) => state.activeTab)
  const documentName = useStore((state) => state.documentName)
  const [inspectorMode, setInspectorMode] = useState<'retrieval' | 'prompt'>('retrieval')

  // Map header text based on active tab
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Intelligence Platform Dashboard',
          subtitle: 'Holistic system telemetry, indexed database node logs, and semantic mapping'
        }
      case 'chat':
        return {
          title: 'NexI ChatBot Console',
          subtitle: 'Isolated query execution environment grounded in indexed vectors'
        }
      case 'analytics':
        return {
          title: 'Vector store analytics',
          subtitle: 'Response latency benchmarks, similarity matching index, and vector weights'
        }
      case 'settings':
        return {
          title: 'Settings Console',
          subtitle: 'Model hyperparameters, constants, and server environment metadata'
        }
    }
  }

  const header = getHeaderInfo()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#030712]">
      {/* Collapsible Left Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* App Top Bar header */}
        <header className="px-6 py-4 border-b border-slate-800 bg-[#05080e]/40 flex justify-between items-center">
          <div>
            <h2 className="font-space font-bold text-sm tracking-wide text-slate-100 uppercase">
              {header.title}
            </h2>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {header.subtitle}
            </p>
          </div>
          
          {/* Active File Banner on header */}
          {documentName && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#0b0f19] border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Loaded:</span>
              <span className="text-slate-200 font-bold max-w-[120px] truncate">{documentName}</span>
            </div>
          )}
        </header>

        {/* Tab workspace scroller */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#030712]">
          
          {/* Render Tab Views */}
          {activeTab === 'dashboard' && <HeroDashboard />}
          
          {activeTab === 'chat' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full items-start">
              
              {/* Left Column: Chat Conversation Interface */}
              <div className="lg:col-span-2 h-[550px] md:h-[620px]">
                <ChatInterface />
              </div>

              {/* Right Column: Dynamic Developer Inspector Dock */}
              <div className="lg:col-span-1 space-y-4">
                
                {/* Tabs for developer panel */}
                <div className="flex bg-[#070b13] border border-slate-800 p-0.5 rounded-xl">
                  <button
                    onClick={() => setInspectorMode('retrieval')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg font-medium transition-all ${
                      inspectorMode === 'retrieval'
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Footprint
                  </button>
                  <button
                    onClick={() => setInspectorMode('prompt')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg font-medium transition-all ${
                      inspectorMode === 'prompt'
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    Prompt Payloads
                  </button>
                </div>

                {/* Display active panel */}
                {inspectorMode === 'retrieval' ? <RetrievalInspector /> : <PromptInspector />}
              </div>

            </div>
          )}
          
          {activeTab === 'analytics' && <DocumentAnalytics />}
          
          {activeTab === 'settings' && <SettingsView />}
          
        </div>
      </main>
    </div>
  )
}
