import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  X,
  Share2,
  CheckCircle2,
  FileText,
  Copy,
  Receipt,
  Scissors,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  type ReciboAvulso,
  FORMAS_PAGAMENTO_LABELS,
  gerarTextoWhatsAppRecibo,
} from "@/lib/recibos";
import { obterMinhaAssinatura } from "@/lib/assinatura-usuario";
import {
  enviarWhatsAppComCopiaPdf,
  gerarPdfDeElemento,
  baixarBlobComoArquivo,
} from "@/lib/pdf-generator";

interface ReciboImpressoModalProps {
  aberto: boolean;
  onFechar: () => void;
  recibo: ReciboAvulso;
}

export function ReciboImpressoModal({ aberto, onFechar, recibo }: ReciboImpressoModalProps) {
  const [formato, setFormato] = useState<"duas_vias" | "pagina_unica" | "termica_80mm">(
    recibo.modeloImpressao || "duas_vias",
  );
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const assinaturaEmitente = obterMinhaAssinatura();

  if (!aberto) return null;

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(recibo.dataEmissao));

  const dataPorExtenso = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(recibo.dataEmissao));

  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(recibo.valor);

  const imprimir = () => {
    // Força fundo branco e esquema de cores claro no navegador para impressão límpida sem bordas escuras
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
    window.print();
    setTimeout(restaurarEstilos, 3000);
  };

  const copiarMensagemWhatsApp = () => {
    const texto = gerarTextoWhatsAppRecibo(recibo);
    navigator.clipboard.writeText(texto);
    toast.success("Texto formatado do recibo copiado para a área de transferência!");
  };

  const enviarWhatsAppDireto = async () => {
    setGerandoPdf(true);
    const texto = gerarTextoWhatsAppRecibo(recibo);
    const fone = recibo.clienteTelefone || "";
    // O nome do PDF é o número do recibo completo (ex: REC-2026-0001.pdf)
    const nomeArquivo = `${recibo.numero}.pdf`;

    await enviarWhatsAppComCopiaPdf({
      telefone: fone,
      mensagem: texto,
      elementoId: "documento-impresso-ativo",
      nomeArquivo,
      tituloDocumento: `Recibo ${recibo.numero} - BR3 Tech`,
    });
    setGerandoPdf(false);
  };

  const baixarPdfDireto = async () => {
    setGerandoPdf(true);
    try {
      const nomeArquivo = `${recibo.numero}.pdf`;
      const res = await gerarPdfDeElemento("documento-impresso-ativo", nomeArquivo);
      if (res) {
        baixarBlobComoArquivo(res.blob, nomeArquivo);
        toast.success(`Download de ${nomeArquivo} iniciado!`);
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast.error("Não foi possível gerar o arquivo PDF.");
    } finally {
      setGerandoPdf(false);
    }
  };

  // Renderiza o corpo do recibo comercial padrão
  const renderCorpoRecibo = (viaLabel: string, ehSegundaVia = false) => (
    <div className="rounded-lg border border-slate-200 p-4 bg-white print:p-2.5 print:border-none space-y-3 print:space-y-2 text-slate-900">
      {/* Cabeçalho do Recibo */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:pb-1">
        <div className="flex items-center gap-2">
          <Logo size="sm" variant="print" />
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            <span className="inline-block rounded bg-slate-900 text-white px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider print:text-[8.5px]">
              {viaLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300 print:text-[8px] print:py-0">
              <CheckCircle2 className="h-3 w-3" /> PAGO
            </span>
          </div>
          <div className="text-xs font-black text-slate-900 mt-0.5 print:text-[10px]">
            RECIBO Nº {recibo.numero} · {dataFormatada}
          </div>
        </div>
      </div>

      {/* Dados da Empresa Emissora */}
      <div className="text-[9px] text-slate-600 border-b border-slate-200 pb-1 flex flex-wrap justify-between items-center px-0.5 print:pb-0.5 print:text-[8px]">
        <span>
          WhatsApp: <strong className="text-slate-800">(92) 99236-5757</strong>
        </span>
        <span>
          E-mail: <strong className="text-slate-800">br3tech.am@gmail.com</strong>
        </span>
        <span>
          Cidade: <strong className="text-slate-800">Manaus / AM</strong>
        </span>
      </div>

      {/* Caixa de Valor em Destaque */}
      <div className="rounded-lg border border-slate-300 bg-slate-50/80 p-2.5 print:p-1.5 flex items-center justify-between">
        <div>
          <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
            Valor do Recibo
          </span>
          <span className="text-base sm:text-lg font-black text-slate-950 font-mono tracking-tight print:text-sm">
            {valorFormatado}
          </span>
        </div>
        <div className="text-right max-w-[65%]">
          <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500">
            Valor por Extenso
          </span>
          <span className="text-[10px] font-semibold text-slate-800 italic block print:text-[9px]">
            ({recibo.valorExtenso})
          </span>
        </div>
      </div>

      {/* Texto Oficial de Quitação do Recibo */}
      <div className="p-3 bg-white rounded border border-slate-200 text-[10.5px] leading-relaxed print:text-[9.5px] print:p-2 text-slate-800">
        Recebemos de <strong className="text-slate-950 uppercase">{recibo.clienteNome}</strong>
        {recibo.clienteDocumento ? `, inscrito no CPF/CNPJ nº ${recibo.clienteDocumento}` : ""}
        {recibo.clienteTelefone ? `, contato (${recibo.clienteTelefone})` : ""}, a importância supra
        de <strong className="text-slate-950">{valorFormatado}</strong> ({recibo.valorExtenso}),
        referente a:
        <div className="mt-1.5 p-2 bg-slate-50 rounded border border-slate-200/80 font-medium text-slate-900 text-[10px] print:text-[9px] print:p-1">
          {recibo.referente}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between text-[9.5px] print:text-[8.5px] pt-1 text-slate-600">
          <span>
            Forma de Liquidação:{" "}
            <strong className="text-slate-900 font-bold">
              {FORMAS_PAGAMENTO_LABELS[recibo.formaPagamento] || recibo.formaPagamento}
            </strong>
          </span>
          <span>Para clareza e comprovação, firmamos o presente recibo.</span>
        </div>
      </div>

      {/* Observações adicionais se houver */}
      {recibo.observacoes && (
        <div className="text-[9px] text-slate-600 bg-slate-50/60 p-1.5 rounded border border-slate-200 print:text-[8px] print:p-1">
          <strong>Observações:</strong> {recibo.observacoes}
        </div>
      )}

      {/* Local, Data e Assinatura */}
      <div className="pt-2 flex items-end justify-between text-[9.5px] border-t border-slate-200 print:pt-1 print:text-[8.5px]">
        <div className="text-slate-600">
          <span>
            {recibo.cidade || "Manaus - AM"}, {dataPorExtenso}
          </span>
        </div>
        <div className="text-center w-56 print:w-48">
          {assinaturaEmitente && (
            <div className="h-8 flex items-end justify-center mb-0.5">
              <img
                src={assinaturaEmitente}
                alt="Assinatura Digital"
                className="max-h-8 max-w-full object-contain"
              />
            </div>
          )}
          <div className="border-t border-slate-400 pt-0.5 font-bold text-slate-900 text-[10px] print:text-[9px]">
            {recibo.emitenteNome || "BR3 Tech — Laboratório de Tecnologia"}
          </div>
          <span className="text-[8px] text-slate-500 block">
            {assinaturaEmitente
              ? "Assinatura Digital Registrada"
              : recibo.emitenteCargo || "Assinatura do Recebedor / Responsável"}
          </span>
        </div>
      </div>
    </div>
  );

  const modalConteudo = (
    <div
      id="modal-termo-garantia"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-sm print:p-0 print:!bg-white print:!bg-none print:static print:inset-auto print:!backdrop-blur-none"
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-background p-4 sm:p-6 shadow-2xl print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none print:!bg-white space-y-4">
        {/* Barra Superior de Ações na Tela (Oculta na impressão) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>Visualização e Impressão de Recibo</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                  {recibo.numero}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {recibo.clienteNome} · {valorFormatado}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Modelo */}
            <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setFormato("duas_vias")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  formato === "duas_vias"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Duas Vias (A4)
              </button>
              <button
                type="button"
                onClick={() => setFormato("pagina_unica")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  formato === "pagina_unica"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Via Única (A4)
              </button>
              <button
                type="button"
                onClick={() => setFormato("termica_80mm")}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  formato === "termica_80mm"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Térmica 80mm
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enviarWhatsAppDireto}
              disabled={gerandoPdf}
              className="gap-1.5 text-xs text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10 font-bold"
              title="Enviar para o WhatsApp com cópia em PDF"
            >
              {gerandoPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
              WhatsApp + PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={baixarPdfDireto}
              disabled={gerandoPdf}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Baixar cópia do recibo em PDF"
            >
              <Download className="h-3.5 w-3.5 text-primary" /> Baixar PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copiarMensagemWhatsApp}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Copiar texto do recibo"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>

            <Button
              type="button"
              onClick={imprimir}
              size="sm"
              className="gap-1.5 font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir / Salvar PDF
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFechar}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Estilos CSS Injetados para Impressão Perfeita */}
        {formato === "termica_80mm" ? (
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
                margin: 5mm 7mm !important;
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
        {/* DOCUMENTO: FORMATO 1 - DUAS VIAS NA MESMA FOLHA A4                        */}
        {/* ========================================================================= */}
        {formato === "duas_vias" && (
          <div
            id="documento-impresso-ativo"
            className="relatorio-impresso-selecionado print-page-exact space-y-4 bg-white text-slate-900 p-4 md:p-6 rounded-xl border border-slate-200 text-[11px] font-sans print:border-none print:p-0 print:text-black print:space-y-2 print:text-[9.5px]"
          >
            {/* 1ª VIA: CLIENTE */}
            {renderCorpoRecibo("1ª VIA — COMPROVANTE DO CLIENTE")}

            {/* Linha de Destaque / Corte */}
            <div className="relative my-2 py-1 text-center print:my-1 print:py-0">
              <div className="border-t-2 border-dashed border-slate-300 w-full absolute top-1/2"></div>
              <span className="relative bg-white px-3 text-[9px] font-black uppercase text-slate-500 tracking-widest border border-slate-300 rounded-full print:text-[7.5px] print:px-2">
                ✂ DESTACAR AQUI — 1ª VIA: CLIENTE / 2ª VIA: FINANCEIRO LOJA ✂
              </span>
            </div>

            {/* 2ª VIA: LOJA / FINANCEIRO */}
            {renderCorpoRecibo("2ª VIA — CONTROLE FINANCEIRO / LOJA", true)}
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTO: FORMATO 2 - VIA ÚNICA A4                                       */}
        {/* ========================================================================= */}
        {formato === "pagina_unica" && (
          <div
            id="documento-impresso-ativo"
            className="relatorio-impresso-selecionado print-page-exact space-y-3 bg-white text-slate-900 p-6 rounded-xl border border-slate-200 text-[11px] font-sans print:border-none print:p-0 print:text-black print:space-y-2 print:text-[10px]"
          >
            {renderCorpoRecibo("VIA ÚNICA — RECIBO DE PAGAMENTO")}
          </div>
        )}

        {/* ========================================================================= */}
        {/* DOCUMENTO: FORMATO 3 - CUPOM TÉRMICO 80MM                                 */}
        {/* ========================================================================= */}
        {formato === "termica_80mm" && (
          <div
            id="documento-impresso-ativo"
            className="relatorio-impresso-selecionado relatorio-termico-80mm mx-auto max-w-[340px] bg-white text-black p-4 rounded-lg border border-slate-300 font-mono text-[11px] leading-tight shadow-md print:shadow-none print:border-none print:p-0 print:max-w-none print:w-[76mm] space-y-2"
          >
            {/* Topo Térmico */}
            <div className="text-center space-y-0.5 pb-1.5 border-b border-black">
              <div className="flex justify-center pb-0.5">
                <Logo size="sm" variant="print" />
              </div>
              <div className="font-black text-[13px] tracking-wide text-black">BR3 TECH</div>
              <div className="text-[9.5px] font-bold">ASSISTÊNCIA TÉCNICA ESPECIALIZADA</div>
              <div className="text-[9px] font-sans">WhatsApp: (92) 99236-5757 · Manaus/AM</div>
            </div>

            {/* Identificação do Recibo */}
            <div className="text-center py-1 border-b border-dashed border-black">
              <div className="font-black text-[11px] uppercase tracking-wider">
                COMPROVANTE DE RECIBO
              </div>
              <div className="font-black text-[13px]">{recibo.numero}</div>
              <div className="text-[9.5px]">Emissão: {dataFormatada}</div>
            </div>

            {/* Destaque do Valor */}
            <div className="text-center py-1.5 border-b border-dashed border-black space-y-0.5">
              <div className="text-[9px] uppercase font-bold">VALOR RECEBIDO</div>
              <div className="text-base font-black font-mono">{valorFormatado}</div>
              <div className="text-[9px] italic">({recibo.valorExtenso})</div>
            </div>

            {/* Dados do Cliente e Quitação */}
            <div className="space-y-1 py-1 border-b border-dashed border-black text-[10px]">
              <div>
                <span className="font-bold">CLIENTE: </span>
                <span>{recibo.clienteNome}</span>
              </div>
              {recibo.clienteDocumento && (
                <div>
                  <span className="font-bold">CPF/CNPJ: </span>
                  <span>{recibo.clienteDocumento}</span>
                </div>
              )}
              {recibo.clienteTelefone && (
                <div>
                  <span className="font-bold">TELEFONE: </span>
                  <span>{recibo.clienteTelefone}</span>
                </div>
              )}
              <div>
                <span className="font-bold">PAGAMENTO: </span>
                <span>
                  {FORMAS_PAGAMENTO_LABELS[recibo.formaPagamento] || recibo.formaPagamento}
                </span>
              </div>
            </div>

            {/* Referente a */}
            <div className="py-1 border-b border-dashed border-black text-[9.5px] space-y-0.5">
              <div className="font-bold uppercase text-[9px]">REFERENTE A:</div>
              <p className="bg-slate-50 print:bg-transparent p-1 rounded text-[9.5px]">
                {recibo.referente}
              </p>
              {recibo.observacoes && (
                <p className="text-[8.5px] text-slate-700 italic">Obs: {recibo.observacoes}</p>
              )}
            </div>

            {/* Assinatura Térmica */}
            <div className="pt-2 text-center text-[9px] space-y-1">
              <div>
                {recibo.cidade || "Manaus/AM"}, {dataFormatada}
              </div>
              {assinaturaEmitente && (
                <div className="h-7 flex items-end justify-center">
                  <img
                    src={assinaturaEmitente}
                    alt="Assinatura Digital"
                    className="max-h-7 max-w-full object-contain"
                  />
                </div>
              )}
              <div className="pt-2 border-b border-black w-4/5 mx-auto"></div>
              <div className="font-bold">{recibo.emitenteNome || "BR3 Tech"}</div>
              <div className="text-[8px]">Assinatura do Recebedor</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalConteudo, document.body)
    : modalConteudo;
}
