'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Upload, CheckCircle, AlertTriangle, FileSpreadsheet, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

type TipoImport = 'transacoes' | 'comissoes' | 'clientes' | 'assinaturas' | 'servicos' | null

interface ResultadoImport {
  sucesso: number
  erros: string[]
  tipo: string
}

function detectarTipo(sheetNames: string[], primeiraLinha: any): TipoImport {
  const sheet = sheetNames[0]?.toLowerCase() ?? ''
  const keys = Object.keys(primeiraLinha ?? {}).map(k => k.toLowerCase())

  if (sheet.includes('transaç') || keys.includes('barbeiro')) return 'transacoes'
  if (sheet.includes('comiss') || keys.some(k => k.includes('comiss'))) return 'comissoes'
  if (sheet.includes('assinatura') || keys.includes('valor bruto')) return 'assinaturas'
  if (sheet.includes('clientes') || keys.includes('total de agendamentos')) return 'clientes'
  if (sheet.includes('vendas') || keys.includes('descrição')) return 'servicos'
  return null
}

async function importarTransacoes(rows: any[]): Promise<ResultadoImport> {
  let sucesso = 0
  const erros: string[] = []

  const validas = rows.filter(r =>
    r['Barbeiro'] && r['Barbeiro'] !== '-' && r['Valor total'] > 0 && r['Status'] !== 'Aguardando'
  )

  for (const row of validas) {
    try {
      // Buscar ou criar barbeiro
      const nomeBarbeiro = String(row['Barbeiro']).trim()
      let { data: barb } = await supabase.from('barbeiros').select('id').ilike('nome', nomeBarbeiro).single()

      if (!barb) {
        const { data: novoBarb } = await supabase.from('barbeiros').insert({
          nome: nomeBarbeiro, ativo: true,
          comissao_servico: 50, comissao_produto: 10, comissao_extra: 50,
          data_admissao: new Date().toISOString().split('T')[0],
        }).select('id').single()
        barb = novoBarb
      }
      if (!barb) continue

      // Buscar ou criar cliente
      let clienteId = null
      const nomeCliente = String(row['Cliente'] ?? '').trim()
      if (nomeCliente && nomeCliente !== '-') {
        let { data: cli } = await supabase.from('clientes').select('id').ilike('nome', nomeCliente).single()
        if (!cli) {
          const { data: novoCli } = await supabase.from('clientes').insert({
            nome: nomeCliente, ativo: true, tipo: 'avulso', total_visitas: 0,
          }).select('id').single()
          cli = novoCli
        }
        clienteId = cli?.id ?? null
      }

      // Parsear data
      const dataStr = String(row['Data do lançamento'] ?? row['Data de recebimento'] ?? '')
      let dataAtend = new Date().toISOString()
      if (dataStr && dataStr !== '-') {
        const partes = dataStr.split('/')
        if (partes.length === 3) {
          dataAtend = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`).toISOString()
        }
      }

      const tipo = String(row['Tipo'] ?? '')
      const descricao = String(row['Descrição'] ?? '')
      const valorTotal = parseFloat(row['Valor total']) || 0
      const comissao = parseFloat(row['Comissão']) || 0
      const isAssinatura = tipo.toLowerCase().includes('assinatura')
      const isProduto = descricao.toLowerCase().includes('produto')

      const { error } = await supabase.from('comandas').insert({
        barbeiro_id: barb.id,
        cliente_id: clienteId,
        status: 'fechada',
        data_atendimento: dataAtend,
        subtotal_servicos: isAssinatura || isProduto ? 0 : valorTotal,
        subtotal_extras: 0,
        subtotal_produtos: isProduto ? valorTotal : 0,
        total: valorTotal,
        comissao_barbeiro: comissao,
        forma_pagamento: 'pix',
        origem: 'importacao',
        observacoes: `Importado do BestBarbers: ${descricao}`,
      })

      if (error) erros.push(`${nomeCliente}: ${error.message}`)
      else sucesso++
    } catch (e: any) {
      erros.push(e.message)
    }
  }

  return { sucesso, erros, tipo: 'Transações Financeiras' }
}

async function importarComissoes(rows: any[]): Promise<ResultadoImport> {
  let sucesso = 0
  const erros: string[] = []

  // Encontrar linhas de colaboradores (pular cabeçalhos)
  const colaboradores = rows.filter(r => {
    const nome = String(r['Colaborador'] ?? r[Object.keys(r)[0]] ?? '')
    return nome && !nome.includes('Relatório') && !nome.includes('Capitão') &&
           !nome.includes('Data') && !nome.includes('Total') && !nome.includes('Colaborador')
  })

  for (const row of colaboradores) {
    const nome = String(row['Colaborador'] ?? row[Object.keys(r)[0]] ?? '').trim()
    if (!nome) continue

    try {
      let { data: barb } = await supabase.from('barbeiros').select('id').ilike('nome', nome).single()
      if (!barb) {
        const { data: novoBarb } = await supabase.from('barbeiros').insert({
          nome, ativo: true,
          comissao_servico: 50, comissao_produto: 10, comissao_extra: 50,
          data_admissao: new Date().toISOString().split('T')[0],
        }).select('id').single()
        barb = novoBarb
      }
      sucesso++
    } catch (e: any) {
      erros.push(`${nome}: ${e.message}`)
    }
  }

  return { sucesso, erros, tipo: 'Comissões / Barbeiros' }
}

async function importarClientes(rows: any[]): Promise<ResultadoImport> {
  let sucesso = 0
  const erros: string[] = []

  for (const row of rows) {
    const nome = String(row['Nome do cliente'] ?? '').trim()
    const telefone = String(row['Telefone do cliente'] ?? '').trim()
    if (!nome) continue

    try {
      const { data: existe } = await supabase.from('clientes').select('id').ilike('nome', nome).single()
      if (!existe) {
        const totalAgend = parseInt(row['Total de Agendamentos']) || 0
        const tipoMais = String(row['Tipo Mais Utilizado'] ?? 'Normal')
        const { error } = await supabase.from('clientes').insert({
          nome, telefone: telefone || null,
          tipo: tipoMais === 'Assinatura' ? 'assinante' : 'avulso',
          total_visitas: totalAgend,
          ativo: true,
        })
        if (error) erros.push(`${nome}: ${error.message}`)
        else sucesso++
      } else {
        sucesso++ // já existe, conta como ok
      }
    } catch (e: any) {
      erros.push(`${nome}: ${e.message}`)
    }
  }

  return { sucesso, erros, tipo: 'Clientes' }
}

async function importarAssinaturas(rows: any[]): Promise<ResultadoImport> {
  let sucesso = 0
  const erros: string[] = []

  // Buscar ou criar planos
  const planosCache: Record<string, string> = {}

  for (const row of rows) {
    const nomeCliente = String(row['Cliente'] ?? '').trim()
    const descricao = String(row['Descrição'] ?? '').trim()
    const valorBruto = parseFloat(row['Valor Bruto']) || 0
    const status = String(row['Status'] ?? 'Recebido')
    if (!nomeCliente) continue

    try {
      // Buscar/criar plano
      let planoId = planosCache[descricao]
      if (!planoId) {
        let { data: plano } = await supabase.from('planos').select('id').ilike('nome', descricao).single()
        if (!plano) {
          const { data: novoPlano } = await supabase.from('planos').insert({
            nome: descricao, preco_mensal: valorBruto, servicos_incluidos: 4, ativo: true,
          }).select('id').single()
          plano = novoPlano
        }
        planoId = plano?.id
        if (planoId) planosCache[descricao] = planoId
      }
      if (!planoId) continue

      // Buscar/criar cliente
      let { data: cli } = await supabase.from('clientes').select('id').ilike('nome', nomeCliente).single()
      if (!cli) {
        const { data: novoCli } = await supabase.from('clientes').insert({
          nome: nomeCliente, tipo: 'assinante', ativo: true, total_visitas: 0,
        }).select('id').single()
        cli = novoCli
      }
      if (!cli) continue

      // Atualizar cliente para assinante
      await supabase.from('clientes').update({ tipo: 'assinante' }).eq('id', cli.id)

      // Parsear data
      const dataStr = String(row['Data de pagamento'] ?? '')
      let dataInicio = new Date().toISOString().split('T')[0]
      if (dataStr) {
        const p = dataStr.split('/')
        if (p.length === 3) dataInicio = `${p[2]}-${p[1]}-${p[0]}`
      }

      const statusAssinatura = status === 'Recebido' ? 'ativo' : 'ativo'

      // Verificar se já tem assinatura
      const { data: assinaturaExiste } = await supabase
        .from('assinaturas').select('id')
        .eq('cliente_id', cli.id).eq('plano_id', planoId).single()

      if (!assinaturaExiste) {
        const { error } = await supabase.from('assinaturas').insert({
          cliente_id: cli.id, plano_id: planoId,
          status: statusAssinatura, data_inicio: dataInicio,
        })
        if (error) erros.push(`${nomeCliente}: ${error.message}`)
        else sucesso++
      } else {
        sucesso++
      }
    } catch (e: any) {
      erros.push(`${nomeCliente}: ${e.message}`)
    }
  }

  return { sucesso, erros, tipo: 'Assinaturas' }
}

async function importarServicos(rows: any[]): Promise<ResultadoImport> {
  let sucesso = 0
  const erros: string[] = []

  const validos = rows.filter(r => r['Descrição'] && r['Total em vendas'])

  for (const row of validos) {
    const nome = String(row['Descrição']).trim()
    const quantidade = parseInt(row['Quantidade']) || 0
    const total = parseFloat(row['Total em vendas']) || 0
    if (!nome || total === 0) continue

    try {
      const { data: existe } = await supabase.from('servicos').select('id').ilike('nome', nome).single()
      if (!existe) {
        const preco = quantidade > 0 ? total / quantidade : total
        const { error } = await supabase.from('servicos').insert({
          nome, preco: Math.round(preco * 100) / 100,
          duracao_minutos: 30, categoria: 'servico', ativo: true,
        })
        if (error) erros.push(`${nome}: ${error.message}`)
        else sucesso++
      } else sucesso++
    } catch (e: any) {
      erros.push(`${nome}: ${e.message}`)
    }
  }

  return { sucesso, erros, tipo: 'Serviços' }
}

export default function ImportarPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [tipoDetectado, setTipoDetectado] = useState<TipoImport>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImport | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const processarArquivo = useCallback((file: File) => {
    setArquivo(file)
    setResultado(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'binary' })
      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

      const tipo = detectarTipo(wb.SheetNames, rows[0])
      setTipoDetectado(tipo)
      setPreview(rows.slice(0, 5))
    }
    reader.readAsBinaryString(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.xlsx') || file?.name.endsWith('.xls')) {
      processarArquivo(file)
    }
  }, [processarArquivo])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
  }

  async function importar() {
    if (!arquivo || !tipoDetectado) return
    setImportando(true)
    setResultado(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        let res: ResultadoImport
        if (tipoDetectado === 'transacoes') res = await importarTransacoes(rows)
        else if (tipoDetectado === 'comissoes') res = await importarComissoes(rows)
        else if (tipoDetectado === 'clientes')  res = await importarClientes(rows)
        else if (tipoDetectado === 'assinaturas') res = await importarAssinaturas(rows)
        else res = await importarServicos(rows)

        setResultado(res)
        setImportando(false)
      }
      reader.readAsBinaryString(arquivo)
    } catch (e: any) {
      setResultado({ sucesso: 0, erros: [e.message], tipo: 'Erro' })
      setImportando(false)
    }
  }

  const tipoLabels: Record<string, { label: string; desc: string; cor: string }> = {
    transacoes:  { label: 'Transações Financeiras', desc: 'Comandas e atendimentos', cor: 'text-gold-400' },
    comissoes:   { label: 'Relatório de Comissões', desc: 'Barbeiros e comissões', cor: 'text-blue-400' },
    clientes:    { label: 'Detalhamento de Clientes', desc: 'Base de clientes', cor: 'text-emerald-400' },
    assinaturas: { label: 'Resumo de Assinaturas', desc: 'Planos e assinantes', cor: 'text-purple-400' },
    servicos:    { label: 'Relatório de Vendas', desc: 'Serviços vendidos', cor: 'text-amber-400' },
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header titulo="Importar do BestBarbers" subtitulo="Importe planilhas exportadas do BestBarbers" />
        <main className="p-4 lg:p-6 space-y-5">

          {/* Instruções */}
          <div className="card-gold p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-gold-400" />
              <h3 className="text-gold-400 font-semibold text-sm">Como usar</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-dark-400">
              {[
                { num: '1', txt: 'No BestBarbers, exporte qualquer relatório em Excel' },
                { num: '2', txt: 'Arraste o arquivo aqui ou clique para selecionar' },
                { num: '3', txt: 'O sistema detecta automaticamente o tipo de dados' },
                { num: '4', txt: 'Clique em Importar — tudo vai para o dashboard!' },
              ].map(s => (
                <div key={s.num} className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-gold-500/20 text-gold-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{s.num}</span>
                  <p>{s.txt}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-dark-700 pt-3">
              <p className="text-dark-500 text-xs font-medium mb-2">Relatórios compatíveis do BestBarbers:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tipoLabels).map(([k, v]) => (
                  <span key={k} className={`text-xs px-2 py-1 bg-dark-900 rounded-lg ${v.cor}`}>
                    {v.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={cn(
              'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer',
              dragOver ? 'border-gold-500 bg-gold-500/5' : 'border-dark-700 hover:border-dark-600',
              arquivo && 'border-gold-500/40 bg-gold-500/3'
            )}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input id="fileInput" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
            {arquivo ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-gold-400" />
                <div className="text-left">
                  <p className="text-dark-100 font-medium text-sm">{arquivo.name}</p>
                  <p className="text-dark-500 text-xs">{(arquivo.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setArquivo(null); setTipoDetectado(null); setPreview([]) }}
                  className="ml-2 p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                <p className="text-dark-300 text-sm font-medium">Arraste o arquivo Excel aqui</p>
                <p className="text-dark-600 text-xs mt-1">ou clique para selecionar · .xlsx, .xls</p>
              </div>
            )}
          </div>

          {/* Tipo detectado */}
          {tipoDetectado && (
            <div className="card p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-dark-100 text-sm font-medium">
                  Tipo detectado: <span className={tipoLabels[tipoDetectado]?.cor}>{tipoLabels[tipoDetectado]?.label}</span>
                </p>
                <p className="text-dark-500 text-xs">{tipoLabels[tipoDetectado]?.desc} · {preview.length} registros (prévia)</p>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-700">
                <p className="text-dark-400 text-xs">Prévia dos dados (5 primeiras linhas)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-dark-700 bg-dark-900/40">
                      {Object.keys(preview[0] ?? {}).slice(0, 8).map(k => (
                        <th key={k} className="text-left px-4 py-2 text-dark-500 font-medium whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-dark-700/50">
                        {Object.values(row).slice(0, 8).map((v: any, j) => (
                          <td key={j} className="px-4 py-2 text-dark-300 whitespace-nowrap max-w-[150px] truncate">
                            {String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botão importar */}
          {arquivo && tipoDetectado && (
            <button
              onClick={importar}
              disabled={importando}
              className="btn-gold w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50"
            >
              {importando ? (
                <><span className="w-5 h-5 border-2 border-dark-800 border-t-transparent rounded-full animate-spin" /> Importando...</>
              ) : (
                <><Upload className="w-5 h-5" /> Importar para o Capitão Performance</>
              )}
            </button>
          )}

          {/* Resultado */}
          {resultado && (
            <div className={cn('card p-5 space-y-3', resultado.sucesso > 0 ? 'border-emerald-500/20' : 'border-red-500/20')}>
              <div className="flex items-center gap-2">
                {resultado.sucesso > 0
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <AlertTriangle className="w-5 h-5 text-red-400" />}
                <h3 className="font-semibold text-sm text-dark-100">Resultado da Importação</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-400">{resultado.sucesso}</p>
                  <p className="text-emerald-600 text-xs mt-1">registros importados</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{resultado.erros.length}</p>
                  <p className="text-red-600 text-xs mt-1">erros</p>
                </div>
              </div>
              {resultado.erros.length > 0 && (
                <div className="bg-dark-900 rounded-xl p-3 max-h-32 overflow-y-auto">
                  {resultado.erros.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-red-400 text-xs">{e}</p>
                  ))}
                </div>
              )}
              {resultado.sucesso > 0 && (
                <p className="text-emerald-400 text-sm">
                  ✓ Dados importados! Acesse o <a href="/dashboard" className="underline">Dashboard</a> para ver os KPIs atualizados.
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
