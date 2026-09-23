import { parse } from 'csv-parse/sync'

export type ImportedRow = {
  date: string | null
  hour: string | null
  campaign: string
  adSet: string | null
  ad: string | null
  country: string | null
  region: string | null
  channel: string | null
  currency: string | null
  spend: number
  results: number | null
  resultType: string | null
  conversionValue: number | null
  impressions: number | null
  clicks: number | null
}

export type ImportSummary = {
  filename: string
  rows: number
  skippedRows: number
  rowsWithoutDate: number
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
  campaigns: Array<{ name: string; spend: number; results: number | null; conversionValue: number | null }>
  countries: Array<{ name: string; spend: number; results: number | null }>
  regions: Array<{ name: string; spend: number; results: number | null }>
  channels: Array<{ name: string; spend: number; results: number | null }>
  daily: Array<{ date: string; spend: number; results: number | null; conversionValue: number | null }>
  hourly: Array<{ hour: string; spend: number; results: number | null }>
}

export class CsvImportError extends Error {}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const headerAliases: Record<string, string[]> = {
  date: ['reporting starts', 'data inicio', 'inicio do relatorio', 'data', 'date', 'day'],
  hour: ['hour of day', 'hora do dia', 'hour', 'hora', 'time', 'horario'],
  campaign: ['campaign name', 'nome da campanha', 'campanha', 'campaign'],
  adSet: ['ad set name', 'nome do conjunto de anuncios', 'conjunto de anuncios', 'ad set'],
  ad: ['ad name', 'nome do anuncio', 'anuncio', 'ad'],
  country: ['country', 'pais', 'regiao pais', 'country name'],
  region: ['region', 'regiao', 'state', 'estado'],
  channel: ['publisher platform', 'platform', 'plataforma', 'placement', 'posicionamento', 'canal'],
  currency: ['currency', 'moeda', 'account currency', 'moeda da conta'],
  spend: ['amount spent', 'valor gasto', 'gasto', 'spend', 'spent'],
  results: ['results', 'resultados', 'result'],
  resultType: ['result indicator', 'indicador de resultados', 'result type', 'tipo de resultado'],
  conversionValue: [
    'purchase conversion value',
    'website purchase conversion value',
    'valor de conversao',
    'conversion value',
    'purchase value',
  ],
  impressions: ['impressions', 'impressoes'],
  clicks: ['link clicks', 'cliques no link', 'outbound clicks', 'cliques de saida', 'clicks', 'cliques'],
}

function resolveColumns(headers: string[]) {
  const normalized = headers.map(normalize)
  const found: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(headerAliases)) {
    const index = normalized.findIndex((header) =>
      aliases.some((alias) => header === alias || header.startsWith(`${alias} `)),
    )
    if (index >= 0) found[field] = index
  }
  return found
}

function detectDelimiter(csv: string): string {
  const firstLine = csv.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? ''
  const counts = new Map([
    [',', 0],
    [';', 0],
    ['\t', 0],
  ])
  let quoted = false
  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i]!
    if (char === '"') {
      if (quoted && firstLine[i + 1] === '"') i++
      else quoted = !quoted
    } else if (!quoted && counts.has(char)) counts.set(char, counts.get(char)! + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0]
}

function parseNumber(input: unknown): number | null {
  if (input === undefined || input === null || String(input).trim() === '') return null
  let value = String(input)
    .trim()
    .replace(/[^\d,\.\-]/g, '')
  if (!value || value === '-') return null
  const comma = value.lastIndexOf(',')
  const dot = value.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    const decimalMark = comma > dot ? ',' : '.'
    value = value.replace(decimalMark === ',' ? /\./g : /,/g, '').replace(decimalMark, '.')
  } else if (comma >= 0 || dot >= 0) {
    const mark = comma >= 0 ? ',' : '.'
    const digitsAfter = value.length - value.lastIndexOf(mark) - 1
    if (digitsAfter === 3) value = value.replace(mark, '')
    else value = value.replace(mark, '.')
  }
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function parseDate(input: unknown): string | null {
  if (!input) return null
  const value = String(input).trim()
  const br = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/)
  if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
  const iso = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return iso?.[1] ?? null
}

function parseHour(input: unknown): string | null {
  if (!input) return null
  const match = String(input).match(/(?:T|\s|^)(\d{1,2}):\d{2}(?::\d{2})?\b/)
  return match ? `${match[1]!.padStart(2, '0')}:00` : null
}

function textAt(record: string[], index: number | undefined): string | null {
  if (index === undefined) return null
  const value = record[index]?.trim()
  return value ? value.slice(0, 180) : null
}

function getNumber(record: string[], index: number | undefined): number | null {
  return index === undefined ? null : parseNumber(record[index])
}

export function parseMetaCsv(
  csv: string,
  filename = 'export.csv',
): { summary: ImportSummary; rows: ImportedRow[] } {
  if (typeof csv !== 'string' || Buffer.byteLength(csv, 'utf8') > 5 * 1024 * 1024) {
    throw new CsvImportError('O arquivo ultrapassa o limite de 5 MB.')
  }
  const safeFilename = filename.replace(/[\\/\0-\x1f]/g, '').slice(0, 120) || 'export.csv'
  let records: string[][]
  try {
    records = parse(csv, {
      bom: true,
      delimiter: detectDelimiter(csv),
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
      max_record_size: 16_384,
    })
  } catch {
    throw new CsvImportError(
      'Não foi possível interpretar o CSV. Confira o delimitador e a codificação do arquivo.',
    )
  }
  if (records.length < 2)
    throw new CsvImportError('O CSV precisa conter um cabeçalho e ao menos uma linha de dados.')
  if (records.length > 20_001) throw new CsvImportError('O arquivo ultrapassa o limite de 20 mil linhas.')
  const columns = resolveColumns(records[0] ?? [])
  if (columns.campaign === undefined || columns.spend === undefined) {
    throw new CsvImportError(
      'Não encontrei as colunas de campanha e valor gasto. Use um CSV de campanhas exportado pelo Meta Ads.',
    )
  }

  const rows: ImportedRow[] = []
  let invalidRows = 0
  let rowsWithoutDate = 0
  for (let i = 1; i < records.length; i++) {
    const record = records[i] ?? []
    const campaign = textAt(record, columns.campaign)
    const spend = getNumber(record, columns.spend)
    const invalidMetric = ['results', 'conversionValue', 'impressions', 'clicks'].some((key) => {
      const value = getNumber(record, columns[key])
      return value !== null && value < 0
    })
    if (!campaign && record.every((cell) => !cell.trim())) continue
    if (!campaign || spend === null || spend < 0 || invalidMetric) {
      invalidRows++
      continue
    }
    const currencyHeader = records[0]?.[columns.spend] ?? ''
    const currencyCode = currencyHeader.match(/\b(BRL|USD|EUR|GBP|CAD|AUD|MXN|ARS|CLP|JPY)\b/i)?.[1]
    const rawDate = textAt(record, columns.date)
    const parsedDate = parseDate(rawDate)
    if (!parsedDate && columns.date !== undefined) rowsWithoutDate++
    rows.push({
      date: parsedDate,
      hour: parseHour(textAt(record, columns.hour)) ?? parseHour(rawDate),
      campaign,
      adSet: textAt(record, columns.adSet),
      ad: textAt(record, columns.ad),
      country: textAt(record, columns.country),
      region: textAt(record, columns.region),
      channel: textAt(record, columns.channel),
      currency: (textAt(record, columns.currency) ?? currencyCode)?.toUpperCase() ?? null,
      spend,
      results: getNumber(record, columns.results),
      resultType: textAt(record, columns.resultType),
      conversionValue: getNumber(record, columns.conversionValue),
      impressions: getNumber(record, columns.impressions),
      clicks: getNumber(record, columns.clicks),
    })
  }
  if (!rows.length)
    throw new CsvImportError(
      'Nenhuma linha v?lida encontrada. Confira os nomes da campanha e do valor gasto.',
    )

  const aggregate = (key: 'campaign' | 'country' | 'region' | 'channel') => {
    const group = new Map<string, { spend: number; results: number | null; conversionValue: number | null }>()
    for (const row of rows) {
      const name = row[key]
      if (!name) continue
      const current = group.get(name) ?? { spend: 0, results: 0, conversionValue: 0 }
      current.spend += row.spend
      current.results =
        current.results === null || row.results === null ? null : current.results + row.results
      current.conversionValue =
        current.conversionValue === null || row.conversionValue === null
          ? null
          : current.conversionValue + row.conversionValue
      group.set(name, current)
    }
    return [...group.entries()]
      .map(([name, totals]) => ({ name, ...totals }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 50)
  }
  const total = rows.reduce(
    (acc, row) => ({
      spend: acc.spend + row.spend,
      results: acc.results === null || row.results === null ? null : acc.results + row.results,
      conversionValue:
        acc.conversionValue === null || row.conversionValue === null
          ? null
          : acc.conversionValue + row.conversionValue,
      impressions:
        acc.impressions === null || row.impressions === null ? null : acc.impressions + row.impressions,
      clicks: acc.clicks === null || row.clicks === null ? null : acc.clicks + row.clicks,
    }),
    {
      spend: 0,
      results: 0 as number | null,
      conversionValue: 0 as number | null,
      impressions: 0 as number | null,
      clicks: 0 as number | null,
    },
  )
  const dates = rows
    .map((row) => row.date)
    .filter((date): date is string => date !== null)
    .sort()
  const dailyMap = new Map<
    string,
    { spend: number; results: number | null; conversionValue: number | null }
  >()
  for (const row of rows) {
    if (!row.date) continue
    const value = dailyMap.get(row.date) ?? { spend: 0, results: 0, conversionValue: 0 }
    value.spend += row.spend
    value.results = value.results === null || row.results === null ? null : value.results + row.results
    value.conversionValue =
      value.conversionValue === null || row.conversionValue === null
        ? null
        : value.conversionValue + row.conversionValue
    dailyMap.set(row.date, value)
  }
  const currencies = [
    ...new Set(rows.map((row) => row.currency).filter((value): value is string => value !== null)),
  ]
  return {
    rows,
    summary: {
      filename: safeFilename,
      rows: rows.length,
      skippedRows: invalidRows,
      rowsWithoutDate,
      dateRange: dates.length ? { from: dates[0]!, to: dates[dates.length - 1]! } : null,
      currency: currencies.length === 1 ? currencies[0]! : null,
      totals: {
        ...total,
        ctr: total.impressions && total.clicks !== null ? (total.clicks / total.impressions) * 100 : null,
        cpa: total.results ? total.spend / total.results : null,
        roas: total.conversionValue !== null && total.spend ? total.conversionValue / total.spend : null,
      },
      campaigns: aggregate('campaign'),
      countries: aggregate('country'),
      regions: aggregate('region'),
      channels: aggregate('channel'),
      daily: [...dailyMap.entries()]
        .map(([date, value]) => ({ date, ...value }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-180),
      hourly: (() => {
        const group = new Map<string, { spend: number; results: number | null }>()
        for (const row of rows) {
          if (!row.hour) continue
          const value = group.get(row.hour) ?? { spend: 0, results: 0 }
          value.spend += row.spend
          value.results = value.results === null || row.results === null ? null : value.results + row.results
          group.set(row.hour, value)
        }
        return [...group.entries()]
          .map(([hour, value]) => ({ hour, ...value }))
          .sort((a, b) => a.hour.localeCompare(b.hour))
      })(),
    },
  }
}
