'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { UserPlus, Shield, Scissors, PhoneCall, Crown, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const roles = [
  { value: 'gestor',   label: 'Gestor',    icon: Crown,     desc: 'Acesso total ao sistema', color: 'text-gold-400' },
  { value: 'barbeiro', label: 'Barbeiro',  icon: Scissors,  desc: 'Apenas seu dashboard',    color: 'text-blue-400' },
  { value: 'recepcao', label: 'Recepção',  icon: PhoneCall, desc: 'CRM e clientes',          color: 'text-emerald-400' },
]

export default function ConfiguracoesPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [form, setForm] = useState({ nome: '', email: '', role: 'barbeiro', senha: '' })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { carregarUsuarios() }, [])

  async function carregarUsuarios() {
    const { data } = await supabase.from('profiles').select('*').order('nome')
    setUsuarios(data ?? [])
  }

  async function criarUsuario() {
    if (!form.nome || !form.email || !form.senha) return alert('Preencha todos os campos')
    if (form.senha.length < 6) return alert('Senha mínima de 6 caracteres')
    setSalvando(true)
    try {
      // Criar usuário no Auth
      const { data, error } = await supabase.auth.admin?.createUser({
        email: form.email,
        password: form.senha,
        email_confirm: true,
      }) as any

      if (error) {
        // Se não tiver permissão admin, orientar o usuário
        alert('Para criar usuários, acesse o Supabase > Authentication > Users > Add user\n\nDepois volte aqui e cadastre o perfil manualmente.')
        setSalvando(false)
        return
      }

      // Inserir profile
      await supabase.from('profiles').insert({
        id: data.user.id,
        nome: form.nome,
        email: form.email,
        role: form.role,
      })

      // Se for barbeiro, criar registro na tabela barbeiros
      if (form.role === 'barbeiro') {
        await supabase.from('barbeiros').insert({
          profile_id: data.user.id,
          nome: form.nome,
          email: form.email,
          ativo: true,
        })
      }

      setSucesso(`Usuário ${form.nome} criado com sucesso!`)
      setForm({ nome: '', email: '', role: 'barbeiro', senha: '' })
      setShowForm(false)
      carregarUsuarios()
      setTimeout(() => setSucesso(''), 4000)
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function alterarRole(id: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    carregarUsuarios()
  }

  async function copiarInstrucoes() {
    const texto = `INSTRUÇÕES PARA CRIAR USUÁRIO NO SUPABASE:

1. Acesse https://app.supabase.com
2. Entre no projeto Capitão Performance
3. Clique em Authentication > Users
4. Clique em "Add user" > "Create new user"
5. Preencha o email e senha do usuário
6. Copie o UUID que aparece na lista
7. Vá em SQL Editor e cole:

INSERT INTO public.profiles (id, nome, email, role)
VALUES ('<UUID_AQUI>', 'Nome do Usuário', 'email@exemplo.com', 'barbeiro');

-- Para barbeiros, também adicione:
INSERT INTO public.barbeiros (profile_id, nome, email, ativo)
VALUES ('<UUID_AQUI>', 'Nome do Usuário', 'email@exemplo.com', true);`

    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header titulo="Configurações" subtitulo="Usuários e permissões" />
        <main className="p-4 lg:p-6 space-y-5">

          {sucesso && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm">
              ✓ {sucesso}
            </div>
          )}

          {/* Como criar usuários */}
          <div className="card-gold p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold-400" />
              <h3 className="text-gold-400 font-semibold text-sm">Como adicionar barbeiros e recepcionistas</h3>
            </div>
            <div className="space-y-3 text-sm text-dark-300">
              <div className="flex gap-3">
                <span className="w-5 h-5 bg-gold-500/20 text-gold-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                <p>Acesse <span className="text-gold-400">supabase.com</span> → seu projeto → <strong className="text-dark-100">Authentication → Users → Add user</strong></p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 bg-gold-500/20 text-gold-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                <p>Preencha o <strong className="text-dark-100">email e senha</strong> do usuário e clique em Create</p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 bg-gold-500/20 text-gold-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                <p>Copie o <strong className="text-dark-100">UUID</strong> do usuário criado</p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 bg-gold-500/20 text-gold-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                <p>Vá em <strong className="text-dark-100">SQL Editor</strong> e use o botão abaixo para copiar o comando SQL</p>
              </div>
            </div>
            <button onClick={copiarInstrucoes} className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 border border-gold-500/30 text-gold-400 rounded-xl text-sm hover:bg-gold-500/20 transition-colors">
              {copiado ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar instruções e SQL</>}
            </button>
          </div>

          {/* SQL rápido */}
          <div className="card p-5 space-y-3">
            <h3 className="text-dark-200 font-semibold text-sm">SQL para cadastrar usuário rápido</h3>
            <p className="text-dark-500 text-xs">Substitua os valores e rode no SQL Editor do Supabase:</p>
            <div className="bg-dark-950 border border-dark-700 rounded-xl p-4 font-mono text-xs text-dark-300 overflow-x-auto">
              <div className="text-dark-500">-- Para BARBEIRO:</div>
              <div className="mt-1">INSERT INTO public.profiles (id, nome, email, role)</div>
              <div>VALUES (<span className="text-gold-400">'UUID_DO_USUARIO'</span>, <span className="text-emerald-400">'Nome Completo'</span>, <span className="text-emerald-400">'email@email.com'</span>, <span className="text-emerald-400">'barbeiro'</span>);</div>
              <div className="mt-3">INSERT INTO public.barbeiros (profile_id, nome, email, ativo)</div>
              <div>VALUES (<span className="text-gold-400">'UUID_DO_USUARIO'</span>, <span className="text-emerald-400">'Nome Completo'</span>, <span className="text-emerald-400">'email@email.com'</span>, true);</div>
              <div className="mt-3 text-dark-500">-- Para RECEPÇÃO:</div>
              <div className="mt-1">INSERT INTO public.profiles (id, nome, email, role)</div>
              <div>VALUES (<span className="text-gold-400">'UUID_DO_USUARIO'</span>, <span className="text-emerald-400">'Nome Completo'</span>, <span className="text-emerald-400">'email@email.com'</span>, <span className="text-blue-400">'recepcao'</span>);</div>
            </div>
          </div>

          {/* Tipos de acesso */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {roles.map(r => (
              <div key={r.value} className="card p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-dark-700 rounded-xl flex items-center justify-center">
                    <r.icon className={cn('w-5 h-5', r.color)} />
                  </div>
                  <div>
                    <p className="text-dark-100 font-semibold text-sm">{r.label}</p>
                    <p className="text-dark-500 text-xs">{r.desc}</p>
                  </div>
                </div>
                <div className="text-xs text-dark-500 space-y-1">
                  {r.value === 'gestor' && <>
                    <p>✓ Dashboard completo</p>
                    <p>✓ Todos os cadastros</p>
                    <p>✓ Metas e relatórios</p>
                    <p>✓ Configurações</p>
                  </>}
                  {r.value === 'barbeiro' && <>
                    <p>✓ Seu dashboard pessoal</p>
                    <p>✓ Suas metas e ranking</p>
                    <p>✓ Suas comandas</p>
                    <p>✗ Sem acesso a outros dados</p>
                  </>}
                  {r.value === 'recepcao' && <>
                    <p>✓ CRM e follow-ups</p>
                    <p>✓ Cadastro de clientes</p>
                    <p>✓ WhatsApp automático</p>
                    <p>✗ Sem dados financeiros</p>
                  </>}
                </div>
              </div>
            ))}
          </div>

          {/* Usuários cadastrados */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-dark-700">
              <h3 className="text-dark-200 font-semibold text-sm">Usuários do sistema</h3>
            </div>
            <div className="divide-y divide-dark-700/50">
              {usuarios.map(u => {
                const role = roles.find(r => r.value === u.role)
                return (
                  <div key={u.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-dark-700 rounded-full flex items-center justify-center text-sm font-bold text-dark-300">
                        {u.nome?.charAt(0) ?? '?'}
                      </div>
                      <div>
                        <p className="text-dark-100 text-sm font-medium">{u.nome}</p>
                        <p className="text-dark-500 text-xs">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={u.role}
                        onChange={e => alterarRole(u.id, e.target.value)}
                        className="input w-32 text-xs py-1.5"
                      >
                        {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      {role && (
                        <span className={cn('text-xs font-medium', role.color)}>
                          <role.icon className="w-3.5 h-3.5 inline mr-1" />
                          {role.label}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              {usuarios.length === 0 && (
                <p className="text-center py-8 text-dark-500 text-sm">Nenhum usuário cadastrado</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
