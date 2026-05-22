'use client'

import { useState, useEffect } from 'react'
import { supabase, getInicioMes, getFimMes } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { formatCurrency, formatPercent, getMesNome } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { Download } from 'lucide-react'

export default function RelatoriosPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [dados, setDados] = useState<any[]>([])
  const [porBarbeiro, setPorBarbeiro] = useState<any[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => { carregar() }, [mes, ano])

  async function carregar() {
    setCarregando(true)
    try {
      const inicio = getInicioMes(mes, ano)
      const fim = getFimMes(mes, ano)

      // Por dia
      const { data: cmds } = await supabase
        .from('comandas')
        .select('data_atendimento, total, subtotal_servicos, subtotal_extras, subtotal_produtos, barbeiro_id')
        .eq('status', 'fechada')
        .gte('data_atendimento', inicio)
        .lte('data_atendimento', fim)

      // Agrupar por dia
      const porDia: Record<string, any> = {}
      ;(cmds ?? []).forEach(c => {
        const dia = c.data_atendimento.split('T')[0]
        if (!porDia[dia]) porDia[dia] = { data: dia.split('-')[2] + '/' + dia.split('-')[1], servicos: 0, extras: 0, produtos: 0, total: 0 }
        porDia[dia].servicos += c.subtotal_servicos || 0
        porDia[dia].extras   += c.subtotal_extras   || 0
        porDia[dia].produtos += c.subtotal_produtos  || 0
        porDia[dia].total    += c.total              || 0
      })
      setDados(Object.values(porDia))

      // Por barbeiro
      const { data: barbs } = await supabase.from('barbeiros').select('id, nome').eq('ativo', true)
      const bData = await Promise.all((barbs ?? []).map(async b => {
        const bc = (cmds ?? []).filter(c => c.barbeiro_id === b.id)
        return {
          nome: b.nome.split(' ')[0],
          total: bc.reduce((s, c) => s + (c.total || 0), 0),
          servicos: bc.reduce((s, c) => s + (c.subtotal_servicos || 0), 0),
          produtos: bc.reduce((s, c) => s + (c.subtotal_produtos || 0), 0),
          atendimentos: bc.length,
        }
      }))
      setPorBarbeiro(bData.filter(b => b.total > 0).sort((a, b) => b.total - a.total))
    } finally { setCarregando(false) }
  }

  const totalMes = dados.reduce((s, d) => s + d.total, 0)
  const totalServicos = dados.reduce((s, d) => s + d.servicos, 0)
  const totalExtras = dados.reduce((s, d) => s + d.extras, 0)
  const totalProdutos = dados.reduce((s, d) => s + d.produtos, 0)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 shadow-card text-xs">
          <p className="text-dark-400 mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-6">
          {/* Filtro */}
          <div className="flex flex-wrap items-center gap-4">
            <select value={mes} onChange={e => setMes(+e.target.value)} className="input w-36">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{getMesNome(m)}</option>
              ))}
            </select>
            <select value={ano} onChange={e => setAno(+e.target.value)} className="input w-28">
              {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <span className="text-dark-500 text-sm">{carregando ? 'Carregando...' : `${dados.length} dias com movimento`}</span>
          </div>

          {/* Totais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total', valor: totalMes, destaque: true },
              { label: 'Serviços', valor: totalServicos },
              { label: 'Extras', valor: totalExtras },
              { label: 'Produtos', valor: totalProdutos },
            ].map(k => (
              <div key={k.label} className={`card p-4 ${k.destaque ? 'border-gold-500/30' : ''}`}>
                <p className="text-dark-500 text-xs uppercase tracking-wider mb-1">{k.label}</p>
                <p className={`text-xl font-bold ${k.destaque ? 'text-gradient-gold' : 'text-dark-100'}`}>{formatCurrency(k.valor)}</p>
                {totalMes > 0 && !k.destaque && (
                  <p className="text-dark-600 text-xs mt-1">{formatPercent((k.valor / totalMes) * 100, 0)} do total</p>
                )}
              </div>
            ))}
          </div>

          {/* Gráfico diário */}
          <div className="card p-5">
            <h3 className="text-dark-200 font-semibold text-sm mb-5">Faturamento Diário — {getMesNome(mes)} {ano}</h3>
            {dados.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dados} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="data" tick={{ fill: '#616161', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#616161', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#616161' }} />
                  <Bar dataKey="servicos" name="Serviços" fill="#C9A84C" radius={[3,3,0,0]} />
                  <Bar dataKey="extras"   name="Extras"   fill="#e8c558" radius={[3,3,0,0]} />
                  <Bar dataKey="produtos" name="Produtos"  fill="#9a7526" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-dark-500 text-sm">
                Nenhum dado no período
              </div>
            )}
          </div>

          {/* Por barbeiro */}
          {porBarbeiro.length > 0 && (
            <div className="card p-5">
              <h3 className="text-dark-200 font-semibold text-sm mb-5">Faturamento por Barbeiro</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={porBarbeiro} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#616161', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" tick={{ fill: '#9e9e9e', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total" fill="#C9A84C" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela por barbeiro */}
          {porBarbeiro.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700">
                <h3 className="text-dark-200 font-semibold text-sm">Detalhamento por Barbeiro</h3>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-dark-700 bg-dark-900/40">
                  {['Barbeiro','Atendimentos','Serviços','Produtos','Total','% do Total'].map(h => (
                    <th key={h} className="table-head text-left px-5 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {porBarbeiro.map(b => (
                    <tr key={b.nome} className="table-row">
                      <td className="px-5 py-3 text-dark-100 font-medium text-sm">{b.nome}</td>
                      <td className="px-5 py-3 text-dark-300 text-sm">{b.atendimentos}</td>
                      <td className="px-5 py-3 text-dark-300 text-sm">{formatCurrency(b.servicos)}</td>
                      <td className="px-5 py-3 text-dark-300 text-sm">{formatCurrency(b.produtos)}</td>
                      <td className="px-5 py-3 text-gold-400 font-bold text-sm">{formatCurrency(b.total)}</td>
                      <td className="px-5 py-3 text-dark-400 text-sm">{totalMes > 0 ? formatPercent((b.total / totalMes) * 100, 1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
