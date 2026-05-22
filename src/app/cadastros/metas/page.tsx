'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, getMesNome } from '@/lib/utils'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Target, Plus, Save } from 'lucide-react'
import type { Barbeiro, Meta } from '@/types'

export default function MetasPage() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [metas, setMetas] = useState<Meta[]>([])
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [metaGeral, setMetaGeral] = useState(0)
  const [metasPorBarbeiro, setMetasPorBarbeiro] = useState<Record<string, number>>({})
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => { carregarBarbeiros() }, [])
  useEffect(() => { carregarMetas() }, [mes, ano])

  async function carregarBarbeiros() {
    const { data } = await supabase.from('barbeiros').select('*').eq('ativo', true).order('nome')
    setBarbeiros(data ?? [])
  }

  async function carregarMetas() {
    const { data } = await supabase.from('metas').select('*').eq('mes', mes).eq('ano', ano)
    if (!data) return
    const geral = data.find(m => !m.barbeiro_id)
    setMetaGeral(geral?.faturamento_meta ?? 0)
    const porBarb: Record<string, number> = {}
    data.filter(m => m.barbeiro_id).forEach(m => { porBarb[m.barbeiro_id!] = m.faturamento_meta })
    setMetasPorBarbeiro(porBarb)
  }

  async function salvarMetas() {
    setSalvando(true)
    try {
      // Meta geral
      await supabase.from('metas').upsert({
        barbeiro_id: null, mes, ano,
        faturamento_meta: metaGeral,
      }, { onConflict: 'barbeiro_id,mes,ano' })

      // Metas por barbeiro
      for (const b of barbeiros) {
        const val = metasPorBarbeiro[b.id] ?? 0
        if (val > 0) {
          await supabase.from('metas').upsert({
            barbeiro_id: b.id, mes, ano,
            faturamento_meta: val,
          }, { onConflict: 'barbeiro_id,mes,ano' })
        }
      }
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } finally {
      setSalvando(false)
    }
  }

  const totalIndividual = Object.values(metasPorBarbeiro).reduce((s, v) => s + v, 0)

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-5">
          {/* Período */}
          <div className="card p-5 flex flex-wrap items-center gap-4">
            <Target className="w-5 h-5 text-gold-400" />
            <h3 className="text-dark-200 font-semibold">Definir Metas</h3>
            <div className="flex items-center gap-3 ml-auto">
              <select value={mes} onChange={e => setMes(+e.target.value)} className="input w-36">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMesNome(m)}</option>
                ))}
              </select>
              <select value={ano} onChange={e => setAno(+e.target.value)} className="input w-28">
                {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {sucesso && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm">
              ✓ Metas salvas com sucesso para {getMesNome(mes)} {ano}!
            </div>
          )}

          {/* Meta geral */}
          <div className="card-gold p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-gold-400 font-semibold text-sm">Meta Geral da Barbearia</h4>
                <p className="text-dark-500 text-xs mt-0.5">Faturamento total esperado para {getMesNome(mes)}</p>
              </div>
              <Target className="w-5 h-5 text-gold-400" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-dark-400 text-sm">R$</span>
              <input
                type="number"
                value={metaGeral || ''}
                onChange={e => setMetaGeral(+e.target.value)}
                placeholder="0,00"
                className="input text-2xl font-bold text-gold-400 bg-transparent border-b border-gold-500/30 rounded-none px-0 focus:border-gold-400 w-48"
                min="0" step="100"
              />
            </div>
            {totalIndividual > 0 && metaGeral > 0 && (
              <p className={`text-xs ${totalIndividual >= metaGeral ? 'text-emerald-400' : 'text-amber-400'}`}>
                Soma das metas individuais: {formatCurrency(totalIndividual)}
                {totalIndividual < metaGeral && ` (faltam ${formatCurrency(metaGeral - totalIndividual)} distribuir)`}
              </p>
            )}
          </div>

          {/* Metas por barbeiro */}
          <div className="card p-5 space-y-5">
            <h4 className="text-dark-200 font-semibold text-sm">Metas Individuais por Barbeiro</h4>
            <div className="space-y-3">
              {barbeiros.map(b => {
                const val = metasPorBarbeiro[b.id] ?? 0
                const pct = metaGeral > 0 ? (val / metaGeral) * 100 : 0
                return (
                  <div key={b.id} className="flex items-center gap-4 p-3 bg-dark-900 rounded-xl">
                    <div className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-xs font-bold text-gold-400 flex-shrink-0">
                      {b.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-dark-200 text-sm font-medium">{b.nome}</p>
                      {metaGeral > 0 && val > 0 && (
                        <p className="text-dark-600 text-xs">{pct.toFixed(1)}% da meta geral</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-dark-500 text-sm">R$</span>
                      <input
                        type="number"
                        value={val || ''}
                        onChange={e => setMetasPorBarbeiro(p => ({ ...p, [b.id]: +e.target.value }))}
                        placeholder="0"
                        className="input w-32 text-right font-semibold"
                        min="0" step="50"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={salvarMetas} disabled={salvando} className="btn-gold flex items-center gap-2 px-8">
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : `Salvar Metas de ${getMesNome(mes)}`}
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
