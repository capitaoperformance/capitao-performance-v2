'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Plus, Trash2, CheckCircle, X, Search, ChevronDown } from 'lucide-react'
import type { Barbeiro, Cliente, Servico, Produto, Comanda } from '@/types'
import { cn } from '@/lib/utils'

interface ItemServico { servico_id: string; nome: string; preco: number; categoria: string }
interface ItemProduto  { produto_id: string; nome: string; preco_unitario: number; quantidade: number }

export default function ComandasPage() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [clientes,  setClientes]  = useState<Cliente[]>([])
  const [servicos,  setServicos]  = useState<Servico[]>([])
  const [produtos,  setProdutos]  = useState<Produto[]>([])
  const [comandas,  setComandas]  = useState<Comanda[]>([])

  // Form state
  const [barbeiroId, setBarbeiroId]   = useState('')
  const [clienteId,  setClienteId]    = useState('')
  const [clienteBusca, setClienteBusca] = useState('')
  const [pagamento,  setPagamento]    = useState('pix')
  const [desconto,   setDesconto]     = useState(0)
  const [observ,     setObserv]       = useState('')
  const [itensSvc,   setItensSvc]     = useState<ItemServico[]>([])
  const [itensProd,  setItensProd]    = useState<ItemProduto[]>([])
  const [salvando,   setSalvando]     = useState(false)
  const [sucesso,    setSucesso]      = useState(false)
  const [aba,        setAba]          = useState<'nova' | 'historico'>('nova')

  useEffect(() => {
    carregarBase()
    carregarComandas()
  }, [])

  async function carregarBase() {
    const [{ data: b }, { data: c }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('barbeiros').select('*').eq('ativo', true).order('nome'),
      supabase.from('clientes').select('*').eq('ativo', true).order('nome').limit(100),
      supabase.from('servicos').select('*').eq('ativo', true).order('categoria').order('nome'),
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
    ])
    setBarbeiros(b ?? [])
    setClientes(c ?? [])
    setServicos(s ?? [])
    setProdutos(p ?? [])
  }

  async function carregarComandas() {
    const { data } = await supabase
      .from('comandas')
      .select(`*, barbeiro:barbeiros(nome), cliente:clientes(nome)`)
      .order('criado_em', { ascending: false })
      .limit(30)
    setComandas(data as any ?? [])
  }

  function adicionarServico(svc: Servico) {
    if (itensSvc.find(i => i.servico_id === svc.id)) return
    setItensSvc(prev => [...prev, { servico_id: svc.id, nome: svc.nome, preco: svc.preco, categoria: svc.categoria }])
  }

  function adicionarProduto(prod: Produto) {
    const existe = itensProd.find(i => i.produto_id === prod.id)
    if (existe) {
      setItensProd(prev => prev.map(i => i.produto_id === prod.id ? { ...i, quantidade: i.quantidade + 1 } : i))
    } else {
      setItensProd(prev => [...prev, { produto_id: prod.id, nome: prod.nome, preco_unitario: prod.preco_venda, quantidade: 1 }])
    }
  }

  const subtotalSvc  = itensSvc.filter(i => i.categoria === 'servico').reduce((s, i) => s + i.preco, 0)
  const subtotalExt  = itensSvc.filter(i => i.categoria === 'extra').reduce((s, i) => s + i.preco, 0)
  const subtotalProd = itensProd.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const total        = subtotalSvc + subtotalExt + subtotalProd - desconto

  async function salvarComanda() {
    if (!barbeiroId) return alert('Selecione o barbeiro')
    if (itensSvc.length === 0 && itensProd.length === 0) return alert('Adicione pelo menos um serviço ou produto')
    setSalvando(true)
    try {
      // Inserir comanda
      const { data: comanda, error } = await supabase
        .from('comandas')
        .insert({
          barbeiro_id: barbeiroId,
          cliente_id: clienteId || null,
          status: 'fechada',
          forma_pagamento: pagamento,
          desconto,
          subtotal_servicos: subtotalSvc,
          subtotal_extras:   subtotalExt,
          subtotal_produtos: subtotalProd,
          total,
          observacoes: observ || null,
          origem: 'manual',
        })
        .select()
        .single()
      if (error) throw error

      // Inserir serviços
      if (itensSvc.length > 0) {
        await supabase.from('comanda_servicos').insert(
          itensSvc.map(i => ({ comanda_id: comanda.id, servico_id: i.servico_id, nome: i.nome, preco: i.preco, categoria: i.categoria }))
        )
      }
      // Inserir produtos
      if (itensProd.length > 0) {
        await supabase.from('comanda_produtos').insert(
          itensProd.map(i => ({ comanda_id: comanda.id, produto_id: i.produto_id, nome: i.nome, preco_unitario: i.preco_unitario, quantidade: i.quantidade, subtotal: i.preco_unitario * i.quantidade }))
        )
      }

      // Limpar form
      setBarbeiroId(''); setClienteId(''); setClienteBusca(''); setPagamento('pix')
      setDesconto(0); setObserv(''); setItensSvc([]); setItensProd([])
      setSucesso(true)
      carregarComandas()
      setTimeout(() => setSucesso(false), 3000)
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(clienteBusca.toLowerCase()) ||
    (c.telefone ?? '').includes(clienteBusca)
  )

  const clienteSelecionado = clientes.find(c => c.id === clienteId)

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6">
          {/* Abas */}
          <div className="flex gap-1 p-1 bg-dark-800 rounded-xl w-fit mb-6">
            {(['nova', 'historico'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)}
                className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all',
                  aba === a ? 'bg-dark-700 text-dark-100' : 'text-dark-500 hover:text-dark-300')}>
                {a === 'nova' ? '+ Nova Comanda' : 'Histórico'}
              </button>
            ))}
          </div>

          {sucesso && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 mb-4 text-sm">
              <CheckCircle className="w-4 h-4" /> Comanda salva com sucesso!
            </div>
          )}

          {aba === 'nova' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Coluna principal */}
              <div className="lg:col-span-2 space-y-5">
                {/* Barbeiro + Cliente */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-dark-200 font-semibold text-sm border-b border-dark-700 pb-3">Informações</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Barbeiro *</label>
                      <select value={barbeiroId} onChange={e => setBarbeiroId(e.target.value)} className="input">
                        <option value="">Selecione...</option>
                        {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Pagamento</label>
                      <select value={pagamento} onChange={e => setPagamento(e.target.value)} className="input">
                        {['pix','dinheiro','credito','debito','assinatura','cortesia'].map(p => (
                          <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Busca de cliente */}
                  <div>
                    <label className="label">Cliente</label>
                    {clienteSelecionado ? (
                      <div className="flex items-center justify-between bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5">
                        <div>
                          <p className="text-dark-100 text-sm font-medium">{clienteSelecionado.nome}</p>
                          <p className="text-dark-500 text-xs">{clienteSelecionado.telefone}</p>
                        </div>
                        <button onClick={() => { setClienteId(''); setClienteBusca('') }} className="text-dark-500 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                        <input
                          value={clienteBusca}
                          onChange={e => setClienteBusca(e.target.value)}
                          placeholder="Buscar por nome ou telefone..."
                          className="input pl-9"
                        />
                        {clienteBusca && (
                          <div className="absolute top-full left-0 right-0 z-20 bg-dark-800 border border-dark-700 rounded-xl mt-1 shadow-card max-h-48 overflow-y-auto">
                            {clientesFiltrados.slice(0, 8).map(c => (
                              <button key={c.id} onClick={() => { setClienteId(c.id); setClienteBusca('') }}
                                className="w-full text-left px-4 py-2.5 hover:bg-dark-700 transition-colors">
                                <p className="text-dark-100 text-sm">{c.nome}</p>
                                <p className="text-dark-500 text-xs">{c.telefone}</p>
                              </button>
                            ))}
                            {clientesFiltrados.length === 0 && (
                              <p className="px-4 py-3 text-dark-500 text-sm">Nenhum cliente encontrado</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Serviços */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-dark-200 font-semibold text-sm">Serviços & Extras</h3>
                  <div className="flex flex-wrap gap-2">
                    {servicos.filter(s => s.categoria === 'servico').map(s => (
                      <button key={s.id} onClick={() => adicionarServico(s)}
                        className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                          itensSvc.find(i => i.servico_id === s.id)
                            ? 'bg-gold-500/15 border-gold-500/40 text-gold-400'
                            : 'border-dark-600 text-dark-400 hover:border-dark-500 hover:text-dark-200')}>
                        {s.nome} · {formatCurrency(s.preco)}
                      </button>
                    ))}
                  </div>
                  {servicos.some(s => s.categoria === 'extra') && (
                    <>
                      <p className="text-dark-500 text-xs uppercase tracking-wider">Extras</p>
                      <div className="flex flex-wrap gap-2">
                        {servicos.filter(s => s.categoria === 'extra').map(s => (
                          <button key={s.id} onClick={() => adicionarServico(s)}
                            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                              itensSvc.find(i => i.servico_id === s.id)
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                : 'border-dark-600 text-dark-400 hover:border-dark-500 hover:text-dark-200')}>
                            ★ {s.nome} · {formatCurrency(s.preco)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {itensSvc.length > 0 && (
                    <div className="border-t border-dark-700 pt-3 space-y-2">
                      {itensSvc.map(i => (
                        <div key={i.servico_id} className="flex items-center justify-between text-sm">
                          <span className="text-dark-300">{i.nome}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-dark-100 font-medium">{formatCurrency(i.preco)}</span>
                            <button onClick={() => setItensSvc(prev => prev.filter(s => s.servico_id !== i.servico_id))}
                              className="text-dark-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Produtos */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-dark-200 font-semibold text-sm">Produtos</h3>
                  <div className="flex flex-wrap gap-2">
                    {produtos.map(p => (
                      <button key={p.id} onClick={() => adicionarProduto(p)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dark-600 text-dark-400 hover:border-dark-500 hover:text-dark-200 transition-all">
                        + {p.nome} · {formatCurrency(p.preco_venda)}
                      </button>
                    ))}
                  </div>
                  {itensProd.length > 0 && (
                    <div className="border-t border-dark-700 pt-3 space-y-2">
                      {itensProd.map(i => (
                        <div key={i.produto_id} className="flex items-center justify-between text-sm">
                          <span className="text-dark-300">{i.nome}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setItensProd(prev => prev.map(p => p.produto_id === i.produto_id ? { ...p, quantidade: Math.max(1, p.quantidade - 1) } : p))}
                                className="w-5 h-5 rounded bg-dark-700 text-dark-300 text-xs flex items-center justify-center hover:bg-dark-600">−</button>
                              <span className="text-dark-100 w-4 text-center font-medium">{i.quantidade}</span>
                              <button onClick={() => setItensProd(prev => prev.map(p => p.produto_id === i.produto_id ? { ...p, quantidade: p.quantidade + 1 } : p))}
                                className="w-5 h-5 rounded bg-dark-700 text-dark-300 text-xs flex items-center justify-center hover:bg-dark-600">+</button>
                            </div>
                            <span className="text-dark-100 font-medium w-16 text-right">{formatCurrency(i.preco_unitario * i.quantidade)}</span>
                            <button onClick={() => setItensProd(prev => prev.filter(p => p.produto_id !== i.produto_id))}
                              className="text-dark-600 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna lateral: Resumo */}
              <div className="space-y-4">
                <div className="card-gold p-5 space-y-4 sticky top-20">
                  <h3 className="text-gold-400 font-semibold text-sm">Resumo da Comanda</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-dark-400">
                      <span>Serviços</span><span>{formatCurrency(subtotalSvc)}</span>
                    </div>
                    <div className="flex justify-between text-dark-400">
                      <span>Extras</span><span>{formatCurrency(subtotalExt)}</span>
                    </div>
                    <div className="flex justify-between text-dark-400">
                      <span>Produtos</span><span>{formatCurrency(subtotalProd)}</span>
                    </div>
                    <div className="flex justify-between text-dark-400 items-center">
                      <span>Desconto</span>
                      <div className="flex items-center gap-1">
                        <span className="text-dark-500">R$</span>
                        <input type="number" value={desconto} onChange={e => setDesconto(+e.target.value)}
                          className="w-20 bg-dark-900 border border-dark-700 rounded-lg px-2 py-1 text-right text-dark-100 text-sm focus:outline-none focus:border-gold-500/50"
                          min="0" step="0.50" />
                      </div>
                    </div>
                    <div className="border-t border-dark-700 pt-2 flex justify-between text-dark-100 font-bold text-base">
                      <span>Total</span><span className="text-gradient-gold">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="label">Observações</label>
                    <textarea value={observ} onChange={e => setObserv(e.target.value)}
                      className="input resize-none" rows={3} placeholder="Observações opcionais..." />
                  </div>

                  <button
                    onClick={salvarComanda}
                    disabled={salvando || !barbeiroId || (itensSvc.length === 0 && itensProd.length === 0)}
                    className="btn-gold w-full flex items-center justify-center gap-2 py-3 disabled:opacity-40 disabled:cursor-not-allowed">
                    {salvando ? (
                      <><span className="w-4 h-4 border-2 border-dark-800 border-t-transparent rounded-full animate-spin" /> Salvando...</>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /> Fechar Comanda</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Histórico */}
          {aba === 'historico' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-900/40">
                      {['Data', 'Barbeiro', 'Cliente', 'Serviços', 'Produtos', 'Total', 'Pagamento', 'Status'].map(h => (
                        <th key={h} className="table-head text-left px-5 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comandas.map(c => (
                      <tr key={c.id} className="table-row">
                        <td className="px-5 py-3 text-dark-400 text-sm">
                          {new Date(c.data_atendimento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-5 py-3 text-dark-200 text-sm">{(c.barbeiro as any)?.nome ?? '—'}</td>
                        <td className="px-5 py-3 text-dark-300 text-sm">{(c.cliente as any)?.nome ?? <span className="text-dark-600">Avulso</span>}</td>
                        <td className="px-5 py-3 text-dark-300 text-sm">{formatCurrency(c.subtotal_servicos + c.subtotal_extras)}</td>
                        <td className="px-5 py-3 text-dark-300 text-sm">{formatCurrency(c.subtotal_produtos)}</td>
                        <td className="px-5 py-3 text-dark-100 font-bold text-sm">{formatCurrency(c.total)}</td>
                        <td className="px-5 py-3 text-dark-400 text-sm capitalize">{c.forma_pagamento}</td>
                        <td className="px-5 py-3">
                          <span className={c.status === 'fechada' ? 'badge-verde' : c.status === 'cancelada' ? 'badge-vermelho' : 'badge-amarelo'}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {comandas.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-12 text-dark-500">Nenhuma comanda registrada</td></tr>
                    )}
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
