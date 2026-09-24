import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, BarChart3, Check, FileUp, LoaderCircle, Sparkles, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { useNextMotion } from '@/lib/motion'

type Group = {
  name: string
  spend: number
  results: number | null
  conversionValue?: number | null
  resultTypes?: string[]
}
type Summary = {
  filename: string
  rows: number
  skippedRows: number
  rowsWithoutDate: number
  periodAggregated: boolean
  entityLabel: string
  resultsLabel: string
  dateRange: { from: string; to: string } | null
  currency: string | null
  totals: {
    spend: number
    results: number | null
    conversionValue: number | null
    impressions: number | null
    clicks: number | null
    ctr: number | null
    cpa: number | null
    roas: number | null
  }
  campaigns: Group[]
  resultsByType: Array<{ type: string; spend: number; results: number; cpa: number | null }>
  countries: Group[]
  regions: Group[]
  channels: Group[]
  daily: Array<{ date: string; spend: number; results: number | null; conversionValue: number | null }>
  hourly: Array<{ hour: string; spend: number; results: number | null }>
}
type Analysis = {
  summary: string
  findings: Array<{ title: string; detail: string; confidence: string }>
  nextSteps: string[]
  model: string
}

const amount = (value: number | null, currencyCode: string | null) =>
  value === null
    ? '—'
    : currencyCode && /^[A-Z]{3}$/.test(currencyCode)
      ? new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: currencyCode,
          maximumFractionDigits: 2,
        }).format(value)
      : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} (moeda não identificada)`
const integer = (value: number | null) =>
  value === null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value)
const date = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00Z`))

async function responseError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error || 'Não foi possível concluir a solicitação.'
  } catch {
    return 'Não foi possível concluir a solicitação.'
  }
}

export function CsvImportPanel() {
  const { reduced } = useNextMotion()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [busy, setBusy] = useState<'upload' | 'analysis' | null>(null)
  const [error, setError] = useState('')
  const [consented, setConsented] = useState(false)
  const [aiReady, setAiReady] = useState<boolean | null>(null)
  const [aiModel, setAiModel] = useState('')
  const [inputKey, setInputKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ai/status', { signal: controller.signal })
      .then((response) => response.json() as Promise<{ configured?: boolean; model?: string }>)
      .then((status) => {
        setAiReady(status.configured === true)
        setAiModel(typeof status.model === 'string' ? status.model.trim().slice(0, 120) : '')
      })
      .catch(() => setAiReady(false))
    return () => controller.abort()
  }, [])

  const importFile = async (file?: File) => {
    if (!file) return
    setError('')
    setAnalysis(null)
    setSummary(null)
    setConsented(false)
    if (!file.name.toLocaleLowerCase().endsWith('.csv')) {
      setError('Selecione um arquivo com extensão .csv.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('O limite de importação é 5 MB.')
      return
    }
    setBusy('upload')
    try {
      const response = await fetch('/api/imports/meta-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'X-Filename': encodeURIComponent(file.name) },
        body: await file.text(),
      })
      if (!response.ok) throw new Error(await responseError(response))
      const body = (await response.json()) as { summary: Summary }
      setSummary(body.summary)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar o CSV.')
    } finally {
      setBusy(null)
      setInputKey((value) => value + 1)
    }
  }

  const analyze = async () => {
    if (!summary || !consented) return
    setBusy('analysis')
    setError('')
    setAnalysis(null)
    try {
      const response = await fetch('/api/ai/analyze-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      })
      if (!response.ok) throw new Error(await responseError(response))
      const body = (await response.json()) as { analysis: Analysis }
      setAnalysis(body.analysis)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a análise.')
    } finally {
      setBusy(null)
    }
  }

  const daily = summary?.daily.slice(-14) ?? []
  const maxDaily = Math.max(1, ...daily.map((item) => item.spend))
  const consentId = 'openrouter-data-consent'
  return (
    <div className="csv-import-panel">
      <div className="csv-import-intro">
        <span className="csv-import-icon">
          <FileUp size={18} />
        </span>
        <div>
          <strong>Importação de relatório Meta Ads</strong>
          <p>
            CSV exportado do Gerenciador de Anúncios. O arquivo é processado em memória e não fica salvo no
            servidor.
          </p>
        </div>
      </div>
      <label className="csv-file-drop" htmlFor={`meta-csv-${inputKey}`}>
        {busy === 'upload' ? <LoaderCircle className="csv-spinner" size={20} /> : <UploadCloud size={20} />}
        <span>
          <strong>{busy === 'upload' ? 'Lendo e organizando o CSV…' : 'Escolha um arquivo CSV'}</strong>
          <small>Até 5 MB · UTF-8 · máximo 20 mil linhas</small>
        </span>
        <input
          key={inputKey}
          id={`meta-csv-${inputKey}`}
          type="file"
          accept=".csv,text/csv"
          disabled={busy !== null}
          onChange={(event) => void importFile(event.target.files?.[0])}
        />
      </label>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            key="error"
            className="csv-message csv-error"
            role="alert"
            initial={{ opacity: 0, y: reduced ? 0 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {summary && (
        <MotionPanel className="csv-report" key={summary.filename}>
          <div className="csv-report-heading">
            <div>
              <span className="csv-status">
                <Check size={13} /> CSV organizado
              </span>
              <h3>{summary.filename}</h3>
              <p>
                {summary.rows.toLocaleString('pt-BR')} linhas válidas
                {summary.dateRange
                  ? ` · ${date(summary.dateRange.from)} – ${date(summary.dateRange.to)}`
                  : ' · sem coluna de data reconhecida'}
              </p>
            </div>
            <BarChart3 size={19} />
          </div>
          {(summary.skippedRows > 0 || summary.rowsWithoutDate > 0) && (
            <p className="csv-quality-warning" role="status">
              {summary.skippedRows > 0 &&
                `${summary.skippedRows} linha(s) sem campanha ou valor válido foram ignoradas.`}
              {summary.skippedRows > 0 && summary.rowsWithoutDate > 0 && ' '}
              {summary.rowsWithoutDate > 0 &&
                `${summary.rowsWithoutDate} linha(s) não entraram no gráfico temporal porque a data não pôde ser lida.`}
            </p>
          )}
          {summary.periodAggregated && (
            <p className="csv-temporal-note" role="note">
              Este relatório traz totais consolidados do intervalo por{' '}
              {summary.entityLabel.toLocaleLowerCase('pt-BR')}; ele não contém métricas diárias, então não é
              possível montar uma tendência por dia.
            </p>
          )}
          <div className="csv-metrics">
            <div>
              <span>Valor gasto</span>
              <strong>{amount(summary.totals.spend, summary.currency)}</strong>
            </div>
            <div>
              <span>{summary.resultsLabel}</span>
              <strong>{integer(summary.totals.results)}</strong>
            </div>
            <div>
              <span>Custo por resultado</span>
              <strong>{amount(summary.totals.cpa, summary.currency)}</strong>
            </div>
            <div>
              <span>Valor de conversão</span>
              <strong>{amount(summary.totals.conversionValue, summary.currency)}</strong>
            </div>
            <div>
              <span>ROAS</span>
              <strong>
                {summary.totals.roas === null ? '—' : `${summary.totals.roas.toFixed(2).replace('.', ',')}x`}
              </strong>
            </div>
            <div>
              <span>CTR</span>
              <strong>
                {summary.totals.ctr === null ? '—' : `${summary.totals.ctr.toFixed(2).replace('.', ',')}%`}
              </strong>
            </div>
          </div>
          <div className="csv-volume">
            {summary.totals.impressions !== null && (
              <span>
                Impressões <strong>{integer(summary.totals.impressions)}</strong>
              </span>
            )}
            {summary.totals.clicks !== null && (
              <span>
                Cliques <strong>{integer(summary.totals.clicks)}</strong>
              </span>
            )}
          </div>
          {summary.resultsByType.length > 1 && (
            <section className="csv-result-breakdown">
              <h4>Indicadores de resultado diferentes</h4>
              <p>
                Para evitar somar ações distintas, os resultados e o custo por resultado acima ficam
                separados.
              </p>
              {summary.resultsByType.map((item) => (
                <div className="csv-group-row" key={item.type}>
                  <span title={item.type}>
                    {item.type} · {integer(item.results)} resultados
                  </span>
                  <strong>{amount(item.cpa, summary.currency)} por resultado</strong>
                </div>
              ))}
            </section>
          )}
          {daily.length > 1 && (
            <section className="csv-daily">
              <h4>Investimento por dia</h4>
              <div
                className="csv-bars"
                role="img"
                aria-label={`Investimento diário nos últimos ${daily.length} dias com dados`}
              >
                {daily.map((item) => (
                  <span
                    key={item.date}
                    title={`${date(item.date)} · ${amount(item.spend, summary.currency)}`}
                    aria-label={`${date(item.date)}: ${amount(item.spend, summary.currency)}`}
                  >
                    <i style={{ height: `${Math.max(4, (item.spend / maxDaily) * 100)}%` }} />
                    <small>{date(item.date).slice(0, 6)}</small>
                  </span>
                ))}
              </div>
            </section>
          )}
          {daily.length < 2 && summary.hourly.length > 1 && (
            <section className="csv-daily">
              <h4>Investimento por horário</h4>
              <div className="csv-bars" role="img" aria-label="Investimento agregado por horário do dia">
                {summary.hourly.map((item) => (
                  <span
                    key={item.hour}
                    title={`${item.hour} · ${amount(item.spend, summary.currency)}`}
                    aria-label={`${item.hour}: ${amount(item.spend, summary.currency)}`}
                  >
                    <i
                      style={{
                        height: `${Math.max(4, (item.spend / Math.max(1, ...summary.hourly.map((hour) => hour.spend))) * 100)}%`,
                      }}
                    />
                    <small>{item.hour}</small>
                  </span>
                ))}
              </div>
            </section>
          )}
          <div className="csv-dimensions">
            <section>
              <h4>
                {summary.entityLabel} ({summary.campaigns.length})
              </h4>
              {summary.campaigns.slice(0, 5).map((item) => (
                <div className="csv-group-row" key={item.name}>
                  <span title={item.name}>{item.name}</span>
                  <strong>{amount(item.spend, summary.currency)}</strong>
                </div>
              ))}
              {!summary.campaigns.length && <p>Sem coluna de campanha reconhecida.</p>}
            </section>
            <section>
              <h4>Países ({summary.countries.length})</h4>
              {summary.countries.slice(0, 5).map((item) => (
                <div className="csv-group-row" key={item.name}>
                  <span title={item.name}>{item.name}</span>
                  <strong>{amount(item.spend, summary.currency)}</strong>
                </div>
              ))}
              {!summary.countries.length && <p>O arquivo não inclui detalhamento por país.</p>}
            </section>
            <section>
              <h4>Regiões ({summary.regions.length})</h4>
              {summary.regions.slice(0, 5).map((item) => (
                <div className="csv-group-row" key={item.name}>
                  <span title={item.name}>{item.name}</span>
                  <strong>{amount(item.spend, summary.currency)}</strong>
                </div>
              ))}
              {!summary.regions.length && <p>O arquivo não inclui detalhamento por região.</p>}
            </section>
            <section>
              <h4>Canais ({summary.channels.length})</h4>
              {summary.channels.slice(0, 5).map((item) => (
                <div className="csv-group-row" key={item.name}>
                  <span title={item.name}>{item.name}</span>
                  <strong>{amount(item.spend, summary.currency)}</strong>
                </div>
              ))}
              {!summary.channels.length && <p>O arquivo não inclui detalhamento por canal.</p>}
            </section>
          </div>
          <div className="csv-agent-consent">
            <label htmlFor={consentId}>
              <input
                id={consentId}
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.target.checked)}
              />{' '}
              <span>
                Entendo que, ao solicitar a análise, o resumo agregado (incluindo nomes de campanhas e
                métricas por data, região e canal) será enviado à OpenRouter e ao provedor do modelo
                selecionado. Evite incluir dados pessoais ou identificadores de conta; as políticas de
                retenção desses serviços também se aplicam.
              </span>
            </label>
            {aiReady === false && (
              <p className="csv-ai-config-note" role="status">
                {aiModel ? `Modelo detectado: ${aiModel}. ` : ''}
                Configure OPENROUTER_API_KEY no .env da raiz e reinicie a API para ativar as análises.
              </p>
            )}
            <Button onClick={() => void analyze()} disabled={!consented || busy !== null || aiReady !== true}>
              <Sparkles size={15} />
              {busy === 'analysis'
                ? 'Analisando…'
                : aiReady === false
                  ? 'Assistente não configurado'
                  : 'Analisar com NextCom IA'}
              {busy === 'analysis' && <LoaderCircle className="csv-spinner" size={15} />}
            </Button>
          </div>
        </MotionPanel>
      )}

      <AnimatePresence initial={false}>
        {analysis && (
          <motion.section
            key="analysis"
            className="csv-analysis"
            initial={{ opacity: 0, y: reduced ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="csv-analysis-title">
              <Sparkles size={17} />
              <div>
                <strong>Análise do NextCom</strong>
                <span>Protótipo · {analysis.model}</span>
              </div>
            </div>
            <p className="csv-analysis-summary">{analysis.summary}</p>
            {analysis.findings.map((item, index) => (
              <article className="csv-finding" key={`${item.title}-${index}`}>
                <div>
                  <strong>{item.title}</strong>
                  <span>Confiança {item.confidence}</span>
                </div>
                <p>{item.detail}</p>
              </article>
            ))}
            {!!analysis.nextSteps.length && (
              <div className="csv-next-steps">
                <strong>Próximos passos para avaliar</strong>
                {analysis.nextSteps.map((step, index) => (
                  <p key={index}>
                    <span>{index + 1}</span>
                    {step}
                  </p>
                ))}
              </div>
            )}
            <small className="csv-disclaimer">
              Sugestões geradas por IA podem conter erros. Confira os dados e valide hipóteses antes de tomar
              decisões.
            </small>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
