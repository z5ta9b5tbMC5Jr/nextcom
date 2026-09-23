import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { useNextMotion } from '@/lib/motion'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { Globe2, Minus, Plus, RotateCcw, MousePointer2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { geoFormat, geoLabels, type CountryPerformance, type GeoMetric } from '@/lib/data'

const geography = feature(world, world.objects.countries)
const land = {
  ...geography,
  features: geography.features
    .filter((f) => String(f.id) !== '010')
    .map((f) => ({ ...f, id: f.id ?? `region-${f.properties.name.toLowerCase().replaceAll(' ', '-')}` })),
}
const projection = geoNaturalEarth1().fitExtent(
  [
    [10, 8],
    [770, 350],
  ],
  land,
)
const path = geoPath(projection)
export const GEO_COLORS = ['#28203A', '#39265F', '#52338F', '#6D42C8', '#8754F6']
export function geoColor(value: number | undefined, max: number) {
  if (value === undefined || !Number.isFinite(value) || value <= 0 || max <= 0) return 'var(--geo-empty)'
  return GEO_COLORS[Math.min(4, Math.floor(Math.sqrt(value / max) * 5))]
}
type Props = {
  data: CountryPerformance[]
  metric?: GeoMetric
  onMetricChange?: (metric: GeoMetric) => void
  selectedCountry?: string | null
  onCountrySelect?: (id: string | null) => void
}
/** Cada país é um path SVG gerado a partir de TopoJSON local (Natural Earth). */
export function GeoPerformanceMap({
  data,
  metric = 'spend',
  onMetricChange,
  selectedCountry,
  onCountrySelect,
}: Props) {
  const { presence } = useNextMotion()
  const [localMetric, setLocalMetric] = useState<GeoMetric>(metric)
  const currentMetric = onMetricChange ? metric : localMetric
  const [localSelected, setLocalSelected] = useState<string | null>(null)
  const selected = selectedCountry === undefined ? localSelected : selectedCountry
  const [hover, setHover] = useState<{ id: string; name: string; x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const lookup = useMemo(() => new Map(data.map((d) => [d.id, d])), [data])
  const max = Math.max(0, ...data.map((d) => d[currentMetric]))
  const selectedData = selected ? lookup.get(selected) : null
  const selectedFeature = land.features.find((f) => String(f.id).padStart(3, '0') === selected)
  const center = selectedFeature && zoom > 1 ? path.centroid(selectedFeature) : [390, 180]
  const hoverData = hover ? lookup.get(hover.id) : null
  const choose = (id: string | null) => {
    setLocalSelected(id)
    onCountrySelect?.(id)
  }
  return (
    <MotionPanel className="panel geo-panel" aria-label="Distribuição geográfica">
      <div className="panel-heading">
        <div>
          <h2>
            <Globe2 size={17} className="heading-icon" /> Distribuição geográfica
          </h2>
          <p>Encontre onde suas campanhas vão mais longe.</p>
        </div>
        <Select
          value={currentMetric}
          onValueChange={(value) => {
            setLocalMetric(value as GeoMetric)
            onMetricChange?.(value as GeoMetric)
          }}
        >
          <SelectTrigger className="compact-select" aria-label="Métrica do mapa">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(geoLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="map-container" onMouseLeave={() => setHover(null)}>
        <div className="map-dot-grid" />
        <svg
          viewBox="0 0 780 360"
          className="world-map"
          aria-label={`Mapa de ${geoLabels[currentMetric]} por país`}
        >
          <g transform={`translate(${390 - center[0] * zoom},${180 - center[1] * zoom}) scale(${zoom})`}>
            {land.features.map((f) => {
              const id = String(f.id).padStart(3, '0'),
                country = lookup.get(id)
              const name = country?.name ?? f.properties.name
              return (
                <path
                  key={`${id}-${name}`}
                  d={path(f) ?? ''}
                  fill={
                    selected === id || hover?.id === id ? '#A78BFA' : geoColor(country?.[currentMetric], max)
                  }
                  stroke={selected === id ? '#D4C5FF' : 'var(--map-border)'}
                  strokeWidth={selected === id ? 1.3 : 0.6}
                  vectorEffect="non-scaling-stroke"
                  role="button"
                  tabIndex={0}
                  aria-label={`${name}: ${country ? geoFormat(currentMetric, country[currentMetric]) : 'sem dados'}`}
                  aria-pressed={selected === id}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
                    setHover({
                      id,
                      name,
                      x: Math.min(Math.max(4, e.clientX - rect.left + 12), rect.width - 175),
                      y: Math.min(e.clientY - rect.top + 12, rect.height - 65),
                    })
                  }}
                  onFocus={() => setHover({ id, name, x: 18, y: 18 })}
                  onBlur={() => setHover(null)}
                  onClick={() => choose(selected === id ? null : id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      choose(selected === id ? null : id)
                    }
                    if (e.key === 'Escape') {
                      choose(null)
                      setHover(null)
                    }
                  }}
                />
              )
            })}
          </g>
        </svg>
        <AnimatePresence>
          {hover && (
            <motion.div
              {...presence}
              key="map-tooltip"
              className="map-tooltip"
              style={{ left: hover.x, top: hover.y }}
            >
              <strong>{hover.name}</strong>
              <span>
                {hoverData ? geoFormat(currentMetric, hoverData[currentMetric]) : 'Sem dados neste período'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="map-controls">
          <Button
            variant="outline"
            size="icon"
            aria-label="Ampliar mapa"
            disabled={zoom >= 3}
            onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
          >
            <Plus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Reduzir mapa"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            <Minus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Restaurar mapa"
            onClick={() => {
              setZoom(1)
              choose(null)
            }}
          >
            <RotateCcw />
          </Button>
        </div>
        <div className="map-caption">
          <span className="live-dot purple" />
          {data.filter((d) => d.spend > 0).length} países com dados
        </div>
      </div>
      <div className="map-footer">
        <span className="map-help">
          {selected ? (
            <>
              <span>{selectedData?.flag ?? '◎'}</span>{' '}
              <strong>{selectedData?.name ?? selectedFeature?.properties.name}</strong>
              <span>
                {selectedData ? geoFormat(currentMetric, selectedData[currentMetric]) : 'Sem dados'}
              </span>
              <button onClick={() => choose(null)} aria-label="Limpar país selecionado">
                ×
              </button>
            </>
          ) : (
            <>
              <MousePointer2 size={13} /> Passe o cursor ou selecione um país
            </>
          )}
        </span>
        <div className="map-legend">
          <span>Menor</span>
          {GEO_COLORS.map((color) => (
            <i key={color} style={{ background: color }} />
          ))}
          <span>Maior</span>
        </div>
      </div>
    </MotionPanel>
  )
}
