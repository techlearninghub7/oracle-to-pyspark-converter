import { useCallback } from 'react'
import { useConversionStore } from '../stores/conversionStore'
import type { StreamEvent } from '../types'
import { toast } from 'sonner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export function useConversion() {
  const store = useConversionStore()

  const convert = useCallback(async () => {
    if (!store.inputSql.trim()) {
      toast.error('Please enter Oracle SQL to convert')
      return
    }

    store.startStreaming()

    const requestBody = {
      sql: store.inputSql,
      input_type: store.inputType,
      target_format: store.targetFormat,
      model: store.model,
      options: store.options,
    }

    try {
      const response = await fetch(`${BASE_URL}/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      if (!response.body) {
        throw new Error('No response body from server')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          try {
            const event: StreamEvent = JSON.parse(data)

            if (event.type === 'token' && event.content) {
              store.appendToken(event.content)
            } else if (event.type === 'parse_info') {
              store.setParseInfo({
                input_type: event.input_type || 'unknown',
                complexity: (event.complexity as 'low' | 'medium' | 'high') || 'low',
                constructs: event.constructs || [],
              })
            } else if (event.type === 'done') {
              store.completeStreaming(
                event.conversion_id || '',
                event.token_count || 0,
                event.latency_ms || 0,
              )
              toast.success('Conversion complete!', {
                description: `${event.token_count} tokens · ${((event.latency_ms || 0) / 1000).toFixed(1)}s`,
              })
            } else if (event.type === 'error') {
              store.setError(event.message || 'Conversion failed')
              toast.error('Conversion failed', { description: event.message })
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error'
      store.setError(message)
      toast.error('Connection error', { description: message })
    }
  }, [store])

  const outputText = store.outputTokens.join('')

  return {
    convert,
    outputText,
    isStreaming: store.isStreaming,
    isComplete: store.isComplete,
    error: store.error,
    parseInfo: store.parseInfo,
    tokenCount: store.tokenCount,
    latencyMs: store.latencyMs,
  }
}
