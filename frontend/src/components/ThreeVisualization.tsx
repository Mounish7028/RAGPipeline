import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Points, PointMaterial, OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, RetrievedChunk } from '../store'
import { Orbit, GitMerge, FileText, Cpu, Database, Eye, Terminal } from 'lucide-react'

// Particle Galaxy component
function Galaxy({ retrieved }: { retrieved: RetrievedChunk[] }) {
  const pointsRef = useRef<THREE.Points>(null)
  const queryParticleRef = useRef<THREE.Mesh>(null)
  const [queryActive, setQueryActive] = useState(false)
  const [queryProgress, setQueryProgress] = useState(0)

  // Generate 800 random particles
  const [particleData, docParticleIndices] = useMemo(() => {
    const count = 700
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const docIndices: number[] = []

    for (let i = 0; i < count; i++) {
      // General spiral structure
      const angle = (i / count) * Math.PI * 16 // spiral curves
      const r = Math.pow(Math.random(), 1.5) * 22 + 2 // spiral radius
      const x = Math.cos(angle) * r + (Math.random() - 0.5) * 2
      const z = Math.sin(angle) * r + (Math.random() - 0.5) * 2
      const y = (Math.random() - 0.5) * 4 - (r * 0.1) // flat disk shape

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      // Distinguish base background particles (slate) vs document chunks (green)
      const isDocChunk = i > 450 && i < 600
      if (isDocChunk) {
        docIndices.push(i)
        // NexI Green color
        colors[i * 3] = 0.46  // #76b900 (approx R=0.46)
        colors[i * 3 + 1] = 0.725 // G=0.725
        colors[i * 3 + 2] = 0.0 // B=0.0
        sizes[i] = 0.2
      } else {
        // Slate background
        colors[i * 3] = 0.2
        colors[i * 3 + 1] = 0.3
        colors[i * 3 + 2] = 0.4
        sizes[i] = 0.08
      }
    }

    return [{ positions, colors, sizes }, docIndices] as const
  }, [])

  // Trigger query animation when retrieved chunks change
  useEffect(() => {
    if (retrieved.length > 0) {
      setQueryActive(true)
      setQueryProgress(0)
    }
  }, [retrieved])

  // Update sizes/colors dynamically for retrieved particles
  const dynamicColors = useMemo(() => {
    const colors = new Float32Array(particleData.colors)
    if (retrieved.length > 0 && docParticleIndices.length > 0) {
      retrieved.forEach((chunk, index) => {
        // Map chunk index to a particle in the document cluster
        const pIdx = docParticleIndices[chunk.chunk_index % docParticleIndices.length]
        if (pIdx !== undefined) {
          // Glow Cyan / Emerald
          colors[pIdx * 3] = 0.0     // R
          colors[pIdx * 3 + 1] = 0.95 // G
          colors[pIdx * 3 + 2] = 1.0  // B (Cyan)
        }
      })
    }
    return colors;
  }, [retrieved, particleData.colors, docParticleIndices])

  useFrame((state, delta) => {
    // Spin the galaxy slowly
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05
    }

    // Animate query particle flying
    if (queryActive && queryParticleRef.current) {
      const newProgress = queryProgress + delta * 1.5
      if (newProgress >= 1) {
        setQueryActive(false)
        setQueryProgress(1)
      } else {
        setQueryProgress(newProgress)
        // Fly from outer edge [18, 5, 18] to galaxy center/doc cluster [0, 0, 0]
        const t = newProgress
        const x = THREE.MathUtils.lerp(18, 0, t)
        const y = THREE.MathUtils.lerp(5, 0, t)
        const z = THREE.MathUtils.lerp(18, 0, t)
        queryParticleRef.current.position.set(x, y, z)
      }
    }
  })

  // Constellation Lines: Connect close document particles
  const lines = useMemo(() => {
    const connections: [THREE.Vector3, THREE.Vector3][] = []
    const limit = 40
    let linesFound = 0
    
    for (let i = 0; i < docParticleIndices.length && linesFound < limit; i++) {
      const idxA = docParticleIndices[i]
      const posA = new THREE.Vector3(
        particleData.positions[idxA * 3],
        particleData.positions[idxA * 3 + 1],
        particleData.positions[idxA * 3 + 2]
      )

      for (let j = i + 1; j < docParticleIndices.length && linesFound < limit; j++) {
        const idxB = docParticleIndices[j]
        const posB = new THREE.Vector3(
          particleData.positions[idxB * 3],
          particleData.positions[idxB * 3 + 1],
          particleData.positions[idxB * 3 + 2]
        )

        if (posA.distanceTo(posB) < 1.8) {
          connections.push([posA, posB])
          linesFound++
        }
      }
    }
    return connections
  }, [docParticleIndices, particleData.positions])

  return (
    <group>
      {/* Search Query Particle */}
      {queryActive && (
        <mesh ref={queryParticleRef}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
      )}

      {/* Main Galaxy Points */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particleData.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[dynamicColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Document Cluster Constellation Lines */}
      {lines.map(([p1, p2], idx) => (
        <Line
          key={idx}
          points={[p1, p2]}
          color="#76b900"
          lineWidth={0.5}
          opacity={0.3}
          transparent
        />
      ))}
    </group>
  )
}

// AI Pipeline visualizer component
function PipelineFlow({ status }: { status: string }) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Pipeline Nodes: positions in 3D
  const nodes = useMemo(() => [
    { name: 'PDF', x: -9, color: '#ef4444' },
    { name: 'Chunking', x: -6, color: '#f59e0b' },
    { name: 'Embedding', x: -3, color: '#3b82f6' },
    { name: 'VectorDB', x: 0, color: '#76b900' },
    { name: 'Retrieval', x: 3, color: '#06b6d4' },
    { name: 'Gemini', x: 6, color: '#8b5cf6' },
    { name: 'Answer', x: 9, color: '#10b981' }
  ], [])

  // Highlight index based on status
  const activeIndex = useMemo(() => {
    switch (status) {
      case 'extracting': return 0
      case 'chunking': return 1
      case 'embedding': return 2
      case 'ready': return 3
      default: return -1 // inactive default
    }
  }, [status])

  // Simple floating animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {nodes.map((node, idx) => {
        const isActive = idx === activeIndex || (status === 'ready' && idx <= 3)
        const scale = isActive ? 1.3 : 0.9

        return (
          <group key={idx} position={[node.x, 0, 0]}>
            {/* Sphere node */}
            <mesh>
              <sphereGeometry args={[0.45 * scale, 32, 32]} />
              <meshStandardMaterial 
                color={isActive ? node.color : '#334155'} 
                emissive={isActive ? node.color : '#000000'}
                emissiveIntensity={isActive ? 1.5 : 0}
                roughness={0.2}
              />
            </mesh>

            {/* Glowing outer ring if active */}
            {isActive && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.65, 0.05, 8, 32]} />
                <meshBasicMaterial color={node.color} transparent opacity={0.6} />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Connecting Flow Lines */}
      {nodes.slice(0, -1).map((node, idx) => {
        const nextNode = nodes[idx + 1]
        const isFlowing = status === 'ready' || idx < activeIndex
        
        return (
          <Line
            key={idx}
            points={[new THREE.Vector3(node.x, 0, 0), new THREE.Vector3(nextNode.x, 0, 0)]}
            color={isFlowing ? '#76b900' : '#1e293b'}
            lineWidth={isFlowing ? 1.5 : 0.8}
            opacity={isFlowing ? 0.8 : 0.3}
            transparent
          />
        )
      })}
    </group>
  )
}

export default function ThreeVisualization() {
  const [vizMode, setVizMode] = useState<'galaxy' | 'pipeline'>('galaxy')
  const retrievedChunks = useStore((state) => state.retrievedChunks)
  const uploadStatus = useStore((state) => state.uploadProgress.status)

  return (
    <div className="relative w-full h-[360px] md:h-[420px] rounded-2xl overflow-hidden glass border border-slate-800 flex flex-col justify-between p-4">
      {/* Header and Toggle Controls */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          {vizMode === 'galaxy' ? (
            <Orbit className="h-5 w-5 text-primary animate-pulse" />
          ) : (
            <GitMerge className="h-5 w-5 text-accent animate-pulse" />
          )}
          <div>
            <h3 className="font-space text-sm font-semibold tracking-wider text-slate-200 uppercase">
              {vizMode === 'galaxy' ? 'Vector Embedding Galaxy' : 'Real-time Pipeline Nodes'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {vizMode === 'galaxy' 
                ? '3D visualization of document chunks and search retrieval vectors' 
                : 'Active stage tracking of data pipeline extraction and generative execution'}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-[#030712]/80 border border-slate-800 p-0.5 rounded-lg">
          <button
            onClick={() => setVizMode('galaxy')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all ${
              vizMode === 'galaxy'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Orbit className="h-3 w-3" />
            3D Galaxy
          </button>
          <button
            onClick={() => setVizMode('pipeline')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all ${
              vizMode === 'pipeline'
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitMerge className="h-3 w-3" />
            Pipeline Path
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 16], fov: 60 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          {vizMode === 'galaxy' ? (
            <Galaxy retrieved={retrievedChunks} />
          ) : (
            <PipelineFlow status={uploadStatus} />
          )}
          
          <OrbitControls 
            enableZoom={true} 
            maxDistance={30} 
            minDistance={5} 
            enablePan={false}
            autoRotate={vizMode === 'galaxy'}
            autoRotateSpeed={0.3}
          />
        </Canvas>
      </div>

      {/* Footer Info Display Overlay */}
      <div className="flex justify-between items-center z-10 bg-[#030712]/70 border border-slate-800/80 p-2.5 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs">
          {vizMode === 'galaxy' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-600"></span>
                <span className="text-slate-400">Knowledge Space</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                <span className="text-slate-400">Document Vectors</span>
              </div>
              {retrievedChunks.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent animate-ping"></span>
                  <span className="text-slate-200 font-medium">Retrieved (Top {retrievedChunks.length})</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-slate-300">Pipeline State: <span className="font-semibold text-primary capitalize">{uploadStatus}</span></span>
              </div>
            </>
          )}
        </div>
        <div className="text-[10px] text-slate-500 font-mono hidden md:block">
          GL Render Engine Active
        </div>
      </div>
    </div>
  )
}
