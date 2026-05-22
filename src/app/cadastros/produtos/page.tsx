'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Plus, Edit2, Power } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { Produto } from '@/types'

const defaultForm = { nome: '', descricao: '', preco_venda: 0, preco_custo: 0, estoque: 0, categoria: '' }

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState(defaultForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    setProdutos(data ?? [])
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Nome obrigatório')
    if (!form.preco_venda) return alert('Preço de venda obrigatório')
    setSalvando(true)
    try {
      if (editId) {
        await supabase.from('produtos').update(form).eq('id', editId)
      } else {
        await supabase.from('produtos').insert({ ...form, ativo: true })
      }
      setForm(defaultForm); setEditId(null); setShowForm(false)
      carregar()
    } finally { setSalvando(false) }
  }

  async function toggleAtivo(p: Produto) {
    await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id)
    carregar()
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-5">
          <div className="flex justify-between items-center">
            <p className="text-dark-400 text-sm">{produtos.filter(p => p.ativo).length} ativos</p>
            <button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true) }} className="btn-gold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>

          {showForm && (
            <div className="card p-6 border-gold-500/20 space-y-4">
              <h3 className="text-gold-400 font-semibold text-sm">{editId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2"><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="input" placeholder="Ex: Pomada Matte 120g" /></div>
                <div><label className="label">Categoria</label><input value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))} className="input" placeholder="Ex: Finalizadores" /></div>
                <div><label className="label">Preço de Venda *</label><input type="number" value={form.preco_venda || ''} onChange={e => setForm(p => ({ ...p, preco_venda: +e.target.value }))} className="input" min="0" step="0.50" /></div>
                <div><label className="label">Preço de Custo</label><input type="number" value={form.preco_custo || ''} onChange={e => setForm(p => ({ ...p, preco_custo: +e.target.value }))} className="input" min="0" step="0.50" /></div>
                <div><label className="label">Estoque</label><input type="number" value={form.estoque || ''} onChange={e => setForm(p => ({ ...p, estoque: +e.target.value }))} className="input" min="0" /></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="label">Descrição</label><input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} className="input" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={salvar} disabled={salvando} className="btn-gold">{salvando ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}</button>
                <button onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.map(p => (
              <div key={p.id} className={cn('card p-5 space-y-3', !p.ativo && 'opacity-50')}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-dark-100 font-semibold text-sm">{p.nome}</p>
                    {p.categoria && <p className="text-dark-500 text-xs mt-0.5">{p.categoria}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setForm({ nome: p.nome, descricao: p.descricao ?? '', preco_venda: p.preco_venda, preco_custo: p.preco_custo ?? 0, estoque: p.estoque, categoria: p.categoria ?? '' }); setEditId(p.id); setShowForm(true) }} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleAtivo(p)} className={cn('p-1.5 rounded-lg transition-colors', p.ativo ? 'text-dark-500 hover:text-red-400 hover:bg-dark-700' : 'text-emerald-400')}><Power className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-dark-900 rounded-lg py-2">
                    <p className="text-gold-400 font-bold text-sm">{formatCurrency(p.preco_venda)}</p>
                    <p className="text-dark-600 text-xs">Venda</p>
                  </div>
                  <div className="bg-dark-900 rounded-lg py-2">
                    <p className="text-dark-300 font-bold text-sm">{formatCurrency(p.preco_custo ?? 0)}</p>
                    <p className="text-dark-600 text-xs">Custo</p>
                  </div>
                  <div className="bg-dark-900 rounded-lg py-2">
                    <p className={cn('font-bold text-sm', p.estoque <= 3 ? 'text-red-400' : 'text-dark-300')}>{p.estoque}</p>
                    <p className="text-dark-600 text-xs">Estoque</p>
                  </div>
                </div>
                <span className={p.ativo ? 'badge-verde' : 'badge-vermelho'}>{p.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
            ))}
            {produtos.length === 0 && <p className="text-dark-500 text-sm col-span-3 text-center py-8">Nenhum produto cadastrado</p>}
          </div>
        </main>
      </div>
    </div>
  )
}
