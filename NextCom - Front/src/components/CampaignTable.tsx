import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { useNextMotion, useRetainedValue } from '@/lib/motion'
import { ArrowDown, ArrowUpRight, Megaphone, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { campaignDefinitions, currency, decimal, metrics, number, sum, type RecordRow } from '@/lib/data'
export function CampaignTable({
  rows,
  search,
  onSearchChange,
}: {
  rows: RecordRow[]
  search: string
  onSearchChange: (s: string) => void
}) {
  const { reduced, presence } = useNextMotion()
  const [status, setStatus] = useState('all'),
    [sort, setSort] = useState<'spend' | 'roas'>('spend')
  const [selected, setSelected] = useState<string | null>(null)
  const campaigns = campaignDefinitions.map((c) => ({
    ...c,
    ...metrics(sum(rows.filter((r) => r.campaign === c.id))),
  }))
  const filtered = campaigns
    .filter(
      (c) =>
        c.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) &&
        (status === 'all' || c.status === status),
    )
    .sort((a, b) => b[sort] - a[sort])
  const activeDetail = campaigns.find((c) => c.id === selected)
  const detail = useRetainedValue(activeDetail)
  return (
    <MotionPanel className="panel campaigns-panel" id="campanhas">
      <div className="panel-heading">
        <div>
          <h2>
            Suas campanhas <span className="count-badge">{campaigns.length}</span>
          </h2>
          <p>Os detalhes que transformam dados em decisões.</p>
        </div>
        <div className="table-tools">
          <div className="table-search">
            <Search size={14} />
            <input
              placeholder="Buscar campanha..."
              aria-label="Buscar campanha"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search && (
              <button onClick={() => onSearchChange('')} aria-label="Limpar busca">
                <X size={13} />
              </button>
            )}
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Status das campanhas" className="compact-select">
              <SlidersHorizontal size={13} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Ativa">Ativas</SelectItem>
              <SelectItem value="Pausada">Pausadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="table-scroll">
        <table className="campaign-table">
          <thead>
            <tr>
              <th>Nome da campanha</th>
              <th>Status</th>
              <th>
                <button onClick={() => setSort('spend')}>
                  Valor gasto {sort === 'spend' && <ArrowDown size={12} />}
                </button>
              </th>
              <th>Resultados</th>
              <th>CPA</th>
              <th>
                <button onClick={() => setSort('roas')}>
                  ROAS {sort === 'roas' && <ArrowDown size={12} />}
                </button>
              </th>
              <th>CTR</th>
              <th>
                <span className="sr-only">Detalhes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {filtered.map((c) => (
                <motion.tr layout={reduced ? false : 'position'} {...presence} key={c.id}>
                  <td>
                    <button className="campaign-name" onClick={() => setSelected(c.id)}>
                      <span className={`campaign-icon ${c.color}`}>
                        <Megaphone size={16} />
                      </span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.objective} · Compras</small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <span className={`status-badge ${c.status === 'Ativa' ? 'active' : 'paused'}`}>
                      <i />
                      {c.status}
                    </span>
                  </td>
                  <td>{currency(c.spend)}</td>
                  <td>{number(c.results)}</td>
                  <td>{c.results ? currency(c.cpa) : '—'}</td>
                  <td>
                    <span className="roas-value">{c.spend ? `${decimal(c.roas)}x` : '—'}</span>
                  </td>
                  <td>{c.impressions ? `${decimal(c.ctr)}%` : '—'}</td>
                  <td>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ver ${c.name}`}
                      onClick={() => setSelected(c.id)}
                    >
                      <ArrowUpRight size={15} />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        <AnimatePresence initial={false}>
          {filtered.length === 0 && (
            <motion.div {...presence} key="empty-campaigns" className="empty-state">
              <Search />
              <h3>Nenhuma campanha encontrada</h3>
              <p>Tente outro nome ou ajuste o status.</p>
              <Button
                variant="outline"
                onClick={() => {
                  onSearchChange('')
                  setStatus('all')
                }}
              >
                Limpar filtros
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="table-footer">
        <span>
          Exibindo {filtered.length} de {campaigns.length} campanhas
        </span>
        <span>
          Dados demonstrativos <span className="footer-dot">·</span> Moeda: BRL
        </span>
      </div>
      <Dialog
        open={!!activeDetail}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              Detalhes demonstrativos para o período e canal selecionados.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="detail-grid">
              {[
                ['Valor gasto', currency(detail.spend)],
                ['Compras', number(detail.results)],
                ['CPA', detail.results ? currency(detail.cpa) : '—'],
                ['Valor de conversão', currency(detail.revenue)],
                ['ROAS', detail.spend ? `${decimal(detail.roas)}x` : '—'],
                ['CTR', detail.impressions ? `${decimal(detail.ctr)}%` : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}
          <p className="muted text-xs">
            A edição e a publicação na Meta serão disponibilizadas na etapa de integração.
          </p>
        </DialogContent>
      </Dialog>
    </MotionPanel>
  )
}
