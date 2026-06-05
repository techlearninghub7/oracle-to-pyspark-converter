import { ChevronDown, Cpu, Settings2, Loader2, Zap } from 'lucide-react'
import { useConversionStore } from '../../stores/conversionStore'
import { useConversion } from '../../hooks/useConversion'
import { cn } from '../../lib/utils'
import type { InputType, TargetFormat, ModelKey } from '../../types'

const INPUT_TYPES: { value: InputType; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto Detect', desc: 'Let AI determine the type' },
  { value: 'select', label: 'SELECT Query', desc: 'Plain SQL SELECT' },
  { value: 'dml', label: 'DML Statement', desc: 'INSERT/UPDATE/DELETE/MERGE' },
  { value: 'view', label: 'View', desc: 'CREATE VIEW definition' },
  { value: 'procedure', label: 'Stored Procedure', desc: 'PL/SQL procedure' },
  { value: 'function', label: 'Function', desc: 'Scalar/table function' },
  { value: 'package', label: 'Package', desc: 'Package spec + body' },
  { value: 'trigger', label: 'Trigger', desc: 'Database trigger' },
  { value: 'sequence', label: 'Sequence', desc: 'CREATE SEQUENCE' },
  { value: 'plsql_block', label: 'PL/SQL Block', desc: 'Anonymous DECLARE/BEGIN block' },
]

const TARGET_FORMATS: { value: TargetFormat; label: string; desc: string; badge?: string }[] = [
  { value: 'pyspark_sql', label: 'PySpark SQL', desc: 'spark.sql("...") style', badge: 'SQL' },
  { value: 'dataframe', label: 'DataFrame API', desc: '.select().filter().join()', badge: 'API' },
  { value: 'script', label: 'Full Script', desc: 'Standalone .py with SparkSession', badge: 'PY' },
  { value: 'databricks', label: 'Databricks', desc: 'Notebook cell format', badge: 'NB' },
]

const MODELS: { value: ModelKey; label: string; badge: string; color: string }[] = [
  { value: 'default', label: 'Claude 3 Haiku', badge: 'Recommended', color: 'text-accent-primary' },
  { value: 'fast', label: 'Llama 3.1 8B', badge: 'Free', color: 'text-status-success' },
  { value: 'balanced', label: 'Mistral 7B', badge: 'Free', color: 'text-status-success' },
  { value: 'powerful', label: 'Claude 3.5 Sonnet', badge: 'Best', color: 'text-blue-400' },
  { value: 'code', label: 'DeepSeek Coder', badge: 'Code', color: 'text-purple-400' },
]

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; desc?: string; badge?: string; color?: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full appearance-none bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary font-medium focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all cursor-pointer pr-8"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      </div>
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      className="flex items-center justify-between py-2 cursor-pointer group"
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-text-secondary text-xs font-medium group-hover:text-text-primary transition-colors">{label}</p>
        <p className="text-text-muted text-xs mt-0.5 truncate">{description}</p>
      </div>
      <div
        className={cn(
          'relative flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200',
          checked ? 'bg-accent-primary' : 'bg-bg-border',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </div>
    </div>
  )
}

export function ConversionConfig() {
  const store = useConversionStore()
  const { convert, isStreaming, tokenCount, latencyMs } = useConversion()

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Section: Input */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Input</span>
          </div>
          <SelectField
            label="Input Type"
            value={store.inputType}
            onChange={store.setInputType}
            options={INPUT_TYPES}
          />
        </div>

        {/* Section: Output */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Output</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {TARGET_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => store.setTargetFormat(fmt.value)}
                className={cn(
                  'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-all',
                  store.targetFormat === fmt.value
                    ? 'bg-accent-primary/10 border-accent-primary/40 text-text-primary'
                    : 'bg-bg-elevated border-bg-border text-text-secondary hover:border-text-muted/30 hover:text-text-primary',
                )}
              >
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-xs font-semibold">{fmt.label}</span>
                  {fmt.badge && (
                    <span
                      className={cn(
                        'ml-auto text-xs px-1.5 py-0 rounded font-mono',
                        store.targetFormat === fmt.value
                          ? 'bg-accent-primary/20 text-accent-primary'
                          : 'bg-bg-surface text-text-muted',
                      )}
                    >
                      {fmt.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs opacity-60 leading-none">{fmt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section: Model */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Model</span>
          </div>
          <div className="space-y-1">
            {MODELS.map((m) => (
              <button
                key={m.value}
                onClick={() => store.setModel(m.value)}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 rounded-lg border text-left transition-all',
                  store.model === m.value
                    ? 'bg-accent-primary/10 border-accent-primary/40'
                    : 'bg-bg-elevated border-bg-border hover:border-text-muted/30',
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      store.model === m.value ? 'bg-accent-primary' : 'bg-bg-border',
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      store.model === m.value ? 'text-text-primary' : 'text-text-secondary',
                    )}
                  >
                    {m.label}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded font-mono',
                    m.badge === 'Free'
                      ? 'bg-status-success/10 text-status-success'
                      : m.badge === 'Best'
                      ? 'bg-blue-500/10 text-blue-400'
                      : m.badge === 'Recommended'
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'bg-purple-500/10 text-purple-400',
                  )}
                >
                  {m.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Section: Options */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Options</span>
          </div>
          <div className="divide-y divide-bg-border">
            <Toggle
              label="Include Imports"
              description="Add all required PySpark imports"
              checked={store.options.include_imports}
              onChange={(v) => store.setOption('include_imports', v)}
            />
            <Toggle
              label="Include Explanation"
              description="Conversion decisions after code"
              checked={store.options.include_explanation}
              onChange={(v) => store.setOption('include_explanation', v)}
            />
            <Toggle
              label="Type Hints"
              description="Add Python type annotations"
              checked={store.options.add_type_hints}
              onChange={(v) => store.setOption('add_type_hints', v)}
            />
            <Toggle
              label="Error Handling"
              description="Wrap in try/except blocks"
              checked={store.options.add_error_handling}
              onChange={(v) => store.setOption('add_error_handling', v)}
            />
          </div>
        </div>
      </div>

      {/* Convert button — sticky bottom */}
      <div className="mt-auto p-4 pt-2 border-t border-bg-border bg-bg-surface">
        {/* Stats */}
        {tokenCount > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-text-muted text-xs font-mono">{tokenCount} tokens</span>
            <span className="text-text-muted text-xs font-mono">{(latencyMs / 1000).toFixed(1)}s</span>
          </div>
        )}

        <button
          onClick={convert}
          disabled={isStreaming}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200',
            isStreaming
              ? 'bg-bg-elevated border border-bg-border text-text-muted cursor-not-allowed'
              : 'bg-accent-primary hover:bg-accent-secondary text-white shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 active:scale-[0.98]',
          )}
        >
          {isStreaming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Converting...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" fill="currentColor" />
              <span>Convert to PySpark</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
