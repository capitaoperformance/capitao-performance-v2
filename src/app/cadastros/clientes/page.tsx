'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Plus, Edit2, Search, Crown, User } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { Cliente, Barbeiro } from '@/types'

const defaultForm = {
  nome: '', telefone: '', email: '', data_nascimento: '',
  tipo: 'avulso' as 'avulso' | 'assinante',
  barbeiro_preferido_id: '', observacoes: '',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [form, setForm] = useState(defaultForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('barbeiros').select('*').eq('ativo', true).order('nome'),
    ])
    setClientes(c ?? [])
    setBarbeiros(b ?? [])
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Nome obrigatório')
    setSalvando(true)
    try {
      const payload = {
        ...form,
        barbeiro_preferido_id: form.barbeiro_preferido_id || null,
        data_nascimento: form.data_nascimento || null,
      }
      if (editId) {
        await supabase.from('clientes').update(payload).eq('id', editId)
      } else {
        await supabase.from('clientes').insert({ ...payload, ativo: true })
      }
      setForm(defaultForm); setEditId(null); setShowForm(false)
      carregar()
    } finally { setSalvando(false) }
  }

  function editar(c: Cliente) {
    setForm({
      nome: c.nome, telefone: c.telefone ?? '', email: c.email ?? '',
      data_nascimento: c.data_nascimento ?? '', tipo: c.tipo,
      barbeiro_preferido_id: c.barbeiro_preferido_id ?? '', observacoes: c.observacoes ?? '',
    })
    setEditId(c.id); setShowForm(true)
  }

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone ?? '').includes(busca)
  )

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar cliente..." className="input pl-9 w-64" />
            </div>
            <button onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true) }}
              className="btn-gold flex items-center gap-2">
              <Plus className="w-4 h-4" /> Novo Cliente
            </button>
          </div>

          {showForm && (
            <div className="card p-6 border-gold-500/20 space-y-4">
              <h3 className="text-gold-400 font-semibold text-sm">{editId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="label">Nome *</label><input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="input" placeholder="Nome completo" /></div>
                <div><label className="label">Telefone</label><input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} className="input" placeholder="(11) 99999-9999" /></div>
                <div><label className="label">Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input" placeholder="email@exemplo.com" /></div>
                <div><label className="label">Data de Nascimento</label><input type="date" value={form.data_nascimento} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))} className="input" /></div>
                <div>
                  <label className="label">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as any }))} className="input">
                    <option value="avulso">Avulso</option>
                    <option value="assinante">Assinante</option>
                  </select>
                </div>
                <div>
                  <label className="label">Barbeiro Preferido</label>
                  <select value={form.barbeiro_preferido_id} onChange={e => setForm(p => ({ ...p, barbeiro_preferido_id: e.target.value }))} className="input">
                    <option value="">Sem preferência</option>
                    {barbeiros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3"><label className="label">Observações</label><textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className="input resize-none" rows={2} /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={salvar} disabled={salvando} className="btn-gold flex items-center gap-2">{salvando ? 'Salvando...' : editId ? 'Salvar' : 'Cadastrar'}</button>
                <button onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-dark-700 flex items-center justify-between">
              <span className="text-dark-400 text-sm">{filtrados.length} clientes</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-dark-700 bg-dark-900/40">
                  {['Nome','Telefone','Tipo','Barbeiro Preferido','Última Visita','Visitas','Ações'].map(h => (
                    <th key={h} className="table-head text-left px-5 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtrados.map(c => (
                    <tr key={c.id} className="table-row">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-dark-300">{c.nome.charAt(0)}</div>
                          <span className="text-dark-100 text-sm font-medium">{c.nome}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-dark-400 text-sm">{c.telefone ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={c.tipo === 'assinante' ? 'badge-gold' : 'badge-amarelo'}>
                          {c.tipo === 'assinante' ? <><Crown className="w-3 h-3" /> Assinante</> : <><User className="w-3 h-3" /> Avulso</>}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-dark-400 text-sm">{barbeiros.find(b => b.id === c.barbeiro_preferido_id)?.nome ?? '—'}</td>
                      <td className="px-5 py-3 text-dark-400 text-sm">{c.ultima_visita ? formatDate(c.ultima_visita) : '—'}</td>
                      <td className="px-5 py-3 text-dark-300 text-sm">{c.total_visitas}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => editar(c)} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-dark-500">Nenhum cliente cadastrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
