import { useEffect, useRef, useState } from 'react'
import type { ImportSummary } from './import-data'

export type Source = { csv: string; filename: string; countryOverride?: string }
export type Dataset = Source & { summary: ImportSummary; id: string }
export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachment?: string
  receipt?: string
}
export function useNextAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [previous, setPrevious] = useState<{ dataset: Dataset | null } | null>(null)
  const [attachment, setAttachment] = useState<Source | null>(null)
  const [draft, setDraft] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const request = useRef<AbortController | null>(null)
  const readVersion = useRef(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ai/status', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error()
        const status = await r.json()
        setConfigured(status.configured === true)
        setModel(typeof status.model === 'string' ? status.model : '')
      })
      .catch(() => {
        if (!controller.signal.aborted) setConfigured(false)
      })
    return () => {
      controller.abort()
      request.current?.abort()
      readVersion.current++
    }
  }, [])
  const attach = async (file?: File) => {
    if (!file || request.current) return
    const version = ++readVersion.current
    setError('')
    setAttachment(null)
    setReading(false)
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 5 * 1024 * 1024) {
      setError('Escolha um CSV de até 5 MB, exportado pelo Gerenciador de Anúncios.')
      return
    }
    setReading(true)
    try {
      const csv = await file.text()
      if (version === readVersion.current) setAttachment({ csv, filename: file.name })
    } catch {
      if (version === readVersion.current) setError('Não foi possível ler o arquivo.')
    } finally {
      if (version === readVersion.current) setReading(false)
    }
  }
  const send = async () => {
    const message = draft.trim()
    if (!message || !consent || configured !== true || request.current || reading) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    const source = attachment ?? dataset
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          consent,
          sourceKind: attachment ? 'attachment' : 'dashboard',
          source: source
            ? { csv: source.csv, filename: source.filename, countryOverride: source.countryOverride }
            : null,
          history: messages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Não foi possível enviar a mensagem.')
      if (controller.signal.aborted) return
      if (typeof body.reply !== 'string') throw new Error('Resposta inválida do agente.')
      if (body.applied && source) {
        setPrevious({ dataset })
        setDataset({
          ...source,
          id: crypto.randomUUID(),
          summary: body.applied.summary,
          countryOverride: body.applied.countryOverride ?? undefined,
        })
        setAttachment(null)
      }
      setMessages(
        (current) =>
          [
            ...current,
            { id: crypto.randomUUID(), role: 'user', content: message, attachment: attachment?.filename },
            { id: crypto.randomUUID(), role: 'assistant', content: body.reply, receipt: body.applied?.label },
          ].slice(-40) as ChatMessage[],
      )
      setDraft('')
      setModel(body.model)
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(failure instanceof Error ? failure.message : 'Falha de conexão. Tente novamente.')
    } finally {
      if (request.current === controller) {
        request.current = null
        setBusy(false)
      }
    }
  }
  const cancel = () => {
    request.current?.abort()
    request.current = null
    setBusy(false)
  }
  const undo = () => {
    if (!previous || busy) return
    setDataset(previous.dataset)
    setPrevious(null)
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Última aplicação desfeita. O dashboard voltou ao estado anterior.',
      },
    ])
  }
  const clear = () => {
    if (busy) return
    setMessages([])
    setDraft('')
    setAttachment(null)
    setError('')
  }
  return {
    messages,
    dataset,
    attachment,
    draft,
    setDraft,
    consent,
    setConsent,
    busy,
    reading,
    error,
    model,
    configured,
    attach,
    removeAttachment: () => {
      readVersion.current++
      setAttachment(null)
      setReading(false)
    },
    send,
    cancel,
    undo,
    canUndo: previous !== null,
    clear,
  }
}
export type NextAIState = ReturnType<typeof useNextAI>
