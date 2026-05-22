'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Bell, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface HeaderProps {
  titulo?: string
  subtitulo?: string
}

const titulos: Record<string, { titulo: string; subtitulo: string }> = {
  '/dashboard':            { titulo: 'Dashboard Gestor',    subtitulo: 'Visão geral do negócio' },
  '/dashboard/barbeiro':   { titulo: 'Minha Performance',  subtitulo: 'Seus números do mês' },
  '/dashboard/recepcao':   { titulo: 'CRM & Recuperação',  subtitulo: 'Gestão de relacionamento' },
  '/cadastros/barbeiros':  { titulo: 'Barbeiros',           subtitulo: 'Cadastro e gestão de equipe' },
  '/cadastros/clientes':   { titulo: 'Clientes',            subtitulo: 'Base de clientes' },
  '/cadastros/comandas':   { titulo: 'Comandas',            subtitulo: 'Lançamento de atendimentos' },
  '/cadastros/metas':      { titulo: 'Metas',               subtitulo: 'Definição de objetivos' },
}

export function Header({ titulo, subtitulo }: HeaderProps) {
  const pathname = usePathname()
  const info = titulos[pathname] ?? { titulo: titulo ?? 'Capitão Performance', subtitulo: subtitulo ?? '' }

  return (
    <header className="h-16 bg-dark-900/80 glass border-b border-dark-700/60
                       flex items-center justify-between px-6 sticky top-0 z-20">
      <div>
        <h1 className="text-dark-100 font-semibold text-base leading-tight">{info.titulo}</h1>
        {info.subtitulo && <p className="text-dark-500 text-xs mt-0.5">{info.subtitulo}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-dark-700 transition-colors text-dark-400 hover:text-dark-200">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold-500 rounded-full" />
        </button>
        {/* Mobile: mostrar logo */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 bg-gold-gradient rounded-lg flex items-center justify-center">
            <Crown className="w-3.5 h-3.5 text-dark-950" />
          </div>
        </div>
      </div>
    </header>
  )
}
