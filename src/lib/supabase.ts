import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getMesAtual = () => {
  const now = new Date()
  return { mes: now.getMonth() + 1, ano: now.getFullYear() }
}

export const getMesAnterior = () => {
  const now = new Date()
  if (now.getMonth() === 0) return { mes: 12, ano: now.getFullYear() - 1 }
  return { mes: now.getMonth(), ano: now.getFullYear() }
}

export const getInicioMes = (mes?: number, ano?: number) => {
  const d = new Date()
  const m = mes ?? d.getMonth() + 1
  const a = ano ?? d.getFullYear()
  return `${a}-${String(m).padStart(2, '0')}-01`
}

export const getFimMes = (mes?: number, ano?: number) => {
  const d = new Date()
  const m = mes ?? d.getMonth() + 1
  const a = ano ?? d.getFullYear()
  const fim = new Date(a, m, 0)
  return `${a}-${String(m).padStart(2, '0')}-${fim.getDate()}`
}