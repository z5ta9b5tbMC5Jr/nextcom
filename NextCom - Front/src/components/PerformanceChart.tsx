import { useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { motionTokens, useNextMotion } from '@/lib/motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts'
import { ArrowUpRight, ChartNoAxesCombined } from 'lucide-react'
import {
  channels,
  channelColors,
  currency,
  dateLabel,
  metrics,
  number,
  short,
  sum,
  type RecordRow,
} from '@/lib/data'

export function PerformanceChart({
  rows,
  title = 'Performance das campanhas',
}: {
  rows: RecordRow[]
  title?: string
}) {
  const { reduced, presence } = useNextMotion()
  const indicatorId = useId()
  const [view, setView] = useState<'results' | 'spend'>('results')
  const daily = useMemo(() => {
    const dates = [...new Set(rows.map((r) => r.day))]
    const step = Math.max(1, Math.ceil(dates.length / 10))
    return Array.from({ length: Math.ceil(dates.length / step) }, (_, i) => {
      const group = dates.slice(i * step, (i + 1) * step)
      const records = rows.filter((r) => group.includes(r.day))
      return {
        label: dateLabel(group[0]),
        ...Object.fromEntries(channels.map((c) => [c, sum(records.filter((r) => r.channel === c)).results])),
        spend: sum(records).spend,
        revenue: sum(records).revenue,
      }
    })
  }, [rows])
  const total = metrics(sum(rows))
  return (
    <MotionPanel className="panel performance-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Cada resultado conta. Acompanhe a evolução.</p>
        </div>
        <div className="segmented" aria-label="Visualização do gráfico">
          <button className={view === 'results' ? 'selected' : ''} onClick={() => setView('results')}>
            {view === 'results' && (
              <motion.span
                className="segment-indicator"
                layoutId={indicatorId}
                transition={{ duration: reduced ? 0 : motionTokens.enter, ease: motionTokens.ease }}
              />
            )}
            Resultados
          </button>
          <button className={view === 'spend' ? 'selected' : ''} onClick={() => setView('spend')}>
            {view === 'spend' && (
              <motion.span
                className="segment-indicator"
                layoutId={indicatorId}
                transition={{ duration: reduced ? 0 : motionTokens.enter, ease: motionTokens.ease }}
              />
            )}
            Investimento
          </button>
        </div>
      </div>
      <div className="chart-summary">
        <div>
          <span>{view === 'results' ? 'Total de compras' : 'Valor investido'}</span>
          <strong>
            <AnimatedNumber
              key={view}
              value={view === 'results' ? total.results : total.spend}
              format={view === 'results' ? 'integer' : 'currency'}
            />
            <ArrowUpRight size={19} />
          </strong>
        </div>
        <div className="chart-legend">
          {view === 'results' ? (
            channels.map((c) => (
              <span key={c}>
                <i style={{ background: channelColors[c] }} />
                {c === 'Audience Network' ? 'Audience' : c}
              </span>
            ))
          ) : (
            <>
              <span>
                <i style={{ background: '#8247F5' }} />
                Valor gasto
              </span>
              <span>
                <i style={{ background: '#E96D00' }} />
                Conversão
              </span>
            </>
          )}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={view}
          {...presence}
          className="chart-canvas"
          role="img"
          aria-label={
            view === 'results'
              ? `Compras por canal: ${channels.map((c) => `${c}, ${number(sum(rows.filter((r) => r.channel === c)).results)}`).join('; ')}`
              : `Investimento: ${currency(total.spend)}; valor de conversão: ${currency(total.revenue)}`
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            {view === 'results' ? (
              <BarChart data={daily} barSize={28} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  dy={10}
                  minTickGap={28}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={short}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <Tooltip
                  isAnimationActive={!reduced}
                  animationDuration={160}
                  cursor={{ fill: 'var(--hover)' }}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    color: 'var(--foreground)',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [number(Number(value)), name]}
                />
                {channels.map((c) => (
                  <Bar
                    isAnimationActive={!reduced}
                    animationDuration={520}
                    animationEasing="ease-out"
                    key={c}
                    dataKey={c}
                    stackId="a"
                    fill={channelColors[c]}
                    radius={[5, 5, 5, 5]}
                    stroke="var(--card)"
                    strokeWidth={3}
                  />
                ))}
              </BarChart>
            ) : (
              <AreaChart data={daily} margin={{ top: 16, right: 10, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id={`${indicatorId}-revenue`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E96D00" stopOpacity={0.17} />
                    <stop offset="100%" stopColor="#E96D00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  dy={10}
                  minTickGap={28}
                />
                <YAxis
                  tickFormatter={short}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                />
                <Tooltip
                  isAnimationActive={!reduced}
                  animationDuration={160}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    color: 'var(--foreground)',
                  }}
                  formatter={(v) => currency(Number(v))}
                />
                <Area
                  isAnimationActive={!reduced}
                  animationDuration={520}
                  animationEasing="ease-out"
                  type="monotone"
                  name="Valor de conversão"
                  dataKey="revenue"
                  stroke="#E96D00"
                  fill={`url(#${indicatorId}-revenue)`}
                  strokeWidth={2.5}
                />
                <Area
                  isAnimationActive={!reduced}
                  animationDuration={520}
                  animationEasing="ease-out"
                  type="monotone"
                  name="Valor gasto"
                  dataKey="spend"
                  stroke="#8247F5"
                  fill="#8247F5"
                  fillOpacity={0.1}
                  strokeWidth={2.5}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </motion.div>
      </AnimatePresence>
      <div className="chart-footnote">
        <ChartNoAxesCombined size={13} />
        {view === 'results'
          ? 'Resultados atribuídos a compras em todos os canais.'
          : 'Investimento e valor de conversão atribuídos no período.'}
      </div>
    </MotionPanel>
  )
}
