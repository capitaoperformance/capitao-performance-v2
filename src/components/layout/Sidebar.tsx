'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Users, Scissors, Package, Target,
  FileText, BarChart3, Settings, LogOut, ChevronRight,
  ShoppingBag, UserCheck, MessageSquare, Crown, Upload, ClipboardCheck
} from 'lucide-react'

const navGestor = [
  { label: 'Dashboard',      href: '/dashboard',            icon: LayoutDashboard },
  { label: 'Fechamento Dia', href: '/fechamento',           icon: ClipboardCheck  },
  { label: 'Barbeiros',      href: '/cadastros/barbeiros',  icon: Scissors        },
  { label: 'Clientes',       href: '/cadastros/clientes',   icon: Users           },
  { label: 'Comandas',       href: '/cadastros/comandas',   icon: FileText        },
  { label: 'Produtos',       href: '/cadastros/produtos',   icon: Package         },
  { label: 'Serviços',       href: '/cadastros/servicos',   icon: ShoppingBag     },
  { label: 'Metas',          href: '/cadastros/metas',      icon: Target          },
  { label: 'Relatórios',     href: '/relatorios',           icon: BarChart3       },
  { label: 'CRM / Follow',   href: '/dashboard/recepcao',   icon: MessageSquare   },
  { label: 'Importar BB',    href: '/importar',             icon: Upload          },
  { label: 'Configurações',  href: '/configuracoes',        icon: Settings        },
]

interface SidebarProps {
  role?: string
  nomeUsuario?: string
}

export function Sidebar({ role = 'gestor', nomeUsuario = 'Gestor' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-dark-900 border-r border-dark-700/60 flex flex-col z-30 hidden lg:flex">
      <div className="px-6 py-6 border-b border-dark-700/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center shadow-gold flex-shrink-0">
            <Crown className="w-4 h-4 text-dark-950" />
          </div>
          <div>
            <div className="font-display text-gold-400 text-sm font-bold tracking-wider leading-tight">CAPITÃO</div>
            <div className="text-dark-500 text-xs tracking-widest">PERFORMANCE</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navGestor.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} className={cn(isActive ? 'nav-item-active' : 'nav-item')}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-dark-700/60 pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
          <div className="w-8 h-8 bg-dark-700 rounded-full flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-4 h-4 text-gold-400" />
          </div>
          <div className="min-w-0">
            <div className="text-dark-100 text-sm font-medium truncate">{nomeUsuario}</div>
            <div className="text-dark-500 text-xs capitalize">{role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="nav-item w-full text-dark-500 hover:text-red-400 hover:bg-red-400/5">
          <LogOut className="w-4 h-4" />Sair
        </button>
      </div>
    </aside>
  )
}
