'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { formatCurrency, cn } from '@/lib/utils'
import { CheckCircle, ChevronDown, ChevronUp, Zap, DollarSign, Scissors, Package, Star } from 'lucide-react'

interface LinhaBarbeiro {
  id: string
  nome: string
  foto: string
  servicos: number
  extras: number
  produtos: number
  atendimentos: number
  aberto: boolean
}

export default function FechamentoDiario() {
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [barbeiros, setBarbeiros] = useState<LinhaBarbeiro[]>([])
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => { carregarBarbeiros() }, [])

  async function carregarBarbeiros() {
    const { data: barbs } = await supabase
      .from('barbeiros').select('id, nome').eq('ativo', true).order('nome')
    setBarbeiros((barbs ?? []).map(b => ({
      id: b.id, nome: b.nome,
      foto: b.nome.charAt(0).toUpperCase(),
      servicos: 0, extras: 0, produtos: 0, atendimentos: 0,
      aberto: true,
    })))
  }

  function atualizar(id: string, campo: keyof LinhaBarbeiro, valor: number) {
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, [campo]: valor } : b))
  }

  function toggleAberto(id: string) {
    setBarbeiros(prev => prev.map(b => b.id === id ? { ...b, aberto: !b.aberto } : b))
  }

  const totais = barbeiros.reduce((acc, b) => ({
    servicos:     acc.servicos     + b.servicos,
    extras:       acc.extras       + b.extras,
    produtos:     acc.produtos     + b.produtos,
    atendimentos: acc.atendimentos + b.atendimentos,
    total:        acc.total        + b.servicos + b.extras + b.produtos,
  }), { servicos: 0, extras: 0, produtos: 0, atendimentos: 0, total: 0 })

  async function salvar() {
    const temDados = barbeiros.some(b => b.servicos > 0 || b.extras > 0 || b.produtos > 0)
    if (!temDados) return setErro('Preencha pelo menos um valor antes de salvar.')
    setErro('')
    setSalvando(true)

    try {
      for (const b of barbeiros) {
        if (b.servicos === 0 && b.extras === 0 && b.produtos === 0) continue

        const total = b.servicos + b.extras + b.produtos
        const { data: barbData } = await supabase
          .from('barbeiros')
          .select('comissao_servico, comissao_produto, comissao_extra')
          .eq('id', b.id).single()

        const comissao = barbData
          ? (b.servicos * (barbData.comissao_servico / 100))
          + (b.extras   * (barbData.comissao_extra   / 100))
          + (b.produtos * (barbData.comissao_produto  / 100))
          : total * 0.5

        await supabase.from('comandas').insert({
          barbeiro_id: b.id,
          status: 'fechada',
          data_atendimento: data + 'T12:00:00',
          subtotal_servicos: b.servicos,
          subtotal_extras: b.extras,
          subtotal_produtos: b.produtos,
          total,
          comissao_barbeiro: Math.round(comissao * 100) / 100,
          forma_pagamento: 'pix',
          origem: 'manual',
          observacoes: `Fechamento diário — ${b.atendimentos} atendimentos`,
        })
      }

      setSucesso(true)
      setTimeout(() => {
        setSucesso(false)
        // Resetar valores
        setBarbeiros(prev => prev.map(b => ({ ...b, servicos: 0, extras: 0, produtos: 0, atendimentos: 0 })))
      }, 3000)
    } catch (e: any) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header titulo="Fechamento do Dia" subtitulo="Lance os números rapidinho" />
        <main className="p-4 lg:p-6 space-y-4 max-w-2xl mx-auto">

          {/* Data */}
          <div className="card p-4 flex items-center gap-4">
            <label className="label mb-0 whitespace-nowrap">Data do fechamento</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="input"
            />
          </div>

          {/* Totais do dia */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Serviços',     valor: totais.servicos,     icon: Scissors,   cor: 'text-gold-400' },
              { label: 'Extras',       valor: totais.extras,       icon: Star,       cor: 'text-emerald-400' },
              { label: 'Produtos',     valor: totais.produtos,     icon: Package,    cor: 'text-blue-400' },
              { label: 'Total do Dia', valor: totais.total,        icon: DollarSign, cor: 'text-gold-400', destaque: true },
            ].map(k => (
              <div key={k.label} className={cn('card p-4 text-center', k.destaque && 'border-gold-500/30')}>
                <k.icon className={cn('w-4 h-4 mx-auto mb-1', k.cor)} />
                <p className={cn('text-lg font-bold', k.cor)}>{formatCurrency(k.valor)}</p>
                <p className="text-dark-600 text-xs">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Mensagens */}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              ✗ {erro}
            </div>
          )}
          {sucesso && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Fechamento salvo! Dashboard atualizado. ✓
            </div>
          )}

          {/* Barbeiros */}
          <div className="space-y-3">
            {barbeiros.map(b => {
              const totalB = b.servicos + b.extras + b.produtos
              return (
                <div key={b.id} className={cn(
                  'card overflow-hidden transition-all',
                  totalB > 0 && 'border-gold-500/20'
                )}>
                  {/* Header do barbeiro */}
                  <button
                    onClick={() => toggleAberto(b.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-dark-700/30 transition-colors"
                  >
                    <div className="w-9 h-9 bg-dark-700 rounded-full flex items-center justify-center text-sm font-bold text-gold-400 flex-shrink-0">
                      {b.foto}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-dark-100 font-semibold text-sm">{b.nome}</p>
                      {totalB > 0 && (
                        <p className="text-gold-400 text-xs">{formatCurrency(totalB)} · {b.atendimentos} atend.</p>
                      )}
                      {totalB === 0 && (
                        <p className="text-dark-600 text-xs">Clique para lançar</p>
                      )}
                    </div>
                    {totalB > 0 && (
                      <span className="badge-gold">{formatCurrency(totalB)}</span>
                    )}
                    {b.aberto
                      ? <ChevronUp className="w-4 h-4 text-dark-500" />
                      : <ChevronDown className="w-4 h-4 text-dark-500" />
                    }
                  </button>

                  {/* Campos */}
                  {b.aberto && (
                    <div className="px-4 pb-4 space-y-3 border-t border-dark-700/50 pt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label flex items-center gap-1">
                            <Scissors className="w-3 h-3" /> Serviços (R$)
                          </label>
                          <input
                            type="number"
                            value={b.servicos || ''}
                            onChange={e => atualizar(b.id, 'servicos', +e.target.value || 0)}
                            placeholder="0,00"
                            className="input text-right font-semibold"
                            min="0" step="0.50"
                          />
                        </div>
                        <div>
                          <label className="label flex items-center gap-1">
                            <Star className="w-3 h-3" /> Extras (R$)
                          </label>
                          <input
                            type="number"
                            value={b.extras || ''}
                            onChange={e => atualizar(b.id, 'extras', +e.target.value || 0)}
                            placeholder="0,00"
                            className="input text-right font-semibold"
                            min="0" step="0.50"
                          />
                        </div>
                        <div>
                          <label className="label flex items-center gap-1">
                            <Package className="w-3 h-3" /> Produtos (R$)
                          </label>
                          <input
                            type="number"
                            value={b.produtos || ''}
                            onChange={e => atualizar(b.id, 'produtos', +e.target.value || 0)}
                            placeholder="0,00"
                            className="input text-right font-semibold"
                            min="0" step="0.50"
                          />
                        </div>
                        <div>
                          <label className="label flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Atendimentos
                          </label>
                          <input
                            type="number"
                            value={b.atendimentos || ''}
                            onChange={e => atualizar(b.id, 'atendimentos', +e.target.value || 0)}
                            placeholder="0"
                            className="input text-right font-semibold"
                            min="0"
                          />
                        </div>
                      </div>
                      {totalB > 0 && (
                        <div className="bg-dark-900 rounded-xl px-4 py-2 flex justify-between items-center">
                          <span className="text-dark-500 text-xs">Total {b.nome.split(' ')[0]}</span>
                          <span className="text-gold-400 font-bold">{formatCurrency(totalB)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Botão salvar */}
          <button
            onClick={salvar}
            disabled={salvando || totais.total === 0}
            className="btn-gold w-full py-4 flex items-center justify-center gap-2 text-base sticky bottom-4 shadow-gold-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {salvando ? (
              <><span className="w-5 h-5 border-2 border-dark-800 border-t-transparent rounded-full animate-spin" /> Salvando...</>
            ) : (
              <><CheckCircle className="w-5 h-5" /> Salvar Fechamento — {formatCurrency(totais.total)}</>
            )}
          </button>

          <p className="text-center text-dark-600 text-xs pb-4">
            Após salvar, os dados aparecem automaticamente no dashboard
          </p>
        </main>
      </div>
    </div>
  )
}
