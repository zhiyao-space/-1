import type { ApiPreset } from '../store/apiPresets'
import { useRuntimeRules } from '../store/runtimeRules'

export interface ChatApiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function trimBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

export async function listModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const resp = await fetch(`${trimBase(baseUrl)}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
  return arr.map((m: { id?: string }) => m?.id).filter((x: unknown): x is string => typeof x === 'string')
}

export async function testConnection(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const resp = await fetch(`${trimBase(baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
    })
    if (resp.ok) return { ok: true, message: '连通成功' }
    const text = await resp.text()
    let msg = text
    try {
      const j = JSON.parse(text)
      msg = j?.error?.message || j?.message || text
    } catch {
      /* keep raw */
    }
    return { ok: false, message: `HTTP ${resp.status}: ${String(msg).slice(0, 300)}` }
  } catch (err) {
    return { ok: false, message: `无法连接到目标服务器: ${(err as Error).message}` }
  }
}

interface StreamHandlers {
  onDelta: (delta: string) => void
  signal?: AbortSignal
}

function extractDelta(json: unknown): string {
  const j = json as { choices?: { delta?: { content?: string }; message?: { content?: string } }[] }
  const choice = j?.choices?.[0]
  return choice?.delta?.content ?? choice?.message?.content ?? ''
}

export async function streamChat(
  preset: ApiPreset,
  messages: ChatApiMessage[],
  handlers: StreamHandlers
): Promise<string> {
  const stream = preset.injectMode !== 'merge-user'
  const resp = await fetch(`${trimBase(preset.baseUrl)}/chat/completions`, {
    method: 'POST',
    signal: handlers.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(preset.apiKey ? { Authorization: `Bearer ${preset.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: preset.model,
      messages,
      temperature: useRuntimeRules.getState().temperature ?? preset.temperature,
      max_tokens: useRuntimeRules.getState().maxReplyLength > 0 ? Math.ceil(useRuntimeRules.getState().maxReplyLength * 2.2) : undefined,
      stream,
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    let msg = text
    try {
      const j = JSON.parse(text)
      msg = j?.error?.message || j?.message || text
    } catch {
      /* keep raw */
    }
    throw new Error(`HTTP ${resp.status}: ${String(msg).slice(0, 300)}`)
  }

  if (!stream || !resp.body) {
    const data = await resp.json()
    const full = extractDelta(data)
    handlers.onDelta(full)
    return full
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const delta = extractDelta(JSON.parse(payload))
        if (delta) {
          full += delta
          handlers.onDelta(delta)
        }
      } catch {
        /* partial json, skip */
      }
    }
  }
  return full
}
