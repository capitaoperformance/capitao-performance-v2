'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, getInicioMes, getFimMes, getMesAtual, getMesAnterior } from '@/lib/supabase'
import { formatCurrency, formatPercent, getDiasCorridosMes, getDiasNoMes, calcularProjecao, getMesNome } from '@/lib/utils'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MetricCard } from '@/components/ui/MetricCard'
import { ProgressGoal } from '@/components/ui/ProgressGoal'
import { RankingBarbeiros } from '@/components/ui/RankingBarbeiros'
import type { KPIsBarbeiro } from '@/types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import {
  DollarSign, Users, Scissors, Package, Crown,
  TrendingUp, UserX, BarChart2, RefreshCw, Star
} from 'lucide-react'

interface KPIsGeral {
  fat_total: number
  fat_servicos: number
  fat_extras: number
  fat_produtos: number
  total_comandas: number
  clientes_unicos: number
  ticket_medio: number
  assinantes_ativos: number
  meta_mes: number
}

export default function DashboardGestor() {
  const [kpis, setKpis] = useState<KPIsGeral | null>(null)
  const [kpisAnt, setKpisAnt] = useState<KPIsGeral | null>(null)
  const [barbeiros, setBarbeiros] = useState<KPIsBarbeiro[]>([])
  const [graficoDiario, setGraficoDiario] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())

  const { mes, ano } = getMesAtual()
  const mesAnt = getMesAnterior()
  const diasMes = getDiasNoMes(mes, ano)
  const diasCorridos = getDiasCorridosMes()
  const projecao = kpis ? calcularProjecao(kpis.fat_total, diasCorridos, diasMes) : 0

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    try {
      const inicio = getInicioMes(mes, ano)
      const fim    = getFimMes(mes, ano)
      const inicioAnt = getInicioMes(mesAnt.mes, mesAnt.ano)
      const fimAnt    = getFimMes(mesAnt.mes, mesAnt.ano)

      // KPIs do mês atual
      const { data: cmdMes } = await supabase
        .from('comandas')
        .select('subtotal_servicos, subtotal_extras, subtotal_produtos, total, cliente_id')
        .eq('status', 'fechada')
        .gte('data_atendimento', inicio)
        .lte('data_atendimento', fim)

      // KPIs do mês anterior
      const { data: cmdAnt } = await supabase
        .from('comandas')
        .select('subtotal_servicos, subtotal_extras, subtotal_produtos, total, cliente_id')
        .eq('status', 'fechada')
        .gte('data_atendimento', inicioAnt)
        .lte('data_atendimento', fimAnt)

      const agregar = (cmds: any[]) => ({
        fat_total:     cmds.reduce((s, c) => s + (c.total || 0), 0),
        fat_servicos:  cmds.reduce((s, c) => s + (c.subtotal_servicos || 0), 0),
        fat_extras:    cmds.reduce((s, c) => s + (c.subtotal_extras || 0), 0),
        fat_produtos:  cmds.reduce((s, c) => s + (c.subtotal_produtos || 0), 0),
        total_comandas: cmds.length,
        clientes_unicos: new Set(cmds.map(c => c.cliente_id).filter(Boolean)).size,
        ticket_medio: cmds.length ? cmds.reduce((s, c) => s + (c.total || 0), 0) / cmds.length : 0,
        assinantes_ativos: 0,
        meta_mes: 0,
      })

      const kpisMes = agregar(cmdMes ?? [])
      const kpisAntRes = agregar(cmdAnt ?? [])

      // Meta do mês
      const { data: meta } = await supabase
        .from('metas')
        .select('faturamento_meta')
        .is('barbeiro_id', null)
        .eq('mes', mes)
        .eq('ano', ano)
        .single()
      if (meta) kpisMes.meta_mes = meta.faturamento_meta

      // Assinantes ativos
      const { count } = await supabase
        .from('assinaturas')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ativo')
      kpisMes.assinantes_ativos = count ?? 0

      setKpis(kpisMes)
      setKpisAnt(kpisAntRes)

      // Performance por barbeiro
      const { data: bData } = await supabase
        .from('barbeiros')
        .select(`
          id, nome,
          comandas!inner(subtotal_servicos, subtotal_extras, subtotal_produtos, total, comissao_barbeiro, cliente_id, status, data_atendimento)
        `)
        .eq('ativo', true)
        .eq('comandas.status', 'fechada')
        .gte('comandas.data_atendimento', inicio)
        .lte('comandas.data_atendimento', fim)

      const { data: todasMetas } = await supabase
        .from('metas')
        .select('barbeiro_id, faturamento_meta')
        .eq('mes', mes).eq('ano', ano)
        .not('barbeiro_id', 'is', null)

      const bKpis: KPIsBarbeiro[] = (bData ?? []).map((b, i) => {
        const cmds = (b.comandas as any[]) ?? []
        const fat = cmds.reduce((s: number, c: any) => s + (c.total || 0), 0)
        const metaBarbeiro = todasMetas?.find(m => m.barbeiro_id === b.id)?.faturamento_meta
        const pctMeta = metaBarbeiro ? (fat / metaBarbeiro) * 100 : 0
        return {
          barbeiro_id: b.id,
          barbeiro: b.nome,
          fat_total: fat,
          fat_servicos: cmds.reduce((s: number, c: any) => s + (c.subtotal_servicos || 0), 0),
          fat_extras:   cmds.reduce((s: number, c: any) => s + (c.subtotal_extras || 0), 0),
          fat_produtos: cmds.reduce((s: number, c: any) => s + (c.subtotal_produtos || 0), 0),
          comissao_total: cmds.reduce((s: number, c: any) => s + (c.comissao_barbeiro || 0), 0),
          total_comandas: cmds.length,
          clientes_atendidos: new Set(cmds.map((c: any) => c.cliente_id).filter(Boolean)).size,
          ticket_medio: cmds.length ? fat / cmds.length : 0,
          meta: metaBarbeiro,
          percentual_meta: pctMeta,
          ranking: i + 1,
        }
      })
      setBarbeiros(bKpis)

      // Gráfico diário (últimos 14 dias)
      const { data: diario } = await supabase
        .from('comandas')
        .select('data_atendimento, total')
        .eq('status', 'fechada')
        .gte('data_atendimento', inicio)
        .lte('data_atendimento', fim)
        .order('data_atendimento')

      const porDia: Record<string, number> = {}
      ;(diario ?? []).forEach(c => {
        const dia = c.data_atendimento.split('T')[0]
        porDia[dia] = (porDia[dia] || 0) + (c.total || 0)
      })

      const chartData = Object.entries(porDia).map(([data, valor]) => ({
        data: data.split('-')[2] + '/' + data.split('-')[1],
        valor,
        valorFmt: formatCurrency(valor),
      }))
      setGraficoDiario(chartData)

      setUltimaAtualizacao(new Date())
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }, [mes, ano])

  useEffect(() => {
    carregarDados()
    // Atualizar a cada 5 minutos
    const interval = setInterval(carregarDados, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [carregarDados])

  const variacao = (atual: number, anterior: number) => {
    if (!anterior) return 0
    return ((atual - anterior) / anterior) * 100
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 shadow-card">
          <p className="text-dark-400 text-xs mb-1">{label}</p>
          <p className="text-gold-400 font-bold text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar role="gestor" nomeUsuario="Gestor" />

      <div className="flex-1 lg:ml-64 min-w-0">
        <Header />

        <main className="p-4 lg:p-6 space-y-6">
          {/* Cabeçalho do período */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-dark-200 font-semibold text-lg">
                {getMesNome(mes)} {ano}
              </h2>
              <p className="text-dark-500 text-sm">
                {diasCorridos} de {diasMes} dias — Atualizado {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button
              onClick={carregarDados}
              disabled={carregando}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Meta do mês */}
          {kpis && kpis.meta_mes > 0 && (
            <ProgressGoal
              titulo={`Meta de ${getMesNome(mes)}`}
              atual={kpis.fat_total}
              meta={kpis.meta_mes}
              projecao={projecao}
              showProjecao={true}
            />
          )}

          {/* KPIs principais */}
          <section>
            <h3 className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-3">Faturamento</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                titulo="Total do Mês"
                valor={formatCurrency(kpis?.fat_total ?? 0)}
                icone={DollarSign}
                destaque
                variacao={kpisAnt ? variacao(kpis?.fat_total ?? 0, kpisAnt.fat_total) : undefined}
                loading={carregando}
              />
              <MetricCard
                titulo="Serviços"
                valor={formatCurrency(kpis?.fat_servicos ?? 0)}
                icone={Scissors}
                variacao={kpisAnt ? variacao(kpis?.fat_servicos ?? 0, kpisAnt.fat_servicos) : undefined}
                loading={carregando}
              />
              <MetricCard
                titulo="Extras"
                valor={formatCurrency(kpis?.fat_extras ?? 0)}
                icone={Star}
                variacao={kpisAnt ? variacao(kpis?.fat_extras ?? 0, kpisAnt.fat_extras) : undefined}
                loading={carregando}
              />
              <MetricCard
                titulo="Produtos"
                valor={formatCurrency(kpis?.fat_produtos ?? 0)}
                icone={Package}
                variacao={kpisAnt ? variacao(kpis?.fat_produtos ?? 0, kpisAnt.fat_produtos) : undefined}
                loading={carregando}
              />
            </div>
          </section>

          {/* KPIs operacionais */}
          <section>
            <h3 className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-3">Operacional</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard
                titulo="Atendimentos"
                valor={String(kpis?.total_comandas ?? 0)}
                icone={BarChart2}
                variacao={kpisAnt ? variacao(kpis?.total_comandas ?? 0, kpisAnt.total_comandas) : undefined}
                loading={carregando}
              />
              <MetricCard
                titulo="Clientes Únicos"
                valor={String(kpis?.clientes_unicos ?? 0)}
                icone={Users}
                loading={carregando}
              />
              <MetricCard
                titulo="Ticket Médio"
                valor={formatCurrency(kpis?.ticket_medio ?? 0)}
                icone={TrendingUp}
                variacao={kpisAnt ? variacao(kpis?.ticket_medio ?? 0, kpisAnt.ticket_medio) : undefined}
                loading={carregando}
              />
              <MetricCard
                titulo="Assinantes Ativos"
                valor={String(kpis?.assinantes_ativos ?? 0)}
                icone={Crown}
                loading={carregando}
              />
            </div>
          </section>

          {/* Gráfico + Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico de evolução */}
            <div className="lg:col-span-2 card p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-dark-200 font-semibold text-sm">Evolução Diária do Faturamento</h3>
                <span className="badge-gold">Mês atual</span>
              </div>
              {graficoDiario.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={graficoDiario} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#C9A84C" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="data" tick={{ fill: '#616161', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#616161', fontSize: 11 }} axisLine={false} tickLine={false}
                           tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="valor" stroke="#C9A84C" strokeWidth={2}
                          fill="url(#goldGradient)" dot={false} activeDot={{ r: 4, fill: '#C9A84C', stroke: '#0f0f0f', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-dark-500 text-sm">
                  {carregando ? 'Carregando...' : 'Nenhum dado no período'}
                </div>
              )}
            </div>

            {/* Ranking */}
            <RankingBarbeiros barbeiros={barbeiros} />
          </div>

          {/* Tabela de barbeiros */}
          {barbeiros.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
                <h3 className="text-dark-200 font-semibold text-sm">Performance por Barbeiro</h3>
                <span className="text-dark-500 text-xs">{getMesNome(mes)} {ano}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-900/40">
                      <th className="table-head text-left px-5 py-3">Barbeiro</th>
                      <th className="table-head text-right px-4 py-3">Faturamento</th>
                      <th className="table-head text-right px-4 py-3">Serviços</th>
                      <th className="table-head text-right px-4 py-3">Ticket Médio</th>
                      <th className="table-head text-right px-4 py-3">Comissão</th>
                      <th className="table-head text-right px-4 py-3">Meta %</th>
                      <th className="table-head text-center px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...barbeiros].sort((a, b) => b.fat_total - a.fat_total).map(b => {
                      const pct = b.percentual_meta ?? 0
                      const zona = pct >= 100 ? 'verde' : pct >= 70 ? 'amarelo' : 'vermelho'
                      return (
                        <tr key={b.barbeiro_id} className="table-row">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-dark-600 flex items-center justify-center text-xs font-bold text-dark-300 flex-shrink-0">
                                {b.barbeiro.charAt(0)}
                              </div>
                              <span className="text-dark-100 text-sm font-medium">{b.barbeiro}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-dark-100 font-bold text-sm">
                            {formatCurrency(b.fat_total)}
                          </td>
                          <td className="px-4 py-3 text-right text-dark-300 text-sm">
                            {b.total_comandas}
                          </td>
                          <td className="px-4 py-3 text-right text-dark-300 text-sm">
                            {formatCurrency(b.ticket_medio)}
                          </td>
                          <td className="px-4 py-3 text-right text-gold-400 text-sm font-medium">
                            {formatCurrency(b.comissao_total)}
                          </td>
                          <td className="px-4 py-3 text-right text-dark-300 text-sm">
                            {b.meta ? formatPercent(pct, 0) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`badge-${zona}`}>
                              {zona === 'verde' ? '● No alvo' : zona === 'amarelo' ? '● Atenção' : '● Abaixo'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
