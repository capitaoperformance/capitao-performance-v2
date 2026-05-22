'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { formatDate } from '@/lib/utils'
import { MessageSquare, UserX, AlertCircle, Clock, CheckCircle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RecepcaoPage() {
  const [clientesRetorno, setClientesRetorno] = useState<any[]>([])
  const [assinantesRisco, setAssinantesRisco] = useState<any[]>([])
  const [followups, setFollowups] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'retorno' | 'assinantes' | 'followups'>('retorno')

  useEffect(() => { carregarDados() }, [])

  async function carregarDados() {
    setCarregando(true)
    try {
      // Clientes para retorno (>20 dias sem visita)
      const { data: retorno } = await supabase
        .from('v_clientes_recuperacao')
        .select('*')
        .limit(50)
      setClientesRetorno(retorno ?? [])

      // Assinantes em risco (status ativo mas sem uso recente)
      const { data: assinantes } = await supabase
        .from('assinaturas')
        .select(`*, cliente:clientes(nome, telefone, ultima_visita), plano:planos(nome)`)
        .eq('status', 'ativo')
        .order('criado_em')
        .limit(30)

      // Filtrar assinantes que não usaram nos últimos 15 dias
      const hoje = new Date()
      const emRisco = (assinantes ?? []).filter(a => {
        const ultima = a.cliente?.ultima_visita
        if (!ultima) return true
        const dias = (hoje.getTime() - new Date(ultima).getTime()) / (1000 * 60 * 60 * 24)
        return dias > 15
      })
      setAssinantesRisco(emRisco)

      // Follow-ups pendentes
      const { data: fu } = await supabase
        .from('followups')
        .select(`*, cliente:clientes(nome, telefone)`)
        .eq('status', 'pendente')
        .order('data_agendada', { ascending: true })
        .limit(30)
      setFollowups(fu ?? [])
    } finally {
      setCarregando(false)
    }
  }

  async function marcarEnviado(followupId: string) {
    await supabase.from('followups').update({ status: 'enviado', data_enviada: new Date().toISOString() }).eq('id', followupId)
    carregarDados()
  }

  async function criarFollowup(clienteId: string, tipo: string, mensagem: string) {
    await supabase.from('followups').insert({
      cliente_id: clienteId,
      tipo, mensagem,
      canal: 'whatsapp',
      status: 'pendente',
    })
    carregarDados()
  }

  const tabs = [
    { key: 'retorno',    label: 'Retorno', count: clientesRetorno.length,   icon: UserX },
    { key: 'assinantes', label: 'Assinantes em Risco', count: assinantesRisco.length, icon: AlertCircle },
    { key: 'followups',  label: 'Follow-ups', count: followups.length,      icon: Clock },
  ] as const

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar role="recepcao" />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-5">
          {/* KPI rápido */}
          <div className="grid grid-cols-3 gap-3">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setAbaAtiva(t.key)}
                className={cn('card p-4 flex flex-col items-center gap-2 transition-all hover:shadow-gold',
                  abaAtiva === t.key && 'border-gold-500/30 bg-gold-500/5')}>
                <t.icon className={cn('w-5 h-5', abaAtiva === t.key ? 'text-gold-400' : 'text-dark-500')} />
                <span className={cn('text-2xl font-bold', abaAtiva === t.key ? 'text-gold-400' : 'text-dark-200')}>
                  {t.count}
                </span>
                <span className="text-dark-500 text-xs text-center">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Clientes para retorno */}
          {abaAtiva === 'retorno' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2">
                <UserX className="w-4 h-4 text-amber-400" />
                <h3 className="text-dark-200 font-semibold text-sm">Clientes sem visita há mais de 20 dias</h3>
              </div>
              <div className="divide-y divide-dark-700/50">
                {clientesRetorno.map(c => (
                  <div key={c.id} className="px-5 py-4 flex items-center justify-between hover:bg-dark-700/20 transition-colors">
                    <div>
                      <p className="text-dark-100 font-medium text-sm">{c.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-dark-500 text-xs">{c.telefone}</p>
                        <span className={cn('text-xs font-medium', c.dias_sem_visita > 40 ? 'text-red-400' : 'text-amber-400')}>
                          {Math.round(c.dias_sem_visita)} dias sem visita
                        </span>
                        {c.barbeiro_preferido && <span className="text-dark-600 text-xs">Prefere: {c.barbeiro_preferido}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const msg = `Olá ${c.nome}! Faz ${Math.round(c.dias_sem_visita)} dias que não te vemos no Capitão Barbers Club. Que tal agendar e renovar o visual? 💈`
                          criarFollowup(c.id, 'retorno', msg)
                          window.open(`https://wa.me/55${c.telefone?.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 transition-colors">
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
                {clientesRetorno.length === 0 && !carregando && (
                  <div className="py-12 text-center text-dark-500 text-sm">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                    Todos os clientes estão em dia! ✓
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assinantes em risco */}
          {abaAtiva === 'assinantes' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-dark-200 font-semibold text-sm">Assinantes em risco de cancelamento</h3>
              </div>
              <div className="divide-y divide-dark-700/50">
                {assinantesRisco.map(a => (
                  <div key={a.id} className="px-5 py-4 flex items-center justify-between hover:bg-dark-700/20">
                    <div>
                      <p className="text-dark-100 font-medium text-sm">{a.cliente?.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-dark-500 text-xs">{a.cliente?.telefone}</p>
                        <span className="badge-gold">{a.plano?.nome}</span>
                        {a.cliente?.ultima_visita && (
                          <span className="text-dark-600 text-xs">Última visita: {formatDate(a.cliente.ultima_visita)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const msg = `Oi ${a.cliente?.nome}! Vimos que você ainda não usou todos os serviços do seu plano ${a.plano?.nome} esse mês. Não deixa passar! 💈`
                        criarFollowup(a.cliente_id, 'assinante_risco', msg)
                        window.open(`https://wa.me/55${a.cliente?.telefone?.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs hover:bg-amber-500/20 transition-colors">
                      <Send className="w-3 h-3" /> Contatar
                    </button>
                  </div>
                ))}
                {assinantesRisco.length === 0 && !carregando && (
                  <div className="py-12 text-center text-dark-500 text-sm">Nenhum assinante em risco</div>
                )}
              </div>
            </div>
          )}

          {/* Follow-ups */}
          {abaAtiva === 'followups' && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-400" />
                <h3 className="text-dark-200 font-semibold text-sm">Follow-ups pendentes</h3>
              </div>
              <div className="divide-y divide-dark-700/50">
                {followups.map(f => (
                  <div key={f.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-dark-700/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-dark-100 font-medium text-sm">{f.cliente?.nome}</p>
                        <span className="badge-amarelo capitalize">{f.tipo.replace('_', ' ')}</span>
                      </div>
                      {f.mensagem && (
                        <p className="text-dark-500 text-xs mt-1 truncate">{f.mensagem}</p>
                      )}
                      <p className="text-dark-600 text-xs mt-0.5">{f.cliente?.telefone}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => f.cliente?.telefone && window.open(`https://wa.me/55${f.cliente.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(f.mensagem ?? '')}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/20 transition-colors">
                        <MessageSquare className="w-3 h-3" /> WA
                      </button>
                      <button onClick={() => marcarEnviado(f.id)}
                        className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-emerald-400 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {followups.length === 0 && !carregando && (
                  <div className="py-12 text-center text-dark-500 text-sm">Nenhum follow-up pendente</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
