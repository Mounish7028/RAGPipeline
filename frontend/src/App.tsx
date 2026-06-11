import React, { useEffect } from 'react'
import { useStore } from './store'
import Layout from './components/Layout'

function App() {
  const initializeState = useStore((state) => state.initializeState)
  const fetchUploadStatus = useStore((state) => state.fetchUploadStatus)
  const uploadProgress = useStore((state) => state.uploadProgress)

  // Initialize server variables on mount
  useEffect(() => {
    initializeState()
  }, [initializeState])

  // Periodic polling for status when uploads are active
  useEffect(() => {
    let interval: any = null

    if (
      uploadProgress.status === 'queued' ||
      uploadProgress.status === 'extracting' ||
      uploadProgress.status === 'chunking' ||
      uploadProgress.status === 'embedding'
    ) {
      interval = setInterval(() => {
        fetchUploadStatus()
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [uploadProgress.status, fetchUploadStatus])

  return <Layout />
}

export default App
