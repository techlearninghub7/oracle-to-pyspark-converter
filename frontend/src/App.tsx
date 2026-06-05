import { useEffect, useState, useRef, useCallback } from 'react'
import { Toaster } from 'sonner'
import { Header } from './components/layout/Header'
import { SqlEditor } from './components/editor/SqlEditor'
import { OutputViewer } from './components/editor/OutputViewer'
import { ConversionConfig } from './components/config/ConversionConfig'
import { ConversionHistory } from './components/history/ConversionHistory'
import { ResizeHandle } from './components/ui/ResizeHandle'
import { useConversionStore } from './stores/conversionStore'
import { useConversion } from './hooks/useConversion'
import { getHealth } from './services/api'

export default function App() {
  const { historyOpen } = useConversionStore()
  const { outputText, isStreaming, isComplete, error } = useConversion()
  const [health, setHealth] = useState<{ status: string; openrouter: string } | null>(null)

  // Resizable pane widths (as percentages 0–100)
  const [leftWidth, setLeftWidth] = useState(42)    // input editor
  const [configWidth, setConfigWidth] = useState(220) // px for config panel
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getHealth()
      .then((h) => setHealth(h))
      .catch(() => setHealth({ status: 'error', openrouter: 'unreachable' }))
  }, [])

  const handleResizeEditors = useCallback((delta: number) => {
    setLeftWidth((prev) => {
      const containerW = containerRef.current?.offsetWidth ?? 1000
      const newPct = prev + (delta / containerW) * 100
      return Math.max(20, Math.min(70, newPct))
    })
  }, [])

  return (
    <div className="flex flex-col h-screen bg-bg-base overflow-hidden">
      <Header health={health} />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Config panel — fixed left */}
        <aside
          className="flex-shrink-0 border-r border-bg-border bg-bg-surface overflow-hidden flex flex-col"
          style={{ width: `${configWidth}px` }}
        >
          <ConversionConfig />
        </aside>

        {/* Editors area */}
        <div ref={containerRef} className="flex flex-1 min-w-0">
          {/* Input Editor */}
          <div
            className="min-w-0 flex flex-col border-r border-bg-border"
            style={{ width: `${leftWidth}%` }}
          >
            {/* Pane header */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border-b border-bg-border">
              <div className="w-2 h-2 rounded-full bg-oracle opacity-70" />
              <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Oracle SQL Input</span>
            </div>
            <div className="flex-1 min-h-0">
              <SqlEditor />
            </div>
          </div>

          {/* Resize handle */}
          <ResizeHandle onResize={handleResizeEditors} />

          {/* Output Editor */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border-b border-bg-border">
              <div className="w-2 h-2 rounded-full bg-spark opacity-70" />
              <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">PySpark Output</span>
            </div>
            <div className="flex-1 min-h-0">
              <OutputViewer
                outputText={outputText}
                isStreaming={isStreaming}
                isComplete={isComplete}
                error={error}
              />
            </div>
          </div>
        </div>

        {/* History panel — slides in from right */}
        {historyOpen && (
          <div className="flex-shrink-0 w-80 border-l border-bg-border">
            <ConversionHistory />
          </div>
        )}
      </div>

      {/* Toaster */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#161820',
            border: '1px solid #1e2130',
            color: '#e8eaf0',
            fontSize: '13px',
            fontFamily: "'DM Sans', sans-serif",
          },
        }}
      />
    </div>
  )
}
