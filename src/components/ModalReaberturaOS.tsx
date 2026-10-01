import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  CheckCircle2,
  Wrench,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  buscarAdministradores,
  validarSenhaAdmin,
  reabrirOrdemServico,
  type AppRole,
} from "@/lib/permissoes";
import { STATUS_LABEL, type OsStatus } from "@/lib/br3";

interface ModalReaberturaOSProps {
  aberto: boolean;
  onFechar: () => void;
  osId: string;
  osNumero: string;
  statusAtual: string;
  clienteNome?: string;
  aparelhoModelo?: string;
  onReabertoSucesso?: () => void;
}

const OPCOES_NOVO_STATUS: Array<{ valor: OsStatus; label: string; descricao: string }> = [
  {
    valor: "em_reparo",
    label: "Em Reparo (Bancada Técnica)",
    descricao: "Retorna o aparelho imediatamente para a bancada técnica para correção/retrabalho.",
  },
  {
    valor: "em_diagnostico",
    label: "Em Diagnóstico (Reavaliação)",
    descricao: "Reinicia o diagnóstico técnico completo para verificar novas falhas ou sintomas.",
  },
  {
    valor: "aguardando_aprovacao",
    label: "Aguardando Aprovação (Novo Orçamento)",
    descricao:
      "Coloca a OS em espera de autorização do cliente para novo valor ou orçamento complementar.",
  },
  {
    valor: "recebida",
    label: "Recebida (Reabertura Inicial)",
    descricao: "Volta ao estágio inicial de entrada na assistência.",
  },
];

export function ModalReaberturaOS({
  aberto,
  onFechar,
  osId,
  osNumero,
  statusAtual,
  clienteNome,
  aparelhoModelo,
  onReabertoSucesso,
}: ModalReaberturaOSProps) {
  const queryClient = useQueryClient();

  const [novoStatus, setNovoStatus] = useState<OsStatus>("em_reparo");
  const [motivo, setMotivo] = useState("");
  const [adminSelecionadoEmail, setAdminSelecionadoEmail] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  // Consulta do usuário atualmente logado
  const { data: usuarioAtual } = useQuery({
    queryKey: ["usuario-logado-reabertura"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;

      const [roleResp, profileResp] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", data.user.id).maybeSingle(),
        supabase.from("profiles").select("nome").eq("id", data.user.id).maybeSingle(),
      ]);

      const role = (roleResp.data?.role as AppRole) || null;
      const nome =
        profileResp.data?.nome ||
        data.user.user_metadata?.nome ||
        data.user.email?.split("@")[0] ||
        "Colaborador";

      return {
        id: data.user.id,
        email: data.user.email || "",
        nome,
        role,
      };
    },
    enabled: aberto,
  });

  // Consulta de todos os administradores para seleção
  const { data: administradores = [] } = useQuery({
    queryKey: ["administradores-sistema"],
    queryFn: buscarAdministradores,
    enabled: aberto,
  });

  // Se o usuário logado for admin OU se ainda não houver nenhum admin cadastrado no sistema (fallback)
  const isAdmin =
    usuarioAtual?.role === "admin" || (administradores.length === 0 && Boolean(usuarioAtual));

  // Reset de formulário ao abrir
  useEffect(() => {
    if (aberto) {
      setMotivo("");
      setSenhaAdmin("");
      setErroMsg(null);
      setNovoStatus("em_reparo");
      if (administradores.length > 0) {
        setAdminSelecionadoEmail(administradores[0].email);
      }
    }
  }, [aberto, administradores]);

  // Tecla Escape para fechar
  useEffect(() => {
    if (!aberto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !processando) {
        onFechar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aberto, processando, onFechar]);

  async function handleConfirmarReabertura(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg(null);

    const motivoLimpo = motivo.trim();
    if (!motivoLimpo) {
      setErroMsg("Informe a justificativa/motivo detalhado para reabrir esta Ordem de Serviço.");
      return;
    }

    if (motivoLimpo.length < 5) {
      setErroMsg("O motivo da reabertura deve conter pelo menos 5 caracteres.");
      return;
    }

    setProcessando(true);

    try {
      let adminNomeFinal = usuarioAtual?.nome || "Administrador";
      let adminEmailFinal = usuarioAtual?.email || "";
      let adminIdFinal = usuarioAtual?.id;

      // Se o usuário logado NÃO for admin, valida a senha informada
      if (!isAdmin) {
        if (!adminSelecionadoEmail) {
          setErroMsg("Selecione o Administrador responsável pela autorização.");
          setProcessando(false);
          return;
        }

        if (!senhaAdmin) {
          setErroMsg("Digite a senha do Administrador para autorizar a liberação.");
          setProcessando(false);
          return;
        }

        const validacao = await validarSenhaAdmin(adminSelecionadoEmail, senhaAdmin);
        if (!validacao.valido || !validacao.admin) {
          setErroMsg(validacao.erro || "Senha de Administrador incorreta.");
          setProcessando(false);
          return;
        }

        adminNomeFinal = validacao.admin.nome;
        adminEmailFinal = validacao.admin.email;
        adminIdFinal = validacao.admin.id;
      }

      // Executa a reabertura
      await reabrirOrdemServico({
        osId,
        numeroOS: osNumero,
        statusAnterior: statusAtual,
        novoStatus,
        motivo: motivoLimpo,
        adminNome: adminNomeFinal,
        adminEmail: adminEmailFinal,
        adminId: adminIdFinal,
        solicitanteNome: usuarioAtual?.nome || "Colaborador",
        solicitanteId: usuarioAtual?.id,
      });

      toast.success(
        `✓ Ordem de Serviço #${osNumero} reaberta com sucesso e retornada para ${STATUS_LABEL[novoStatus]}!`,
      );

      await queryClient.invalidateQueries();
      onReabertoSucesso?.();
      onFechar();
    } catch (err: any) {
      console.error("Erro na reabertura de OS:", err);
      setErroMsg(err?.message || "Ocorreu um erro ao processar a reabertura da OS.");
    } finally {
      setProcessando(false);
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Reabertura de Ordem de Serviço</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                  #{osNumero}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {clienteNome && `${clienteNome} · `}
                {aparelhoModelo || "Equipamento"} (Situação atual:{" "}
                <span className="font-semibold text-foreground">
                  {STATUS_LABEL[statusAtual as OsStatus] || statusAtual}
                </span>
                )
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onFechar}
            disabled={processando}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Banner de Permissão */}
        {isAdmin ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs text-emerald-950 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Privilégio de Administrador Ativo</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                Você está autenticado como <strong>{usuarioAtual?.nome}</strong>. Sua autorização
                será registrada no histórico oficial da OS.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
            <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Autorização de Administrador Necessária</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                A reabertura de ordens fechadas é uma ação restrita. Solicite a um administrador
                para selecionar seu usuário e digitar sua senha de liberação abaixo.
              </p>
            </div>
          </div>
        )}

        {/* Mensagem de Erro */}
        {erroMsg && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{erroMsg}</span>
          </div>
        )}

        {/* Formulário de Reabertura */}
        <form onSubmit={handleConfirmarReabertura} className="space-y-3.5 text-xs">
          {/* Seção de Credenciais de Administrador (para não-administradores) */}
          {!isAdmin && (
            <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <span>Liberação do Administrador</span>
              </div>

              {/* Seleção do Administrador */}
              <div className="space-y-1">
                <Label htmlFor="admin-select" className="text-[11px]">
                  Administrador Responsável
                </Label>
                {administradores.length > 0 ? (
                  <select
                    id="admin-select"
                    value={adminSelecionadoEmail}
                    onChange={(e) => setAdminSelecionadoEmail(e.target.value)}
                    disabled={processando}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {administradores.map((adm) => (
                      <option key={adm.id} value={adm.email}>
                        {adm.nome} ({adm.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="admin-select"
                    type="email"
                    placeholder="E-mail do administrador"
                    value={adminSelecionadoEmail}
                    onChange={(e) => setAdminSelecionadoEmail(e.target.value)}
                    disabled={processando}
                    className="text-xs h-8"
                  />
                )}
              </div>

              {/* Senha do Administrador */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-password" className="text-[11px]">
                    Senha do Administrador
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Validação presencial em bancada
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Digite a senha de administrador"
                    value={senhaAdmin}
                    onChange={(e) => setSenhaAdmin(e.target.value)}
                    disabled={processando}
                    autoComplete="current-password"
                    className="pr-9 text-xs h-8"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Seleção do Novo Status */}
          <div className="space-y-1.5">
            <Label
              htmlFor="novo-status"
              className="font-semibold text-xs flex items-center gap-1.5"
            >
              <Wrench className="h-3.5 w-3.5 text-primary" />
              <span>Novo Status de Destino na Reabertura</span>
            </Label>
            <select
              id="novo-status"
              value={novoStatus}
              onChange={(e) => setNovoStatus(e.target.value as OsStatus)}
              disabled={processando}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
            >
              {OPCOES_NOVO_STATUS.map((opt) => (
                <option key={opt.valor} value={opt.valor}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              {OPCOES_NOVO_STATUS.find((o) => o.valor === novoStatus)?.descricao}
            </p>
          </div>

          {/* Motivo Obrigatório da Reabertura */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="motivo-reabertura" className="font-semibold text-xs">
                Justificativa / Motivo da Reabertura *
              </Label>
              <span className="text-[10px] text-muted-foreground">Obrigatório para auditoria</span>
            </div>
            <Textarea
              id="motivo-reabertura"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={processando}
              placeholder="Ex: Retorno em garantia - cliente relatou que a bateria não segura carga. Necessário abrir novamente o aparelho para análise e troca de componente."
              maxLength={500}
              className="text-xs resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFechar}
              disabled={processando}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={processando}
              className="text-xs gap-1.5 font-bold bg-amber-600 hover:bg-amber-500 text-white"
            >
              {processando ? (
                <>Processando Reabertura...</>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {isAdmin ? "Confirmar Reabertura da OS" : "Validar Senha e Reabrir OS"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
