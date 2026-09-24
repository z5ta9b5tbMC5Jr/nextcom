import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { FileSpreadsheet, Sparkles, Undo2 } from 'lucide-react'
import { MotionPanel } from './motion/MotionPanel'
import { Button } from './ui/button'
import { GeoPerformanceMap } from './GeoPerformanceMap'
import { countries, type CountryPerformance } from '@/lib/data'
import { motionTokens, useNextMotion } from '@/lib/motion'
import type { NextAIState } from '@/lib/use-nextai'

const numeric = (value: number | null) =>
  value === null ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const normalized = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
export function ImportedDashboard({
  chat,
  onChat,
  search,
  onSearch,
}: {
  chat: NextAIState
  onChat: () => void
  search: string
  onSearch: (value: string) => void
}) {
  const { reduced } = useNextMotion()
  const [selected, setSelected] = useState<string | null>(null)
  const [visible, setVisible] = useState(20)
  const data = chat.dataset!
  const s = data.summary
  const money = (value: number | null) =>
    value === null
      ? '—'
      : s.currency && /^[A-Z]{3}$/.test(s.currency)
        ? value.toLocaleString('pt-BR', { style: 'currency', currency: s.currency })
        : `${numeric(value)} (moeda não informada)`
  const mapped = useMemo<CountryPerformance[]>(
    () =>
      s.countries.flatMap((row) => {
        const country = countries.find(
          (c) =>
            normalized(c.name) === normalized(row.name) ||
            c.code === row.name.toUpperCase() ||
            c.id === row.name,
        )
        return country
          ? [
              {
                ...country,
                spend: row.spend,
                results: 0,
                revenue: 0,
                clicks: 0,
                impressions: 0,
                cpa: 0,
                ctr: 0,
                roas: 0,
              },
            ]
          : []
      }),
    [s.countries],
  )
  const filtered = s.campaigns.filter((c) => normalized(c.name).includes(normalized(search)))
  const selectedData = mapped.find((c) => c.id === selected)
  const cards = [
    ['Valor gasto', money(s.totals.spend)],
    ['Resultados', numeric(s.totals.results)],
    ['Custo por resultado', money(s.totals.cpa)],
    ['Valor de conversão', money(s.totals.conversionValue)],
    ['ROAS', s.totals.roas === null ? '—' : `${numeric(s.totals.roas)}x`],
    ['CTR', s.totals.ctr === null ? '—' : `${numeric(s.totals.ctr)}%`],
  ]
  return (
    <div className="imported-dashboard">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span />
            DADOS IMPORTADOS
          </div>
          <h1>
            Seu dashboard<span>.</span>
          </h1>
          <p>O contexto vem de você. Os números vêm do arquivo.</p>
        </div>
        <Button onClick={onChat}>
          <Sparkles size={16} />
          Conversar com Next
        </Button>
      </div>
      <MotionPanel className="imported-source">
        <FileSpreadsheet size={22} />
        <div>
          <strong>{s.filename}</strong>
          <p>
            {s.rows} linhas válidas ·{' '}
            {s.dateRange
              ? `${s.dateRange.from.split('-').reverse().join('/')} — ${s.dateRange.to.split('-').reverse().join('/')}`
              : 'Período não informado'}{' '}
            · {s.periodAggregated ? 'Totais do intervalo' : 'Datas do CSV'}
          </p>
        </div>
        {chat.canUndo && (
          <Button variant="outline" onClick={chat.undo} disabled={chat.busy}>
            <Undo2 size={15} />
            Desfazer
          </Button>
        )}
      </MotionPanel>
      <div className="imported-kpis">
        {cards.map(([label, value]) => (
          <MotionPanel className="panel imported-kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{value === '—' ? 'Não disponível neste relatório' : 'Calculado a partir do CSV'}</small>
          </MotionPanel>
        ))}
      </div>
      {(s.skippedRows > 0 || s.resultsByType.length > 1 || !s.currency) && (
        <div className="imported-note">
          {s.skippedRows > 0 && <p>{s.skippedRows} linhas inválidas foram ignoradas.</p>}
          {s.resultsByType.length > 1 && (
            <p>
              O arquivo contém tipos de resultado diferentes. Resultados e CPA gerais ficam indisponíveis para
              evitar somar ações distintas.
            </p>
          )}
          {!s.currency && (
            <p>
              A moeda não foi identificada de forma única. Confira o arquivo antes de interpretar valores
              monetários.
            </p>
          )}
        </div>
      )}
      <div className="imported-grid">
        <MotionPanel className="panel imported-panel">
          <h2>Investimento ao longo do tempo</h2>
          <p>
            {s.daily.length
              ? 'Valores por dia disponível no arquivo.'
              : 'O CSV não oferece detalhamento diário. Exporte com divisão por dia para visualizar a evolução.'}
          </p>
          {s.daily.length > 0 ? (
            <>
              <div className="imported-chart" role="img" aria-label="Evolução diária do investimento">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.daily}>
                    <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date: string) => date.slice(5)}
                      minTickGap={40}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis width={60} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v) => money(Number(v))}
                      contentStyle={{
                        background: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="spend"
                      name="Valor gasto"
                      stroke="#8247f5"
                      fill="#8247f5"
                      fillOpacity={0.18}
                      isAnimationActive={!reduced}
                      animationDuration={motionTokens.data * 1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <details>
                <summary>Consultar valores diários</summary>
                {s.daily.map((d) => (
                  <div className="imported-row" key={d.date}>
                    <span>{d.date}</span>
                    <strong>{money(d.spend)}</strong>
                  </div>
                ))}
              </details>
            </>
          ) : (
            <div className="imported-empty">
              <strong>{money(s.totals.spend)}</strong>
              <span>Investimento total do período</span>
            </div>
          )}
        </MotionPanel>
        <MotionPanel className="panel imported-panel">
          <h2>Resultados por objetivo</h2>
          <p>Indicadores preservados conforme o relatório.</p>
          {s.resultsByType.length ? (
            s.resultsByType.map((r) => (
              <div className="imported-result" key={r.type}>
                <strong>{r.type}</strong>
                <span>
                  {numeric(r.results)} resultados · {money(r.cpa)} por resultado
                </span>
                <small>Gasto das linhas com esse indicador: {money(r.spend)}</small>
              </div>
            ))
          ) : (
            <p className="imported-empty">Sem indicadores de resultado no arquivo.</p>
          )}
          <div className="imported-row">
            <span>Impressões</span>
            <strong>{numeric(s.totals.impressions)}</strong>
          </div>
          <div className="imported-row">
            <span>Cliques</span>
            <strong>{numeric(s.totals.clicks)}</strong>
          </div>
        </MotionPanel>
      </div>
      <div className="imported-grid">
        <div>
          {mapped.length > 0 ? (
            <GeoPerformanceMap
              data={mapped}
              availableMetrics={['spend']}
              formatValue={(_, value) => money(value)}
              selectedCountry={selected}
              onCountrySelect={setSelected}
            />
          ) : (
            <MotionPanel className="panel imported-panel">
              <h2>Distribuição geográfica</h2>
              <p>
                {s.countries.length
                  ? 'Os países deste arquivo ainda não têm correspondência neste mapa. Consulte os valores ao lado.'
                  : 'Sem país no CSV. Informe ao Next se todos os dados pertencem a um mesmo país.'}
              </p>
              <Button variant="outline" onClick={onChat}>
                Informar contexto ao Next
              </Button>
            </MotionPanel>
          )}
          {data.countryOverride && (
            <p className="imported-provenance">
              País {data.countryOverride} informado pelo usuário no chat; não consta no CSV.
            </p>
          )}
          {selectedData && (
            <p className="imported-provenance">
              {selectedData.name}: {money(selectedData.spend)} ·{' '}
              {numeric(s.totals.spend ? (selectedData.spend / s.totals.spend) * 100 : 0)}% do gasto
            </p>
          )}
        </div>
        <MotionPanel className="panel imported-panel">
          <h2>Países e canais</h2>
          <p>Somente dimensões disponíveis ou informadas.</p>
          {s.countries.map((c) => (
            <div className="imported-row" key={c.name}>
              <span>{countries.find((x) => x.code === c.name)?.name ?? c.name}</span>
              <strong>{money(c.spend)}</strong>
            </div>
          ))}
          {!s.countries.length && <p>Países não informados.</p>}
          <h3>Investimento por canal</h3>
          {s.channels.map((c) => (
            <div className="imported-row" key={c.name}>
              <span>{c.name}</span>
              <strong>{money(c.spend)}</strong>
            </div>
          ))}
          {!s.channels.length && <p>Sem detalhamento por canal.</p>}
          {mapped.length < s.countries.length && <p>Alguns países estão disponíveis apenas nesta lista.</p>}
        </MotionPanel>
      </div>
      <MotionPanel className="panel imported-panel" id="campanhas">
        <div className="imported-table-heading">
          <div>
            <h2>{s.entityLabel}</h2>
            <p>{s.campaigns.length} itens no resumo importado · até 50 itens de maior gasto</p>
          </div>
          <input
            type="search"
            aria-label="Buscar itens importados"
            placeholder="Buscar no relatório…"
            value={search}
            onChange={(e) => {
              onSearch(e.target.value)
              setVisible(20)
            }}
          />
        </div>
        <div className="imported-table">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Valor gasto</th>
                <th>Resultados</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>{money(c.spend)}</td>
                  <td>{(c.resultTypes?.length ?? 0) > 1 ? 'Tipos diferentes' : numeric(c.results)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <p>Nenhum item encontrado.</p>}
        {visible < filtered.length && (
          <Button variant="outline" onClick={() => setVisible((n) => n + 20)}>
            Mostrar mais
          </Button>
        )}
      </MotionPanel>
      <p className="nextai-footnote">
        Esta importação substitui os dados anteriores e permanece apenas nesta sessão. Nenhuma campanha é
        alterada na Meta. Listas exibem até 50 grupos e a série diária até 180 dias; os KPIs incluem todas
        as linhas válidas.
      </p>
    </div>
  )
}
