'use client'

import { useEffect, useState } from 'react'
import { supabase, getInicioMes, getFimMes, getMesAtual } from '@/lib/supabase'
import { formatCurrency, formatPercent, getZonaPerformance, getZonaColor, getDiasNoMes, getDiasCorridosMes, calcularProjecao, getMesNome } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Trophy, Target, TrendingUp, Scissors, Star, Package, Zap, Medal, Crown } from 'lucide-react'

interface PageProps {
  params: { slug: string }
}

export default function BarbeiroPublico({ params }: PageProps) {
  const [barbeiro, setBarbeiro] = useState<any>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [meta, setMeta] = useState(0)
  const [ranking, setRanking] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const { mes, ano } = getMesAtual()
  const diasMes = getDiasNoMes(mes, ano)
  const diasCorridos = getDiasCorridosMes()

  useEffect(() => { carregar() }, [params.slug])

  async function carregar() {
    setCarregando(true)
    try {
      // Buscar barbeiro pelo slug (nome normalizado)
      const { data: barbs } = await supabase
        .from('barbeiros').select('*').eq('ativo', true)

      const slug = params.slug.toLowerCase()
      const barb = barbs?.find(b =>
        b.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-') === slug ||
        b.apelido?.toLowerCase() === slug ||
        b.nome.toLowerCase().split(' ')[0] === slug
      )

      if (!barb) { setNotFound(true); setCarregando(false); return }
      setBarbeiro(barb)

      const inicio = getInicioMes(mes, ano)
      const fim    = getFimMes(mes, ano)

      // KPIs do barbeiro
      const { data: cmds } = await supabase
        .from('comandas')
        .select('total, subtotal_servicos, subtotal_extras, subtotal_produtos, comissao_barbeiro')
        .eq('barbeiro_id', barb.id)
        .eq('status', 'fechada')
        .gte('data_atendimento', inicio)
        .lte('data_atendimento', fim)

      const fat = (cmds ?? []).reduce((s, c) => s + (c.total || 0), 0)
      const comissao = (cmds ?? []).reduce((s, c) => s + (c.comissao_barbeiro || 0), 0)
      setKpis({
        fat_total: fat,
        fat_servicos: (cmds ?? []).reduce((s, c) => s + (c.subtotal_servicos || 0), 0),
        fat_extras: (cmds ?? []).reduce((s, c) => s + (c.subtotal_extras || 0), 0),
        fat_produtos: (cmds ?? []).reduce((s, c) => s + (c.subtotal_produtos || 0), 0),
        comissao,
        atendimentos: cmds?.length ?? 0,
        ticket_medio: cmds?.length ? fat / cmds.length : 0,
        projecao: calcularProjecao(fat, diasCorridos, diasMes),
      })

      // Meta
      const { data: metaData } = await supabase
        .from('metas').select('faturamento_meta')
        .eq('barbeiro_id', barb.id).eq('mes', mes).eq('ano', ano).single()
      setMeta(metaData?.faturamento_meta ?? 0)

      // Ranking geral
      const { data: todosBarbeiros } = await supabase
        .from('barbeiros').select('id, nome').eq('ativo', true)

      const rankData = await Promise.all((todosBarbeiros ?? []).map(async b => {
        const { data: bc } = await supabase
          .from('comandas').select('total')
          .eq('barbeiro_id', b.id).eq('status', 'fechada')
          .gte('data_atendimento', inicio).lte('data_atendimento', fim)
        return { id: b.id, nome: b.nome, fat: (bc ?? []).reduce((s, c) => s + (c.total || 0), 0) }
      }))
      setRanking(rankData.sort((a, b) => b.fat - a.fat))
    } catch (e) {
      setNotFound(true)
    } finally {
      setCarregando(false)
    }
  }

  if (carregando) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-dark-500 text-sm">Carregando...</p>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="text-center">
        <Crown className="w-12 h-12 text-gold-500/30 mx-auto mb-4" />
        <p className="text-dark-200 font-semibold">Barbeiro não encontrado</p>
        <p className="text-dark-500 text-sm mt-1">Verifique o link com seu gestor</p>
      </div>
    </div>
  )

  const pct = meta > 0 && kpis ? (kpis.fat_total / meta) * 100 : 0
  const zona = getZonaPerformance(pct)
  const colors = getZonaColor(zona)
  const posicao = ranking.findIndex(r => r.id === barbeiro?.id) + 1
  const diasRestantes = diasMes - diasCorridos
  const faltaMeta = Math.max(meta - (kpis?.fat_total ?? 0), 0)
  const porDia = diasRestantes > 0 ? faltaMeta / diasRestantes : 0

  // Nível Bronze/Prata/Ouro
  const nivel = pct >= 100 ? { nome: 'OURO', cor: 'text-gold-400', bg: 'bg-gold-500/10', border: 'border-gold-500/30', icon: '🥇' }
    : pct >= 70 ? { nome: 'PRATA', cor: 'text-dark-300', bg: 'bg-dark-700/50', border: 'border-dark-600', icon: '🥈' }
    : { nome: 'BRONZE', cor: 'text-amber-700', bg: 'bg-amber-900/20', border: 'border-amber-800/30', icon: '🥉' }

  return (
    <div className="min-h-screen bg-dark-950 pb-10">
      {/* Header */}
      <div className="bg-dark-900 border-b border-dark-700 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gold-gradient rounded-lg flex items-center justify-center">
            <Crown className="w-3.5 h-3.5 text-dark-950" />
          </div>
          <div>
            <div className="font-display text-gold-400 text-xs font-bold tracking-wider">CAPITÃO</div>
            <div className="text-dark-600 text-[9px] tracking-widest">BARBERS CLUB</div>
          </div>
        </div>
        <span className="text-dark-500 text-xs">{getMesNome(mes)} {ano}</span>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto space-y-4">
        {/* Perfil */}
        <div className={cn('rounded-2xl border p-5 flex items-center gap-4', nivel.bg, nivel.border)}>
          <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center text-2xl font-bold text-gold-400 flex-shrink-0">
            {barbeiro?.nome?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-dark-100 font-bold text-lg leading-tight">{barbeiro?.nome?.split(' ')[0]}</p>
            <p className="text-dark-500 text-sm">{barbeiro?.nome}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('text-sm font-bold', nivel.cor)}>{nivel.icon} {nivel.nome}</span>
              <span className="text-dark-600 text-xs">· {posicao}º lugar</span>
            </div>
          </div>
        </div>

        {/* Meta */}
        {meta > 0 && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gold-400" />
                <span className="text-dark-200 font-semibold text-sm">Meta do Mês</span>
              </div>
              <span className={cn('text-sm font-bold px-2.5 py-1 rounded-full', colors.bg, colors.text)}>
                {formatPercent(pct, 0)}
              </span>
            </div>

            {/* Barra */}
            <div>
              <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: zona === 'verde' ? 'linear-gradient(90deg,#059669,#34d399)'
                      : zona === 'amarelo' ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                      : 'linear-gradient(90deg,#dc2626,#f87171)'
                  }} />
              </div>
              <div className="flex justify-between text-xs text-dark-600 mt-1">
                <span>{formatCurrency(kpis?.fat_total ?? 0)}</span>
                <span>Meta: {formatCurrency(meta)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <p className="text-dark-500 text-xs mb-1">Realizado</p>
                <p className="text-dark-100 font-bold">{formatCurrency(kpis?.fat_total ?? 0)}</p>
              </div>
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <p className="text-dark-500 text-xs mb-1">{faltaMeta > 0 ? 'Falta' : '🎉 Bateu!'}</p>
                <p className={cn('font-bold', faltaMeta > 0 ? 'text-dark-200' : 'text-emerald-400')}>
                  {faltaMeta > 0 ? formatCurrency(faltaMeta) : 'Meta atingida!'}
                </p>
              </div>
              {faltaMeta > 0 && diasRestantes > 0 && (
                <div className="col-span-2 bg-dark-900 rounded-xl p-3 text-center">
                  <p className="text-dark-500 text-xs mb-1">Precisa fazer por dia ({diasRestantes} dias)</p>
                  <p className="text-amber-400 font-bold text-lg">{formatCurrency(porDia)}/dia</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Faturamento', valor: formatCurrency(kpis?.fat_total ?? 0), icon: TrendingUp, cor: 'text-gold-400', destaque: true },
            { label: 'Comissão',    valor: formatCurrency(kpis?.comissao ?? 0),   icon: Zap,        cor: 'text-emerald-400' },
            { label: 'Serviços',    valor: formatCurrency(kpis?.fat_servicos ?? 0), icon: Scissors, cor: 'text-dark-300' },
            { label: 'Extras',      valor: formatCurrency(kpis?.fat_extras ?? 0), icon: Star,       cor: 'text-dark-300' },
            { label: 'Produtos',    valor: formatCurrency(kpis?.fat_produtos ?? 0), icon: Package,  cor: 'text-dark-300' },
            { label: 'Ticket Médio',valor: formatCurrency(kpis?.ticket_medio ?? 0), icon: TrendingUp, cor: 'text-dark-300' },
          ].map(k => (
            <div key={k.label} className={cn('bg-dark-800 border border-dark-700 rounded-xl p-4', k.destaque && 'border-gold-500/30 col-span-2')}>
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={cn('w-3.5 h-3.5', k.cor)} />
                <span className="text-dark-500 text-xs">{k.label}</span>
              </div>
              <p className={cn('font-bold', k.destaque ? 'text-2xl text-gradient-gold' : 'text-lg text-dark-100')}>{k.valor}</p>
            </div>
          ))}
        </div>

        {/* Projeção */}
        {kpis?.projecao > 0 && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
            <p className="text-dark-500 text-xs mb-1">Projeção de fechamento</p>
            <p className={cn('text-xl font-bold', kpis.projecao >= meta ? 'text-emerald-400' : 'text-amber-400')}>
              {formatCurrency(kpis.projecao)}
            </p>
            <p className="text-dark-600 text-xs mt-0.5">
              {meta > 0 ? `${formatPercent((kpis.projecao / meta) * 100, 0)} da meta` : 'no ritmo atual'}
            </p>
          </div>
        )}

        {/* Ranking */}
        {ranking.length > 1 && (
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-gold-400" />
              <span className="text-dark-200 font-semibold text-sm">Ranking da equipe</span>
            </div>
            <div className="space-y-2">
              {ranking.map((r, i) => {
                const isEu = r.id === barbeiro?.id
                const icons = ['🥇', '🥈', '🥉']
                return (
                  <div key={r.id} className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all',
                    isEu ? 'bg-gold-500/10 border border-gold-500/20' : 'bg-dark-900'
                  )}>
                    <span className="text-sm w-5 text-center">{icons[i] ?? `${i+1}º`}</span>
                    <p className={cn('flex-1 text-sm font-medium', isEu ? 'text-gold-400' : 'text-dark-300')}>
                      {r.nome.split(' ')[0]} {isEu && '← você'}
                    </p>
                    <p className={cn('text-sm font-bold', isEu ? 'text-gold-400' : 'text-dark-400')}>
                      {formatCurrency(r.fat)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center pt-2">
          <p className="text-dark-600 text-xs">Capitão Barbers Club · Capitão Performance</p>
          <p className="text-dark-700 text-xs mt-0.5">Atualizado em tempo real</p>
        </div>
      </div>
    </div>
  )
}
