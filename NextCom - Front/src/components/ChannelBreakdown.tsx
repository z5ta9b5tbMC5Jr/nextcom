import { ArrowUpRight, Layers3 } from 'lucide-react'
import { motion } from 'motion/react'
import { MotionPanel } from '@/components/motion/MotionPanel'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { motionTokens, useNextMotion } from '@/lib/motion'
import { channels, channelColors, ratio, sum, type ChannelFilter, type RecordRow } from '@/lib/data'
function Instagram({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  )
}
function Facebook({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.8 21v-8h2.8l.5-3.3h-3.3V7.6c0-.9.4-1.8 1.9-1.8h1.5V3.1s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.8v2H7V13h2.9v8z" />
    </svg>
  )
}
const icons = { Instagram, Facebook, 'Audience Network': Layers3 }
export function ChannelBreakdown({
  rows,
  onSelect,
}: {
  rows: RecordRow[]
  onSelect: (c: ChannelFilter) => void
}) {
  const { reduced } = useNextMotion()
  const total = sum(rows)
  const breakdown = channels.map((channel) => ({
    channel,
    ...sum(rows.filter((r) => r.channel === channel)),
  }))
  const segmentColors = breakdown.flatMap((c) =>
    Array(Math.round(ratio(c.spend, total.spend) * 60)).fill(channelColors[c.channel]),
  ) as string[]
  return (
    <MotionPanel className="panel channel-panel">
      <div className="panel-heading">
        <div>
          <h2>Investimento por canal</h2>
          <p>Uma visão de cada ponto de contato.</p>
        </div>
        <span className="small-meta">Meta Ads</span>
      </div>
      <div className="channel-totals">
        {breakdown.map((c) => (
          <div key={c.channel}>
            <span>
              <i style={{ background: channelColors[c.channel] }} />
              {c.channel === 'Audience Network' ? 'Audience' : c.channel}
            </span>
            <strong>
              <AnimatedNumber value={ratio(c.spend, total.spend) * 100} format="percent" />
            </strong>
          </div>
        ))}
      </div>
      <div className="channel-segments" aria-hidden="true">
        {segmentColors.map((color, i) => (
          <motion.i
            key={i}
            initial={false}
            animate={{ backgroundColor: color }}
            transition={{ duration: reduced ? 0 : motionTokens.data }}
          />
        ))}
      </div>
      <div className="channel-table">
        <div className="channel-table-head">
          <span>Canal</span>
          <span>Valor gasto</span>
        </div>
        {breakdown.map((c) => {
          const Icon = icons[c.channel]
          return (
            <button
              className="channel-row"
              key={c.channel}
              onClick={() => onSelect(c.channel)}
              aria-label={`Filtrar por ${c.channel}`}
            >
              <span>
                <span
                  className={`social-icon ${c.channel === 'Instagram' ? 'instagram' : c.channel === 'Facebook' ? 'facebook' : 'audience'}`}
                >
                  <Icon size={17} />
                </span>
                {c.channel}
              </span>
              <span>
                <AnimatedNumber value={c.spend} format="currency" />
                <ArrowUpRight size={13} />
              </span>
            </button>
          )
        })}
      </div>
      <div className="channel-note">
        <span className="live-dot purple" />
        Distribuição do investimento no período
      </div>
    </MotionPanel>
  )
}
