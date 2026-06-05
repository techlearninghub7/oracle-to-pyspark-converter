import { Zap, History, Github, Activity } from 'lucide-react'
import { useConversionStore } from '../../stores/conversionStore'
import { cn } from '../../lib/utils'

interface HeaderProps {
  health: { status: string; openrouter: string } | null
}

export function Header({ health }: HeaderProps) {
  const { toggleHistory, historyOpen } = useConversionStore()

  const isHealthy = health?.status === 'ok' && health?.openrouter === 'reachable'
  const isPartial = health?.status === 'ok' && health?.openrouter !== 'reachable'

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-bg-border bg-bg-surface relative z-10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
          <Zap className="w-4 h-4 text-accent-primary" fill="currentColor" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-sm text-text-secondary tracking-wide uppercase">Oracle</span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/20">
            <span className="text-accent-primary font-mono text-xs font-semibold">→</span>
          </div>
          <span className="font-display font-semibold text-sm tracking-wide uppercase text-text-primary">PySpark</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-bg-elevated border border-bg-border">
          <span className="text-text-muted text-xs font-mono">v1.0</span>
          <span className="text-text-muted text-xs">·</span>
          <span className="text-text-muted text-xs">POC</span>
        </div>
      </div>

      {/* Center — tagline */}
      <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
        <span className="text-text-muted text-xs font-mono tracking-widest uppercase">
          AI-Powered Migration Assistant
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Health indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono',
            isHealthy
              ? 'bg-status-success/10 border-status-success/20 text-status-success'
              : isPartial
              ? 'bg-status-warning/10 border-status-warning/20 text-status-warning'
              : 'bg-bg-elevated border-bg-border text-text-muted',
          )}
          title={health ? `DB: ok | OpenRouter: ${health.openrouter}` : 'Checking...'}
        >
          <Activity className="w-3 h-3" />
          <span className="hidden sm:inline">
            {isHealthy ? 'Online' : isPartial ? 'Degraded' : 'Checking...'}
          </span>
        </div>

        {/* History button */}
        <button
          onClick={toggleHistory}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            historyOpen
              ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
              : 'bg-bg-elevated text-text-secondary border border-bg-border hover:border-bg-border/80 hover:text-text-primary',
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>

        {/* GitHub */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-bg-elevated border border-bg-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-all"
        >
          <Github className="w-4 h-4" />
        </a>
      </div>
    </header>
  )
}
