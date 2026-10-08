/**
 * Integração Oficial com o Google AI Studio (Gemini API)
 * Permite diagnóstico inteligente, pareceres técnicos e análise de falhas via IA.
 * Modelos suportados: gemini-2.0-flash, gemini-1.5-flash
 */

const GOOGLE_AI_STUDIO_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface DadosParaLaudoIA {
  osNumero?: number | string;
  aparelho: string;
  marca?: string;
  modelo?: string;
  imeiOuSerial?: string;
  defeitoRelatado: string;
  observacoesTecnicas?: string;
  laudoAtual?: string;
  valorServico?: number;
  valorPecas?: number;
  testesHardware?: Record<string, { status: string; detalhes?: string }>;
}

export interface RespostaIA {
  sucesso: boolean;
  texto?: string;
  erro?: string;
  modeloUsado?: string;
}

/**
 * Obtém a chave do Google AI Studio (do localStorage ou de variáveis de ambiente)
 */
export function obterChaveGoogleAIStudio(): string {
  if (typeof window !== "undefined") {
    const salvaLocal = localStorage.getItem("br3_google_ai_studio_key");
    if (salvaLocal && salvaLocal.trim().length > 10) {
      return salvaLocal.trim();
    }
  }

  const envKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  return (envKey || "").trim();
}

/**
 * Salva a chave do Google AI Studio no navegador
 */
export function salvarChaveGoogleAIStudio(chave: string): void {
  if (typeof window !== "undefined") {
    if (chave && chave.trim().length > 0) {
      localStorage.setItem("br3_google_ai_studio_key", chave.trim());
    } else {
      localStorage.removeItem("br3_google_ai_studio_key");
    }
  }
}

/**
 * Valida se uma chave do Google AI Studio é válida fazendo uma chamada leve de teste
 */
export async function testarChaveGoogleAIStudio(
  apiKey?: string,
): Promise<{ valida: boolean; mensagem: string }> {
  const chave = apiKey || obterChaveGoogleAIStudio();
  if (!chave) {
    return {
      valida: false,
      mensagem:
        "Nenhuma chave de API informada. Obtenha sua chave gratuitamente em aistudio.google.com.",
    };
  }

  try {
    const url = `${GOOGLE_AI_STUDIO_API_URL}/gemini-1.5-flash:generateContent?key=${encodeURIComponent(chave)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Responda apenas com a palavra: OK" }],
          },
        ],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson?.error?.message || `Erro HTTP ${response.status}`;
      return { valida: false, mensagem: `Chave inválida ou recusada pelo Google: ${msg}` };
    }

    return { valida: true, mensagem: "Conexão com Google AI Studio validada com sucesso!" };
  } catch (err: any) {
    return { valida: false, mensagem: `Falha na requisição: ${err?.message || "Sem conexão"}` };
  }
}

/**
 * Gera um Parecer Técnico / Laudo Pericial completo com IA utilizando o Google AI Studio
 */
export async function gerarParecerTecnicoComIA(dados: DadosParaLaudoIA): Promise<RespostaIA> {
  const apiKey = obterChaveGoogleAIStudio();

  if (!apiKey) {
    return {
      sucesso: false,
      erro: "Chave do Google AI Studio não configurada. Adicione sua chave gratuita do Google Gemini em aistudio.google.com para habilitar esta função.",
    };
  }

  const prompt = `Você é o Especialista Chefe em Engenharia de Hardware e Manutenção de Dispositivos Móveis e Informática da assistência técnica "BR3 Tech".
Sua tarefa é analisar os dados técnicos de uma Ordem de Serviço (OS) e emitir um PARECER TÉCNICO FORMAL E PROFISSIONAL para o laudo da OS e garantia.

DADOS DA ORDEM DE SERVIÇO:
- Número da OS: #${dados.osNumero || "N/A"}
- Dispositivo: ${dados.aparelho} ${dados.marca ? `(${dados.marca} ${dados.modelo || ""})` : ""}
- Identificador / IMEI / Serial: ${dados.imeiOuSerial || "Não informado"}
- Reclamação / Defeito Relatado pelo Cliente: "${dados.defeitoRelatado}"
${dados.observacoesTecnicas ? `- Observações da Bancada: "${dados.observacoesTecnicas}"` : ""}
${dados.laudoAtual ? `- Laudo Preliminar: "${dados.laudoAtual}"` : ""}

RESULTADOS DA BATERIA DE TESTES DE HARDWARE (*#0*#):
${
  dados.testesHardware
    ? Object.entries(dados.testesHardware)
        .map(
          ([teste, res]) =>
            `  • ${teste.toUpperCase()}: ${res.status.toUpperCase()} ${res.detalhes ? `(${res.detalhes})` : ""}`,
        )
        .join("\n")
    : "Bateria de testes em andamento."
}

DIRETRIZES DO LAUDO:
1. Comece com um resumo conciso do diagnóstico técnico (o que causou o defeito e quais circuitos/módulos foram avaliados).
2. Descreva o procedimento técnico recomendado ou executado (ex: substituição com calibração, desoxidação ultrassônica, reparo em micro-soldagem SMD, testes de bancada).
3. Especifique os testes pós-reparo que validam a entrega segura ao cliente (display, touch, câmeras, biometria/face, carga, consumo em fonte assimétrica).
4. Inclua recomendações preventivas para o cliente (uso de carregadores homologados, evitar umidade, proteção física).
5. O tom deve ser estritamente técnico, formal, polido e confiável para fins jurídicos e de garantia.
6. Não use Markdown excessivo, mantenha parágrafos objetivos prontos para impressão no laudo da OS.`;

  // Tenta primeiro gemini-2.0-flash, com fallback para gemini-1.5-flash
  const modelos = ["gemini-2.0-flash", "gemini-1.5-flash"];

  for (const modelo of modelos) {
    try {
      const url = `${GOOGLE_AI_STUDIO_API_URL}/${modelo}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const textoGerado = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textoGerado && textoGerado.trim().length > 0) {
          return {
            sucesso: true,
            texto: textoGerado.trim(),
            modeloUsado: modelo,
          };
        }
      }
    } catch {
      // tenta próximo modelo
    }
  }

  return {
    sucesso: false,
    erro: "Não foi possível obter resposta dos servidores do Google AI Studio. Verifique a chave de API e a conexão.",
  };
}
