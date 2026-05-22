'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, getInicioMes, getFimMes, getMesAtual } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { formatCurrency, formatPercent, getMesNome, getZonaPerformance } from '@/lib/utils'
import { Download, Share2, Link, Copy, Check } from 'lucide-react'

export default function CardsPage() {
  const [barbeiros, setBarbeiros] = useState<any[]>([])
  const [selecionado, setSelecionado] = useState<string>('')
  const [kpis, setKpis] = useState<any>(null)
  const [meta, setMeta] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { mes, ano } = getMesAtual()

  useEffect(() => { carregarBarbeiros() }, [])
  useEffect(() => { if (selecionado) carregarKpis(selecionado) }, [selecionado])

  async function carregarBarbeiros() {
    const { data } = await supabase.from('barbeiros').select('id, nome, apelido').eq('ativo', true).order('nome')
    setBarbeiros(data ?? [])
    if (data?.[0]) setSelecionado(data[0].id)
  }

  async function carregarKpis(barbeiroId: string) {
    const inicio = getInicioMes(mes, ano)
    const fim = getFimMes(mes, ano)
    const { data: cmds } = await supabase
      .from('comandas').select('total, subtotal_servicos, subtotal_extras, subtotal_produtos, comissao_barbeiro')
      .eq('barbeiro_id', barbeiroId).eq('status', 'fechada')
      .gte('data_atendimento', inicio).lte('data_atendimento', fim)

    const fat = (cmds ?? []).reduce((s, c) => s + (c.total || 0), 0)
    const comissao = (cmds ?? []).reduce((s, c) => s + (c.comissao_barbeiro || 0), 0)

    const { data: rankAll } = await supabase.from('barbeiros').select('id, nome').eq('ativo', true)
    const ranks = await Promise.all((rankAll ?? []).map(async b => {
      const { data: bc } = await supabase.from('comandas').select('total')
        .eq('barbeiro_id', b.id).eq('status', 'fechada')
        .gte('data_atendimento', inicio).lte('data_atendimento', fim)
      return { id: b.id, fat: (bc ?? []).reduce((s, c) => s + (c.total || 0), 0) }
    }))
    const sorted = ranks.sort((a, b) => b.fat - a.fat)
    const pos = sorted.findIndex(r => r.id === barbeiroId) + 1

    const { data: metaData } = await supabase.from('metas').select('faturamento_meta')
      .eq('barbeiro_id', barbeiroId).eq('mes', mes).eq('ano', ano).single()

    setKpis({ fat, comissao, atendimentos: cmds?.length ?? 0, ranking: pos, total_barbeiros: rankAll?.length ?? 1 })
    setMeta(metaData?.faturamento_meta ?? 0)
  }

  const barb = barbeiros.find(b => b.id === selecionado)
  const pct = meta > 0 && kpis ? (kpis.fat / meta) * 100 : 0
  const zona = getZonaPerformance(pct)
  const nivel = pct >= 100 ? { nome: 'OURO 🥇', cor: '#C9A84C' }
    : pct >= 70 ? { nome: 'PRATA 🥈', cor: '#9e9e9e' }
    : { nome: 'BRONZE 🥉', cor: '#b87333' }

  function getSlug(b: any) {
    return (b?.apelido || b?.nome?.split(' ')[0] || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
  }

  function copiarLink() {
    const link = `${window.location.origin}/b/${getSlug(barb)}`
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header titulo="Cards & Links" subtitulo="Compartilhe no WhatsApp" />
        <main className="p-4 lg:p-6 space-y-5">

          {/* Seletor de barbeiro */}
          <div className="card p-5 space-y-4">
            <h3 className="text-dark-200 font-semibold text-sm">Selecionar Barbeiro</h3>
            <div className="flex flex-wrap gap-2">
              {barbeiros.map(b => (
                <button key={b.id} onClick={() => setSelecionado(b.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selecionado === b.id
                      ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}>
                  {b.nome.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {barb && kpis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Card visual */}
              <div>
                <h3 className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-3">Card para WhatsApp</h3>
                <div ref={cardRef} className="rounded-2xl overflow-hidden" style={{
                  background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  padding: '28px',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <div style={{ color: '#C9A84C', fontSize: '10px', letterSpacing: '3px', fontWeight: 700 }}>CAPITÃO BARBERS CLUB</div>
                      <div style={{ color: '#424242', fontSize: '9px', letterSpacing: '2px' }}>CAPITÃO PERFORMANCE</div>
                    </div>
                    <div style={{ color: '#424242', fontSize: '11px' }}>{getMesNome(mes)} {ano}</div>
                  </div>

                  {/* Nome */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#2a2a2a', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <span style={{ color: '#C9A84C', fontSize: '20px', fontWeight: 700 }}>{barb.nome.charAt(0)}</span>
                    </div>
                    <div style={{ color: '#e0e0e0', fontSize: '22px', fontWeight: 700, lineHeight: 1 }}>{barb.nome.split(' ')[0]}</div>
                    <div style={{ color: nivel.cor, fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>{nivel.nome}</div>
                  </div>

                  {/* Faturamento principal */}
                  <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
                    <div style={{ color: '#616161', fontSize: '11px', marginBottom: '4px' }}>FATURAMENTO DO MÊS</div>
                    <div style={{ background: 'linear-gradient(135deg, #C9A84C, #e8c558)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>
                      {formatCurrency(kpis.fat)}
                    </div>
                    <div style={{ color: '#616161', fontSize: '11px', marginTop: '4px' }}>
                      Comissão: <span style={{ color: '#e0e0e0' }}>{formatCurrency(kpis.comissao)}</span>
                    </div>
                  </div>

                  {/* Grid de stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { label: 'Atend.', valor: kpis.atendimentos },
                      { label: 'Ranking', valor: `${kpis.ranking}º/${kpis.total_barbeiros}` },
                      { label: 'Meta', valor: meta > 0 ? formatPercent(pct, 0) : '—' },
                    ].map(s => (
                      <div key={s.label} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                        <div style={{ color: '#e0e0e0', fontSize: '16px', fontWeight: 700 }}>{s.valor}</div>
                        <div style={{ color: '#424242', fontSize: '10px' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Barra de meta */}
                  {meta > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#616161', marginBottom: '6px' }}>
                        <span>Progresso da meta</span>
                        <span>{formatCurrency(meta)}</span>
                      </div>
                      <div style={{ height: '6px', background: '#2a2a2a', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '4px',
                          width: `${Math.min(pct, 100)}%`,
                          background: zona === 'verde' ? 'linear-gradient(90deg,#059669,#34d399)'
                            : zona === 'amarelo' ? 'linear-gradient(90deg,#d97706,#fbbf24)'
                            : 'linear-gradient(90deg,#dc2626,#f87171)'
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-dark-600 text-xs mt-2 text-center">
                  Tire um print deste card e envie no WhatsApp
                </p>
              </div>

              {/* Links e ações */}
              <div className="space-y-4">
                <h3 className="text-dark-400 text-xs font-medium uppercase tracking-wider">Link individual</h3>

                {/* Link do barbeiro */}
                <div className="card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-gold-400" />
                    <p className="text-dark-200 font-semibold text-sm">Link de {barb.nome.split(' ')[0]}</p>
                  </div>
                  <div className="bg-dark-900 border border-dark-700 rounded-xl px-4 py-3 font-mono text-xs text-dark-400 break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/b/${getSlug(barb)}` : `/b/${getSlug(barb)}`}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copiarLink}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 rounded-xl text-sm hover:bg-gold-500/20 transition-colors">
                      {copiado ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar link</>}
                    </button>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/b/${getSlug(barb)}`
                        const msg = `Olá ${barb.nome.split(' ')[0]}! Aqui está o seu link de performance da Capitão Barbers Club 🏆\n\n${link}\n\nAcompanhe seu faturamento, ranking e metas em tempo real!`
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm hover:bg-emerald-500/20 transition-colors">
                      <Share2 className="w-4 h-4" /> Enviar WA
                    </button>
                  </div>
                  <p className="text-dark-600 text-xs">
                    O barbeiro acessa sem precisar de senha ou login. Funciona no celular.
                  </p>
                </div>

                {/* Todos os links */}
                <div className="card p-5 space-y-3">
                  <p className="text-dark-200 font-semibold text-sm">Todos os links da equipe</p>
                  <div className="space-y-2">
                    {barbeiros.map(b => (
                      <div key={b.id} className="flex items-center justify-between bg-dark-900 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-dark-700 rounded-full flex items-center justify-center text-xs font-bold text-gold-400">
                            {b.nome.charAt(0)}
                          </div>
                          <span className="text-dark-300 text-sm">{b.nome.split(' ')[0]}</span>
                        </div>
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/b/${getSlug(b)}`
                            navigator.clipboard.writeText(link)
                          }}
                          className="text-dark-600 hover:text-gold-400 transition-colors text-xs flex items-center gap-1">
                          <Copy className="w-3 h-3" /> /b/{getSlug(b)}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
