import { create } from 'zustand'
import type { ConversionOptions, InputType, ModelKey, ParseInfo, TargetFormat } from '../types'

interface ConversionState {
  // Input
  inputSql: string
  inputType: InputType
  targetFormat: TargetFormat
  model: ModelKey
  options: ConversionOptions

  // Output
  outputTokens: string[]
  isStreaming: boolean
  isComplete: boolean
  error: string | null
  parseInfo: ParseInfo | null
  lastConversionId: string | null
  tokenCount: number
  latencyMs: number

  // History panel
  historyOpen: boolean

  // Actions
  setInputSql: (sql: string) => void
  setInputType: (type: InputType) => void
  setTargetFormat: (fmt: TargetFormat) => void
  setModel: (model: ModelKey) => void
  setOption: (key: keyof ConversionOptions, value: boolean) => void
  startStreaming: () => void
  appendToken: (token: string) => void
  setParseInfo: (info: ParseInfo) => void
  completeStreaming: (conversionId: string, tokenCount: number, latencyMs: number) => void
  setError: (error: string) => void
  resetOutput: () => void
  toggleHistory: () => void
}

export const useConversionStore = create<ConversionState>((set) => ({
  inputSql: `-- Paste your Oracle SQL here
-- Example: SELECT with Oracle-specific functions
SELECT
  e.employee_id,
  e.first_name || ' ' || e.last_name AS full_name,
  NVL(e.salary, 0) AS salary,
  TO_CHAR(e.hire_date, 'YYYY-MM-DD') AS hire_date,
  DECODE(e.status, 'A', 'Active', 'I', 'Inactive', 'Unknown') AS status
FROM employees e
WHERE ROWNUM <= 100
  AND e.department_id = 10
ORDER BY e.salary DESC`,
  inputType: 'auto',
  targetFormat: 'dataframe',
  model: 'default',
  options: {
    include_explanation: true,
    add_type_hints: true,
    add_error_handling: false,
    include_imports: true,
  },

  outputTokens: [],
  isStreaming: false,
  isComplete: false,
  error: null,
  parseInfo: null,
  lastConversionId: null,
  tokenCount: 0,
  latencyMs: 0,
  historyOpen: false,

  setInputSql: (sql) => set({ inputSql: sql }),
  setInputType: (inputType) => set({ inputType }),
  setTargetFormat: (targetFormat) => set({ targetFormat }),
  setModel: (model) => set({ model }),
  setOption: (key, value) =>
    set((state) => ({ options: { ...state.options, [key]: value } })),

  startStreaming: () =>
    set({ isStreaming: true, isComplete: false, error: null, outputTokens: [], parseInfo: null, tokenCount: 0, latencyMs: 0 }),

  appendToken: (token) =>
    set((state) => ({ outputTokens: [...state.outputTokens, token] })),

  setParseInfo: (info) => set({ parseInfo: info }),

  completeStreaming: (conversionId, tokenCount, latencyMs) =>
    set({ isStreaming: false, isComplete: true, lastConversionId: conversionId, tokenCount, latencyMs }),

  setError: (error) => set({ isStreaming: false, error }),

  resetOutput: () =>
    set({ outputTokens: [], isStreaming: false, isComplete: false, error: null, parseInfo: null }),

  toggleHistory: () => set((state) => ({ historyOpen: !state.historyOpen })),
}))
