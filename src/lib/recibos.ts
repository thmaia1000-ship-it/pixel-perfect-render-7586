/**
 * Tipos e utilitários para Gerenciamento e Emissão de Recibos Avulsos — BR3 Tech
 */

export type FormaPagamentoRecibo =
  "pix" | "dinheiro" | "cartao_credito" | "cartao_debito" | "transferencia";

export const FORMAS_PAGAMENTO_LABELS: Record<FormaPagamentoRecibo, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro em Espécie",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  transferencia: "Transferência Bancária / TED",
};

export interface ReciboAvulso {
  id: string;
  numero: string;
  clienteNome: string;
  clienteDocumento?: string; // CPF ou CNPJ
  clienteTelefone?: string;
  clienteId?: string;
  valor: number;
  valorExtenso: string;
  referente: string;
  formaPagamento: FormaPagamentoRecibo;
  dataEmissao: string; // ISO
  cidade: string;
  emitenteNome: string;
  emitenteCargo?: string;
  observacoes?: string;
  modeloImpressao: "padrao_a4" | "duas_vias" | "termica_80mm";
  criadoEm: string;
}

const STORAGE_KEY = "br3_recibos_avulsos_v1";

/**
 * Converte valor numérico em reais para texto por extenso em português do Brasil
 */
export function converterParaExtenso(valor: number): string {
  if (!valor || isNaN(valor) || valor <= 0) return "Zero reais";

  const centavos = Math.round((valor % 1) * 100);
  const reais = Math.floor(valor);

  const unidades = [
    "",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];

  const dezenas = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];

  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  function tresDigitos(num: number): string {
    if (num === 0) return "";
    if (num === 100) return "cem";

    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;
    const partes: string[] = [];

    if (c > 0) partes.push(centenas[c]);

    const resto = num % 100;
    if (resto > 0 && resto < 20) {
      partes.push(unidades[resto]);
    } else {
      if (d > 0) partes.push(dezenas[d]);
      if (u > 0) partes.push(unidades[u]);
    }

    return partes.join(" e ");
  }

  const partesReais: string[] = [];

  const milhoes = Math.floor(reais / 1000000);
  const milhares = Math.floor((reais % 1000000) / 1000);
  const unidadesCentena = reais % 1000;

  if (milhoes > 0) {
    partesReais.push(`${tresDigitos(milhoes)} ${milhoes === 1 ? "milhão" : "milhões"}`);
  }

  if (milhares > 0) {
    if (milhares === 1) {
      partesReais.push("mil");
    } else {
      partesReais.push(`${tresDigitos(milhares)} mil`);
    }
  }

  if (unidadesCentena > 0) {
    partesReais.push(tresDigitos(unidadesCentena));
  }

  let textoReais = "";
  if (reais > 0) {
    const pluralOuSingular = reais === 1 ? "real" : "reais";
    textoReais = `${partesReais.join(" e ")} ${pluralOuSingular}`;
  }

  let textoCentavos = "";
  if (centavos > 0) {
    const cExtenso = tresDigitos(centavos);
    const pluralOuSingular = centavos === 1 ? "centavo" : "centavos";
    textoCentavos = `${cExtenso} ${pluralOuSingular}`;
  }

  let resultado = "";
  if (textoReais && textoCentavos) {
    resultado = `${textoReais} e ${textoCentavos}`;
  } else if (textoReais) {
    resultado = textoReais;
  } else if (textoCentavos) {
    resultado = textoCentavos;
  } else {
    resultado = "Zero reais";
  }

  // Capitaliza a primeira letra
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}

/**
 * Gera próximo número sequencial de recibo
 */
export function gerarProximoNumeroRecibo(): string {
  const recibos = listarRecibos();
  const ano = new Date().getFullYear();

  // Filtra recibos do ano atual
  const prefixo = `REC-${ano}-`;
  let maiorNumero = 0;

  for (const r of recibos) {
    if (r.numero?.startsWith(prefixo)) {
      const parteNum = parseInt(r.numero.replace(prefixo, ""), 10);
      if (!isNaN(parteNum) && parteNum > maiorNumero) {
        maiorNumero = parteNum;
      }
    }
  }

  const proximo = maiorNumero + 1;
  return `${prefixo}${String(proximo).padStart(4, "0")}`;
}

/**
 * Lista todos os recibos emitidos ordenados pelo mais recente
 */
export function listarRecibos(): ReciboAvulso[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Erro ao carregar recibos:", err);
    return [];
  }
}

/**
 * Salva um novo recibo avulso
 */
export function salvarRecibo(dados: Omit<ReciboAvulso, "id" | "criadoEm">): ReciboAvulso {
  const recibos = listarRecibos();
  const novo: ReciboAvulso = {
    ...dados,
    id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    criadoEm: new Date().toISOString(),
  };

  const listaAtualizada = [novo, ...recibos];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listaAtualizada));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("br3_recibos_atualizados"));
  }

  return novo;
}

/**
 * Exclui um recibo pelo ID
 */
export function excluirRecibo(id: string): void {
  const recibos = listarRecibos();
  const filtrados = recibos.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtrados));

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("br3_recibos_atualizados"));
  }
}

/**
 * Formata texto amigável para envio de recibo pelo WhatsApp
 */
export function gerarTextoWhatsAppRecibo(recibo: ReciboAvulso): string {
  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(recibo.dataEmissao));

  const valorFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(recibo.valor);

  return (
    `*COMPROVANTE DE RECIBO DE PAGAMENTO — BR3 TECH*\n\n` +
    `📄 *Recibo:* ${recibo.numero}\n` +
    `👤 *Cliente / Pagador:* ${recibo.clienteNome}\n` +
    `💰 *Valor:* ${valorFormatado} (${recibo.valorExtenso})\n` +
    `💳 *Forma de Pagamento:* ${FORMAS_PAGAMENTO_LABELS[recibo.formaPagamento]}\n` +
    `📅 *Data de Emissão:* ${dataFormatada}\n` +
    `📝 *Referente a:* ${recibo.referente}\n\n` +
    (recibo.observacoes ? `ℹ️ *Obs:* ${recibo.observacoes}\n\n` : "") +
    `_Agradecemos pela preferência! Para qualquer dúvida, entre em contato conosco._\n` +
    `*BR3 Tech — Manaus/AM · (92) 99236-5757*`
  );
}
