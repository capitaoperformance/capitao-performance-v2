'use client'

import { cn, formatCurrency, formatPercent, getZonaPerformance, getZonaColor } from '@/lib/utils'
import type { KPIsBarbeiro } from '@/types'
import { Trophy, Medal } from 'lucide-react'

interface RankingBarbeirosProps {
  barbeiros: KPIsBarbeiro[]
  className?: string
}

const posicaoIcon = (i: number) => {
  if (i === 0) return <Trophy className="w-4 h-4 text-gold-400" />
  if (i === 1) return <Medal  className="w-4 h-4 text-dark-300" />
  if (i === 2) return <Medal  className="w-4 h-4 text-amber-700" />
  return <span className="text-dark-500 text-sm font-mono w-4 text-center">{i + 1}º</span>
}

export function RankingBarbeiros({ barbeiros, className }: RankingBarbeirosProps) {
  const ordenado = [...barbeiros].sort((a, b) => b.fat_total - a.fat_total)

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-dark-200 font-semibold text-sm">Ranking de Performance</h3>
        <Trophy className="w-4 h-4 text-gold-400" />
      </div>
      <div className="space-y-3">
        {ordenado.map((b, i) => {
          const pct = b.percentual_meta ?? 0
          const zona = getZonaPerformance(pct)
          const colors = getZonaColor(zona)
          return (
            <div
              key={b.barbeiro_id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-colors',
                i === 0 ? 'bg-gold-500/8 border border-gold-500/20' : 'hover:bg-dark-700/40'
              )}
            >
              <div className="w-5 flex items-center justify-center flex-shrink-0">
                {posicaoIcon(i)}
              </div>
              <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-dark-300">
                {b.barbeiro.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-dark-100 text-sm font-medium truncate">{b.barbeiro}</p>
                  <p className="text-dark-100 text-sm font-bold ml-2 flex-shrink-0">
                    {formatCurrency(b.fat_total)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex-1 progress-bar mr-3" style={{ height: '3px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: colors.hex,
                      }}
                    />
                  </div>
                  <span className={cn('text-xs font-medium flex-shrink-0', colors.text)}>
                    {formatPercent(pct, 0)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        {barbeiros.length === 0 && (
          <p className="text-dark-500 text-sm text-center py-4">Nenhum dado disponível</p>
        )}
      </div>
    </div>
  )
}
