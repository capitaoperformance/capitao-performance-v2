// ============================================================
// CAPITÃO PERFORMANCE — Tipos TypeScript
// ============================================================

export type Role = 'gestor' | 'barbeiro' | 'recepcao'

export interface Profile {
  id: string
  nome: string
  email: string
  role: Role
  avatar_url?: string
  ativo: boolean
  criado_em: string
}

export interface Barbeiro {
  id: string
  profile_id?: string
  nome: string
  apelido?: string
  telefone?: string
  email?: string
  foto_url?: string
  comissao_servico: number
  comissao_produto: number
  comissao_extra: number
  ativo: boolean
  data_admissao: string
}

export interface Cliente {
  id: string
  nome: string
  telefone?: string
  email?: string
  data_nascimento?: string
  tipo: 'avulso' | 'assinante'
  barbeiro_preferido_id?: string
  ativo: boolean
  ultima_visita?: string
  total_visitas: number
  observacoes?: string
}

export interface Servico {
  id: string
  nome: string
  descricao?: string
  preco: number
  duracao_minutos: number
  categoria: 'servico' | 'extra'
  ativo: boolean
}

export interface Produto {
  id: string
  nome: string
  descricao?: string
  preco_venda: number
  preco_custo?: number
  estoque: number
  categoria?: string
  ativo: boolean
}

export interface Plano {
  id: string
  nome: string
  descricao?: string
  preco_mensal: number
  servicos_incluidos: number
  ativo: boolean
}

export interface Meta {
  id: string
  barbeiro_id?: string
  mes: number
  ano: number
  faturamento_meta: number
  servicos_meta?: number
  produtos_meta?: number
  clientes_novos_meta?: number
}

export interface Comanda {
  id: string
  numero?: string
  cliente_id?: string
  barbeiro_id: string
  status: 'aberta' | 'fechada' | 'cancelada'
  data_atendimento: string
  subtotal_servicos: number
  subtotal_extras: number
  subtotal_produtos: number
  desconto: number
  total: number
  comissao_barbeiro: number
  forma_pagamento?: string
  origem: 'manual' | 'api' | 'importacao'
  observacoes?: string
  // joins
  cliente?: Cliente
  barbeiro?: Barbeiro
  servicos?: ComandaServico[]
  produtos?: ComandaProduto[]
}

export interface ComandaServico {
  id: string
  comanda_id: string
  servico_id?: string
  nome: string
  preco: number
  categoria: string
}

export interface ComandaProduto {
  id: string
  comanda_id: string
  produto_id?: string
  nome: string
  preco_unitario: number
  quantidade: number
  subtotal: number
}

// KPIs calculados
export interface KPIsBarbeiro {
  barbeiro_id: string
  barbeiro: string
  fat_total: number
  fat_servicos: number
  fat_extras: number
  fat_produtos: number
  comissao_total: number
  total_comandas: number
  clientes_atendidos: number
  ticket_medio: number
  meta?: number
  percentual_meta?: number
  zona?: 'verde' | 'amarelo' | 'vermelho'
  ranking?: number
}

export interface KPIsGeral {
  fat_total: number
  fat_servicos: number
  fat_extras: number
  fat_produtos: number
  fat_assinaturas: number
  total_comandas: number
  clientes_unicos: number
  clientes_novos: number
  ticket_medio: number
  assinantes_ativos: number
  meta_mes: number
  percentual_meta: number
  dias_corridos: number
  dias_uteis_mes: number
  projecao_mes: number
}

export interface FollowUp {
  id: string
  cliente_id: string
  tipo: string
  status: 'pendente' | 'enviado' | 'respondido' | 'convertido' | 'ignorado'
  canal: string
  mensagem?: string
  data_agendada?: string
  data_enviada?: string
  observacoes?: string
  cliente?: Cliente
}
