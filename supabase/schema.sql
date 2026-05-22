-- ============================================================
-- CAPITÃO PERFORMANCE — Schema Completo do Banco de Dados
-- Execute este SQL no editor do Supabase (SQL Editor)
-- ============================================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: perfis de usuários (extends auth.users do Supabase)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('gestor', 'barbeiro', 'recepcao')),
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: barbeiros
-- ============================================================
CREATE TABLE public.barbeiros (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id),
  nome TEXT NOT NULL,
  apelido TEXT,
  telefone TEXT,
  email TEXT,
  foto_url TEXT,
  comissao_servico NUMERIC(5,2) DEFAULT 50.00,  -- percentual %
  comissao_produto NUMERIC(5,2) DEFAULT 10.00,   -- percentual %
  comissao_extra   NUMERIC(5,2) DEFAULT 50.00,   -- percentual %
  ativo BOOLEAN DEFAULT true,
  data_admissao DATE DEFAULT CURRENT_DATE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: clientes
-- ============================================================
CREATE TABLE public.clientes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  data_nascimento DATE,
  foto_url TEXT,
  tipo TEXT DEFAULT 'avulso' CHECK (tipo IN ('avulso', 'assinante')),
  barbeiro_preferido_id UUID REFERENCES public.barbeiros(id),
  ativo BOOLEAN DEFAULT true,
  ultima_visita DATE,
  total_visitas INT DEFAULT 0,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: serviços
-- ============================================================
CREATE TABLE public.servicos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  duracao_minutos INT DEFAULT 30,
  categoria TEXT DEFAULT 'servico' CHECK (categoria IN ('servico', 'extra')),
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: produtos
-- ============================================================
CREATE TABLE public.produtos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_venda NUMERIC(10,2) NOT NULL,
  preco_custo NUMERIC(10,2),
  estoque INT DEFAULT 0,
  categoria TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: planos de assinatura
-- ============================================================
CREATE TABLE public.planos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC(10,2) NOT NULL,
  servicos_incluidos INT DEFAULT 4,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: assinaturas de clientes
-- ============================================================
CREATE TABLE public.assinaturas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
  plano_id UUID REFERENCES public.planos(id) NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado', 'suspenso', 'inadimplente')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_cancelamento DATE,
  motivo_cancelamento TEXT,
  dia_vencimento INT DEFAULT 1,
  servicos_usados_mes INT DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: metas
-- ============================================================
CREATE TABLE public.metas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  barbeiro_id UUID REFERENCES public.barbeiros(id),  -- NULL = meta geral da barbearia
  mes INT NOT NULL,   -- 1-12
  ano INT NOT NULL,
  faturamento_meta NUMERIC(10,2) NOT NULL,
  servicos_meta INT,
  produtos_meta INT,
  clientes_novos_meta INT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barbeiro_id, mes, ano)
);

-- ============================================================
-- TABELA: comandas (principal)
-- ============================================================
CREATE TABLE public.comandas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero TEXT,
  cliente_id UUID REFERENCES public.clientes(id),
  barbeiro_id UUID REFERENCES public.barbeiros(id) NOT NULL,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'fechada', 'cancelada')),
  data_atendimento TIMESTAMPTZ DEFAULT NOW(),
  subtotal_servicos NUMERIC(10,2) DEFAULT 0,
  subtotal_extras NUMERIC(10,2) DEFAULT 0,
  subtotal_produtos NUMERIC(10,2) DEFAULT 0,
  desconto NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  comissao_barbeiro NUMERIC(10,2) DEFAULT 0,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro','pix','credito','debito','assinatura','cortesia')),
  origem TEXT DEFAULT 'manual' CHECK (origem IN ('manual', 'api', 'importacao')),
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: itens da comanda - serviços
-- ============================================================
CREATE TABLE public.comanda_servicos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  servico_id UUID REFERENCES public.servicos(id),
  nome TEXT NOT NULL,  -- snapshot do nome no momento da venda
  preco NUMERIC(10,2) NOT NULL,
  categoria TEXT DEFAULT 'servico',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: itens da comanda - produtos
-- ============================================================
CREATE TABLE public.comanda_produtos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comanda_id UUID REFERENCES public.comandas(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id),
  nome TEXT NOT NULL,  -- snapshot
  preco_unitario NUMERIC(10,2) NOT NULL,
  quantidade INT DEFAULT 1,
  subtotal NUMERIC(10,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: follow-ups e recuperação de clientes
-- ============================================================
CREATE TABLE public.followups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('retorno', 'assinante_risco', 'novo_cliente', 'cancelamento', 'inadimplente', 'lead')),
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'respondido', 'convertido', 'ignorado')),
  canal TEXT DEFAULT 'whatsapp' CHECK (canal IN ('whatsapp', 'sms', 'email', 'ligacao')),
  mensagem TEXT,
  data_agendada TIMESTAMPTZ,
  data_enviada TIMESTAMPTZ,
  responsavel_id UUID REFERENCES public.profiles(id),
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: modelos de mensagem
-- ============================================================
CREATE TABLE public.mensagem_modelos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  corpo TEXT NOT NULL,  -- suporte a variáveis {{nome}}, {{dias}}, etc.
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================

-- Trigger: atualizar total da comanda ao inserir item de serviço
CREATE OR REPLACE FUNCTION recalcular_comanda()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal_servicos NUMERIC;
  v_subtotal_extras NUMERIC;
  v_subtotal_produtos NUMERIC;
  v_total NUMERIC;
  v_barbeiro_comissao_s NUMERIC;
  v_barbeiro_comissao_p NUMERIC;
  v_barbeiro_comissao_e NUMERIC;
  v_comissao NUMERIC;
  v_comanda_id UUID;
BEGIN
  v_comanda_id := COALESCE(NEW.comanda_id, OLD.comanda_id);

  SELECT COALESCE(SUM(preco),0) INTO v_subtotal_servicos
  FROM comanda_servicos WHERE comanda_id = v_comanda_id AND categoria = 'servico';

  SELECT COALESCE(SUM(preco),0) INTO v_subtotal_extras
  FROM comanda_servicos WHERE comanda_id = v_comanda_id AND categoria = 'extra';

  SELECT COALESCE(SUM(subtotal),0) INTO v_subtotal_produtos
  FROM comanda_produtos WHERE comanda_id = v_comanda_id;

  v_total := v_subtotal_servicos + v_subtotal_extras + v_subtotal_produtos;

  SELECT b.comissao_servico, b.comissao_produto, b.comissao_extra
  INTO v_barbeiro_comissao_s, v_barbeiro_comissao_p, v_barbeiro_comissao_e
  FROM comandas c JOIN barbeiros b ON c.barbeiro_id = b.id
  WHERE c.id = v_comanda_id;

  v_comissao := (v_subtotal_servicos * v_barbeiro_comissao_s / 100)
              + (v_subtotal_produtos * v_barbeiro_comissao_p / 100)
              + (v_subtotal_extras   * v_barbeiro_comissao_e / 100);

  UPDATE comandas SET
    subtotal_servicos = v_subtotal_servicos,
    subtotal_extras   = v_subtotal_extras,
    subtotal_produtos = v_subtotal_produtos,
    total             = v_total - desconto,
    comissao_barbeiro = v_comissao,
    atualizado_em     = NOW()
  WHERE id = v_comanda_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_comanda_servico
AFTER INSERT OR UPDATE OR DELETE ON comanda_servicos
FOR EACH ROW EXECUTE FUNCTION recalcular_comanda();

CREATE TRIGGER trg_recalcular_comanda_produto
AFTER INSERT OR UPDATE OR DELETE ON comanda_produtos
FOR EACH ROW EXECUTE FUNCTION recalcular_comanda();

-- Trigger: atualizar ultima_visita e total_visitas do cliente
CREATE OR REPLACE FUNCTION atualizar_cliente_apos_comanda()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'fechada' AND NEW.cliente_id IS NOT NULL THEN
    UPDATE clientes SET
      ultima_visita = DATE(NEW.data_atendimento),
      total_visitas = total_visitas + 1,
      atualizado_em = NOW()
    WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_cliente_comanda
AFTER UPDATE ON comandas
FOR EACH ROW
WHEN (OLD.status != 'fechada' AND NEW.status = 'fechada')
EXECUTE FUNCTION atualizar_cliente_apos_comanda();

-- ============================================================
-- VIEWS úteis para dashboards
-- ============================================================

-- View: faturamento por barbeiro no mês atual
CREATE OR REPLACE VIEW v_faturamento_barbeiro_mes AS
SELECT
  b.id AS barbeiro_id,
  b.nome AS barbeiro,
  DATE_TRUNC('month', c.data_atendimento) AS mes,
  COUNT(DISTINCT c.id) AS total_comandas,
  COUNT(DISTINCT c.cliente_id) AS clientes_atendidos,
  COALESCE(SUM(c.subtotal_servicos), 0) AS fat_servicos,
  COALESCE(SUM(c.subtotal_extras), 0) AS fat_extras,
  COALESCE(SUM(c.subtotal_produtos), 0) AS fat_produtos,
  COALESCE(SUM(c.total), 0) AS fat_total,
  COALESCE(SUM(c.comissao_barbeiro), 0) AS comissao_total,
  CASE WHEN COUNT(c.id) > 0 THEN COALESCE(SUM(c.total), 0) / COUNT(c.id) ELSE 0 END AS ticket_medio
FROM barbeiros b
LEFT JOIN comandas c ON c.barbeiro_id = b.id AND c.status = 'fechada'
GROUP BY b.id, b.nome, DATE_TRUNC('month', c.data_atendimento);

-- View: KPIs gerais do mês atual
CREATE OR REPLACE VIEW v_kpis_mes_atual AS
SELECT
  DATE_TRUNC('month', data_atendimento) AS mes,
  COUNT(DISTINCT id) AS total_comandas,
  COUNT(DISTINCT cliente_id) AS clientes_unicos,
  COUNT(DISTINCT barbeiro_id) AS barbeiros_ativos,
  COALESCE(SUM(subtotal_servicos), 0) AS fat_servicos,
  COALESCE(SUM(subtotal_extras), 0) AS fat_extras,
  COALESCE(SUM(subtotal_produtos), 0) AS fat_produtos,
  COALESCE(SUM(total), 0) AS fat_total,
  CASE WHEN COUNT(id) > 0 THEN SUM(total) / COUNT(id) ELSE 0 END AS ticket_medio
FROM comandas
WHERE status = 'fechada'
GROUP BY DATE_TRUNC('month', data_atendimento);

-- View: clientes para recuperação (sem visita há mais de 20 dias)
CREATE OR REPLACE VIEW v_clientes_recuperacao AS
SELECT
  c.id,
  c.nome,
  c.telefone,
  c.ultima_visita,
  DATE_PART('day', NOW() - c.ultima_visita::TIMESTAMP) AS dias_sem_visita,
  c.tipo,
  b.nome AS barbeiro_preferido
FROM clientes c
LEFT JOIN barbeiros b ON c.barbeiro_preferido_id = b.id
WHERE c.ativo = true
  AND c.ultima_visita IS NOT NULL
  AND c.ultima_visita < CURRENT_DATE - INTERVAL '20 days'
ORDER BY c.ultima_visita ASC;

-- ============================================================
-- RLS (Row Level Security) — Política básica
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Gestor vê tudo
CREATE POLICY "Gestor acessa tudo" ON public.comandas
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'gestor')
);

-- Barbeiro vê apenas suas próprias comandas
CREATE POLICY "Barbeiro vê suas comandas" ON public.comandas
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN barbeiros b ON b.profile_id = p.id
    WHERE p.id = auth.uid() AND b.id = comandas.barbeiro_id
  )
);

-- ============================================================
-- DADOS INICIAIS (seed)
-- ============================================================

-- Serviços padrão de barbearia
INSERT INTO public.servicos (nome, preco, duracao_minutos, categoria) VALUES
('Corte Clássico', 45.00, 30, 'servico'),
('Corte + Barba', 70.00, 50, 'servico'),
('Barba Tradicional', 35.00, 30, 'servico'),
('Platinado / Coloração', 150.00, 90, 'servico'),
('Sobrancelha', 20.00, 15, 'servico'),
('Pigmentação de Barba', 80.00, 45, 'servico'),
('Hidratação', 40.00, 20, 'extra'),
('Relaxamento', 60.00, 30, 'extra'),
('Tratamento de Couro Cabeludo', 50.00, 25, 'extra'),
('Design de Barba Premium', 30.00, 20, 'extra');

-- Planos padrão
INSERT INTO public.planos (nome, preco_mensal, servicos_incluidos, descricao) VALUES
('Plano Essencial', 120.00, 2, '2 cortes por mês'),
('Plano Premium', 200.00, 4, '4 serviços por mês + prioridade'),
('Plano Black', 350.00, 8, '8 serviços + produtos + prioridade VIP');

-- Modelos de mensagem WhatsApp
INSERT INTO public.mensagem_modelos (tipo, titulo, corpo) VALUES
('retorno', 'Cliente sem visita há 20 dias', 'Olá {{nome}}! Faz {{dias}} dias que não te vemos no Capitão Barbers Club. Que tal agendar e renovar o visual? 💈 Clica aqui: {{link}}'),
('novo_cliente', 'Boas-vindas pós-atendimento', 'Olá {{nome}}! Foi uma satisfação te atender hoje aqui no Capitão Barbers Club. Esperamos te ver em breve! ✂️ Qualquer dúvida, é só chamar.'),
('assinante_risco', 'Assinante com baixo uso', 'Oi {{nome}}! Vimos que você ainda não usou todos os serviços do seu plano esse mês. Não deixa passar! Agenda agora: {{link}} 💈'),
('cancelamento', 'Recuperação de cancelamento', 'Olá {{nome}}, sentimos muito que você cancelou seu plano. Gostaríamos de entender o que aconteceu e ver se podemos te oferecer uma solução. Pode conversar com a gente? 🤝'),
('inadimplente', 'Cliente inadimplente', 'Olá {{nome}}, identificamos uma pendência no seu plano. Para não perder os benefícios, regularize aqui: {{link}}'),
('lead', 'Lead sem resposta', 'Oi {{nome}}! Vi que você demonstrou interesse no Capitão Barbers Club. Ficou alguma dúvida? Estou aqui para ajudar! 😊');
