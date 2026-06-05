import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Copy, Download, CheckCheck, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useConversionStore } from '../../stores/conversionStore'
import { cn } from '../../lib/utils'

interface OutputViewerProps {
  outputText: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
}

function extractCodeBlock(text: string): { code: string; explanation: string } {
  const match = text.match(/```python\s*\n([\s\S]*?)```/)
  if (match) {
    const code = match[1].trim()
    const explanation = text.replace(/```python[\s\S]*?```/, '').trim()
    return { code, explanation }
  }
  // If no code fence, treat entire text as code if it looks like Python
  if (text.includes('from pyspark') || text.includes('import pyspark') || text.includes('spark.')) {
    return { code: text.trim(), explanation: '' }
  }
  return { code: '', explanation: text.trim() }
}

export function OutputViewer({ outputText, isStreaming, isComplete, error }: OutputViewerProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'explanation' | 'raw'>('code')
  const { parseInfo } = useConversionStore()
  const streamingRef = useRef<HTMLDivElement>(null)

  const { code, explanation } = extractCodeBlock(outputText)

  useEffect(() => {
    if (isStreaming && streamingRef.current) {
      streamingRef.current.scrollTop = streamingRef.current.scrollHeight
    }
  }, [outputText, isStreaming])

  const handleCopy = async () => {
    const content = activeTab === 'code' ? code : activeTab === 'raw' ? outputText : explanation
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const content = code || outputText
    if (!content) return
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'converted_pyspark.py'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded converted_pyspark.py')
  }

  const isEmpty = !outputText && !isStreaming && !error

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border bg-bg-elevated">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-text-muted text-xs font-mono ml-1">pyspark_output.py</span>
          {isStreaming && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-primary pulse-dot" />
              <span className="text-accent-primary text-xs font-mono">Generating...</span>
            </div>
          )}
          {isComplete && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-status-success/10 border border-status-success/20">
              <CheckCheck className="w-3 h-3 text-status-success" />
              <span className="text-status-success text-xs font-mono">Complete</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Tabs */}
          {(code || isComplete) && (
            <div className="flex items-center gap-0.5 mr-2 bg-bg-surface rounded-lg p-0.5 border border-bg-border">
              {(['code', 'explanation', 'raw'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-md transition-all font-medium capitalize',
                    activeTab === tab
                      ? 'bg-bg-elevated text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleCopy}
            disabled={!outputText}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-bg-surface hover:bg-bg-hover border border-bg-border text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!outputText}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-bg-surface hover:bg-bg-hover border border-bg-border text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            .py
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 relative">
        {/* Empty state */}
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-primary/5 border border-accent-primary/10">
              <Sparkles className="w-7 h-7 text-accent-primary/40" />
            </div>
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">PySpark output will appear here</p>
              <p className="text-text-muted text-xs">Configure options and click Convert to generate</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-status-error/10 border border-status-error/20 max-w-lg w-full">
              <AlertCircle className="w-5 h-5 text-status-error flex-shrink-0" />
              <div>
                <p className="text-status-error text-sm font-medium">Conversion Failed</p>
                <p className="text-status-error/70 text-xs mt-0.5 font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Streaming raw output */}
        {isStreaming && (
          <div
            ref={streamingRef}
            className="absolute inset-0 overflow-y-auto p-4 font-mono text-xs text-text-secondary leading-relaxed"
            style={{ background: '#0f1117' }}
          >
            <pre className="whitespace-pre-wrap break-words">
              {outputText}
              <span className="inline-block w-2 h-4 bg-accent-primary ml-0.5 animate-pulse" />
            </pre>
          </div>
        )}

        {/* Completed — Monaco editor for code tab */}
        {isComplete && activeTab === 'code' && code && (
          <Editor
            height="100%"
            defaultLanguage="python"
            language="python"
            value={code}
            theme="oracle-dark"
            options={{
              readOnly: true,
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: 'none',
              scrollbar: { verticalScrollbarSize: 6 },
              contextmenu: false,
            }}
            beforeMount={(monaco) => {
              if (!monaco.editor.getModel(monaco.Uri.parse('file:///oracle-dark'))) {
                monaco.editor.defineTheme('oracle-dark', {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [
                    { token: 'keyword', foreground: 'f97316', fontStyle: 'bold' },
                    { token: 'string', foreground: 'a3e635' },
                    { token: 'comment', foreground: '4a4e66', fontStyle: 'italic' },
                    { token: 'number', foreground: '60a5fa' },
                    { token: 'keyword.python', foreground: 'f97316', fontStyle: 'bold' },
                  ],
                  colors: {
                    'editor.background': '#0f1117',
                    'editor.foreground': '#e8eaf0',
                    'editor.lineHighlightBackground': '#0f1117',
                    'editorLineNumber.foreground': '#2a2d3e',
                    'editorLineNumber.activeForeground': '#4a4e66',
                    'editorGutter.background': '#0f1117',
                  },
                })
              }
              monaco.editor.setTheme('oracle-dark')
            }}
          />
        )}

        {/* Explanation tab */}
        {isComplete && activeTab === 'explanation' && (
          <div className="absolute inset-0 overflow-y-auto p-5">
            {explanation ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="space-y-3">
                  {explanation.split('\n').filter(Boolean).map((line, i) => {
                    if (line.startsWith('##') || line.startsWith('**')) {
                      return (
                        <h3 key={i} className="text-text-primary font-semibold text-sm font-display">
                          {line.replace(/^#+\s*/, '').replace(/\*\*/g, '')}
                        </h3>
                      )
                    }
                    if (line.startsWith('-') || line.startsWith('•')) {
                      return (
                        <div key={i} className="flex gap-2 text-xs text-text-secondary">
                          <span className="text-accent-primary mt-0.5">→</span>
                          <span>{line.replace(/^[-•]\s*/, '')}</span>
                        </div>
                      )
                    }
                    return (
                      <p key={i} className="text-xs text-text-secondary leading-relaxed">
                        {line}
                      </p>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-muted text-sm">No explanation available. Enable "Include Explanation" in options.</p>
              </div>
            )}
          </div>
        )}

        {/* Raw tab */}
        {isComplete && activeTab === 'raw' && (
          <div className="absolute inset-0 overflow-y-auto p-4 font-mono text-xs text-text-secondary leading-relaxed" style={{ background: '#0f1117' }}>
            <pre className="whitespace-pre-wrap break-words">{outputText}</pre>
          </div>
        )}
      </div>

      {/* Parse info footer */}
      {parseInfo && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-t border-bg-border bg-bg-surface">
          <span className="text-text-muted text-xs">Detected:</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-mono capitalize',
              parseInfo.input_type === 'select' ? 'badge-spark' : 'badge-oracle',
            )}
          >
            {parseInfo.input_type}
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-mono capitalize',
              parseInfo.complexity === 'low' ? 'badge-low' : parseInfo.complexity === 'medium' ? 'badge-medium' : 'badge-high',
            )}
          >
            {parseInfo.complexity} complexity
          </span>
          {parseInfo.constructs.slice(0, 4).map((c) => (
            <span key={c} className="badge-oracle px-2 py-0.5 rounded text-xs font-mono">
              {c}
            </span>
          ))}
          {parseInfo.constructs.length > 4 && (
            <span className="text-text-muted text-xs">+{parseInfo.constructs.length - 4} more</span>
          )}
        </div>
      )}
    </div>
  )
}
