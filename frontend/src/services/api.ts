import axios from 'axios'
import type { ConversionDetail, ConversionSummary } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

export async function getHistory(limit = 20, inputType?: string): Promise<{
  conversions: ConversionSummary[]
  total: number
}> {
  const params: Record<string, unknown> = { limit }
  if (inputType) params.input_type = inputType
  const { data } = await api.get('/api/history', { params })
  return data
}

export async function getConversion(id: string): Promise<ConversionDetail> {
  const { data } = await api.get(`/api/history/${id}`)
  return data
}

export async function deleteConversion(id: string): Promise<void> {
  await api.delete(`/api/history/${id}`)
}

export async function submitFeedback(
  conversionId: string,
  rating: number,
  comment?: string,
): Promise<void> {
  await api.post('/api/feedback', { conversion_id: conversionId, rating, comment })
}

export async function getHealth() {
  const { data } = await api.get('/api/health')
  return data
}

export async function getModels() {
  const { data } = await api.get('/api/models')
  return data
}
