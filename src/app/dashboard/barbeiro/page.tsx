'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, getInicioMes, getFimMes, getMesAtual } from '@/lib/supabase'
import { formatCurrency, formatPercent, getZonaPerformance, getZonaColor, getDiasNoMes, getDiasCorridosMes, calcularProjecao, getMesNome } from '@/lib/utils'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MetricCard } from '@/components/ui/MetricCard'
import { ProgressGoal } from '@/components/ui/ProgressGoal'
import { cn } from '@/lib/utils'
import { AlertTriangle, TrendingUp, Package, Scissors, Star, Users, Trophy, Zap, CheckCircle2 } from 'lucide-react'

export default function DashboardBarbeiro() {
  const [barbeiro, setBarbeiro] = useState<any>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [meta, setMeta] = useState<number>(0)
  const [ranking, setRanking] = useState<number>(1)
  const [totalBarbeiros, setTotalBarbeiros] = useState<number>(1)
  const [gargalos, setGargalos] = useState<string[]>([])
  const [recomendacoes, setRecomendacoes] = useState<string[]>([])
  const [carregando, setCarregando] = useState(true)

  const { mes, ano } = getMesAtual()
  const diasMes = getDiasNoMes(mes, ano)
  const diasCorridos = getDiasCorridosMes()
  const projecao = kpis ? calcularProjecao(kpis.fat_total, diasCorridos, diasMes) : 0

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      // Buscar profile do usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const { data: barb } = await supabase.from('barbeiros').select('*').eq('profile_id', user.id).single()
      if (!barb) return
      setBarbeiro(barb)

      const inicio = getInicioMes(mes, ano)
      const fim    = getFimMes(mes, ano)

      // Comandas do barbeiro no mês
      const { data: cmds } = await supabase
        .from('comandas')
        .select(`*, comanda_servicos(*), comanda_produtos(*)`)
        .eq('barbeiro_id', barb.id)
        .eq('status', 'fechada')
        .gte('data_atendimento', inicio)
        .lte('data_atendimento', fim)

      const fat_total     = (cmds ?? []).reduce((s, c) => s + (c.total || 0), 0)
      const fat_servicos  = (cmds ?? []).reduce((s, c) => s + (c.subtotal_servicos || 0), 0)
      const fat_extras    = (cmds ?? []).reduce((s, c) => s + (c.subtotal_extras || 0), 0)
      const fat_produtos  = (cmds ?? []).reduce((s, c) => s + (c.subtotal_produtos || 0), 0)
      const comissao      = (cmds ?? []).reduce((s, c) => s + (c.comissao_barbeiro || 0), 0)
      const ticket_medio  = cmds?.length ? fat_total / cmds.length : 0
      const qtd_servicos  = (cmds ?? []).reduce((s, c) => s + (c.comanda_servicos?.filter((cs: any) => cs.categoria === 'servico').length || 0), 0)
      const qtd_extras    = (cmds ?? []).reduce((s, c) => s + (c.comanda_servicos?.filter((cs: any) => cs.categoria === 'extra').length || 0), 0)
      const qtd_produtos  = (cmds ?? []).reduce((s, c) => s + (c.comanda_produtos?.length || 0), 0)
      const clientes_unicos = new Set((cmds ?? []).map(c => c.cliente_id).filter(Boolean)).size

      setKpis({ fat_total, fat_servicos, fat_extras, fat_produtos, comissao, ticket_medio, qtd_servicos, qtd_extras, qtd_produtos, clientes_unicos, total_comandas: cmds?.length ?? 0 })

      // Meta
      const { data: metaData } = await supabase
        .from('metas')
        .select('faturamento_meta')
        .eq('barbeiro_id', barb.id)
        .eq('mes', mes).eq('ano', ano)
        .single()
      const metaVal = metaData?.faturamento_meta ?? 0
      setMeta(metaVal)

      // Ranking
      const { data: todos } = await supabase
        .from('barbeiros')
        .select('id, nome')
        .eq('ativo', true)

      if (todos) {
        const fats: Record<string, number> = {}
        for (const b of todos) {
          const { data: bc } = await supabase
            .from('comandas')
            .select('total')
            .eq('barbeiro_id', b.id)
            .eq('status', 'fechada')
            .gte('data_atendimento', inicio)
            .lte('data_atendimento', fim)
          fats[b.id] = (bc ?? []).reduce((s, c) => s + (c.total || 0), 0)
        }
        const sorted = Object.entries(fats).sort((a, b) => b[1] - a[1])
        const pos = sorted.findIndex(([id]) => id === barb.id) + 1
        setRanking(pos || 1)
        setTotalBarbeiros(todos.length)
      }

      // Calcular gargalos e recomendações
      const g: string[] = []
      const r: string[] = []
      const pct = metaVal > 0 ? (fat_total / metaVal) * 100 : 0

      if (qtd_produtos === 0) g.push('Nenhum produto vendido neste mês')
      else if (qtd_produtos < cmds!.length * 0.2) g.push('Baixa venda de produtos por atendimento')

      if (qtd_extras === 0) g.push('Nenhum serviço extra vendido')
      else if (qtd_extras < cmds!.length * 0.3) g.push('Poucos extras por atendimento')

      if (ticket_medio < 60) g.push('Ticket médio abaixo do ideal (< R$ 60)')

      if (pct < 50 && diasCorridos > 15) g.push('Mais da metade do mês passou e abaixo de 50% da meta')

      if (g.length === 0 && pct >= 100) {
        r.push('🏆 Parabéns! Meta batida! Foco em superar e consolidar a liderança.')
      } else {
        if (qtd_produtos === 0) r.push('💡 Ofereça pelo menos 1 produto por atendimento. Pomadas e produtos de barba vendem bem.')
        if (qtd_extras < cmds!.length * 0.3) r.push('✂️ Sugerira extras como hidratação e design de barba premium a cada cliente.')
        if (metaVal > 0 && fat_total < metaVal) {
          const falta = metaVal - fat_total
          const diasRestantes = diasMes - diasCorridos
          if (diasRestantes > 0) {
            const porDia = falta / diasRestantes
            r.push(`📅 Para bater a meta, precisa de ${formatCurrency(porDia)}/dia nos próximos ${diasRestantes} dias.`)
          }
        }
      }

      setGargalos(g)
      setRecomendacoes(r)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregando(false)
    }
  }, [mes, ano])

  useEffect(() => {
    carregarDados()
    const interval = setInterval(carregarDados, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [carregarDados])

  const pct = meta > 0 && kpis ? (kpis.fat_total / meta) * 100 : 0
  const zona = getZonaPerformance(pct)
  const colors = getZonaColor(zona)

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar role="barbeiro" nomeUsuario={barbeiro?.nome ?? 'Barbeiro'} />

      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-5">
          {/* Saudação + Zona */}
          <div className={cn('card p-5 border flex items-center justify-between', colors.border, colors.bg)}>
            <div>
              <p className="text-dark-400 text-sm mb-0.5">Olá, {barbeiro?.nome?.split(' ')[0] ?? 'Barbeiro'} 👋</p>
              <p className="text-dark-100 font-semibold">{getMesNome(mes)} {ano} — {diasMes - diasCorridos} dias restantes</p>
            </div>
            <div className={cn('text-right')}>
              <div className={cn('text-2xl font-bold', colors.text)}>
                {zona === 'verde' ? '🟢' : zona === 'amarelo' ? '🟡' : '🔴'}
                {' '}{formatPercent(pct, 0)} da meta
              </div>
              <p className={cn('text-xs', colors.text)}>
                {zona === 'verde' ? 'No alvo!' : zona === 'amarelo' ? 'Atenção!' : 'Precisa acelerar!'}
              </p>
            </div>
          </div>

          {/* Ranking */}
          <div className="card p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-gold-500/10 border border-gold-500/30 rounded-2xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <p className="text-dark-500 text-xs">Ranking da equipe</p>
              <p className="text-dark-100 font-bold text-lg">
                {ranking}º lugar <span className="text-dark-500 text-sm font-normal">de {totalBarbeiros} barbeiros</span>
              </p>
            </div>
          </div>

          {/* Meta */}
          {meta > 0 && (
            <ProgressGoal
              titulo={`Minha Meta — ${getMesNome(mes)}`}
              atual={kpis?.fat_total ?? 0}
              meta={meta}
              projecao={projecao}
            />
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <MetricCard titulo="Faturamento" valor={formatCurrency(kpis?.fat_total ?? 0)} icone={TrendingUp} destaque loading={carregando} />
            <MetricCard titulo="Comissão"    valor={formatCurrency(kpis?.comissao ?? 0)}   icone={Zap}         loading={carregando} />
            <MetricCard titulo="Atendimentos" valor={String(kpis?.total_comandas ?? 0)}   icone={Scissors}    loading={carregando} />
            <MetricCard titulo="Ticket Médio" valor={formatCurrency(kpis?.ticket_medio ?? 0)} icone={TrendingUp} loading={carregando} />
            <MetricCard titulo="Extras"       valor={String(kpis?.qtd_extras ?? 0)}       icone={Star}         loading={carregando} />
            <MetricCard titulo="Produtos"     valor={String(kpis?.qtd_produtos ?? 0)}     icone={Package}      loading={carregando} />
          </div>

          {/* Gargalos */}
          {gargalos.length > 0 && (
            <div className="card p-5 border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-amber-400 font-semibold text-sm">Pontos de Atenção</h3>
              </div>
              <ul className="space-y-2">
                {gargalos.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-dark-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendações */}
          {recomendacoes.length > 0 && (
            <div className="card p-5 border-emerald-500/20 bg-emerald-500/3">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-emerald-400 font-semibold text-sm">Como bater a meta</h3>
              </div>
              <ul className="space-y-3">
                {recomendacoes.map((r, i) => (
                  <li key={i} className="text-sm text-dark-200 leading-relaxed">{r}</li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
