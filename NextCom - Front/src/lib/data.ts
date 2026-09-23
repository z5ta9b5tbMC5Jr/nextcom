export type Channel = 'Instagram' | 'Facebook' | 'Audience Network'
export type ChannelFilter = Channel | 'all'
export type GeoMetric = 'spend' | 'results' | 'cpa' | 'revenue' | 'roas' | 'ctr'
export type Totals = { spend: number; results: number; revenue: number; impressions: number; clicks: number }
export type Country = { id: string; code: string; name: string; flag: string; weight: number }
export const countries: Country[] = [
  { id: '076', code: 'BR', name: 'Brasil', flag: '🇧🇷', weight: 46 },
  { id: '840', code: 'US', name: 'Estados Unidos', flag: '🇺🇸', weight: 18 },
  { id: '620', code: 'PT', name: 'Portugal', flag: '🇵🇹', weight: 9 },
  { id: '032', code: 'AR', name: 'Argentina', flag: '🇦🇷', weight: 7 },
  { id: '826', code: 'GB', name: 'Reino Unido', flag: '🇬🇧', weight: 5 },
  { id: '124', code: 'CA', name: 'Canadá', flag: '🇨🇦', weight: 4 },
  { id: '276', code: 'DE', name: 'Alemanha', flag: '🇩🇪', weight: 3 },
  { id: '250', code: 'FR', name: 'França', flag: '🇫🇷', weight: 3 },
  { id: '484', code: 'MX', name: 'México', flag: '🇲🇽', weight: 2 },
  { id: '152', code: 'CL', name: 'Chile', flag: '🇨🇱', weight: 1.5 },
  { id: '724', code: 'ES', name: 'Espanha', flag: '🇪🇸', weight: 1 },
  { id: '036', code: 'AU', name: 'Austrália', flag: '🇦🇺', weight: 0.5 },
]
export const channels: Channel[] = ['Instagram', 'Facebook', 'Audience Network']
export const channelColors: Record<Channel, string> = {
  Instagram: '#8247F5',
  Facebook: '#E96D00',
  'Audience Network': '#F4BA43',
}
export const campaignDefinitions = [
  {
    id: 'c1',
    name: 'Conversões · Coleção essencial',
    objective: 'Vendas',
    status: 'Ativa',
    code: 'CE',
    color: 'purple',
    weight: 1.4,
  },
  {
    id: 'c2',
    name: 'Remarketing · Quem já conhece',
    objective: 'Vendas',
    status: 'Ativa',
    code: 'RM',
    color: 'orange',
    weight: 0.9,
  },
  {
    id: 'c3',
    name: 'Novos clientes · Setembro',
    objective: 'Vendas',
    status: 'Ativa',
    code: 'NC',
    color: 'blue',
    weight: 0.75,
  },
  {
    id: 'c4',
    name: 'Oferta especial · Primavera',
    objective: 'Vendas',
    status: 'Ativa',
    code: 'OP',
    color: 'green',
    weight: 0.6,
  },
  {
    id: 'c5',
    name: 'Coleção anterior · Últimas peças',
    objective: 'Vendas',
    status: 'Pausada',
    code: 'CA',
    color: 'yellow',
    weight: 0.35,
  },
]
export type RecordRow = Totals & { day: string; country: string; channel: Channel; campaign: string }
export const DEMO_END = '2026-09-23'
const end = new Date(`${DEMO_END}T12:00:00Z`)
export function dateOffset(offset: number) {
  const date = new Date(end)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}
// Dataset estático e determinístico. Nenhuma chamada à Meta nesta fase.
export const demoRecords: RecordRow[] = Array.from({ length: 60 }, (_, d) => {
  const day = dateOffset(d - 59)
  return countries.flatMap((country, ci) =>
    campaignDefinitions.flatMap((campaign, pi) =>
      channels.map((channel, ch) => {
        const wave = 0.8 + ((d * 7 + ci * 3 + pi * 11) % 17) / 24
        const growth = 0.8 + d / 170
        const spend =
          Math.round(country.weight * campaign.weight * [1.65, 1.08, 0.3][ch] * wave * growth * 100) / 100
        const impressions = Math.round(spend * (75 + ci * 4 + ch * 12))
        const clicks = Math.round(impressions * (0.021 + pi * 0.003 + d / 16000))
        const results = Math.round(clicks * (0.035 + pi * 0.008))
        const revenue = Math.round(results * (32 + pi * 9 + ci * 2) * 100) / 100
        const paused = campaign.status === 'Pausada' && d > 53
        return {
          day,
          country: country.id,
          channel,
          campaign: campaign.id,
          spend: paused ? 0 : spend,
          impressions: paused ? 0 : impressions,
          clicks: paused ? 0 : clicks,
          results: paused ? 0 : results,
          revenue: paused ? 0 : revenue,
        }
      }),
    ),
  )
}).flat()
export function sum(rows: Totals[]): Totals {
  return rows.reduce(
    (a, r) => ({
      spend: a.spend + r.spend,
      results: a.results + r.results,
      revenue: a.revenue + r.revenue,
      impressions: a.impressions + r.impressions,
      clicks: a.clicks + r.clicks,
    }),
    { spend: 0, results: 0, revenue: 0, impressions: 0, clicks: 0 },
  )
}
export function ratio(n: number, d: number) {
  return d ? n / d : 0
}
export function metrics(t: Totals) {
  return {
    ...t,
    cpa: ratio(t.spend, t.results),
    roas: ratio(t.revenue, t.spend),
    ctr: ratio(t.clicks, t.impressions) * 100,
  }
}
export function getRecords(days: number, channel: ChannelFilter, previous = false) {
  const from = dateOffset(-days + 1 - (previous ? days : 0))
  const to = dateOffset(previous ? -days : 0)
  return demoRecords.filter(
    (r) => r.day >= from && r.day <= to && (channel === 'all' || r.channel === channel),
  )
}
export const currency = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
export const number = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
export const decimal = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const short = (n: number) =>
  n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : number(n)
export const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
    .replace('.', '')
export const geoLabels: Record<GeoMetric, string> = {
  spend: 'Valor gasto',
  results: 'Resultados',
  cpa: 'CPA',
  revenue: 'Valor de conversão',
  roas: 'ROAS',
  ctr: 'CTR',
}
export function geoFormat(metric: GeoMetric, value: number) {
  return ['spend', 'cpa', 'revenue'].includes(metric)
    ? currency(value)
    : metric === 'roas'
      ? `${decimal(value)}x`
      : metric === 'ctr'
        ? `${decimal(value)}%`
        : number(value)
}
export type CountryPerformance = Country & ReturnType<typeof metrics>
export function getCountries(rows: RecordRow[]): CountryPerformance[] {
  return countries.map((country) => ({
    ...country,
    ...metrics(sum(rows.filter((r) => r.country === country.id))),
  }))
}
export function csvCell(value: string | number) {
  const text = String(value)
  return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""')}"`
}
export function exportCampaignCsv(rows: RecordRow[], days: number) {
  const lines = [
    [
      'Campanha',
      'Objetivo',
      'Status',
      'Valor gasto (BRL)',
      'Resultados',
      'CPA (BRL)',
      'Valor de conversão (BRL)',
      'ROAS',
      'CTR (%)',
    ],
    ...campaignDefinitions.map((c) => {
      const t = metrics(sum(rows.filter((r) => r.campaign === c.id)))
      return [
        c.name,
        c.objective,
        c.status,
        decimal(t.spend),
        t.results,
        decimal(t.cpa),
        decimal(t.revenue),
        decimal(t.roas),
        decimal(t.ctr),
      ]
    }),
  ]
  const url = URL.createObjectURL(
    new Blob(['\uFEFF' + lines.map((line) => line.map(csvCell).join(';')).join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `nextcom-demonstracao-${days}dias-${DEMO_END}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
