import { supabase } from "@/integrations/supabase/client";

export interface AssinaturaUsuarioRegistro {
  userId: string;
  nome: string;
  dataUrl: string;
  atualizadoEm: string;
  tipo?: "desenho" | "upload";
}

const STORAGE_KEY = "br3_assinaturas_digitais_usuarios_v1";
const MINHA_ASSINATURA_KEY = "br3_minha_assinatura_digital_v1";

/**
 * Retorna o mapa completo de todas as assinaturas de usuários registradas
 */
export function listarTodasAssinaturas(): Record<string, AssinaturaUsuarioRegistro> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao carregar mapa de assinaturas:", err);
    return {};
  }
}

/**
 * Obtém a assinatura digital cadastrada para um usuário específico
 */
export function obterAssinaturaUsuario(userId?: string | null): string | null {
  if (!userId || typeof window === "undefined") return null;
  const mapa = listarTodasAssinaturas();
  if (mapa[userId]?.dataUrl) {
    return mapa[userId].dataUrl;
  }
  return null;
}

/**
 * Obtém a assinatura digital do usuário atualmente logado ou a assinatura padrão de fallback
 */
export function obterMinhaAssinatura(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const direta = localStorage.getItem(MINHA_ASSINATURA_KEY);
    if (direta) return direta;

    const mapa = listarTodasAssinaturas();
    const chaves = Object.keys(mapa);
    if (chaves.length > 0) {
      return mapa[chaves[0]].dataUrl;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Obtém a assinatura do técnico responsável da OS, caindo para a do usuário logado se não houver
 */
export function obterAssinaturaTecnicoOuLoja(tecnicoId?: string | null): string | null {
  if (tecnicoId) {
    const assTecnico = obterAssinaturaUsuario(tecnicoId);
    if (assTecnico) return assTecnico;
  }
  return obterMinhaAssinatura();
}

/**
 * Salva a assinatura digital de um usuário
 */
export async function salvarAssinaturaUsuario(
  userId: string,
  dataUrl: string,
  nome = "Colaborador",
  tipo: "desenho" | "upload" = "desenho",
): Promise<void> {
  if (!userId || !dataUrl || typeof window === "undefined") return;

  const mapa = listarTodasAssinaturas();
  mapa[userId] = {
    userId,
    nome,
    dataUrl,
    atualizadoEm: new Date().toISOString(),
    tipo,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
  localStorage.setItem(MINHA_ASSINATURA_KEY, dataUrl);

  // Tenta sincronizar com o user_metadata do Supabase Auth se for o usuário ativo
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user && data.user.id === userId) {
      await supabase.auth.updateUser({
        data: {
          assinatura_digital: dataUrl,
          assinatura_atualizada_em: new Date().toISOString(),
        },
      });
    }
  } catch (err) {
    console.warn("Aviso: Não foi possível sincronizar com o user_metadata do auth:", err);
  }

  // Notifica toda a aplicação para atualização reativa instantânea
  window.dispatchEvent(
    new CustomEvent("br3_assinatura_usuario_atualizada", {
      detail: { userId, dataUrl },
    }),
  );
}

/**
 * Remove a assinatura digital de um usuário
 */
export async function removerAssinaturaUsuario(userId: string): Promise<void> {
  if (!userId || typeof window === "undefined") return;

  const mapa = listarTodasAssinaturas();
  delete mapa[userId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));

  try {
    const { data } = await supabase.auth.getUser();
    if (data.user && data.user.id === userId) {
      localStorage.removeItem(MINHA_ASSINATURA_KEY);
      await supabase.auth.updateUser({
        data: {
          assinatura_digital: null,
          assinatura_atualizada_em: null,
        },
      });
    }
  } catch {
    // Ignora erro
  }

  window.dispatchEvent(
    new CustomEvent("br3_assinatura_usuario_atualizada", {
      detail: { userId, dataUrl: null },
    }),
  );
}
