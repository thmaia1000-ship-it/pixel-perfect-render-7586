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

/**
 * Itens do Checklist de Saída / Encerramento da Ordem de Serviço
 */
export const ITENS_CHECKLIST_SAIDA = [
  "Aparelho liga e inicializa perfeitamente",
  "Tela / Display sem manchas ou burn-in",
  "Touchscreen 100% responsivo",
  "Câmeras frontal e traseira focando e nítidas",
  "Áudio auricular e viva-voz limpos sem chiados",
  "Microfone gravando áudio com clareza",
  "Carregamento testado e subindo carga",
  "Wi-Fi e Bluetooth conectando",
  "Rede de chip / Dados móveis funcionando",
  "Sensores (Proximidade / Giroscópio) OK",
  "Biometria / Reconhecimento facial OK",
  "Botões Power e Volume firmes",
  "Limpeza e higienização física concluídas",
  "Parafusos e carcaça perfeitamente alinhados",
] as const;

export type ItemConferenciaNome = (typeof ITENS_CONFERENCIA_ENTRADA)[number];
export type ItemChecklistSaidaNome = (typeof ITENS_CHECKLIST_SAIDA)[number];

export type StatusConferencia = "OK" | "Defeito" | "N/V" | null;

export type ConferenciaChecklist = Record<string, StatusConferencia | undefined>;

/**
 * Testes de diagnóstico de hardware do aparelho
 */
export type TesteHardwareId =
  | "red"
  | "green"
  | "blue"
  | "white"
  | "black"
  | "touch"
  | "receiver"
  | "speaker"
  | "mic"
  | "vibration"
  | "dimming"
  | "camera_front"
  | "camera_back"
  | "sensor"
  | "sub_key"
  | "charging";

export interface ItemTesteHardware {
  id: TesteHardwareId;
  titulo: string;
  descricao: string;
  categoria: "display" | "audio" | "sensores" | "cameras" | "geral";
}

export const LISTA_TESTES_HARDWARE: ItemTesteHardware[] = [
  {
    id: "red",
    titulo: "Red (Vermelho)",
    descricao: "Teste de pixels mortos e fidelidade de cor vermelha",
    categoria: "display",
  },
  {
    id: "green",
    titulo: "Green (Verde)",
    descricao: "Teste de pixels mortos e fidelidade de cor verde",
    categoria: "display",
  },
  {
    id: "blue",
    titulo: "Blue (Azul)",
    descricao: "Teste de pixels mortos e fidelidade de cor azul",
    categoria: "display",
  },
  {
    id: "white",
    titulo: "White (Branco)",
    descricao: "Inspeção de manchas, uniformidade da tela e iluminação",
    categoria: "display",
  },
  {
    id: "black",
    titulo: "Black (Preto)",
    descricao: "Contraste, vazamento de luz e pureza de preto",
    categoria: "display",
  },
  {
    id: "touch",
    titulo: "Touch Grid (Grade)",
    descricao: "Mapeamento e precisão de toque em todas as áreas da tela",
    categoria: "display",
  },
  {
    id: "receiver",
    titulo: "Receiver (Auricular)",
    descricao: "Teste de áudio do alto-falante superior de chamadas",
    categoria: "audio",
  },
  {
    id: "speaker",
    titulo: "Speaker (Viva-voz)",
    descricao: "Teste de alto-falante principal e potência estéreo",
    categoria: "audio",
  },
  {
    id: "mic",
    titulo: "Microphone (Microfone)",
    descricao: "Gravação e eco para teste do microfone principal e cancelamento",
    categoria: "audio",
  },
  {
    id: "vibration",
    titulo: "Vibration (Vibração)",
    descricao: "Ativação do motor de vibração / feedback tátil",
    categoria: "geral",
  },
  {
    id: "dimming",
    titulo: "Dimming (Brilho)",
    descricao: "Teste de controle de intensidade de iluminação do display",
    categoria: "display",
  },
  {
    id: "camera_back",
    titulo: "Mega Cam (Traseira)",
    descricao: "Câmera principal traseira, autofoco e resolução",
    categoria: "cameras",
  },
  {
    id: "camera_front",
    titulo: "Front Cam (Frontal)",
    descricao: "Câmera frontal para selfies e chamadas",
    categoria: "cameras",
  },
  {
    id: "sensor",
    titulo: "Sensor (Acelerômetro/Luz)",
    descricao: "Leitura de sensores de aceleração, giroscópio e proximidade",
    categoria: "sensores",
  },
  {
    id: "sub_key",
    titulo: "Sub Key (Teclas Físicas)",
    descricao: "Teste de acionamento dos botões Power e Volume",
    categoria: "geral",
  },
  {
    id: "charging",
    titulo: "Charging (Carregamento)",
    descricao: "Teste de conector de carga, detecção de carregador e subida de bateria",
    categoria: "geral",
  },
];

export interface ResultadoTesteHardware {
  id: TesteHardwareId;
  status: "aprovado" | "reprovado" | "ignorado";
  dataHora: string;
  detalhes?: string;
}

export interface DiagnosticoExecutado {
  executadoEm: string;
  aparelhoInfo?: string;
  testes: Record<string, ResultadoTesteHardware>;
  observacoes?: string;
  totalAprovados: number;
  totalReprovados: number;
}

export interface EncerramentoOS {
  checklistSaida: ConferenciaChecklist;
  diagnosticoHardware?: DiagnosticoExecutado | null;
  observacoesSaida?: string;
  encerradoEm: string;
  tecnicoNome?: string;
}

export interface MidiaConferencia {
  id: string;
  nome: string;
  tipo: "imagem" | "video";
  url: string; // Base64 Data URL
  tamanhoFormatado: string;
  tamanhoBytes?: number;
  criadoEm: string;
}

export type AssinaturaAutorizacao = {
  dataUrl: string;
  aprovado_em: string;
  nome_signatario: string;
  documento_signatario?: string | null;
  recusado?: boolean;
  motivo_recusa?: string | null;
};

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
 * Cria o checklist padrão de saída
 */
export function criarChecklistSaidaPadrao(): ConferenciaChecklist {
  const padrao: ConferenciaChecklist = {};
  for (const item of ITENS_CHECKLIST_SAIDA) {
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
  assinaturaAutorizacao?: AssinaturaAutorizacao | null,
  encerramento?: EncerramentoOS | null,
): string {
  const payload = {
    versao: 1,
    conferencia,
    observacoes: observacoesTexto?.trim() || "",
    midias: midias || [],
    assinatura_autorizacao: assinaturaAutorizacao || null,
    encerramento: encerramento || null,
  };
  return JSON.stringify(payload);
}

/**
 * Desserializa a string de estado físico retornando a conferência, texto livre, mídias anexadas, assinatura de autorização e encerramento
 */
export function deserializarEstadoEConferencia(valor?: string | null): {
  conferencia: ConferenciaChecklist;
  observacoes: string;
  midias: MidiaConferencia[];
  assinaturaAutorizacao: AssinaturaAutorizacao | null;
  encerramento: EncerramentoOS | null;
} {
  const padrao = criarConferenciaPadrao();
  if (!valor || !valor.trim()) {
    return {
      conferencia: padrao,
      observacoes: "",
      midias: [],
      assinaturaAutorizacao: null,
      encerramento: null,
    };
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
        assinaturaAutorizacao: parsed.assinatura_autorizacao || null,
        encerramento: parsed.encerramento || null,
      };
    }
  } catch {
    // Formato legado em texto puro
  }

  return {
    conferencia: padrao,
    observacoes: valor,
    midias: [],
    assinaturaAutorizacao: null,
    encerramento: null,
  };
}
