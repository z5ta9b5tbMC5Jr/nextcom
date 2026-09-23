import { describe, expect, it } from 'vitest'
import {
  channels,
  csvCell,
  getCountries,
  getRecords,
  metrics,
  ratio,
  sum,
} from '../NextCom - Front/src/lib/data'

describe('Métricas compartilhadas do dashboard', () => {
  it('separa janelas atuais e anteriores sem dias sobrepostos', () => {
    for (const days of [7, 14, 30]) {
      const current = new Set(getRecords(days, 'all').map((r) => r.day))
      const previous = new Set(getRecords(days, 'all', true).map((r) => r.day))
      expect(current.size).toBe(days)
      expect(previous.size).toBe(days)
      expect([...current].filter((day) => previous.has(day))).toEqual([])
    }
  })
  it('reconcilia canais e países com o total exibido', () => {
    const rows = getRecords(30, 'all'),
      total = sum(rows)
    const byChannel = sum(channels.map((c) => sum(getRecords(30, c))))
    const byCountry = sum(getCountries(rows))
    for (const key of ['spend', 'results', 'revenue', 'impressions', 'clicks'] as const) {
      expect(byChannel[key]).toBeCloseTo(total[key], 6)
      expect(byCountry[key]).toBeCloseTo(total[key], 6)
    }
  })
  it('calcula taxas pelos totais ponderados, sem fazer média das taxas', () => {
    const result = metrics(
      sum([
        { spend: 100, results: 2, revenue: 300, clicks: 10, impressions: 100 },
        { spend: 900, results: 18, revenue: 2700, clicks: 45, impressions: 900 },
      ]),
    )
    expect(result.cpa).toBe(50)
    expect(result.roas).toBe(3)
    expect(result.ctr).toBe(5.5)
    expect(ratio(1, 0)).toBe(0)
  })
  it('não gera métricas não finitas para um conjunto vazio', () => {
    expect(Object.values(metrics(sum([]))).every(Number.isFinite)).toBe(true)
  })
  it('filtra o canal em todos os registros', () => {
    expect(getRecords(7, 'Instagram').every((r) => r.channel === 'Instagram')).toBe(true)
  })
  it('neutraliza fórmulas e escapa aspas no CSV', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"')
    expect(csvCell('Campanha "A"')).toBe('"Campanha ""A"""')
  })
})
