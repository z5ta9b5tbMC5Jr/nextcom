import express, { type Request, type Response, type NextFunction } from 'express'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { CsvImportError, parseMetaCsv, type ImportSummary } from './csv-import.js'
import { analyzeImport } from './ai-agent.js'

// Resolved relative to this module; secrets never enter the frontend bundle.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })

const app = express()
app.disable('x-powered-by')
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store')
  const origin = req.get('origin')
  if (origin) {
    const configured = process.env.NEXTCOM_ALLOWED_ORIGINS?.split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    const allowed = configured?.length ? configured : ['http://127.0.0.1:5173', 'http://localhost:5173']
    const localDevOrigin =
      process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):51[7-9]\d$/.test(origin)
    if (!allowed.includes(origin) && !localDevOrigin)
      return res.status(403).json({ error: 'Origem não permitida.' })
  }
  next()
})
app.use(express.json({ limit: '64kb' }))
app.use('/api/imports/meta-csv', express.text({ type: ['text/csv', 'application/csv'], limit: '5mb' }))

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'nextcom-api' }))
app.get('/api/integrations/meta/status', (_req, res) => {
  res.json({
    provider: 'meta',
    connected: false,
    mode: 'demo',
    message: 'Integração Meta Ads prevista para uma próxima etapa.',
  })
})
app.get('/api/ai/status', (_req, res) => {
  res.json({
    provider: 'openrouter',
    configured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    model: process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini',
  })
})

app.post('/api/imports/meta-csv', (req, res) => {
  if (typeof req.body !== 'string')
    return res.status(415).json({ error: 'Envie o arquivo como text/csv em UTF-8.' })
  let filename = String(req.get('x-filename') ?? 'export.csv').slice(0, 200)
  try {
    filename = decodeURIComponent(filename)
  } catch {
    filename = 'export.csv'
  }
  try {
    const { summary } = parseMetaCsv(req.body, filename)
    // CSV and normalized rows remain in the browser; nothing is written to disk or database.
    return res.json({ summary })
  } catch (error) {
    if (error instanceof CsvImportError) return res.status(400).json({ error: error.message })
    return res.status(400).json({ error: 'Não foi possível processar este CSV.' })
  }
})

const recentAnalyses = new Map<string, number[]>()
function analysisRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now()
  const ip = req.ip || 'local'
  const timestamps = (recentAnalyses.get(ip) ?? []).filter((time) => now - time < 60_000)
  if (timestamps.length >= 4)
    return res.status(429).json({ error: 'Limite de análises atingido. Tente novamente em um minuto.' })
  timestamps.push(now)
  recentAnalyses.set(ip, timestamps)
  if (recentAnalyses.size > 1000) {
    for (const [key, values] of recentAnalyses)
      if (!values.some((time) => now - time < 60_000)) recentAnalyses.delete(key)
  }
  next()
}

function cleanText(value: unknown, limit: number): string | null {
  return typeof value === 'string' && value.trim()
    ? value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .trim()
        .slice(0, limit)
    : null
}
function cleanMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e15 ? value : null
}
function cleanGroups(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 20).flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const item = entry as Record<string, unknown>
    const name = cleanText(item.name, 100)
    const spend = cleanMetric(item.spend)
    if (!name || spend === null) return []
    return [
      {
        name,
        spend,
        results: cleanMetric(item.results),
        conversionValue: cleanMetric(item.conversionValue),
      },
    ]
  })
}
function validateSummary(value: unknown): ImportSummary | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const totalsInput = input.totals
  if (!totalsInput || typeof totalsInput !== 'object') return null
  const metrics = totalsInput as Record<string, unknown>
  const spend = cleanMetric(metrics.spend)
  if (spend === null || spend < 0) return null
  const range = input.dateRange as Record<string, unknown> | null
  const dateRange =
    range && typeof range === 'object' && typeof range.from === 'string' && typeof range.to === 'string'
      ? { from: range.from.slice(0, 10), to: range.to.slice(0, 10) }
      : null
  const daily = Array.isArray(input.daily)
    ? input.daily.slice(-60).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const row = entry as Record<string, unknown>
        const date = cleanText(row.date, 10)
        const rowSpend = cleanMetric(row.spend)
        return date && rowSpend !== null && rowSpend >= 0
          ? [
              {
                date,
                spend: rowSpend,
                results: cleanMetric(row.results),
                conversionValue: cleanMetric(row.conversionValue),
              },
            ]
          : []
      })
    : []
  const hourly = Array.isArray(input.hourly)
    ? input.hourly.slice(0, 24).flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const row = entry as Record<string, unknown>
        const hour = cleanText(row.hour, 5)
        const rowSpend = cleanMetric(row.spend)
        return hour && rowSpend !== null && rowSpend >= 0
          ? [{ hour, spend: rowSpend, results: cleanMetric(row.results) }]
          : []
      })
    : []
  return {
    filename: 'import.csv',
    rows: Math.min(20_000, Math.max(0, Number(input.rows) || 0)),
    skippedRows: Math.min(20_000, Math.max(0, Number(input.skippedRows) || 0)),
    rowsWithoutDate: Math.min(20_000, Math.max(0, Number(input.rowsWithoutDate) || 0)),
    dateRange,
    currency: cleanText(input.currency, 3),
    totals: {
      spend,
      results: cleanMetric(metrics.results),
      conversionValue: cleanMetric(metrics.conversionValue),
      impressions: cleanMetric(metrics.impressions),
      clicks: cleanMetric(metrics.clicks),
      ctr: cleanMetric(metrics.ctr),
      cpa: cleanMetric(metrics.cpa),
      roas: cleanMetric(metrics.roas),
    },
    campaigns: cleanGroups(input.campaigns),
    countries: cleanGroups(input.countries),
    regions: cleanGroups(input.regions),
    channels: cleanGroups(input.channels),
    daily,
    hourly,
  }
}

app.post('/api/ai/analyze-import', analysisRateLimit, async (req, res) => {
  const summary = validateSummary(req.body?.summary)
  if (!summary)
    return res.status(400).json({ error: 'Resumo da importação inválido. Importe o CSV novamente.' })
  try {
    return res.json({ analysis: await analyzeImport(summary) })
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 502
    const message = error instanceof Error ? error.message : 'Não foi possível concluir a análise.'
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: message })
  }
})

app.use((_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }))
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'O arquivo ultrapassa o limite de 5 MB.' })
  }
  return res.status(400).json({ error: 'Requisição inválida.' })
})

const port = Number(process.env.PORT || 3001)
app.listen(port, '127.0.0.1', () => console.log(`NextCom API: http://127.0.0.1:${port}`))
