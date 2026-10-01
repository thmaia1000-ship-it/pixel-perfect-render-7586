import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { linkWhatsApp } from "./br3";

export interface OpcoesEnvioWhatsAppPdf {
  telefone: string;
  mensagem: string;
  elementoId?: string;
  elemento?: HTMLElement | null;
  nomeArquivo: string;
  tituloDocumento?: string;
}

/**
 * Renderiza um elemento HTML para um documento PDF com escala 2x para nitidez
 */
export async function gerarPdfDeElemento(
  elementoOuId: HTMLElement | string,
  nomeArquivo: string,
): Promise<{ blob: Blob; file: File; url: string; doc: jsPDF }> {
  const el =
    typeof elementoOuId === "string" ? document.getElementById(elementoOuId) : elementoOuId;

  if (!el) {
    throw new Error("Elemento do documento não foi localizado para gerar o PDF.");
  }

  // Captura o elemento com canvas de alta definição
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: el.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.98);
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;

  // Verifica se é cupom térmico (largura estreita 80mm) ou folha A4 comercial
  const ehTermica =
    el.classList.contains("relatorio-termico-80mm") ||
    el.id.includes("termic") ||
    el.clientWidth < 420;

  let doc: jsPDF;

  if (ehTermica) {
    const larguraMm = 80;
    const alturaMm = Math.max(80, (imgHeightPx * larguraMm) / imgWidthPx);
    doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [larguraMm, alturaMm + 4],
    });
    doc.addImage(imgData, "JPEG", 2, 2, larguraMm - 4, alturaMm);
  } else {
    // Formato A4 padrão: 210mm x 297mm
    doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const margemX = 6;
    const margemY = 6;
    const larguraDisponivel = 210 - margemX * 2; // 198mm
    const alturaCalculada = (imgHeightPx * larguraDisponivel) / imgWidthPx;

    // Se couber em uma página sem estourar altura útil (285mm)
    if (alturaCalculada <= 285) {
      doc.addImage(imgData, "JPEG", margemX, margemY, larguraDisponivel, alturaCalculada);
    } else {
      // Ajusta proporção mantendo margens sem cortar o rodapé
      const proporcao = Math.min(1, 285 / alturaCalculada);
      const larguraFinal = larguraDisponivel * proporcao;
      const alturaFinal = alturaCalculada * proporcao;
      const centroX = margemX + (larguraDisponivel - larguraFinal) / 2;
      doc.addImage(imgData, "JPEG", centroX, margemY, larguraFinal, alturaFinal);
    }
  }

  const blob = doc.output("blob");
  const nomeSanitizado = nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`;
  const file = new File([blob], nomeSanitizado, { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  return { blob, file, url, doc };
}

/**
 * Dispara o download de um Blob no navegador
 */
export function baixarBlobComoArquivo(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4000);
}

/**
 * Envia mensagem pelo WhatsApp sempre acompanhada da cópia em PDF:
 * 1) No celular/tablets compatíveis: anexa o arquivo PDF diretamente via Web Share API
 * 2) No computador/WhatsApp Web: faz download automático do PDF + abre WhatsApp com a mensagem pronta para anexar
 */
export async function enviarWhatsAppComCopiaPdf({
  telefone,
  mensagem,
  elementoId = "documento-impresso-ativo",
  elemento,
  nomeArquivo,
  tituloDocumento = "Comprovante BR3 Tech",
}: OpcoesEnvioWhatsAppPdf): Promise<void> {
  const target = elemento || (elementoId ? document.getElementById(elementoId) : null);

  const toastId = toast.loading("Gerando cópia em PDF do documento...");

  try {
    let pdfResultado: { blob: Blob; file: File; url: string; doc: jsPDF } | null = null;

    if (target) {
      pdfResultado = await gerarPdfDeElemento(target, nomeArquivo);
    }

    toast.dismiss(toastId);

    // 1. Tenta compartilhamento nativo com o arquivo PDF anexado via Web Share API
    if (
      pdfResultado &&
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files: [pdfResultado.file] })
    ) {
      try {
        await navigator.share({
          title: tituloDocumento,
          text: mensagem,
          files: [pdfResultado.file],
        });
        toast.success("Comprovante enviado com cópia em PDF anexada!");
        return;
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.warn("Compartilhamento nativo não concluído, abrindo WhatsApp direto:", err);
        }
      }
    }

    // 2. Fluxo Universal (Desktop / WhatsApp Web):
    // Baixa o arquivo PDF localmente
    if (pdfResultado) {
      baixarBlobComoArquivo(pdfResultado.blob, nomeArquivo);
    }

    // Copia o texto para a área de transferência
    try {
      await navigator.clipboard.writeText(mensagem);
    } catch {
      // Ignora se não permitido
    }

    // Abre o WhatsApp Web / App diretamente com a mensagem
    const link = linkWhatsApp(telefone, mensagem);
    window.open(link, "_blank");

    toast.success(
      "📄 Cópia em PDF baixada com sucesso! O WhatsApp foi aberto para você colar a mensagem e anexar o PDF.",
      { duration: 7000 },
    );
  } catch (error) {
    console.error("Erro ao gerar PDF para WhatsApp:", error);
    toast.dismiss(toastId);
    toast.error("Não foi possível gerar o PDF automaticamente. Abrindo WhatsApp...");
    const link = linkWhatsApp(telefone, mensagem);
    window.open(link, "_blank");
  }
}
