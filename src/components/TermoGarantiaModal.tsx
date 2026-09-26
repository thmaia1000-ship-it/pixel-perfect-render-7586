import React, { useState } from "react";
import {
  Printer,
  X,
  FileText,
  Camera,
  CheckCircle2,
  Share2,
  ExternalLink,
  PlusCircle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ITENS_CONFERENCIA_ENTRADA,
  type ConferenciaChecklist,
  type MidiaConferencia,
} from "@/lib/conferencia-aparelho";
import { moeda, dataCurta, dataHora, linkWhatsApp } from "@/lib/br3";

export type ModoDocumentoOS = "duas_vias" | "entrada" | "finalizada";

interface TermoGarantiaModalProps {
  aberto: boolean;
  onFechar: () => void;
  os: {
    id?: string;
    numero: string;
    status?: string;
    created_at: string;
    entregue_em?: string | null;
    prazo?: string | null;
    aparelho: string;
    marca: string | null;
    modelo: string | null;
    imei: string | null;
    defeito_relatado: string;
    diagnostico: string | null;
    valor_pecas: number;
    valor_mao_obra: number;
    garantia_dias: number;
    acessorios: string | null;
    estado_fisico: string | null;
    clientes?: {
      nome: string;
      telefone?: string | null;
      documento?: string | null;
      endereco?: string | null;
    } | null;
    profiles?: {
      nome: string;
    } | null;
  };
  conferencia: ConferenciaChecklist;
  observacoesFisicas?: string;
  midias?: MidiaConferencia[];
  modoInicial?: ModoDocumentoOS;
  mostrarAcoesFinalizacao?: boolean;
  onIrParaOS?: () => void;
  onNovaOS?: () => void;
}

export function TermoGarantiaModal({
  aberto,
  onFechar,
  os,
  conferencia,
  observacoesFisicas,
  midias = [],
  modoInicial,
  mostrarAcoesFinalizacao = false,
  onIrParaOS,
  onNovaOS,
}: TermoGarantiaModalProps) {
  const ehEntregue = os.status === "entregue";
  const [modo, setModo] = useState<ModoDocumentoOS>(
    modoInicial ?? (ehEntregue ? "finalizada" : "entrada"),
  );

  React.useEffect(() => {
    if (modoInicial) {
      setModo(modoInicial);
    } else if (ehEntregue) {
      setModo("finalizada");
    } else {
      setModo("entrada");
    }
  }, [modoInicial, ehEntregue, aberto]);

  if (!aberto) return null;

  const total = Number(os.valor_pecas) + Number(os.valor_mao_obra);
  const dataCriacaoFormatada = dataCurta(os.created_at);
  const dataEntregaFormatada = os.entregue_em ? dataHora(os.entregue_em) : null;
  const modeloAparelho = [os.marca, os.modelo].filter(Boolean).join(" ") || os.aparelho;
  const telefoneCliente = os.clientes?.telefone ?? "";

  const mensagemWhatsApp = `Olá, ${os.clientes?.nome || "cliente"}! Seu aparelho (${modeloAparelho}) deu entrada na BR3 Tech sob a Ordem de Serviço nº ${os.numero}. Defeito relatado: "${os.defeito_relatado}". Estamos iniciando a análise. Guarde o nº da sua OS para acompanhar. WhatsApp de contato: (92) 99236-5757. Agradecemos a confiança!`;

  const imprimir = () => {
    window.print();
  };

  const copiarNumeroOS = () => {
    navigator.clipboard.writeText(os.numero);
    toast.success(`Nº da OS (${os.numero}) copiado para a área de transferência!`);
  };

  // Itens com alteração na conferência de entrada
  const itensComDefeito = ITENS_CONFERENCIA_ENTRADA.filter(
    (item) => conferencia[item] === "Defeito",
  );
  const itensOK = ITENS_CONFERENCIA_ENTRADA.filter((item) => conferencia[item] === "OK");

  // Divisão do checklist em duas colunas para garantir encaixe perfeito em 1 página impressa
  const meioChecklist = Math.ceil(ITENS_CONFERENCIA_ENTRADA.length / 2);
  const coluna1Checklist = ITENS_CONFERENCIA_ENTRADA.slice(0, meioChecklist);
  const coluna2Checklist = ITENS_CONFERENCIA_ENTRADA.slice(meioChecklist);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-background p-4 sm:p-6 shadow-2xl print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none">
        {/* BANNER DE FINALIZAÇÃO DE ABERTURA DA OS (quando aplicável) */}
        {mostrarAcoesFinalizacao && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 sm:p-4 text-emerald-950 dark:text-emerald-200 print:hidden shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white font-black shadow-md">
                  ✓
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    Ordem de Serviço Nº {os.numero} Criada com Sucesso!
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Imprima o relatório de entrada para controle físico da loja e entrega do
                    comprovante ao cliente.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {telefoneCliente && (
                  <a
                    href={linkWhatsApp(telefoneCliente, mensagemWhatsApp)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Enviar WhatsApp
                  </a>
                )}
                {onIrParaOS && (
                  <Button
                    onClick={onIrParaOS}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Acessar OS
                  </Button>
                )}
                {onNovaOS && (
                  <Button
                    onClick={onNovaOS}
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <PlusCircle className="h-3.5 w-3.5" /> Nova OS
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BARRA SUPERIOR DE AÇÕES NA TELA (oculta na impressão) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                {modo === "finalizada"
                  ? `Comprovante de OS Finalizada`
                  : `Relatório de Entrada de Equipamento`}
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-mono text-primary">
                  OS #{os.numero}
                </span>
                <button
                  type="button"
                  onClick={copiarNumeroOS}
                  className="text-muted-foreground hover:text-foreground"
                  title="Copiar número da OS"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </h3>
              <p className="text-xs text-muted-foreground">
                Documento de controle físico da loja e garantia do cliente.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Modelo de Impressão */}
            <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setModo("entrada")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  modo === "entrada"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Relatório de Entrada completo em 1 página (Padrão de abertura de OS)"
              >
                Via Completa (1 Página)
              </button>
              <button
                type="button"
                onClick={() => setModo("duas_vias")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  modo === "duas_vias"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Imprime 1 folha A4 dividida: 1ª Via Loja e 2ª Via Cliente"
              >
                2 Vias (Loja + Cliente)
              </button>
              <button
                type="button"
                onClick={() => setModo("finalizada")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  modo === "finalizada"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Comprovante de entrega e garantia ativada"
              >
                OS Finalizada
              </button>
            </div>

            <Button
              onClick={imprimir}
              size="sm"
              className="gap-1.5 font-bold shadow-sm bg-primary text-primary-foreground"
            >
              <Printer className="h-4 w-4" /> Imprimir Relatório (PDF)
            </Button>
            <Button onClick={onFechar} variant="outline" size="sm">
              <X className="h-4 w-4" /> Fechar
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DOCUMENTO IMPRESSO / FORMATO 1: "duas_vias" (LOJA + CLIENTE NA MESMA FOLHA) */}
        {/* ========================================================================= */}
        {modo === "duas_vias" && (
          <div className="relatorio-impresso-selecionado print-page-exact space-y-3 bg-white text-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 text-[11px] font-sans print:border-none print:p-0 print:text-black print:space-y-2">
            {/* ======================== 1ª VIA: LOJA ======================== */}
            <div className="rounded-lg border-2 border-slate-800 p-3 bg-white">
              {/* Topo da Via Loja */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Logo size="sm" />
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-slate-900 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    1ª VIA — CONTROLE DA LOJA / TÉCNICO
                  </span>
                  <div className="text-xs font-black text-slate-900 mt-0.5">
                    OS Nº {os.numero} · Entrada: {dataCriacaoFormatada}
                  </div>
                </div>
              </div>

              {/* Grid de Informações Loja */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] border-b border-slate-200 pb-2 mb-2">
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    Cliente
                  </span>
                  <span className="font-bold text-slate-900 text-[11px]">
                    {os.clientes?.nome || "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    Telefone / WhatsApp
                  </span>
                  <span className="font-semibold text-slate-900">
                    {os.clientes?.telefone || "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    Equipamento / Modelo
                  </span>
                  <span className="font-bold text-slate-900">{modeloAparelho}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    IMEI / Nº Série
                  </span>
                  <span className="font-medium text-slate-900">{os.imei || "Não informado"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] mb-2">
                <div>
                  <span className="block font-bold text-slate-700 uppercase text-[9px]">
                    Defeito Relatado pelo Cliente:
                  </span>
                  <p className="font-medium text-slate-900 bg-slate-50 p-1.5 rounded border border-slate-200">
                    {os.defeito_relatado}
                  </p>
                  {observacoesFisicas && (
                    <p className="mt-1 text-[9px] text-slate-600">
                      <strong>Obs. Físicas:</strong> {observacoesFisicas}
                    </p>
                  )}
                  {os.acessorios && (
                    <p className="text-[9px] text-slate-600">
                      <strong>Acessórios:</strong> {os.acessorios}
                    </p>
                  )}
                </div>

                <div>
                  <span className="block font-bold text-slate-700 uppercase text-[9px]">
                    Conferência de Entrada (Checklist):
                  </span>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-1">
                    {itensComDefeito.length > 0 ? (
                      <p className="text-rose-700 font-bold text-[9px]">
                        ⚠️ Defeitos anotados: {itensComDefeito.join(", ")}
                      </p>
                    ) : (
                      <p className="text-emerald-700 font-semibold text-[9px]">
                        ✓ Sem avarias críticas relatadas
                      </p>
                    )}
                    <p className="text-[9px] text-slate-600">
                      Itens OK: {itensOK.length} · Defeito: {itensComDefeito.length}
                      {midias.length > 0 && ` · ${midias.length} foto(s)/vídeo(s) arquivados`}
                    </p>
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-200 font-bold">
                      <span>Total Previsto / Orçamento:</span>
                      <span className="text-slate-950 font-black">{moeda(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assinatura da Via Loja */}
              <div className="pt-2 flex items-end justify-between text-[9px] border-t border-slate-300">
                <div className="max-w-[65%] text-slate-500 italic">
                  O cliente autoriza a abertura do aparelho para análise/diagnóstico e concorda com
                  as condições de entrada.
                </div>
                <div className="text-center w-52">
                  <div className="border-t border-slate-800 pt-0.5 font-bold text-slate-900">
                    Assinatura do Cliente
                  </div>
                </div>
              </div>
            </div>

            {/* Linha Tracejada de Corte */}
            <div className="relative my-2 py-1 text-center">
              <div className="border-t-2 border-dashed border-slate-400 w-full absolute top-1/2"></div>
              <span className="relative bg-white px-3 text-[9px] font-black uppercase text-slate-500 tracking-widest border border-slate-300 rounded-full">
                ✂ DESTACAR AQUI — 1ª VIA: LOJA / 2ª VIA: CLIENTE ✂
              </span>
            </div>

            {/* ======================== 2ª VIA: CLIENTE ======================== */}
            <div className="rounded-lg border-2 border-slate-800 p-3 bg-white">
              {/* Topo da Via Cliente */}
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <Logo size="sm" />
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    2ª VIA — COMPROVANTE DO CLIENTE
                  </span>
                  <div className="text-xs font-black text-slate-900 mt-0.5">
                    OS Nº {os.numero} · Entrada: {dataCriacaoFormatada}
                  </div>
                </div>
              </div>

              {/* Grid de Informações Cliente */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] border-b border-slate-200 pb-2 mb-2">
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    Cliente
                  </span>
                  <span className="font-bold text-slate-900 text-[11px]">
                    {os.clientes?.nome || "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    Equipamento Deixado
                  </span>
                  <span className="font-bold text-slate-900">{modeloAparelho}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    IMEI / Nº Série
                  </span>
                  <span className="font-medium text-slate-900">{os.imei || "Não informado"}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px]">
                    WhatsApp Suporte
                  </span>
                  <span className="font-bold text-emerald-700">(92) 99236-5757</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] mb-2">
                <div>
                  <span className="block font-bold text-slate-700 uppercase text-[9px]">
                    Defeito Relatado:
                  </span>
                  <p className="font-medium text-slate-900 bg-slate-50 p-1.5 rounded border border-slate-200">
                    {os.defeito_relatado}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-600">
                    <strong>Prazo estimado:</strong> {dataCurta(os.prazo)} ·{" "}
                    <strong>Garantia legal:</strong> {os.garantia_dias || 90} dias após reparo
                  </p>
                </div>

                <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[9px] space-y-1 text-slate-700">
                  <span className="font-bold text-slate-900 uppercase block text-[9px]">
                    Condições Importantes da OS:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Apresente este comprovante para retirada do aparelho.</li>
                    <li>O orçamento será enviado para sua aprovação antes de qualquer reparo.</li>
                    <li>
                      Aparelhos não retirados em até 90 dias após notificação poderão ser
                      descartados.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Assinatura da Via Cliente */}
              <div className="pt-2 flex items-end justify-between text-[9px] border-t border-slate-300">
                <div className="text-[9px] text-slate-500">
                  BR3 Tech · Assistência Especializada · E-mail: br3tech.am@gmail.com
                </div>
                <div className="text-center w-52">
                  <div className="border-t border-slate-800 pt-0.5 font-bold text-slate-900">
                    {os.profiles?.nome || "BR3 Tech (Recepção)"}
                  </div>
                  <p className="text-[8px] text-slate-500">Equipamento recebido na assistência</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTO IMPRESSO / FORMATO 2 & 3: "entrada" (COMPLETO) OU "finalizada"   */}
        {/* ========================================================================= */}
        {(modo === "entrada" || modo === "finalizada") && (
          <div className="relatorio-impresso-selecionado print-page-exact space-y-2 bg-white text-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 text-[10.5px] font-sans print:border-none print:p-0 print:text-black print:space-y-1.5 leading-snug">
            {/* Cabeçalho Oficial */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <div className="flex items-center gap-2">
                <Logo size="sm" />
              </div>
              <div className="text-right">
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900">
                  {modo === "finalizada"
                    ? "ORDEM DE SERVIÇO FINALIZADA E TERMO DE GARANTIA"
                    : "RELATÓRIO DE ENTRADA DE EQUIPAMENTO"}
                </h1>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className="text-xs font-black text-slate-900">OS Nº {os.numero}</span>
                  {modo === "finalizada" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> CONCLUÍDA / ENTREGUE (GARANTIA ATIVA)
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800 border border-blue-300">
                      COMPROVANTE DE ENTRADA (1 PÁGINA)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dados da Empresa */}
            <div className="text-[9px] text-slate-600 border-b border-slate-200 pb-1 flex flex-wrap justify-between items-center px-0.5">
              <span>
                WhatsApp: <strong className="text-slate-800">(92) 99236-5757</strong>
              </span>
              <span>
                E-mail: <strong className="text-slate-800">br3tech.am@gmail.com</strong>
              </span>
              <span>
                Data Entrada: <strong className="text-slate-800">{dataCriacaoFormatada}</strong>
              </span>
              {dataEntregaFormatada && (
                <span>
                  Entrega: <strong className="text-emerald-700">{dataEntregaFormatada}</strong>
                </span>
              )}
            </div>

            {/* DADOS DO CLIENTE & IDENTIFICAÇÃO DO EQUIPAMENTO (LADO A LADO) */}
            <div className="grid grid-cols-2 gap-2">
              {/* 1. DADOS DO CLIENTE */}
              <section className="rounded border border-slate-200 bg-slate-50/70 p-2">
                <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1.5 flex items-center justify-between">
                  <span>1. DADOS DO CLIENTE</span>
                </h2>
                <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                  <div className="col-span-2">
                    <span className="block text-[8px] uppercase font-bold text-slate-500">
                      Nome:
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {os.clientes?.nome || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500">
                      Telefone / WhatsApp:
                    </span>
                    <span className="font-semibold text-slate-900">
                      {os.clientes?.telefone || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500">
                      CPF / Documento:
                    </span>
                    <span className="font-medium text-slate-900">
                      {os.clientes?.documento || "Não informado"}
                    </span>
                  </div>
                </div>
              </section>

              {/* 2. IDENTIFICAÇÃO DO EQUIPAMENTO */}
              <section className="rounded border border-slate-200 bg-slate-50/70 p-2">
                <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1.5 flex items-center justify-between">
                  <span>2. IDENTIFICAÇÃO DO EQUIPAMENTO</span>
                </h2>
                <div className="grid grid-cols-2 gap-1 text-[9.5px]">
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500">
                      Aparelho / Modelo:
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {modeloAparelho}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500">
                      IMEI / Nº Série:
                    </span>
                    <span className="font-medium text-slate-900 truncate block">
                      {os.imei || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500">
                      Tipo:
                    </span>
                    <span className="font-medium text-slate-900">{os.aparelho}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500">
                      Acessórios:
                    </span>
                    <span className="font-medium text-slate-900 truncate block">
                      {os.acessorios || "Nenhum"}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* SERVIÇO EXECUTADO & ORÇAMENTO */}
            <section className="rounded border border-slate-200 bg-slate-50/70 p-2">
              <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1.5">
                {modo === "finalizada"
                  ? "3. SERVIÇOS EXECUTADOS E VALORES FINAIS"
                  : "3. DEFEITO RELATADO E ORÇAMENTO INICIAL"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px]">
                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-500">
                    Defeito Relatado:
                  </span>
                  <p className="font-medium text-slate-900 bg-white p-1 rounded border border-slate-200 text-[9.5px]">
                    {os.defeito_relatado}
                  </p>
                  {observacoesFisicas && (
                    <p className="mt-0.5 text-[8.5px] text-slate-600">
                      <strong>Obs. Físicas:</strong> {observacoesFisicas}
                    </p>
                  )}
                </div>

                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-500">
                    {modo === "finalizada"
                      ? "Diagnóstico / Solução Realizada:"
                      : "Diagnóstico Técnico Inicial:"}
                  </span>
                  <p className="font-medium text-slate-900 bg-white p-1 rounded border border-slate-200 text-[9.5px]">
                    {os.diagnostico ||
                      (modo === "finalizada"
                        ? "Reparo efetuado e aprovado em testes técnicos."
                        : "Aguardando conclusão de diagnóstico em bancada")}
                  </p>
                </div>
              </div>

              {/* Tabela de Valores */}
              <div className="mt-1.5 grid grid-cols-4 gap-1 rounded bg-white p-1.5 border border-slate-200 text-center text-[9.5px]">
                <div>
                  <span className="block text-[8px] uppercase text-slate-500 font-semibold">
                    Peças / Comp.
                  </span>
                  <span className="font-bold text-slate-800">{moeda(os.valor_pecas)}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase text-slate-500 font-semibold">
                    Mão de Obra
                  </span>
                  <span className="font-bold text-slate-800">{moeda(os.valor_mao_obra)}</span>
                </div>
                <div className="border-l border-slate-200 pl-1">
                  <span className="block text-[8px] uppercase text-slate-600 font-extrabold">
                    {modo === "finalizada" ? "Total Pago" : "Total Estimado"}
                  </span>
                  <span className="text-xs font-black text-slate-950">{moeda(total)}</span>
                </div>
                <div className="border-l border-slate-200 pl-1">
                  <span className="block text-[8px] uppercase text-emerald-700 font-bold">
                    Garantia
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-800">
                    {os.garantia_dias ? `${os.garantia_dias} dias` : "90 dias"}
                  </span>
                </div>
              </div>
            </section>

            {/* 4. CONFERÊNCIA DE ENTRADA DO APARELHO (CHECKLIST EM 2 COLUNAS) */}
            <section className="rounded border border-slate-200 bg-slate-50/70 p-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-1">
                <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800">
                  {modo === "finalizada"
                    ? "4. CHECKLIST DE TESTES DE SAÍDA E ENTREGA"
                    : "4. CONFERÊNCIA DE ENTRADA DO APARELHO (CHECKLIST)"}
                </h2>
                <span className="text-[8.5px] text-slate-600 font-medium">
                  {itensComDefeito.length > 0 ? (
                    <span className="text-rose-700 font-bold">
                      ⚠️ {itensComDefeito.length} avaria(s) anotada(s)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">✓ Sem defeitos aparentes</span>
                  )}
                  {midias.length > 0 && ` · ${midias.length} foto(s)/vídeo(s)`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px]">
                {/* Coluna 1 do Checklist */}
                <table className="w-full border-collapse border border-slate-200 bg-white">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[8px]">
                      <th className="border border-slate-200 py-0.5 px-1.5 text-left font-bold">
                        Item
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-emerald-700">
                        OK
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-8 text-rose-700">
                        Def.
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-slate-500">
                        N/V
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coluna1Checklist.map((item, idx) => {
                      const st = conferencia[item];
                      return (
                        <tr key={item} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="border border-slate-200 py-0.5 px-1.5 font-medium text-slate-800 truncate max-w-[130px]">
                            {item}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-emerald-600">
                            {st === "OK" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-rose-600">
                            {st === "Defeito" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-slate-400">
                            {st === "N/V" ? "✓" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Coluna 2 do Checklist */}
                <table className="w-full border-collapse border border-slate-200 bg-white">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[8px]">
                      <th className="border border-slate-200 py-0.5 px-1.5 text-left font-bold">
                        Item
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-emerald-700">
                        OK
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-8 text-rose-700">
                        Def.
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-slate-500">
                        N/V
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coluna2Checklist.map((item, idx) => {
                      const st = conferencia[item];
                      return (
                        <tr key={item} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="border border-slate-200 py-0.5 px-1.5 font-medium text-slate-800 truncate max-w-[130px]">
                            {item}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-emerald-600">
                            {st === "OK" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-rose-600">
                            {st === "Defeito" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-slate-400">
                            {st === "N/V" ? "✓" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {midias.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-[8.5px] font-medium text-slate-600">
                  <Camera className="h-3 w-3 text-primary" />
                  Registro Fotográfico: {midias.length} arquivo(s) arquivado(s) no sistema digital.
                </div>
              )}
            </section>

            {/* TERMOS E CONDIÇÕES */}
            <section className="rounded border border-slate-200 bg-slate-50/70 p-2 text-[8px] leading-tight text-slate-700">
              <h3 className="font-bold text-slate-900 uppercase text-[8.5px] mb-0.5">
                {modo === "finalizada"
                  ? "TERMOS DE GARANTIA E ENTREGA"
                  : "CONDIÇÕES DA ORDEM DE SERVIÇO E GUARDA"}
              </h3>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 list-disc list-inside">
                {modo === "finalizada" ? (
                  <>
                    <li>Cliente testou e recebeu o equipamento em perfeito funcionamento.</li>
                    <li>
                      Garantia de <strong>{os.garantia_dias || 90} dias</strong> sobre serviços e
                      peças.
                    </li>
                    <li>Perda de garantia em caso de quedas, trincados ou umidade.</li>
                    <li>Apresentação deste comprovante obrigatória para garantia.</li>
                  </>
                ) : (
                  <>
                    <li>Aparelho entregue para diagnóstico/reparo conforme itens acima.</li>
                    <li>Diagnóstico: até 5 dias úteis. Orçamento sujeito à aprovação.</li>
                    <li>Aparelhos não retirados em até 90 dias poderão ser descartados.</li>
                    <li>Não nos responsabilizamos por dados (recomendado backup prévio).</li>
                  </>
                )}
              </ul>
            </section>

            {/* ASSINATURAS */}
            <div className="pt-2 grid grid-cols-2 gap-8 text-center text-[9.5px]">
              <div>
                <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900">
                  {os.clientes?.nome || "Assinatura do Cliente"}
                </div>
                <p className="text-[8px] text-slate-500">
                  {modo === "finalizada"
                    ? "Cliente (Declara recebimento e aceite)"
                    : "Cliente (Autorização de entrada)"}
                </p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900">
                  {os.profiles?.nome || "BR3 Tech (Recepção)"}
                </div>
                <p className="text-[8px] text-slate-500">
                  {modo === "finalizada"
                    ? "Técnico Responsável (Entrega efetuada)"
                    : "Técnico Responsável (Recepção)"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BARRA INFERIOR DE AÇÕES (oculta na impressão) */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 print:hidden">
          <p className="text-xs text-muted-foreground">
            Dica: clique em <strong>Fechar Documento</strong> após concluir a impressão ou envio.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={imprimir}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-4 w-4 text-primary" /> Imprimir / Salvar PDF
            </Button>
            <Button
              type="button"
              onClick={onFechar}
              size="sm"
              className="gap-1.5 font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <X className="h-4 w-4" /> Fechar Documento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
