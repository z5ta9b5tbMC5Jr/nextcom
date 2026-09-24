import { csvCell } from './data'

type Group = {
  name: string
  spend: number
  results: number | null
  conversionValue?: number | null
  resultTypes?: string[]
}

export function exportImportedSummary(summary: ImportSummary) {
  const lines = [
    ['Nome', 'Valor gasto', 'Moeda', 'Resultados', 'Indicadores', 'Valor de conversão'],
    ...summary.campaigns.map((row) => [
      row.name,
      row.spend.toFixed(2),
      summary.currency ?? '',
      row.results === null ? '' : String(row.results),
      row.resultTypes?.join(' | ') ?? '',
      row.conversionValue === null || row.conversionValue === undefined ? '' : row.conversionValue.toFixed(2),
    ]),
  ]
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + lines.map((row) => row.map(csvCell).join(';')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'nextcom-resumo-importado.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export type ImportSummary = {
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
