'use client'

import { cn, formatCurrency, formatPercent, getZonaColor, getZonaPerformance } from '@/lib/utils'

interface ProgressGoalProps {
  titulo: string
  atual: number
  meta: number
  projecao?: number
  className?: string
  showProjecao?: boolean
}

export function ProgressGoal({
  titulo, atual, meta, projecao, className, showProjecao = true
}: ProgressGoalProps) {
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0
  const pctProj = meta > 0 && projecao ? Math.min((projecao / meta) * 100, 100) : 0
  const falta = Math.max(meta - atual, 0)
  const zona = getZonaPerformance(pct)
  const colors = getZonaColor(zona)

  return (
    <div className={cn('card p-5 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-dark-300 text-sm font-medium">{titulo}</h3>
        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
          {formatPercent(pct, 0)}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-1.5">
        <div className="progress-bar relative">
          {/* Projeção (fundo) */}
          {showProjecao && projecao && projecao > atual && (
            <div
              className="absolute inset-0 rounded-full bg-dark-600 transition-all duration-700"
              style={{ width: `${pctProj}%` }}
            />
          )}
          {/* Atual */}
          <div
            className="progress-fill relative z-10"
            style={{
              width: `${pct}%`,
              background: zona === 'verde'   ? 'linear-gradient(90deg, #059669, #34d399)' :
                          zona === 'amarelo' ? 'linear-gradient(90deg, #d97706, #fbbf24)' :
                                              'linear-gradient(90deg, #dc2626, #f87171)'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-dark-500">
          <span>R$ 0</span>
          <span className="text-dark-400">Meta: {formatCurrency(meta)}</span>
        </div>
      </div>

      {/* Números */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div>
          <p className="text-dark-500 text-xs mb-0.5">Realizado</p>
          <p className="text-dark-100 font-bold">{formatCurrency(atual)}</p>
        </div>
        <div>
          <p className="text-dark-500 text-xs mb-0.5">Falta</p>
          <p className={cn('font-bold', falta === 0 ? 'text-emerald-400' : 'text-dark-200')}>
            {falta === 0 ? '✓ Meta batida!' : formatCurrency(falta)}
          </p>
        </div>
        {showProjecao && projecao && (
          <>
            <div className="col-span-2 border-t border-dark-700 pt-3">
              <p className="text-dark-500 text-xs mb-0.5">Projeção de fechamento</p>
              <div className="flex items-baseline gap-2">
                <p className={cn(
                  'font-bold text-lg',
                  projecao >= meta ? 'text-emerald-400' : 'text-amber-400'
                )}>
                  {formatCurrency(projecao)}
                </p>
                <span className="text-dark-500 text-xs">
                  ({formatPercent((projecao / meta) * 100, 0)} da meta)
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
