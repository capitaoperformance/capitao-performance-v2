import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function getZonaPerformance(percentual: number): 'verde' | 'amarelo' | 'vermelho' {
  if (percentual >= 100) return 'verde'
  if (percentual >= 70) return 'amarelo'
  return 'vermelho'
}

export function getZonaColor(zona: 'verde' | 'amarelo' | 'vermelho') {
  switch (zona) {
    case 'verde':   return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', hex: '#34d399' }
    case 'amarelo': return { text: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   hex: '#fbbf24' }
    case 'vermelho':return { text: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30',     hex: '#f87171' }
  }
}

export function calcularProjecao(fatAtual: number, diasCorridos: number, diasMes: number): number {
  if (diasCorridos === 0) return 0
  return (fatAtual / diasCorridos) * diasMes
}

export function getDiasNoMes(mes?: number, ano?: number): number {
  const d = new Date()
  const m = mes ?? d.getMonth() + 1
  const a = ano ?? d.getFullYear()
  return new Date(a, m, 0).getDate()
}

export function getDiasCorridosMes(): number {
  return new Date().getDate()
}

export function getMesNome(mes: number): string {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return meses[mes - 1] ?? ''
}
