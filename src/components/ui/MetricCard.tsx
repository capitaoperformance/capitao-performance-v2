'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  titulo: string
  valor: string
  subvalor?: string
  variacao?: number   // % comparado ao mês anterior
  icone?: LucideIcon
  destaque?: boolean  // card dourado
  className?: string
  descricao?: string
  loading?: boolean
}

export function MetricCard({
  titulo, valor, subvalor, variacao, icone: Icone,
  destaque = false, className, descricao, loading = false
}: MetricCardProps) {
  const variou = variacao !== undefined
  const subiu   = variou && variacao > 0
  const caiu    = variou && variacao < 0
  const igual   = variou && variacao === 0

  return (
    <div className={cn(
      'card-animate card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-all duration-300',
      destaque && 'card-gold border-gold-500/30 hover:shadow-gold',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={cn(
            'text-xs font-medium uppercase tracking-wider mb-0.5',
            destaque ? 'text-gold-400/80' : 'text-dark-400'
          )}>
            {titulo}
          </p>
          {loading ? (
            <div className="h-7 w-24 bg-dark-700 rounded animate-pulse mt-1" />
          ) : (
            <p className={cn(
              'text-2xl font-bold leading-none mt-1',
              destaque ? 'text-gradient-gold' : 'text-dark-100'
            )}>
              {valor}
            </p>
          )}
          {subvalor && !loading && (
            <p className="text-dark-500 text-xs mt-1">{subvalor}</p>
          )}
          {descricao && (
            <p className="text-dark-500 text-xs mt-1">{descricao}</p>
          )}
        </div>
        {Icone && (
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            destaque ? 'bg-gold-500/15 text-gold-400' : 'bg-dark-700 text-dark-400'
          )}>
            <Icone className="w-5 h-5" />
          </div>
        )}
      </div>

      {variou && !loading && (
        <div className={cn(
          'flex items-center gap-1.5 text-xs font-medium',
          subiu  && 'text-emerald-400',
          caiu   && 'text-red-400',
          igual  && 'text-dark-500',
        )}>
          {subiu  && <TrendingUp   className="w-3.5 h-3.5" />}
          {caiu   && <TrendingDown className="w-3.5 h-3.5" />}
          {igual  && <Minus        className="w-3.5 h-3.5" />}
          <span>
            {subiu ? '+' : ''}{variacao.toFixed(1)}% vs mês anterior
          </span>
        </div>
      )}
    </div>
  )
}
