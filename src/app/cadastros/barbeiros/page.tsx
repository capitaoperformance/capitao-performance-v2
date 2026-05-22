'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Plus, Edit2, Power } from 'lucide-react'
import type { Barbeiro } from '@/types'
import { cn } from '@/lib/utils'

const defaultForm = {
  nome: '', apelido: '', telefone: '', email: '',
  comissao_servico: 50, comissao_produto: 10, comissao_extra: 50,
  data_admissao: new Date().toISOString().split('T')[0],
}

export default function BarbeirosPage() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [form, setForm] = useState(defaultForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data, error } = await supabase.from('barbeiros').select('*').order('nome')
    if (error) setErro('Erro ao carregar: ' + error.message)
    setBarbeiros(data ?? [])
  }

  async function salvar() {
    if (!form.nome.trim()) return setErro('Nome é obrigatório')
    setErro('')
    setSalvando(true)
    try {
      if (editId) {
        const { error } = await supabase.from('barbeiros').update({ ...form }).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('barbeiros').insert({ ...form, ativo: true })
        if (error) throw error
      }
      setForm(defaultForm)
      setEditId(null)
      setShowForm(false)
      setSucesso('Barbeiro salvo com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
      carregar()
    } catch (err: any) {
      setErro('Erro ao salvar: ' + (err.message ?? JSON.stringify(err)))
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(b: Barbeiro) {
    const { error } = await supabase.from('barbeiros').update({ ativo: !b.ativo }).eq('id', b.id)
    if (error) setErro('Erro: ' + error.message)
    else carregar()
  }

  function editar(b: Barbeiro) {
    setErro('')
    setForm({
      nome: b.nome, apelido: b.apelido ?? '', telefone: b.telefone ?? '',
      email: b.email ?? '', comissao_servico: b.comissao_servico,
      comissao_produto: b.comissao_produto, comissao_extra: b.comissao_extra,
      data_admissao: b.data_admissao,
    })
    setEditId(b.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 space-y-5">

          {/* Mensagens */}
          {sucesso && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm">
              ✓ {sucesso}
            </div>
          )}
          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              ✗ {erro}
            </div>
          )}

          {/* Botão novo */}
          <div className="flex items-center justify-between">
            <p className="text-dark-400 text-sm">
              {barbeiros.filter(b => b.ativo).length} ativos · {barbeiros.length} total
            </p>
            <button
              onClick={() => { setForm(defaultForm); setEditId(null); setErro(''); setShowForm(true) }}
              className="btn-gold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Barbeiro
            </button>
          </div>

          {/* Formulário */}
          {showForm && (
            <div className="card p-6 border-gold-500/20 space-y-5">
              <h3 className="text-gold-400 font-semibold text-sm">
                {editId ? 'Editar Barbeiro' : 'Cadastrar Novo Barbeiro'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="label">Nome Completo *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: João Silva"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Apelido</label>
                  <input
                    type="text"
                    value={form.apelido}
                    onChange={e => setForm(p => ({ ...p, apelido: e.target.value }))}
                    placeholder="Ex: João"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input
                    type="tel"
                    value={form.telefone}
                    onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="joao@email.com"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Data de Admissão</label>
                  <input
                    type="date"
                    value={form.data_admissao}
                    onChange={e => setForm(p => ({ ...p, data_admissao: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <p className="text-dark-400 text-xs uppercase tracking-wider mb-4">Comissões (%)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Serviços</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.comissao_servico}
                        onChange={e => setForm(p => ({ ...p, comissao_servico: +e.target.value }))}
                        className="input pr-8" min="0" max="100" step="0.5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="label">Produtos</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.comissao_produto}
                        onChange={e => setForm(p => ({ ...p, comissao_produto: +e.target.value }))}
                        className="input pr-8" min="0" max="100" step="0.5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="label">Extras</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.comissao_extra}
                        onChange={e => setForm(p => ({ ...p, comissao_extra: +e.target.value }))}
                        className="input pr-8" min="0" max="100" step="0.5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? (
                    <><span className="w-4 h-4 border-2 border-dark-800 border-t-transparent rounded-full animate-spin" /> Salvando...</>
                  ) : editId ? 'Salvar Alterações' : 'Cadastrar Barbeiro'}
                </button>
                <button onClick={() => { setShowForm(false); setErro('') }} className="btn-outline">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de barbeiros */}
          {barbeiros.length === 0 && !showForm && (
            <div className="card p-10 text-center">
              <p className="text-dark-500 text-sm mb-3">Nenhum barbeiro cadastrado ainda</p>
              <button
                onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true) }}
                className="btn-gold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Cadastrar primeiro barbeiro
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbeiros.map(b => (
              <div key={b.id} className={cn('card p-5 space-y-4 transition-all', !b.ativo && 'opacity-50')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center text-gold-400 font-bold text-lg">
                      {b.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-dark-100 font-semibold text-sm">{b.nome}</p>
                      <p className="text-dark-500 text-xs">{b.telefone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => editar(b)}
                      className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleAtivo(b)}
                      className={cn('p-1.5 rounded-lg transition-colors',
                        b.ativo ? 'hover:bg-dark-700 text-dark-500 hover:text-red-400' : 'text-emerald-400 hover:bg-dark-700'
                      )}
                      title={b.ativo ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Serviços', value: b.comissao_servico },
                    { label: 'Produtos', value: b.comissao_produto },
                    { label: 'Extras',   value: b.comissao_extra },
                  ].map(c => (
                    <div key={c.label} className="bg-dark-900 rounded-lg py-2">
                      <p className="text-gold-400 font-bold text-sm">{c.value}%</p>
                      <p className="text-dark-600 text-xs">{c.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-dark-600 text-xs">
                    Desde {new Date(b.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span className={b.ativo ? 'badge-verde' : 'badge-vermelho'}>
                    {b.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
