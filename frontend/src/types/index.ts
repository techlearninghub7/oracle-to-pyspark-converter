export type InputType =
  | 'auto'
  | 'select'
  | 'dml'
  | 'view'
  | 'procedure'
  | 'function'
  | 'package'
  | 'trigger'
  | 'sequence'
  | 'plsql_block'

export type TargetFormat = 'pyspark_sql' | 'dataframe' | 'script' | 'databricks'

export type ModelKey = 'default' | 'fast' | 'balanced' | 'powerful' | 'code' | 'free'

export interface ConversionOptions {
  include_explanation: boolean
  add_type_hints: boolean
  add_error_handling: boolean
  include_imports: boolean
}

export interface ConversionRequest {
  sql: string
  input_type: InputType
  target_format: TargetFormat
  model: ModelKey
  options: ConversionOptions
}

export interface ConversionSummary {
  id: string
  created_at: string
  input_type: string
  target_fmt: string
  model_used: string
  status: string
  token_count: number
  latency_ms: number
  preview?: string
}

export interface ConversionDetail extends ConversionSummary {
  input_sql: string
  output_code?: string
  explanation?: string
  error_msg?: string
}

export interface StreamEvent {
  type: 'token' | 'done' | 'error' | 'parse_info'
  content?: string
  message?: string
  conversion_id?: string
  token_count?: number
  latency_ms?: number
  input_type?: string
  complexity?: string
  constructs?: string[]
}

export interface ParseInfo {
  input_type: string
  complexity: 'low' | 'medium' | 'high'
  constructs: string[]
}

export interface ModelOption {
  key: string
  id: string
  label: string
}
