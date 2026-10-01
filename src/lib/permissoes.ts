import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  deserializarEstadoEConferencia,
  serializarEstadoEConferencia,
} from "@/lib/conferencia-aparelho";
import type { OsStatus } from "@/lib/br3";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface ReaberturaRegistro {
  dataHora: string;
  autorizadoPorAdminNome: string;
  autorizadoPorAdminEmail: string;
  autorizadoPorAdminId?: string;
  solicitanteNome: string;
  solicitanteId?: string;
  motivo: string;
  statusAnterior: string;
  novoStatus: string;
}

const SUPABASE_URL =
  import.meta.env["VITE_SUPABASE_URL"] || "https://wfugtqltzfmisynurfil.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
  "sb_publishable_7kYdbVZuWRUcV74lWkL_0g_f3JHaWUd";

/**
 * Cria cliente isolado sem persistência de sessão para validar credenciais de admin
 * sem interferir na sessão ativa do usuário atual.
 */
function criarAuthClientTemporario() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Busca todos os administradores cadastrados no sistema
 */
export async function buscarAdministradores(): Promise<
  Array<{ id: string; nome: string; email: string }>
> {
  try {
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");

    if (rolesError) throw rolesError;

    const adminIds = (userRoles || []).map((r) => r.user_id);
    if (adminIds.length === 0) {
      // Se não houver papéis ainda na tabela user_roles, busca todos os profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .order("nome");
      return (profiles || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        email: p.email || "",
      }));
    }

    const { data: profiles, error: profError } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .in("id", adminIds)
      .order("nome");

    if (profError) throw profError;

    return (profiles || []).map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email || "",
    }));
  } catch (err) {
    console.error("Erro ao buscar administradores:", err);
    return [];
  }
}

/**
 * Valida a senha informada de um administrador
 */
export async function validarSenhaAdmin(
  email: string,
  senhaDigitada: string,
): Promise<{
  valido: boolean;
  admin?: { id: string; nome: string; email: string };
  erro?: string;
}> {
  const emailLimpo = email.trim().toLowerCase();
  const senhaLimpa = senhaDigitada.trim();

  if (!emailLimpo || !senhaLimpa) {
    return { valido: false, erro: "Informe o e-mail e a senha do administrador." };
  }

  try {
    const authTemp = criarAuthClientTemporario();
    const { data, error } = await authTemp.auth.signInWithPassword({
      email: emailLimpo,
      password: senhaLimpa,
    });

    if (error || !data.user) {
      return {
        valido: false,
        erro: "Senha do administrador incorreta. Tente novamente.",
      };
    }

    // Verifica se este usuário tem papel de admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    // Se houver papéis cadastrados, exige role = 'admin'. Se a tabela estiver vazia, permite o usuário autenticado.
    const { count: totalRoles } = await supabase
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    if (totalRoles && totalRoles > 0 && roleData?.role !== "admin") {
      return {
        valido: false,
        erro: "O usuário autenticado não possui privilégios de Administrador.",
      };
    }

    // Busca o nome no profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", data.user.id)
      .maybeSingle();

    return {
      valido: true,
      admin: {
        id: data.user.id,
        nome: profile?.nome || data.user.user_metadata?.nome || emailLimpo,
        email: emailLimpo,
      },
    };
  } catch (err: any) {
    return {
      valido: false,
      erro: err?.message || "Falha na validação das credenciais do administrador.",
    };
  }
}

/**
 * Executa a reabertura oficial da Ordem de Serviço com registro de auditoria
 */
export async function reabrirOrdemServico({
  osId,
  numeroOS,
  statusAnterior,
  novoStatus,
  motivo,
  adminNome,
  adminEmail,
  adminId,
  solicitanteNome,
  solicitanteId,
}: {
  osId: string;
  numeroOS: string;
  statusAnterior: string;
  novoStatus: OsStatus;
  motivo: string;
  adminNome: string;
  adminEmail: string;
  adminId?: string;
  solicitanteNome: string;
  solicitanteId?: string;
}) {
  // 1. Busca os dados atuais da OS para atualizar estado físico
  const { data: os, error: fetchError } = await supabase
    .from("ordens_servico")
    .select("estado_fisico")
    .eq("id", osId)
    .single();

  if (fetchError || !os) {
    throw new Error("Ordem de serviço não encontrada para reabertura.");
  }

  const { conferencia, observacoes, midias, assinaturaAutorizacao, encerramento } =
    deserializarEstadoEConferencia(os.estado_fisico);

  const novoRegistroReabertura: ReaberturaRegistro = {
    dataHora: new Date().toISOString(),
    autorizadoPorAdminNome: adminNome,
    autorizadoPorAdminEmail: adminEmail,
    autorizadoPorAdminId: adminId,
    solicitanteNome,
    solicitanteId,
    motivo: motivo.trim(),
    statusAnterior,
    novoStatus,
  };

  // Se houver encerramento anterior, registra a reabertura
  const encerramentoAtualizado = encerramento
    ? {
        ...encerramento,
        reabertoEm: novoRegistroReabertura.dataHora,
        reabertoPor: adminNome,
        motivoReabertura: motivo.trim(),
      }
    : null;

  const novoEstadoFisico = serializarEstadoEConferencia(
    conferencia,
    observacoes,
    midias,
    assinaturaAutorizacao,
    encerramentoAtualizado,
  );

  // 2. Atualiza a ordem de serviço no banco
  const { error: updateError } = await supabase
    .from("ordens_servico")
    .update({
      status: novoStatus,
      entregue_em: null, // Anula entrega para que volte a ficar ativa na bancada
      estado_fisico: novoEstadoFisico,
      updated_at: new Date().toISOString(),
    })
    .eq("id", osId);

  if (updateError) {
    throw new Error(`Erro ao atualizar ordem de serviço: ${updateError.message}`);
  }

  // 3. Registra no histórico da OS
  const textoHistorico =
    adminId && solicitanteId && adminId !== solicitanteId
      ? `Reabertura de OS autorizada pelo Administrador ${adminNome} (${adminEmail}) a pedido de ${solicitanteNome}. Motivo: ${motivo.trim()}`
      : `Reabertura de OS autorizada pelo Administrador ${adminNome}. Motivo: ${motivo.trim()}`;

  await supabase.from("os_historico").insert({
    os_id: osId,
    status: novoStatus,
    observacao: textoHistorico,
    usuario_id: solicitanteId || adminId || null,
    usuario_nome: solicitanteNome || adminNome,
  });

  return { sucesso: true, novoStatus };
}
