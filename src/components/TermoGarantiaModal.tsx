import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ITENS_CHECKLIST_SAIDA,
  deserializarEstadoEConferencia,
  type ConferenciaChecklist,
  type MidiaConferencia,
} from "@/lib/conferencia-aparelho";
import { moeda, dataCurta, dataHora, linkWhatsApp } from "@/lib/br3";
import { obterAssinaturaTecnicoOuLoja, obterMinhaAssinatura } from "@/lib/assinatura-usuario";

export type ModoDocumentoOS = "duas_vias" | "entrada" | "termica_80mm" | "finalizada";

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
    tecnico_id?: string | null;
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
    modoInicial ?? (ehEntregue ? "finalizada" : "duas_vias"),
  );

  useEffect(() => {
    if (modoInicial) {
      setModo(modoInicial);
    } else if (ehEntregue) {
      setModo("finalizada");
    } else {
      setModo("duas_vias");
    }
  }, [modoInicial, ehEntregue, aberto]);

  const imprimir = () => {
    // Força fundo branco e esquema de cores claro no navegador para eliminar qualquer borda escura da página
    const prevColorScheme = document.documentElement.style.colorScheme;
    const prevBodyBg = document.body.style.backgroundColor;

    document.documentElement.style.colorScheme = "light";
    document.body.style.backgroundColor = "#ffffff";

    let restaurado = false;
    const restaurarEstilos = () => {
      if (restaurado) return;
      restaurado = true;
      document.documentElement.style.colorScheme = prevColorScheme;
      document.body.style.backgroundColor = prevBodyBg;
      window.removeEventListener("afterprint", restaurarEstilos);
    };

    window.addEventListener("afterprint", restaurarEstilos);

    // Remove qualquer iframe remanescente de execuções anteriores
    const iframeAntigo = document.getElementById("print-iframe-helper");
    if (iframeAntigo) {
      iframeAntigo.remove();
    }

    // Dispara a impressão nativa imediata
    window.print();

    // Fallback caso afterprint não dispare (ex: em alguns navegadores/mobile)
    setTimeout(restaurarEstilos, 3000);
  };

  // Intercepta atalho de teclado Ctrl+P / Cmd+P quando o modal estiver aberto
  useEffect(() => {
    if (!aberto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        imprimir();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aberto, modo, os]);

  if (!aberto) return null;

  const total = Number(os.valor_pecas) + Number(os.valor_mao_obra);
  const dataCriacaoFormatada = dataCurta(os.created_at);
  const dataEntregaFormatada = os.entregue_em ? dataHora(os.entregue_em) : null;
  const modeloAparelho = [os.marca, os.modelo].filter(Boolean).join(" ") || os.aparelho;
  const telefoneCliente = os.clientes?.telefone ?? "";

  const mensagemWhatsApp = `Olá, ${os.clientes?.nome || "cliente"}! Seu aparelho (${modeloAparelho}) deu entrada na BR3 Tech sob a Ordem de Serviço nº ${os.numero}. Defeito relatado: "${os.defeito_relatado}". Estamos iniciando a análise. Guarde o nº da sua OS para acompanhar. WhatsApp de contato: (92) 99236-5757. Agradecemos a confiança!`;

  const copiarNumeroOS = () => {
    navigator.clipboard.writeText(os.numero);
    toast.success(`Nº da OS (${os.numero}) copiado para a área de transferência!`);
  };

  // Recupera dados de encerramento e autorização se existirem
  const { encerramento, assinaturaAutorizacao } = deserializarEstadoEConferencia(os.estado_fisico);

  // Obtém as assinaturas digitais cadastradas para impressos
  const assinaturaTecnico = obterAssinaturaTecnicoOuLoja(os.tecnico_id) || obterMinhaAssinatura();
  const assinaturaCliente = assinaturaAutorizacao?.dataUrl || null;

  const checklistAtivo: ConferenciaChecklist = (() => {
    if (modo !== "finalizada") {
      return conferencia;
    }
    const res: ConferenciaChecklist = {};
    const checklistExistente = encerramento?.checklistSaida || {};

    for (const item of ITENS_CHECKLIST_SAIDA) {
      if (checklistExistente[item] !== undefined && checklistExistente[item] !== null) {
        res[item] = checklistExistente[item];
      } else {
        // Se a OS foi finalizada/entregue ou está em garantia, assume OK como padrão técnico de saída
        res[item] = "OK";
      }
    }
    return res;
  })();

  const listaItensAtiva = modo === "finalizada" ? ITENS_CHECKLIST_SAIDA : ITENS_CONFERENCIA_ENTRADA;

  // Itens com alteração na conferência
  const itensComDefeito = listaItensAtiva.filter((item) => checklistAtivo[item] === "Defeito");
  const itensOK = listaItensAtiva.filter((item) => checklistAtivo[item] === "OK");

  // Divisão do checklist em duas colunas para garantir encaixe perfeito em 1 página impressa
  const meioChecklist = Math.ceil(listaItensAtiva.length / 2);
  const coluna1Checklist = listaItensAtiva.slice(0, meioChecklist);
  const coluna2Checklist = listaItensAtiva.slice(meioChecklist);

  const modalConteudo = (
    <div
      id="modal-termo-garantia"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-sm print:p-0 print:!bg-white print:!bg-none print:static print:inset-auto print:!backdrop-blur-none"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-background p-4 sm:p-6 shadow-2xl print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none print:!bg-white">
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
                  : modo === "duas_vias"
                    ? `Relatório de Entrada (2 Vias na Folha A4)`
                    : modo === "termica_80mm"
                      ? `Cupom Térmico 80mm (2 Vias Loja + Cliente)`
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
                {modo === "termica_80mm"
                  ? "Formato otimizado em 2 vias para impressoras térmicas de cupom de 80mm."
                  : "Documento de controle físico da loja e garantia do cliente em 1 página A4."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Modelo de Impressão */}
            <div className="flex flex-wrap rounded-lg border border-border bg-secondary/50 p-0.5 text-xs font-medium">
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
                2 Vias (A4)
              </button>
              <button
                type="button"
                onClick={() => setModo("termica_80mm")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  modo === "termica_80mm"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Imprime cupom para impressora térmica de bobina 80mm (2 Vias: Loja + Cliente)"
              >
                Cupom 80mm
              </button>
              <button
                type="button"
                onClick={() => setModo("entrada")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  modo === "entrada"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Relatório de Entrada completo em 1 página A4"
              >
                Via Completa (A4)
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

        {/* Ajuste dinâmico de tamanho de papel conforme o modelo selecionado e remoção completa de bordas pretas */}
        {modo === "termica_80mm" ? (
          <style>{`
            @media print {
              @page {
                size: 80mm auto !important;
                margin: 2mm 2mm !important;
              }
              :root, html, body {
                color-scheme: light !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              body::before, body::after, html::before, html::after {
                display: none !important;
                content: none !important;
                background: none !important;
              }
              #root, body > *:not(#modal-termo-garantia) {
                display: none !important;
              }
              #modal-termo-garantia {
                position: static !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              #modal-termo-garantia > div {
                background: #ffffff !important;
                background-color: #ffffff !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
            }
          `}</style>
        ) : (
          <style>{`
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 4mm 6mm !important;
              }
              :root, html, body {
                color-scheme: light !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #000000 !important;
              }
              body::before, body::after, html::before, html::after {
                display: none !important;
                content: none !important;
                background: none !important;
              }
              #root, body > *:not(#modal-termo-garantia) {
                display: none !important;
              }
              #modal-termo-garantia {
                position: static !important;
                display: block !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                max-width: 100% !important;
                inset: auto !important;
              }
              #modal-termo-garantia > div {
                background: #ffffff !important;
                background-color: #ffffff !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              .relatorio-impresso-selecionado {
                background: #ffffff !important;
                background-color: #ffffff !important;
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
              }
              .relatorio-impresso-selecionado > div,
              .print-page-exact > div {
                border-color: #e2e8f0 !important;
                box-shadow: none !important;
              }
            }
          `}</style>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTO IMPRESSO / FORMATO 1: "duas_vias" (LOJA + CLIENTE NA MESMA FOLHA) */}
        {/* ========================================================================= */}
        {modo === "duas_vias" && (
          <div
            id="documento-impresso-ativo"
            className="relatorio-impresso-selecionado print-page-exact space-y-3 bg-white text-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 text-[11px] font-sans print:border-none print:p-0 print:text-black print:space-y-1.5 print:text-[9.5px]"
          >
            {/* ======================== 1ª VIA: LOJA ======================== */}
            <div className="rounded-lg border border-slate-200 p-3 bg-white print:p-1.5 print:border-none">
              {/* Topo da Via Loja */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 print:pb-1 print:mb-1 print:border-slate-200">
                <div className="flex items-center gap-2">
                  <Logo size="sm" />
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-slate-900 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider print:text-[9px]">
                    1ª VIA — CONTROLE DA LOJA / TÉCNICO
                  </span>
                  <div className="text-xs font-black text-slate-900 mt-0.5 print:text-[10px]">
                    OS Nº {os.numero} · Entrada: {dataCriacaoFormatada}
                  </div>
                </div>
              </div>

              {/* Grid de Informações Loja */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] border-b border-slate-200 pb-2 mb-2 print:gap-1.5 print:pb-1 print:mb-1 print:text-[8.5px]">
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    Cliente
                  </span>
                  <span className="font-bold text-slate-900 text-[11px] print:text-[9.5px]">
                    {os.clientes?.nome || "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    Telefone / WhatsApp
                  </span>
                  <span className="font-semibold text-slate-900">
                    {os.clientes?.telefone || "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    Equipamento / Modelo
                  </span>
                  <span className="font-bold text-slate-900">{modeloAparelho}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    IMEI / Nº Série
                  </span>
                  <span className="font-medium text-slate-900">{os.imei || "Não informado"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] mb-2 print:gap-2 print:mb-1 print:text-[8.5px]">
                <div>
                  <span className="block font-bold text-slate-700 uppercase text-[9px] print:text-[7.5px]">
                    Defeito Relatado pelo Cliente:
                  </span>
                  <p className="font-medium text-slate-900 bg-slate-50 p-1.5 rounded border border-slate-200 print:p-1 print:text-[8px]">
                    {os.defeito_relatado}
                  </p>
                  {observacoesFisicas && (
                    <p className="mt-1 text-[9px] text-slate-600 print:mt-0.5 print:text-[8px]">
                      <strong>Obs. Físicas:</strong> {observacoesFisicas}
                    </p>
                  )}
                  {os.acessorios && (
                    <p className="text-[9px] text-slate-600 print:text-[8px]">
                      <strong>Acessórios:</strong> {os.acessorios}
                    </p>
                  )}
                </div>

                <div>
                  <span className="block font-bold text-slate-700 uppercase text-[9px] print:text-[7.5px]">
                    Conferência de Entrada (Checklist):
                  </span>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-200 space-y-1 print:p-1 print:space-y-0.5">
                    {itensComDefeito.length > 0 ? (
                      <p className="text-rose-700 font-bold text-[9px] print:text-[8px]">
                        ⚠️ Defeitos anotados: {itensComDefeito.join(", ")}
                      </p>
                    ) : (
                      <p className="text-emerald-700 font-semibold text-[9px] print:text-[8px]">
                        ✓ Sem avarias críticas relatadas
                      </p>
                    )}
                    <p className="text-[9px] text-slate-600 print:text-[7.5px]">
                      Itens OK: {itensOK.length} · Defeito: {itensComDefeito.length}
                      {midias.length > 0 && ` · ${midias.length} foto(s)/vídeo(s) arquivados`}
                    </p>
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-200 font-bold print:pt-0.5 print:text-[8.5px]">
                      <span>Total Previsto / Orçamento:</span>
                      <span className="text-slate-950 font-black">{moeda(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assinatura da Via Loja */}
              <div className="pt-2 flex items-end justify-between text-[9px] border-t border-slate-300 print:pt-1 print:text-[8px]">
                <div className="max-w-[65%] text-slate-500 italic">
                  O cliente autoriza a abertura do aparelho para análise/diagnóstico e concorda com
                  as condições de entrada.
                </div>
                <div className="text-center w-52 print:w-44">
                  {assinaturaCliente && (
                    <div className="h-8 flex items-end justify-center mb-0.5">
                      <img
                        src={assinaturaCliente}
                        alt="Assinatura do Cliente"
                        className="max-h-8 max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900">
                    Assinatura do Cliente
                  </div>
                </div>
              </div>
            </div>

            {/* Linha Tracejada de Corte */}
            <div className="relative my-2 py-1 text-center print:my-1 print:py-0">
              <div className="border-t-2 border-dashed border-slate-400 w-full absolute top-1/2"></div>
              <span className="relative bg-white px-3 text-[9px] font-black uppercase text-slate-500 tracking-widest border border-slate-300 rounded-full print:text-[7.5px] print:px-2">
                ✂ DESTACAR AQUI — 1ª VIA: LOJA / 2ª VIA: CLIENTE ✂
              </span>
            </div>

            {/* ======================== 2ª VIA: CLIENTE ======================== */}
            <div className="rounded-lg border border-slate-200 p-3 bg-white print:p-1.5 print:border-none">
              {/* Topo da Via Cliente */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2 print:pb-1 print:mb-1 print:border-slate-200">
                <div className="flex items-center gap-2">
                  <Logo size="sm" />
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-wider print:text-[9px]">
                    2ª VIA — COMPROVANTE DO CLIENTE
                  </span>
                  <div className="text-xs font-black text-slate-900 mt-0.5 print:text-[10px]">
                    OS Nº {os.numero} · Entrada: {dataCriacaoFormatada}
                  </div>
                </div>
              </div>

              {/* Grid de Informações Cliente */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] border-b border-slate-200 pb-2 mb-2 print:gap-1.5 print:pb-1 print:mb-1 print:text-[8.5px]">
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    Cliente
                  </span>
                  <span className="font-bold text-slate-900 text-[11px] print:text-[9.5px]">
                    {os.clientes?.nome || "Não informado"}
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    Equipamento Deixado
                  </span>
                  <span className="font-bold text-slate-900">{modeloAparelho}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    IMEI / Nº Série
                  </span>
                  <span className="font-medium text-slate-900">{os.imei || "Não informado"}</span>
                </div>
                <div>
                  <span className="block font-bold text-slate-500 uppercase text-[9px] print:text-[7.5px]">
                    WhatsApp Suporte
                  </span>
                  <span className="font-bold text-emerald-700">(92) 99236-5757</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] mb-2 print:gap-2 print:mb-1 print:text-[8.5px]">
                <div>
                  <span className="block font-bold text-slate-700 uppercase text-[9px] print:text-[7.5px]">
                    Defeito Relatado:
                  </span>
                  <p className="font-medium text-slate-900 bg-slate-50 p-1.5 rounded border border-slate-200 print:p-1 print:text-[8px]">
                    {os.defeito_relatado}
                  </p>
                  <div className="mt-1 text-[9px] text-slate-600 print:mt-0.5 print:text-[7.5px] space-y-0.5">
                    <p>
                      <strong>Prazo estimado:</strong> {dataCurta(os.prazo)} ·{" "}
                      <strong>Garantia legal:</strong> {os.garantia_dias || 90} dias após reparo
                    </p>
                    <p>
                      <strong>Checklist de Entrada:</strong> {itensOK.length} itens OK
                      {itensComDefeito.length > 0
                        ? ` · Defeitos anotados: ${itensComDefeito.join(", ")}`
                        : " · Sem defeitos aparentes"}
                    </p>
                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-200 font-bold print:pt-0.5 print:text-[8.5px]">
                      <span>Total Previsto / Orçamento:</span>
                      <span className="text-slate-950 font-black">{moeda(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[9px] space-y-1 text-slate-700 print:p-1.5 print:space-y-0.5 print:text-[8px]">
                  <span className="font-bold text-slate-900 uppercase block text-[9px] print:text-[8px]">
                    Condições Importantes da OS:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 print:space-y-0">
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
              <div className="pt-2 flex items-end justify-between text-[9px] border-t border-slate-300 print:pt-1 print:text-[8px]">
                <div className="text-[9px] text-slate-500 print:text-[7.5px]">
                  BR3 Tech · Assistência Especializada · E-mail: br3tech.am@gmail.com
                </div>
                <div className="text-center w-52 print:w-44">
                  {assinaturaTecnico && (
                    <div className="h-8 flex items-end justify-center mb-0.5">
                      <img
                        src={assinaturaTecnico}
                        alt="Assinatura Digital Técnica"
                        className="max-h-8 max-w-full object-contain"
                      />
                    </div>
                  )}
                  <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900">
                    {os.profiles?.nome || "BR3 Tech (Recepção)"}
                  </div>
                  <p className="text-[8px] text-slate-500">
                    {assinaturaTecnico
                      ? "Assinatura Digital do Responsável"
                      : "Equipamento recebido na assistência"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTO IMPRESSO / FORMATO 4: "termica_80mm" (BOBINA TÉRMICA DE 80MM)   */}
        {/* ========================================================================= */}
        {modo === "termica_80mm" && (
          <div
            id="documento-impresso-ativo"
            className="relatorio-impresso-selecionado relatorio-termico-80mm mx-auto max-w-[340px] bg-white text-black p-4 rounded-lg border border-slate-300 font-mono text-[11px] leading-tight shadow-md print:shadow-none print:border-none print:p-0 print:max-w-none print:w-[76mm] space-y-3"
          >
            {/* ==================== 1ª VIA: LOJA / TÉCNICO ==================== */}
            <div className="space-y-1.5 border border-slate-200 print:border-none p-2 rounded bg-white">
              {/* Topo Loja */}
              <div className="text-center space-y-0.5 pb-1.5 border-b border-black">
                <div className="flex justify-center pb-0.5">
                  <Logo size="sm" />
                </div>
                <div className="font-black text-[13px] tracking-wide text-black">BR3 TECH</div>
                <div className="text-[9.5px] font-bold">ASSISTÊNCIA TÉCNICA ESPECIALIZADA</div>
                <div className="text-[9px] font-sans">WhatsApp: (92) 99236-5757 · Manaus/AM</div>
              </div>

              {/* Identificação da OS */}
              <div className="text-center py-1 border-b border-dashed border-black bg-slate-100 print:bg-transparent">
                <div className="font-black text-[11px] uppercase tracking-wider">
                  1ª VIA — CONTROLE DA LOJA
                </div>
                <div className="font-black text-[13px]">ORDEM DE SERVIÇO Nº #{os.numero}</div>
                <div className="text-[9.5px]">Entrada: {dataCriacaoFormatada}</div>
              </div>

              {/* Dados do Cliente e Aparelho */}
              <div className="space-y-1 py-1 border-b border-dashed border-black text-[10px]">
                <div>
                  <span className="font-bold">CLIENTE: </span>
                  <span className="font-bold">{os.clientes?.nome || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-bold">CONTATO: </span>
                  <span>{os.clientes?.telefone || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-bold">APARELHO: </span>
                  <span className="font-bold">{modeloAparelho}</span>
                </div>
                {os.imei && (
                  <div>
                    <span className="font-bold">IMEI/SÉRIE: </span>
                    <span>{os.imei}</span>
                  </div>
                )}
                {os.acessorios && (
                  <div>
                    <span className="font-bold">ACESSÓRIOS: </span>
                    <span>{os.acessorios}</span>
                  </div>
                )}
                {observacoesFisicas && (
                  <div>
                    <span className="font-bold">OBS. FÍSICAS: </span>
                    <span>{observacoesFisicas}</span>
                  </div>
                )}
              </div>

              {/* Defeito Relatado */}
              <div className="py-1 border-b border-dashed border-black text-[10px]">
                <div className="font-bold uppercase">Defeito Relatado:</div>
                <p className="bg-slate-50 print:bg-transparent p-1 rounded mt-0.5 border border-slate-200 print:border-black/30 text-[9.5px]">
                  {os.defeito_relatado}
                </p>
              </div>

              {/* Checklist de Entrada */}
              <div className="py-1 border-b border-dashed border-black text-[9.5px] space-y-0.5">
                <div className="font-bold uppercase">Checklist de Entrada:</div>
                <div>✓ {itensOK.length} itens testados OK</div>
                {itensComDefeito.length > 0 ? (
                  <div className="font-bold text-black mt-0.5">
                    ⚠️ Avarias anotadas: {itensComDefeito.join(", ")}
                  </div>
                ) : (
                  <div>✓ Sem avarias iniciais anotadas</div>
                )}
                {midias.length > 0 && <div>📷 {midias.length} foto(s)/vídeo(s) arquivados</div>}
              </div>

              {/* Valores & Prazos */}
              <div className="py-1 border-b border-dashed border-black text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>TOTAL ESTIMADO:</span>
                  <span>{moeda(total)}</span>
                </div>
                <div className="flex justify-between text-[9.5px]">
                  <span>Previsão de Retorno:</span>
                  <span>{dataCurta(os.prazo)}</span>
                </div>
                <div className="flex justify-between text-[9.5px]">
                  <span>Técnico Responsável:</span>
                  <span>{os.profiles?.nome || "BR3 Tech"}</span>
                </div>
              </div>

              {/* Assinatura da Loja */}
              <div className="pt-2 text-center text-[9px] space-y-1">
                <p className="text-[8px] italic">
                  Autorizo a abertura do equipamento e a elaboração do diagnóstico técnico.
                </p>
                {assinaturaCliente && (
                  <div className="h-7 flex items-end justify-center">
                    <img
                      src={assinaturaCliente}
                      alt="Assinatura do Cliente"
                      className="max-h-7 max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="pt-2 border-b border-black w-4/5 mx-auto"></div>
                <div className="font-bold">Assinatura do Cliente</div>
              </div>
            </div>

            {/* Linha de Destaque / Serrilha da Guilhotina */}
            <div className="py-1 text-center border-y border-dashed border-black font-bold text-[9px] tracking-wider my-2">
              ✂ - - - DESTACAR AQUI - - - ✂
            </div>

            {/* ==================== 2ª VIA: COMPROVANTE DO CLIENTE ==================== */}
            <div className="space-y-1.5 border border-slate-200 print:border-none p-2 rounded bg-white">
              {/* Topo Cliente */}
              <div className="text-center space-y-0.5 pb-1.5 border-b border-black">
                <div className="flex justify-center pb-0.5">
                  <Logo size="sm" />
                </div>
                <div className="font-black text-[13px] tracking-wide text-black">BR3 TECH</div>
                <div className="text-[9.5px] font-bold">ASSISTÊNCIA TÉCNICA ESPECIALIZADA</div>
                <div className="text-[9px] font-sans">WhatsApp Suporte: (92) 99236-5757</div>
              </div>

              {/* Identificação da OS Cliente */}
              <div className="text-center py-1 border-b border-dashed border-black bg-slate-100 print:bg-transparent">
                <div className="font-black text-[11px] uppercase tracking-wider">
                  2ª VIA — COMPROVANTE DO CLIENTE
                </div>
                <div className="font-black text-[13px]">ORDEM DE SERVIÇO Nº #{os.numero}</div>
                <div className="text-[9.5px]">Entrada: {dataCriacaoFormatada}</div>
              </div>

              {/* Dados do Aparelho & Cliente */}
              <div className="space-y-1 py-1 border-b border-dashed border-black text-[10px]">
                <div>
                  <span className="font-bold">CLIENTE: </span>
                  <span className="font-bold">{os.clientes?.nome || "Não informado"}</span>
                </div>
                <div>
                  <span className="font-bold">APARELHO: </span>
                  <span className="font-bold">{modeloAparelho}</span>
                </div>
                {os.imei && (
                  <div>
                    <span className="font-bold">IMEI/SÉRIE: </span>
                    <span>{os.imei}</span>
                  </div>
                )}
                <div>
                  <span className="font-bold">DEFEITO: </span>
                  <span>{os.defeito_relatado}</span>
                </div>
                <div>
                  <span className="font-bold">CHECKLIST: </span>
                  <span>
                    {itensOK.length} itens OK
                    {itensComDefeito.length > 0 && ` · Avarias: ${itensComDefeito.join(", ")}`}
                  </span>
                </div>
              </div>

              {/* Orçamento & Previsão */}
              <div className="py-1 border-b border-dashed border-black text-[10px] space-y-0.5">
                <div className="flex justify-between font-bold text-[11px]">
                  <span>TOTAL ESTIMADO:</span>
                  <span>{moeda(total)}</span>
                </div>
                <div className="flex justify-between text-[9.5px]">
                  <span>Previsão de Retorno:</span>
                  <span>{dataCurta(os.prazo)}</span>
                </div>
                <div className="flex justify-between text-[9.5px]">
                  <span>Garantia de Serviços:</span>
                  <span>{os.garantia_dias || 90} dias após entrega</span>
                </div>
              </div>

              {/* Termos Importantes */}
              <div className="py-1 border-b border-dashed border-black text-[8.5px] space-y-0.5">
                <div className="font-bold uppercase text-[9px]">Termos Importantes:</div>
                <p>1. Apresente este cupom para retirada do aparelho.</p>
                <p>2. Orçamento enviado para aprovação antes de qualquer reparo.</p>
                <p>3. Aparelhos não retirados em até 90 dias poderão sofrer descarte.</p>
              </div>

              {/* Assinatura Assistência */}
              <div className="pt-2 text-center text-[9px] space-y-1">
                {assinaturaTecnico && (
                  <div className="h-7 flex items-end justify-center">
                    <img
                      src={assinaturaTecnico}
                      alt="Assinatura Digital Técnica"
                      className="max-h-7 max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="pt-2 border-b border-black w-4/5 mx-auto"></div>
                <div className="font-bold">{os.profiles?.nome || "BR3 Tech (Recepção)"}</div>
                <p className="text-[8px]">
                  {assinaturaTecnico
                    ? "Assinatura Digital Verificada"
                    : "Equipamento recebido na assistência"}
                </p>
                <p className="text-[9px] font-bold text-emerald-800 print:text-black pt-1">
                  Acompanhe sua OS pelo WhatsApp: (92) 99236-5757
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTO IMPRESSO / FORMATO 2 & 3: "entrada" (COMPLETO) OU "finalizada"   */}
        {/* ========================================================================= */}
        {(modo === "entrada" || modo === "finalizada") && (
          <div
            id="documento-impresso-ativo"
            className="relatorio-impresso-selecionado print-page-exact space-y-2 bg-white text-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 text-[10.5px] font-sans print:border-none print:p-0 print:text-black print:space-y-1 print:text-[9px] leading-snug"
          >
            {/* Cabeçalho Oficial */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:pb-1 print:border-slate-200">
              <div className="flex items-center gap-2">
                <Logo size="sm" />
              </div>
              <div className="text-right">
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-900 print:text-xs">
                  {modo === "finalizada"
                    ? "ORDEM DE SERVIÇO FINALIZADA E TERMO DE GARANTIA"
                    : "RELATÓRIO DE ENTRADA DE EQUIPAMENTO"}
                </h1>
                <div className="flex items-center justify-end gap-2 mt-0.5">
                  <span className="text-xs font-black text-slate-900 print:text-[10px]">
                    OS Nº {os.numero}
                  </span>
                  {modo === "finalizada" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300 print:text-[8px] print:py-0">
                      <CheckCircle2 className="h-3 w-3" /> CONCLUÍDA / ENTREGUE (GARANTIA ATIVA)
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800 border border-blue-300 print:text-[8px] print:py-0">
                      COMPROVANTE DE ENTRADA (1 PÁGINA)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dados da Empresa */}
            <div className="text-[9px] text-slate-600 border-b border-slate-200 pb-1 flex flex-wrap justify-between items-center px-0.5 print:pb-0.5 print:text-[8px]">
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
            <div className="grid grid-cols-2 gap-2 print:gap-1.5">
              {/* 1. DADOS DO CLIENTE */}
              <section className="rounded border border-slate-200 bg-slate-50/70 p-2 print:p-1.5 print:border-slate-300">
                <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1.5 flex items-center justify-between print:mb-1 print:text-[8.5px]">
                  <span>1. DADOS DO CLIENTE</span>
                </h2>
                <div className="grid grid-cols-2 gap-1 text-[9.5px] print:text-[8.5px]">
                  <div className="col-span-2">
                    <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                      Nome:
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {os.clientes?.nome || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                      Telefone / WhatsApp:
                    </span>
                    <span className="font-semibold text-slate-900">
                      {os.clientes?.telefone || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                      CPF / Documento:
                    </span>
                    <span className="font-medium text-slate-900">
                      {os.clientes?.documento || "Não informado"}
                    </span>
                  </div>
                </div>
              </section>

              {/* 2. IDENTIFICAÇÃO DO EQUIPAMENTO */}
              <section className="rounded border border-slate-200 bg-slate-50/70 p-2 print:p-1.5 print:border-slate-300">
                <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1.5 flex items-center justify-between print:mb-1 print:text-[8.5px]">
                  <span>2. IDENTIFICAÇÃO DO EQUIPAMENTO</span>
                </h2>
                <div className="grid grid-cols-2 gap-1 text-[9.5px] print:text-[8.5px]">
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                      Aparelho / Modelo:
                    </span>
                    <span className="font-bold text-slate-900 truncate block">
                      {modeloAparelho}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                      IMEI / Nº Série:
                    </span>
                    <span className="font-medium text-slate-900 truncate block">
                      {os.imei || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                      Tipo:
                    </span>
                    <span className="font-medium text-slate-900">{os.aparelho}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
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
            <section className="rounded border border-slate-200 bg-slate-50/70 p-2 print:p-1.5 print:border-slate-300">
              <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-0.5 mb-1.5 print:mb-1 print:text-[8.5px]">
                {modo === "finalizada"
                  ? "3. SERVIÇOS EXECUTADOS E VALORES FINAIS"
                  : "3. DEFEITO RELATADO E ORÇAMENTO INICIAL"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px] print:gap-1.5 print:text-[8.5px]">
                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                    Defeito Relatado:
                  </span>
                  <p className="font-medium text-slate-900 bg-white p-1 rounded border border-slate-200 text-[9.5px] print:text-[8px] print:p-0.5">
                    {os.defeito_relatado}
                  </p>
                  {observacoesFisicas && (
                    <p className="mt-0.5 text-[8.5px] text-slate-600 print:text-[7.5px]">
                      <strong>Obs. Físicas:</strong> {observacoesFisicas}
                    </p>
                  )}
                </div>

                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-500 print:text-[7.5px]">
                    {modo === "finalizada"
                      ? "Diagnóstico / Solução Realizada:"
                      : "Diagnóstico Técnico Inicial:"}
                  </span>
                  <p className="font-medium text-slate-900 bg-white p-1 rounded border border-slate-200 text-[9.5px] print:text-[8px] print:p-0.5">
                    {os.diagnostico ||
                      (modo === "finalizada"
                        ? "Reparo efetuado e aprovado em testes técnicos."
                        : "Aguardando conclusão de diagnóstico em bancada")}
                  </p>
                </div>
              </div>

              {/* Tabela de Valores */}
              <div className="mt-1.5 grid grid-cols-4 gap-1 rounded bg-white p-1.5 border border-slate-200 text-center text-[9.5px] print:mt-1 print:p-1 print:text-[8px]">
                <div>
                  <span className="block text-[8px] uppercase text-slate-500 font-semibold print:text-[7px]">
                    Peças / Comp.
                  </span>
                  <span className="font-bold text-slate-800">{moeda(os.valor_pecas)}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase text-slate-500 font-semibold print:text-[7px]">
                    Mão de Obra
                  </span>
                  <span className="font-bold text-slate-800">{moeda(os.valor_mao_obra)}</span>
                </div>
                <div className="border-l border-slate-200 pl-1">
                  <span className="block text-[8px] uppercase text-slate-600 font-extrabold print:text-[7px]">
                    {modo === "finalizada" ? "Total Pago" : "Total Estimado"}
                  </span>
                  <span className="text-xs font-black text-slate-950 print:text-[10px]">
                    {moeda(total)}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-1">
                  <span className="block text-[8px] uppercase text-emerald-700 font-bold print:text-[7px]">
                    Garantia
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-800 print:text-[8px]">
                    {os.garantia_dias ? `${os.garantia_dias} dias` : "90 dias"}
                  </span>
                </div>
              </div>
            </section>

            {/* 4. CONFERÊNCIA DE ENTRADA OU CHECKLIST E TESTES DE SAÍDA DO EQUIPAMENTO */}
            <section className="rounded border border-slate-200 bg-slate-50/70 p-2 print:p-1.5 print:border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5 mb-1 print:mb-0.5">
                <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800 print:text-[8.5px]">
                  {modo === "finalizada"
                    ? "4. CHECKLIST E TESTES DE SAÍDA DO EQUIPAMENTO"
                    : "4. CONFERÊNCIA DE ENTRADA DO APARELHO (CHECKLIST)"}
                </h2>
                <span className="text-[8.5px] text-slate-600 font-medium print:text-[7.5px]">
                  {modo === "finalizada" ? (
                    <span className="text-emerald-700 font-bold">
                      ✓ {itensOK.length} itens testados e aprovados na saída
                      {itensComDefeito.length > 0 && ` · ⚠️ ${itensComDefeito.length} com ressalva`}
                    </span>
                  ) : itensComDefeito.length > 0 ? (
                    <span className="text-rose-700 font-bold">
                      ⚠️ {itensComDefeito.length} avaria(s) anotada(s)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">✓ Sem defeitos aparentes</span>
                  )}
                  {midias.length > 0 && ` · ${midias.length} foto(s)/vídeo(s)`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] print:gap-1.5 print:text-[8px]">
                {/* Coluna 1 do Checklist */}
                <table className="w-full border-collapse border border-slate-200 bg-white">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[8px] print:text-[7px]">
                      <th className="border border-slate-200 py-0.5 px-1.5 text-left font-bold print:py-0 print:px-1">
                        Item
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-emerald-700 print:py-0 print:px-0.5">
                        OK
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-8 text-rose-700 print:py-0 print:px-0.5">
                        Def.
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-slate-500 print:py-0 print:px-0.5">
                        N/V
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coluna1Checklist.map((item, idx) => {
                      const st = checklistAtivo[item];
                      return (
                        <tr key={item} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="border border-slate-200 py-0.5 px-1.5 font-medium text-slate-800 truncate max-w-[130px] print:py-0 print:px-1 print:text-[7.5px]">
                            {item}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-emerald-600 print:py-0 print:px-0.5">
                            {st === "OK" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-rose-600 print:py-0 print:px-0.5">
                            {st === "Defeito" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-slate-400 print:py-0 print:px-0.5">
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
                    <tr className="bg-slate-100 text-slate-700 text-[8px] print:text-[7px]">
                      <th className="border border-slate-200 py-0.5 px-1.5 text-left font-bold print:py-0 print:px-1">
                        Item
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-emerald-700 print:py-0 print:px-0.5">
                        OK
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-8 text-rose-700 print:py-0 print:px-0.5">
                        Def.
                      </th>
                      <th className="border border-slate-200 py-0.5 px-1 text-center font-bold w-6 text-slate-500 print:py-0 print:px-0.5">
                        N/V
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coluna2Checklist.map((item, idx) => {
                      const st = checklistAtivo[item];
                      return (
                        <tr key={item} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="border border-slate-200 py-0.5 px-1.5 font-medium text-slate-800 truncate max-w-[130px] print:py-0 print:px-1 print:text-[7.5px]">
                            {item}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-emerald-600 print:py-0 print:px-0.5">
                            {st === "OK" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-rose-600 print:py-0 print:px-0.5">
                            {st === "Defeito" ? "✓" : ""}
                          </td>
                          <td className="border border-slate-200 py-0.5 px-1 text-center font-bold text-slate-400 print:py-0 print:px-0.5">
                            {st === "N/V" ? "✓" : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {midias.length > 0 && (
                <div className="mt-1 flex items-center gap-1.5 text-[8.5px] font-medium text-slate-600 print:mt-0.5 print:text-[7.5px]">
                  <Camera className="h-3 w-3 text-primary" />
                  Registro Fotográfico: {midias.length} arquivo(s) arquivado(s) no sistema digital.
                </div>
              )}

              {modo === "finalizada" ? (
                <div className="mt-1 space-y-1 print:mt-0.5">
                  {encerramento?.diagnosticoHardware ? (
                    <div className="rounded border border-emerald-300 bg-emerald-50/90 p-1.5 text-[8px] text-emerald-950 print:p-1 print:text-[7px]">
                      <div className="flex items-center justify-between font-bold border-b border-emerald-200/80 pb-0.5 mb-1">
                        <span className="flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>BATERIA DE TESTES DE SAÍDA DE HARDWARE NO APARELHO:</span>
                          <span className="font-mono text-emerald-900">
                            {encerramento.diagnosticoHardware.totalAprovados} aprovados
                            {encerramento.diagnosticoHardware.totalReprovados > 0
                              ? `, ${encerramento.diagnosticoHardware.totalReprovados} falha(s)`
                              : " (100% de sucesso)"}
                          </span>
                        </span>
                        <span className="font-mono text-[7px] text-emerald-700">
                          Laudo de Hardware Registrado
                        </span>
                      </div>

                      {/* Grade compacta de testes de hardware realizados */}
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1 text-[7.5px] print:text-[6.5px]">
                        {Object.entries(encerramento.diagnosticoHardware.testes || {}).map(
                          ([teste, res]) => (
                            <div
                              key={teste}
                              className={`flex items-center justify-between px-1 py-0.5 rounded border ${
                                res.status === "aprovado"
                                  ? "bg-white border-emerald-300 text-emerald-900"
                                  : res.status === "reprovado"
                                    ? "bg-rose-50 border-rose-300 text-rose-800 font-bold"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                              }`}
                            >
                              <span className="truncate uppercase font-medium">
                                {teste.replace("_", " ")}
                              </span>
                              <span className="font-bold ml-1">
                                {res.status === "aprovado"
                                  ? "✓"
                                  : res.status === "reprovado"
                                    ? "✕"
                                    : "—"}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[8px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 p-1 rounded print:mt-0.5 print:py-0.5 print:text-[7px]">
                      <span>
                        ✓ Testes Funcionais de Saída e Bancada: Display, touch, carga, áudio e
                        botões validados com êxito na liberação.
                      </span>
                      <span className="font-mono text-[7px] text-emerald-700">
                        Equipamento Aprovado
                      </span>
                    </div>
                  )}

                  {encerramento?.observacoesSaida && (
                    <p className="text-[8px] text-slate-700 bg-white p-1 rounded border border-slate-200 print:text-[7px] print:p-0.5">
                      <strong>Obs. de Liberação Técnica:</strong> {encerramento.observacoesSaida}
                    </p>
                  )}
                </div>
              ) : (
                encerramento?.diagnosticoHardware && (
                  <div className="mt-1 flex items-center justify-between text-[8px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 p-1 rounded print:mt-0.5 print:py-0.5 print:text-[7px]">
                    <span>
                      ✓ Bateria de Testes de Hardware executada:{" "}
                      {encerramento.diagnosticoHardware.totalAprovados} itens aprovados
                      {encerramento.diagnosticoHardware.totalReprovados > 0 &&
                        `, ${encerramento.diagnosticoHardware.totalReprovados} com falha`}
                    </span>
                    <span className="font-mono text-[7px] text-emerald-700">
                      Laudo Digital Registrado
                    </span>
                  </div>
                )
              )}
            </section>

            {/* TERMOS E CONDIÇÕES */}
            <section className="rounded border border-slate-200 bg-slate-50/70 p-2 text-[8px] leading-tight text-slate-700 print:p-1.5 print:text-[7.5px] print:border-slate-300">
              <h3 className="font-bold text-slate-900 uppercase text-[8.5px] mb-0.5 print:text-[7.5px]">
                {modo === "finalizada"
                  ? "TERMOS DE GARANTIA E ENTREGA"
                  : "CONDIÇÕES DA ORDEM DE SERVIÇO E GUARDA"}
              </h3>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 list-disc list-inside print:gap-x-2">
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
            <div className="pt-2 grid grid-cols-2 gap-8 text-center text-[9.5px] print:pt-1.5 print:gap-6 print:text-[8px]">
              <div>
                {assinaturaCliente && (
                  <div className="h-9 flex items-end justify-center mb-0.5">
                    <img
                      src={assinaturaCliente}
                      alt="Assinatura do Cliente"
                      className="max-h-9 max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900">
                  {os.clientes?.nome || "Assinatura do Cliente"}
                </div>
                <p className="text-[8px] text-slate-500 print:text-[7px]">
                  {modo === "finalizada"
                    ? "Cliente (Declara recebimento e aceite)"
                    : "Cliente (Autorização de entrada)"}
                </p>
              </div>
              <div>
                {assinaturaTecnico && (
                  <div className="h-9 flex items-end justify-center mb-0.5">
                    <img
                      src={assinaturaTecnico}
                      alt="Assinatura Digital do Responsável Técnico"
                      className="max-h-9 max-w-full object-contain"
                    />
                  </div>
                )}
                <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900">
                  {os.profiles?.nome || "BR3 Tech (Recepção)"}
                </div>
                <p className="text-[8px] text-slate-500 print:text-[7px]">
                  {assinaturaTecnico
                    ? "Assinatura Digital do Responsável Técnico"
                    : modo === "finalizada"
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

  return typeof document !== "undefined"
    ? createPortal(modalConteudo, document.body)
    : modalConteudo;
}
