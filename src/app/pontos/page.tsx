'use client'

import { useState, useEffect } from 'react'
import { supabase, getInicioMes, getFimMes, getMesAtual } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { getMesNome } from '@/lib/utils'
import { Star, Trophy, Medal, Save, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const SERVICOPADRAO = [
  { nome: 'Corte Avulso',      pontos: 10 },
  { nome: 'Corte Assinatura',  pontos: 8  },
  { nome: 'Barba',             pontos: 6  },
  { nome: 'Corte + Barba',     pontos: 15 },
  { nome: 'Extra / Add-on',    pontos: 5  },
  { nome: 'Produto Vendido',   pontos: 8  },
  { nome: 'Hidratação',        pontos: 6  },
  { nome: 'Pigmentação',       pontos: 10 },
]

export default function PontosPage() {
  const [config, setConfig] = useState(SERVICOPADRAO)
  const [ranking, setRanking] = useState<any[]>([])
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const { mes, ano } = getMesAtual()

  useEffect(() => { carregarRanking() }, [])

  async function carregarRanking() {
    const inicio = getInicioMes(mes, ano)
    const fim    = getFimMes(mes, ano)
    const { data: barbs } = await supabase.from('barbeiros').select('id, nome').eq('ativo', true)
    const result = await Promise.all((barbs ?? []).map(async b => {
      const { data: cmds } = await supabase
        .from('comandas').select('subtotal_servicos, subtotal_extras, subtotal_produtos, total')
        .eq('barbeiro_id', b.id).eq('status', 'fechada')
        .gte('data_atendimento', inicio).lte('data_atendimento', fim)
      // Calcular pontos simples: R$10 = 1 ponto
      const fat = (cmds ?? []).reduce((s, c) => s + (c.total || 0), 0)
      const pontos = Math.floor(fat / 10)
      return { id: b.id, nome: b.nome, fat, pontos }
    }))
    setRanking(result.sort((a, b) => b.pontos - a.pontos))
  }

  function atualizarPontos(i: number, val: number) {
    setConfig(prev => prev.map((s, idx) => idx === i ? { ...s, pontos: val } : s))
  }

  async function salvar() {
    setSalvando(true)
    // Salvar configuração no banco (em mensagem_modelos como JSON)
    await supabase.from('mensagem_modelos').upsert({
      tipo: 'config_pontos',
      titulo: 'Configuração de Pontos',
      corpo: JSON.stringify(config),
    }, { onConflict: 'tipo' })
    setSucesso(true)
    setTimeout(() => setSucesso(false), 2000)
    setSalvando(false)
  }

  const medalhas = ['🥇', '🥈', '🥉']
  const maxPontos = Math.max(...ranking.map(r => r.pontos), 1)

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header titulo="Campanha de Pontos" subtitulo="Gamificação da equipe" />
        <main className="p-4 lg:p-6 space-y-5">

          {/* Ranking de pontos */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold-400" />
              <h3 className="text-dark-200 font-semibold text-sm">Ranking de Pontos — {getMesNome(mes)} {ano}</h3>
            </div>
            <div className="space-y-3">
              {ranking.map((b, i) => (
                <div key={b.id} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl',
                  i === 0 ? 'bg-gold-500/8 border border-gold-500/20' : 'bg-dark-900'
                )}>
                  <span className="text-lg w-6 text-center">{medalhas[i] ?? `${i+1}º`}</span>
                  <div className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center text-xs font-bold text-gold-400">
                    {b.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-dark-100 text-sm font-medium">{b.nome.split(' ')[0]}</p>
                    <div className="h-1.5 bg-dark-700 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-gold-gradient rounded-full transition-all duration-700"
                        style={{ width: `${(b.pontos / maxPontos) * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gold-400 font-bold text-sm">{b.pontos} pts</p>
                    <p className="text-dark-600 text-xs">R${Math.round(b.fat)}</p>
                  </div>
                </div>
              ))}
              {ranking.length === 0 && (
                <p className="text-dark-500 text-sm text-center py-4">Nenhum dado ainda. Lance comandas primeiro!</p>
              )}
            </div>
            <div className="bg-dark-900 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-dark-500 mt-0.5 flex-shrink-0" />
                <p className="text-dark-600 text-xs">Pontuação calculada automaticamente: R$10 faturado = 1 ponto. Configure os valores por serviço abaixo.</p>
              </div>
            </div>
          </div>

          {/* Configuração de pontos */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gold-400" />
              <h3 className="text-dark-200 font-semibold text-sm">Pontos por Serviço</h3>
            </div>
            <div className="space-y-3">
              {config.map((s, i) => (
                <div key={s.nome} className="flex items-center justify-between gap-4 p-3 bg-dark-900 rounded-xl">
                  <div className="flex items-center gap-2 flex-1">
                    <Star className="w-3.5 h-3.5 text-gold-400 flex-shrink-0" />
                    <span className="text-dark-200 text-sm">{s.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => atualizarPontos(i, Math.max(0, s.pontos - 1))}
                      className="w-7 h-7 rounded-lg bg-dark-700 text-dark-300 flex items-center justify-center hover:bg-dark-600 transition-colors text-sm">−</button>
                    <span className="text-gold-400 font-bold w-8 text-center">{s.pontos}</span>
                    <button onClick={() => atualizarPontos(i, s.pontos + 1)}
                      className="w-7 h-7 rounded-lg bg-dark-700 text-dark-300 flex items-center justify-center hover:bg-dark-600 transition-colors text-sm">+</button>
                    <span className="text-dark-600 text-xs w-8">pts</span>
                  </div>
                </div>
              ))}
            </div>
            {sucesso && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-2 text-sm">
                ✓ Configuração salva!
              </div>
            )}
            <button onClick={salvar} disabled={salvando} className="btn-gold flex items-center gap-2">
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
