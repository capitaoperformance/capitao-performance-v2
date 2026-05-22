'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Plus, Edit2, Power } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { Servico } from '@/types'

const defaultForm = { nome: '', descricao: '', preco: 0, duracao_minutos: 30, categoria: 'servico' as 'servico' | 'extra' }

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [form, setForm] = useState(defaultForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await supabase.from('servicos').select('*').order('categoria').order('nome')
    setServicos(data ?? [])
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Nome obrigatório')
    setSalvando(true)
    try {
      if (editId) {
        await supabase.from('servicos').update(form).eq('id', editId)
      } else {
        await supabase.from('servicos').insert({ ...form, ativo: true })
      }
      setForm(defaultForm); setEditId(null); setShowForm(false)
      carregar()
    } finally { setSalvando(false) }
  }

  async function toggleAtivo(s: Servico) {
    await supabase.from('servicos').update({ ativo: !s.ativo }).eq('id', s.id)
    carregar()
  }

  const servicos_ = servicos.filter(s => s.categoria === 'servico')
  const extras_ = servicos.filter(s => s.categoria === 'extra')

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-5">
          <div className="flex justify-between items-center">
            <p className="text-dark-400 text-sm">{servicos.filter(s => s.ativo).length} ativos</p>
            <button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true) }} className="btn-gold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Serviço
            </button>
          </div>

          {showForm && (
            <div className="card p-6 border-gold-500/20 space-y-4">
              <h3 className="text-gold-400 font-semibold text-sm">{editId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2"><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="input" placeholder="Ex: Corte Clássico" /></div>
                <div>
                  <label className="label">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value as any }))} className="input">
                    <option value="servico">Serviço</option>
                    <option value="extra">Extra / Add-on</option>
                  </select>
                </div>
                <div><label className="label">Preço (R$) *</label><input type="number" value={form.preco || ''} onChange={e => setForm(p => ({ ...p, preco: +e.target.value }))} className="input" min="0" step="0.50" /></div>
                <div><label className="label">Duração (min)</label><input type="number" value={form.duracao_minutos} onChange={e => setForm(p => ({ ...p, duracao_minutos: +e.target.value }))} className="input" min="5" step="5" /></div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="label">Descrição</label><input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} className="input" /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={salvar} disabled={salvando} className="btn-gold">{salvando ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}</button>
                <button onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
              </div>
            </div>
          )}

          {[{ titulo: 'Serviços', lista: servicos_ }, { titulo: 'Extras / Add-ons', lista: extras_ }].map(grupo => (
            <div key={grupo.titulo}>
              <h3 className="text-dark-400 text-xs font-medium uppercase tracking-wider mb-3">{grupo.titulo}</h3>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-dark-700 bg-dark-900/40">
                    {['Serviço','Preço','Duração','Status','Ações'].map(h => (
                      <th key={h} className="table-head text-left px-5 py-3">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {grupo.lista.map(s => (
                      <tr key={s.id} className={cn('table-row', !s.ativo && 'opacity-50')}>
                        <td className="px-5 py-3">
                          <p className="text-dark-100 text-sm font-medium">{s.nome}</p>
                          {s.descricao && <p className="text-dark-500 text-xs">{s.descricao}</p>}
                        </td>
                        <td className="px-5 py-3 text-gold-400 font-bold text-sm">{formatCurrency(s.preco)}</td>
                        <td className="px-5 py-3 text-dark-400 text-sm">{s.duracao_minutos} min</td>
                        <td className="px-5 py-3"><span className={s.ativo ? 'badge-verde' : 'badge-vermelho'}>{s.ativo ? 'Ativo' : 'Inativo'}</span></td>
                        <td className="px-5 py-3 flex items-center gap-1">
                          <button onClick={() => { setForm({ nome: s.nome, descricao: s.descricao ?? '', preco: s.preco, duracao_minutos: s.duracao_minutos, categoria: s.categoria }); setEditId(s.id); setShowForm(true) }} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => toggleAtivo(s)} className={cn('p-1.5 rounded-lg transition-colors', s.ativo ? 'text-dark-500 hover:text-red-400 hover:bg-dark-700' : 'text-emerald-400')}><Power className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {grupo.lista.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-dark-500 text-sm">Nenhum {grupo.titulo.toLowerCase()} cadastrado</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
