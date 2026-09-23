import { useMemo, useRef } from 'react'
import { ArrowLeft, Globe2, MousePointerClick, Eye, Megaphone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CountryFlag } from '@/components/CountryFlag'
import { KpiCards } from '@/components/KpiCards'
import { PerformanceChart } from '@/components/PerformanceChart'
import { motion } from 'motion/react'
import { motionTokens, useNextMotion, useRetainedValue } from '@/lib/motion'
import {
  campaignDefinitions,
  channels,
  channelColors,
  currency,
  dateLabel,
  dateOffset,
  decimal,
  getRecords,
  metrics,
  number,
  ratio,
  sum,
  type ChannelFilter,
  type CountryPerformance,
  type RecordRow,
} from '@/lib/data'

type Props = {
  country: CountryPerformance | undefined
  rows: RecordRow[]
  days: number
  channel: ChannelFilter
  fromRanking: boolean
  onClose: () => void
}
export function CountryDetailsDialog({ country, rows, days, channel, fromRanking, onClose }: Props) {
  const displayed = useRetainedValue(country)
  const { presence, reduced } = useNextMotion()
  const heading = useRef<HTMLHeadingElement>(null)
  const origin = useRef<HTMLElement | null>(null)
  const regional = useMemo(() => rows.filter((row) => row.country === displayed?.id), [rows, displayed?.id])
  const previous = useMemo(
    () => sum(getRecords(days, channel, true).filter((row) => row.country === displayed?.id)),
    [days, channel, displayed?.id],
  )
  const totals = sum(regional)
  const campaigns = campaignDefinitions
    .map((c) => ({ ...c, ...metrics(sum(regional.filter((row) => row.campaign === c.id))) }))
    .filter((c) => c.spend > 0)
    .sort((a, b) => b.spend - a.spend)
  return (
    <Dialog
      open={!!country}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="country-detail-dialog"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          heading.current?.focus()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (origin.current?.isConnected) origin.current.focus({ preventScroll: true })
        }}
      >
        <DialogHeader className="region-header">
          <div className="region-title-row">
            {displayed && <CountryFlag code={displayed.code} />}
            <div>
              <span className="geo-dialog-eyebrow">ANÁLISE REGIONAL · {displayed?.code}</span>
              <DialogTitle ref={heading} tabIndex={-1}>
                {displayed?.name ?? 'País'}
              </DialogTitle>
              <DialogDescription>Métricas atribuídas às campanhas nesta região.</DialogDescription>
            </div>
          </div>
          <div className="region-context">
            <span className="region-demo">Dados demonstrativos</span>
            <span>{dateLabel(dateOffset(-days + 1))} — 23 set, 2026</span>
            <span>{channel === 'all' ? 'Todos os canais' : channel}</span>
          </div>
        </DialogHeader>
        <div className="region-scroll">
          <motion.div {...presence} key={displayed?.id}>
            <div className="region-overview">
              <span>
                <Globe2 size={16} />
                Participação no investimento total
              </span>
              <strong>{decimal(ratio(totals.spend, sum(rows).spend) * 100)}%</strong>
              <div>
                <i style={{ width: `${ratio(totals.spend, sum(rows).spend) * 100}%` }} />
              </div>
            </div>
            <KpiCards total={totals} previous={previous} />
            <div className="region-stats">
              <span>
                <Eye size={17} />
                <span>
                  Impressões<strong>{number(totals.impressions)}</strong>
                </span>
              </span>
              <span>
                <MousePointerClick size={17} />
                <span>
                  Cliques<strong>{number(totals.clicks)}</strong>
                </span>
              </span>
              <span>
                <Megaphone size={17} />
                <span>
                  Campanhas com gasto<strong>{campaigns.length}</strong>
                </span>
              </span>
            </div>
            {regional.length && totals.impressions ? (
              <PerformanceChart rows={regional} title="Evolução na região" />
            ) : (
              <div className="region-empty">
                Sem atividade para este país no período e canal selecionados.
              </div>
            )}
            <section className="region-channels">
              <h3>Investimento por canal</h3>
              <p>Distribuição do gasto dentro de {displayed?.name}.</p>
              {channels.map((name) => {
                const t = sum(regional.filter((row) => row.channel === name))
                return (
                  <div className="region-channel" key={name}>
                    <span>
                      <i style={{ background: channelColors[name] }} />
                      {name}
                    </span>
                    <strong>{currency(t.spend)}</strong>
                    <span>{decimal(ratio(t.spend, totals.spend) * 100)}%</span>
                    <div className="region-channel-track">
                      <motion.i
                        initial={false}
                        animate={{ width: `${ratio(t.spend, totals.spend) * 100}%` }}
                        transition={{ duration: reduced ? 0 : motionTokens.data }}
                        style={{ background: channelColors[name] }}
                      />
                    </div>
                  </div>
                )
              })}
            </section>
            <section className="region-campaigns">
              <h3>Campanhas nesta região</h3>
              <p>Resultados são compras; taxas calculadas a partir dos totais regionais.</p>
              <div className="region-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Campanha</th>
                      <th>Valor gasto</th>
                      <th>Compras</th>
                      <th>CPA</th>
                      <th>ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{currency(c.spend)}</td>
                        <td>{number(c.results)}</td>
                        <td>{c.results ? currency(c.cpa) : '—'}</td>
                        <td>{decimal(c.roas)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!campaigns.length && <p>Nenhuma campanha com investimento neste período.</p>}
              </div>
            </section>
          </motion.div>
        </div>
        <footer className="region-footer">
          <span>A análise regional não altera os totais do dashboard.</span>
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft size={15} />
            {fromRanking ? 'Voltar aos países' : 'Voltar ao dashboard'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
