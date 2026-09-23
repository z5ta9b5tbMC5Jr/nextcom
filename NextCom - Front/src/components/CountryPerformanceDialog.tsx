import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpRight,
  Check,
  Globe2,
  MapPin,
  Search,
  X,
} from 'lucide-react'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CountryFlag } from '@/components/CountryFlag'
import { useNextMotion } from '@/lib/motion'
import {
  currency,
  decimal,
  geoFormat,
  geoLabels,
  ratio,
  type CountryPerformance,
  type GeoMetric,
} from '@/lib/data'

type Props = {
  data: CountryPerformance[]
  metric: GeoMetric
  onMetricChange: (value: GeoMetric) => void
  selectedCountry: string | null
  onSelect: (id: string) => void
  days: number
  channel: string
}
export function CountryPerformanceDialog({
  data,
  metric,
  onMetricChange,
  selectedCountry,
  onSelect,
  days,
  channel,
}: Props) {
  const [search, setSearch] = useState('')
  const [ascending, setAscending] = useState(metric === 'cpa')
  const { reduced, presence } = useNextMotion()
  const totalSpend = data.reduce((total, country) => total + country.spend, 0)
  const leader = [...data].sort((a, b) => b.spend - a.spend)[0]
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim()
  const sorted = [...data].sort((a, b) => (ascending ? 1 : -1) * (a[metric] - b[metric]))
  const filtered = sorted.filter(
    (country) =>
      normalize(country.name).includes(normalize(search)) ||
      normalize(country.code).includes(normalize(search)),
  )
  return (
    <>
      <DialogHeader className="geo-dialog-header">
        <div className="geo-dialog-icon">
          <Globe2 size={23} />
        </div>
        <div>
          <span className="geo-dialog-eyebrow">DISTRIBUIÇÃO GEOGRÁFICA</span>
          <DialogTitle>Performance por país</DialogTitle>
          <DialogDescription>Descubra onde seu investimento gera resultados.</DialogDescription>
        </div>
      </DialogHeader>
      <div className="geo-dialog-context">
        <span>
          <i />
          Demonstração
        </span>
        <span>Últimos {days} dias</span>
        <span>{channel === 'all' ? 'Todos os canais' : channel}</span>
      </div>
      <div className="geo-dialog-summary">
        <div>
          <span>Investimento no período</span>
          <strong>{currency(totalSpend)}</strong>
        </div>
        <div>
          <span>Países com investimento</span>
          <strong>
            {data.filter((country) => country.spend > 0).length}
            <small>países</small>
          </strong>
        </div>
        <div>
          <span>Maior participação no gasto</span>
          <strong>
            {leader && <CountryFlag code={leader.code} />}
            {leader?.name ?? '—'}
          </strong>
          <small>{decimal(ratio(leader?.spend ?? 0, totalSpend) * 100)}% do total</small>
        </div>
      </div>
      <div className="geo-dialog-toolbar">
        <div className="geo-dialog-search">
          <Search size={17} />
          <input
            aria-label="Buscar país"
            placeholder="Buscar país ou código..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button aria-label="Limpar busca de países" onClick={() => setSearch('')}>
              <X size={15} />
            </button>
          )}
        </div>
        <Select
          value={metric}
          onValueChange={(value) => {
            onMetricChange(value as GeoMetric)
            setAscending(value === 'cpa')
          }}
        >
          <SelectTrigger aria-label="Métrica dos países">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(geoLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          aria-label={ascending ? 'Ordenar do maior para o menor' : 'Ordenar do menor para o maior'}
          title={ascending ? 'Menor para maior' : 'Maior para menor'}
          onClick={() => setAscending((value) => !value)}
        >
          {ascending ? <ArrowUpNarrowWide size={17} /> : <ArrowDownWideNarrow size={17} />}
        </Button>
      </div>
      <div className="geo-dialog-columns" aria-hidden="true">
        <span>País</span>
        <span>{geoLabels[metric]}</span>
        <span>Participação no gasto</span>
        <span />
      </div>
      <div className="geo-dialog-list" aria-label="Ranking de países">
        <AnimatePresence initial={false} mode="popLayout">
          {filtered.map((country) => (
            <motion.button
              key={country.id}
              layout={reduced ? false : 'position'}
              {...presence}
              className={`geo-dialog-row ${selectedCountry === country.id ? 'is-selected' : ''}`}
              aria-label={`Ver métricas de ${country.name}`}
              onClick={() => onSelect(country.id)}
            >
              <span className="geo-dialog-country">
                <span className="geo-dialog-rank">
                  {String(sorted.indexOf(country) + 1).padStart(2, '0')}
                </span>
                <CountryFlag code={country.code} />
                <span>
                  <strong>{country.name}</strong>
                  <small>{country.code}</small>
                </span>
              </span>
              <span className="geo-dialog-value">{geoFormat(metric, country[metric])}</span>
              <span className="geo-dialog-share">
                <span>
                  {decimal(ratio(country.spend, totalSpend) * 100)}%<small> do gasto</small>
                </span>
                <span className="geo-dialog-track">
                  <i style={{ width: `${ratio(country.spend, totalSpend) * 100}%` }} />
                </span>
              </span>
              <span className="geo-dialog-action">
                {selectedCountry === country.id ? <Check size={16} /> : <ArrowUpRight size={16} />}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <motion.div {...presence} className="geo-dialog-empty">
            <Search size={26} />
            <strong>Nenhum país encontrado</strong>
            <p>Tente outro nome ou código, como Brasil ou BR.</p>
            <Button variant="outline" onClick={() => setSearch('')}>
              Limpar busca
            </Button>
          </motion.div>
        )}
      </div>
      <footer className="geo-dialog-footer">
        <span>
          <MapPin size={16} />
          <span>
            Selecione um país para explorar suas métricas.
            <small>Os totais do dashboard permanecem os mesmos.</small>
          </span>
        </span>
        <span className="geo-dialog-count" aria-live="polite">
          {filtered.length} de {data.length} países
        </span>
      </footer>
    </>
  )
}
