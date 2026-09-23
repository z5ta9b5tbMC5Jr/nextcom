import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Crosshair,
  MousePointerClick,
  ShoppingBag,
  TrendingUp,
  Info,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { currency, decimal, metrics, number, ratio, type Totals } from '@/lib/data'
import { motion } from 'motion/react'
import { AnimatedNumber } from '@/components/motion/AnimatedNumber'
import { motionTokens, useNextMotion } from '@/lib/motion'

export function KpiCards({ total, previous }: { total: Totals; previous: Totals }) {
  const { reduced } = useNextMotion()
  const now = metrics(total),
    before = metrics(previous)
  const cards = [
    {
      label: 'Valor gasto',
      value: currency(now.spend),
      key: 'spend',
      icon: Banknote,
      description:
        'Investimento total em anúncios no período. A variação indica volume de gasto, não qualidade.',
      neutral: true,
    },
    {
      label: 'Resultados',
      value: number(now.results),
      key: 'results',
      icon: ShoppingBag,
      description:
        'Compras atribuídas. Nesta demonstração, todas as campanhas usam o mesmo tipo de resultado.',
    },
    {
      label: 'Custo por resultado',
      value: currency(now.cpa),
      key: 'cpa',
      icon: Crosshair,
      description: 'Valor gasto dividido pelo total de compras (CPA). Menor tende a ser melhor.',
      inverse: true,
    },
    {
      label: 'Valor de conversão',
      value: currency(now.revenue),
      key: 'revenue',
      icon: CircleDollarSign,
      description: 'Valor atribuído às compras. Não representa lucro líquido.',
    },
    {
      label: 'ROAS',
      value: `${decimal(now.roas)}x`,
      key: 'roas',
      icon: TrendingUp,
      description:
        'Valor de conversão dividido pelo valor gasto. Exemplo: 3x = R$ 3 em conversões por R$ 1 investido.',
    },
    {
      label: 'CTR',
      value: `${decimal(now.ctr)}%`,
      key: 'ctr',
      icon: MousePointerClick,
      description: 'Cliques divididos pelas impressões, multiplicados por 100.',
    },
  ] as const
  return (
    <div className="kpi-grid">
      {cards.map((card, index) => {
        const change = ratio(now[card.key] - before[card.key], before[card.key]) * 100
        const better = 'inverse' in card ? change <= 0 : change >= 0
        const Arrow = change >= 0 ? ArrowUpRight : ArrowDownRight
        return (
          <motion.article
            className="kpi-card"
            key={card.key}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0 : motionTokens.reveal,
              delay: reduced ? 0 : index * 0.045,
              ease: motionTokens.ease,
            }}
          >
            <div className="kpi-label">
              <span>{card.label}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button aria-label={`Sobre ${card.label}`}>
                    <card.icon size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">{card.description}</TooltipContent>
              </Tooltip>
            </div>
            <strong className={`kpi-value ${card.value.length > 10 ? 'compact' : ''}`}>
              <AnimatedNumber
                value={now[card.key]}
                format={
                  card.key === 'results'
                    ? 'integer'
                    : card.key === 'roas'
                      ? 'multiple'
                      : card.key === 'ctr'
                        ? 'percent'
                        : 'currency'
                }
              />
            </strong>
            <div className="kpi-comparison">
              <span className={`delta ${'neutral' in card ? 'neutral' : better ? 'positive' : 'negative'}`}>
                <Arrow size={12} />
                {Math.abs(change).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </span>
              <span>vs. período anterior</span>
            </div>
          </motion.article>
        )
      })}
      <span className="sr-only">
        <Info />
        Os valores são demonstrativos e a comparação usa um período anterior de igual duração.
      </span>
    </div>
  )
}
