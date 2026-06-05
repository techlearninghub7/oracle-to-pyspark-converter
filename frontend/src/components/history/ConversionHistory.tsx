import { useEffect, useState } from 'react'
import { Clock, ChevronRight, Trash2, X, RefreshCw, AlertCircle } from 'lucide-react'
import { getHistory, deleteConversion, getConversion } from '../../services/api'
import { useConversionStore } from '../../stores/conversionStore'
import type { ConversionSummary } from '../../types'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

const INPUT_TYPE_COLORS: Record<string, string> = {
  select: 'badge-spark',
  dml: 'badge-medium',
  view: 'badge-oracle',
  procedure: 'badge-high',
  function: 'badge-high',
  package: 'badge-high',
  trigger: 'badge-high',
  sequence: 'badge-low',
  plsql_block: 'badge-medium',
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-status-success',
  failed: 'text-status-error',
  pending: 'text-status-warning',
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return dateStr
  }
}

export function ConversionHistory() {
  const [history, setHistory] = useState<ConversionSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toggleHistory, setInputSql, setInputType } = useConversionStore()

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistory(50)
      setHistory(data.conversions)
      setTotal(data.total)
    } catch (err) {
      setError('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteConversion(id)
      setHistory((prev) => prev.filter((c) => c.id !== id))
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleReopen = async (id: string) => {
    try {
      const detail = await getConversion(id)
      setInputSql(detail.input_sql)
      setInputType(detail.input_type as any)
      toggleHistory()
      toast.success('Loaded into editor')
    } catch {
      toast.error('Failed to load conversion')
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-surface border-l border-bg-border animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-primary" />
          <span className="font-semibold text-sm text-text-primary">Conversion History</span>
          <span className="px-1.5 py-0.5 bg-bg-elevated rounded text-xs text-text-muted font-mono">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={toggleHistory}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-accent-primary/30 border-t-accent-primary rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 m-4 p-3 rounded-lg bg-status-error/10 border border-status-error/20">
            <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0" />
            <span className="text-status-error text-xs">{error}</span>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Clock className="w-8 h-8 text-text-muted mb-3 opacity-40" />
            <p className="text-text-muted text-sm">No conversions yet</p>
            <p className="text-text-muted text-xs mt-1">Your conversion history will appear here</p>
          </div>
        )}

        {!loading && history.map((item) => (
          <div
            key={item.id}
            onClick={() => handleReopen(item.id)}
            className="group flex items-start gap-3 px-4 py-3 border-b border-bg-border hover:bg-bg-elevated cursor-pointer transition-all"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('px-1.5 py-0.5 rounded text-xs font-mono capitalize', INPUT_TYPE_COLORS[item.input_type] || 'badge-spark')}>
                  {item.input_type}
                </span>
                <span className={cn('text-xs font-mono capitalize', STATUS_COLORS[item.status] || 'text-text-muted')}>
                  {item.status}
                </span>
                <span className="ml-auto text-xs text-text-muted font-mono">{formatTime(item.created_at)}</span>
              </div>
              {item.preview && (
                <p className="text-text-secondary text-xs font-mono truncate leading-relaxed">
                  {item.preview.replace(/--[^\n]*/g, '').trim().slice(0, 80)}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-text-muted text-xs">{item.model_used.split('/').pop()}</span>
                {item.token_count > 0 && (
                  <span className="text-text-muted text-xs">{item.token_count} tok</span>
                )}
                {item.latency_ms > 0 && (
                  <span className="text-text-muted text-xs">{(item.latency_ms / 1000).toFixed(1)}s</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleDelete(item.id, e)}
                className="p-1 rounded text-text-muted hover:text-status-error transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
