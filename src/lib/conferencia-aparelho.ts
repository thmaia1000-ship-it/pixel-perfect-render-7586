/**
 * Mapeamento e controle da Conferência de Entrada do Aparelho (Termo de Entrada e Garantia BR3 Tech)
 * Conforme itens especificados no documento de conferência.
 */

export const ITENS_CONFERENCIA_ENTRADA = [
  "Liga normalmente",
  "Tela sem trincos",
  "Touch funcionando",
  "Câmera frontal OK",
  "Câmera traseira OK",
  "Alto-falante / Auricular OK",
  "Microfone OK",
  "Botões físicos (Power/Volume) OK",
  "Conector de carga OK",
  "Biometria (Digital/Face ID) OK",
  "Wi-Fi / Rede móvel OK",
  "Bateria saudável",
  "Carcaça sem amassados",
  "Acompanha capa/película",
  "Acompanha cabo/carregador",
] as const;

export type ItemConferenciaNome = (typeof ITENS_CONFERENCIA_ENTRADA)[number];

export type StatusConferencia = "OK" | "Defeito" | "N/V" | null;

export type ConferenciaChecklist = Record<string, StatusConferencia | undefined>;

export interface MidiaConferencia {
  id: string;
  nome: string;
  tipo: "imagem" | "video";
  url: string; // Base64 Data URL
  tamanhoFormatado: string;
  tamanhoBytes?: number;
  criadoEm: string;
}

/**
 * Cria o checklist padrão inicial (sem seleção inicial para que o técnico marque cada item)
 */
export function criarConferenciaPadrao(): ConferenciaChecklist {
  const padrao: ConferenciaChecklist = {};
  for (const item of ITENS_CONFERENCIA_ENTRADA) {
    padrao[item] = null;
  }
  return padrao;
}

/**
 * Serializa a conferência, texto livre de estado físico e mídias em uma string estruturada para salvar no banco
 */
export function serializarEstadoEConferencia(
  conferencia: ConferenciaChecklist,
  observacoesTexto?: string,
  midias?: MidiaConferencia[],
): string {
  const payload = {
    versao: 1,
    conferencia,
    observacoes: observacoesTexto?.trim() || "",
    midias: midias || [],
  };
  return JSON.stringify(payload);
}

/**
 * Desserializa a string de estado físico retornando a conferência, texto livre e mídias anexadas
 */
export function deserializarEstadoEConferencia(valor?: string | null): {
  conferencia: ConferenciaChecklist;
  observacoes: string;
  midias: MidiaConferencia[];
} {
  const padrao = criarConferenciaPadrao();
  if (!valor || !valor.trim()) {
    return { conferencia: padrao, observacoes: "", midias: [] };
  }

  try {
    const parsed = JSON.parse(valor);
    if (parsed && typeof parsed === "object" && parsed.conferencia) {
      return {
        conferencia: {
          ...padrao,
          ...parsed.conferencia,
        },
        observacoes: typeof parsed.observacoes === "string" ? parsed.observacoes : "",
        midias: Array.isArray(parsed.midias) ? parsed.midias : [],
      };
    }
  } catch {
    // Formato legado em texto puro
  }

  return {
    conferencia: padrao,
    observacoes: valor,
    midias: [],
  };
}
