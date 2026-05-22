'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Scissors } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) throw error
      // Buscar o role do usuário
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', data.user.id).single()
      const role = profile?.role ?? 'gestor'
      if (role === 'barbeiro') router.push('/dashboard/barbeiro')
      else if (role === 'recepcao') router.push('/dashboard/recepcao')
      else router.push('/dashboard')
    } catch (err: any) {
      setErro('Email ou senha incorretos. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Efeito de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full opacity-5
                        bg-gradient-radial from-gold-500 to-transparent blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-gold-gradient shadow-gold mb-6">
            <Scissors className="w-8 h-8 text-dark-950" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gradient-gold tracking-widest uppercase mb-1">
            Capitão Performance
          </h1>
          <p className="text-dark-500 text-sm tracking-wide">Capitão Barbers Club</p>
        </div>

        {/* Card de login */}
        <div className="card p-8 border-dark-700/80">
          <h2 className="text-dark-100 font-semibold text-lg mb-6">Entrar no sistema</h2>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="input pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="btn-gold w-full flex items-center justify-center gap-2 py-3 text-base mt-2"
            >
              {carregando ? (
                <>
                  <span className="w-4 h-4 border-2 border-dark-800 border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-700">
            <p className="text-center text-dark-500 text-xs">
              Acesso restrito a usuários autorizados.<br/>
              Entre em contato com o gestor para obter acesso.
            </p>
          </div>
        </div>

        <p className="text-center text-dark-600 text-xs mt-8">
          © 2024 Capitão Barbers Club. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
