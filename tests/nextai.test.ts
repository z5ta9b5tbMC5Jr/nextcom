import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatWithNextAI, executeChatAction, summarizeSource } from '../NextCom - Back/src/nextai'
import { analyzeImport } from '../NextCom - Back/src/ai-agent'

const csv =
  'Campaign name,Amount spent (BRL),Results,Result indicator,Reporting starts,Reporting ends\nCompras,100,2,purchase,2026-09-23,2026-09-30\nMensagens,50,5,messaging,2026-09-23,2026-09-30'
const source = { csv, filename: 'teste.csv' }
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe('NextAI: ações limitadas e cálculos determinísticos', () => {
  it('aplica o CSV com país fornecido sem alterar totais, datas ou somar indicadores diferentes', () => {
    const before = summarizeSource(source)
    const result = executeChatAction(
      { action: 'import', country: 'BR' },
      'Importe o CSV; ele não diz mas todas as campanhas rodaram no BR (Brasil). Pode traçar os dados para lá.',
      source,
    )!
    expect(result.summary.totals).toEqual(before.totals)
    expect(result.summary.totals.results).toBeNull()
    expect(result.summary.totals.cpa).toBeNull()
    expect(result.summary.dateRange).toEqual({ from: '2026-09-23', to: '2026-09-30' })
    expect(result.summary.daily).toEqual([])
    expect(result.summary.countries).toEqual([{ name: 'BR', spend: 150, results: null }])
    expect(before.countries).toEqual([])
  })
  it('não executa ações vindas apenas dos nomes de campanhas ou do modelo', () => {
    expect(() => executeChatAction({ action: 'import', country: 'BR' }, 'Analise meu CSV', source)).toThrow(
      'explicitamente',
    )
    expect(() => executeChatAction({ action: 'import', country: 'BR' }, 'Importe o CSV', source)).toThrow(
      'único país',
    )
    expect(() => executeChatAction({ action: 'delete' }, 'Importe', source)).toThrow('não suportada')
    expect(() => executeChatAction({ action: 'import' }, 'Não importe este CSV', source)).toThrow(
      'explicitamente',
    )
    expect(executeChatAction({ action: 'none' }, 'Analise', source)).toBeNull()
  })
  it('não sobrescreve países existentes nem aplica sem arquivo', () => {
    const withCountry = { ...source, csv: 'Campaign name,Amount spent (BRL),Country\nA,100,US' }
    expect(() =>
      executeChatAction({ action: 'import', country: 'BR' }, 'Importe para Brasil', withCountry),
    ).toThrow('sobrescrevemos')
    expect(() => executeChatAction({ action: 'import' }, 'Importe', null)).toThrow('Anexe')
    expect(() =>
      executeChatAction({ action: 'assign_country', country: 'BR' }, 'Atribua Brasil ou Portugal', source),
    ).toThrow('único país')
  })
  it('mantém origem informada nas conversas subsequentes', () => {
    expect(summarizeSource({ ...source, countryOverride: 'BR' }).countries[0]?.name).toBe('BR')
    expect(() => summarizeSource({ ...source, countryOverride: 'constructor' })).toThrow()
  })
})

function mockProvider(value: unknown) {
  vi.stubEnv('OPENROUTER_API_KEY', 'synthetic-test-key')
  const mocked = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    )
  vi.stubGlobal('fetch', mocked)
  return mocked
}
describe('NextAI: contrato OpenRouter e privacidade', () => {
  it('envia somente agregados, histórico limitado e preserva os parâmetros que funcionam', async () => {
    const mocked = mockProvider({ reply: 'Vou aplicar o arquivo.', action: 'import', country: 'BR' })
    const result = await chatWithNextAI({
      consent: true,
      message: 'Importe o CSV para Brasil',
      source,
      sourceKind: 'attachment',
    })
    expect(result.applied?.summary.totals.spend).toBe(150)
    const [url, options] = mocked.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    const body = JSON.parse(options.body)
    expect(body.stream).toBe(false)
    expect(body.reasoning).toEqual({ effort: 'low', exclude: true })
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(options.body).not.toContain('Campaign name,Amount spent')
    expect(options.body).not.toContain('synthetic-test-key')
  })
  it('exige consentimento e valida saída antes de executar', async () => {
    const mocked = mockProvider({ reply: 'Dados aplicados', action: 'delete' })
    await expect(chatWithNextAI({ message: 'Importe', source })).rejects.toThrow('Autorize')
    expect(mocked).not.toHaveBeenCalled()
    await expect(chatWithNextAI({ consent: true, message: 'Importe', source })).rejects.toThrow(
      'não suportada',
    )
  })
  it('preserva a análise anterior após compartilhar o transporte', async () => {
    mockProvider({
      summary: 'Dois tipos de resultado.',
      findings: [{ title: 'Tipos distintos', detail: 'Não somar.', confidence: 'alta' }],
      nextSteps: ['Exportar por dia.'],
    })
    const analysis = await analyzeImport(summarizeSource(source))
    expect(analysis.summary).toBe('Dois tipos de resultado.')
    expect(analysis.findings[0]?.confidence).toBe('alta')
  })
  it('traduz falha HTTP e não altera dataset ao receber JSON inválido', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'synthetic-test-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>unavailable</html>', { status: 503 })),
    )
    await expect(chatWithNextAI({ consent: true, message: 'Importe', source })).rejects.toThrow(
      'indisponível',
    )
  })
})
