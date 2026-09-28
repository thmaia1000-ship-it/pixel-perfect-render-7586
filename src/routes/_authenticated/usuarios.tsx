import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  UserPlus,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Share2,
  Mail,
  UserCheck,
  UserX,
  RefreshCw,
  Wrench,
  Headphones,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { dataCurta, linkWhatsApp } from "@/lib/br3";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Administração de Usuários — BR3 Tech" },
      {
        name: "description",
        content: "Gerenciamento de usuários, permissões e acessos da equipe BR3 Tech.",
      },
      { property: "og:title", content: "Administração de Usuários — BR3 Tech" },
      {
        property: "og:description",
        content: "Gerenciamento de usuários, permissões e acessos da equipe BR3 Tech.",
      },
    ],
  }),
  component: AdministracaoUsuarios,
});

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, { label: string; class: string; icon: typeof ShieldCheck }> = {
  admin: {
    label: "Administrador",
    class: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: ShieldCheck,
  },
  tecnico: {
    label: "Técnico",
    class: "bg-sky-500/15 text-sky-400 border-sky-500/30",
    icon: Wrench,
  },
  atendente: {
    label: "Atendente",
    class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: Headphones,
  },
};

const emailSchema = z.string().trim().email("Informe um e-mail válido").max(255);
const senhaSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72);
const nomeSchema = z.string().trim().min(2, "Informe o nome completo").max(100);

function gerarSenhaAleatoria(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  let senha = "";
  for (let i = 0; i < 10; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

function AdministracaoUsuarios() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Form de novo usuário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [papel, setPapel] = useState<AppRole>("tecnico");

  // Credenciais recém-criadas para exibição/cópia
  const [credenciaisCriadas, setCredenciaisCriadas] = useState<{
    nome: string;
    email: string;
    senha: string;
    papel: AppRole;
    telefone?: string;
  } | null>(null);

  // Consulta usuários e papéis
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => {
      const [perfisResp, papeisResp] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
      ]);

      if (perfisResp.error) throw perfisResp.error;

      const papeisMap: Record<string, AppRole> = {};
      if (papeisResp.data) {
        for (const r of papeisResp.data) {
          papeisMap[r.user_id] = r.role;
        }
      }

      return (perfisResp.data || []).map((p) => ({
        ...p,
        role: papeisMap[p.id] || ("tecnico" as AppRole),
      }));
    },
  });

  const { data: usuarioAtual } = useQuery({
    queryKey: ["usuario-atual"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  function abrirModalNovo() {
    setNome("");
    setEmail("");
    setSenha(gerarSenhaAleatoria());
    setTelefone("");
    setPapel("tecnico");
    setErro(null);
    setCredenciaisCriadas(null);
    setModalAberto(true);
  }

  async function criarUsuario(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const nomeOk = nomeSchema.safeParse(nome);
    if (!nomeOk.success) return setErro(nomeOk.error.issues[0]!.message);

    const emailOk = emailSchema.safeParse(email);
    if (!emailOk.success) return setErro(emailOk.error.issues[0]!.message);

    const senhaOk = senhaSchema.safeParse(senha);
    if (!senhaOk.success) return setErro(senhaOk.error.issues[0]!.message);

    setSalvando(true);
    try {
      const SUPABASE_URL =
        import.meta.env["VITE_SUPABASE_URL"] || "https://wfugtqltzfmisynurfil.supabase.co";
      const SUPABASE_KEY =
        import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
        "sb_publishable_7kYdbVZuWRUcV74lWkL_0g_f3JHaWUd";

      // Instância secundária isolada para NÃO desconectar o admin logado
      const tempClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
        email: emailOk.data,
        password: senhaOk.data,
        options: {
          data: {
            nome: nomeOk.data,
            telefone: telefone.trim() || null,
            role: papel,
          },
        },
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (signUpData.user) {
        // Assegura atribuição correta do papel em user_roles
        try {
          await supabase.from("user_roles").upsert(
            {
              user_id: signUpData.user.id,
              role: papel,
            },
            { onConflict: "user_id,role" },
          );
        } catch {
          // Trigger handle_new_user já cuida se configurado
        }
      }

      setCredenciaisCriadas({
        nome: nomeOk.data,
        email: emailOk.data,
        senha: senhaOk.data,
        papel,
        telefone: telefone.trim() || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success(`Usuário ${nomeOk.data} criado com sucesso!`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cadastrar novo usuário.");
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(userId: string, statusAtual: boolean, nomeUser: string) {
    if (userId === usuarioAtual?.id) {
      toast.error("Você não pode desativar seu próprio usuário administrador.");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo: !statusAtual })
        .eq("id", userId);
      if (error) throw error;

      toast.success(
        `Usuário ${nomeUser} foi ${!statusAtual ? "ativado" : "desativado"} com sucesso.`,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
    }
  }

  async function alterarPapel(userId: string, novoPapel: AppRole, nomeUser: string) {
    try {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: novoPapel }, { onConflict: "user_id,role" });
      if (error) throw error;

      toast.success(`Papel de ${nomeUser} atualizado para ${ROLE_LABELS[novoPapel].label}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o papel.");
    }
  }

  async function enviarRedefinicaoSenha(emailUser: string, nomeUser: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailUser, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      toast.success(`Link de redefinição de senha enviado para ${emailUser} (${nomeUser}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar e-mail de redefinição.");
    }
  }

  const usuariosFiltrados = (usuarios || []).filter((u) => {
    const termo = busca.toLowerCase();
    return (
      u.nome.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      (u.telefone && u.telefone.toLowerCase().includes(termo))
    );
  });

  const textoAcessoWhatsApp = credenciaisCriadas
    ? `Olá, ${credenciaisCriadas.nome}! Seu acesso ao sistema da BR3 Tech foi criado com sucesso.\n\nE-mail: ${credenciaisCriadas.email}\nSenha inicial: ${credenciaisCriadas.senha}\nCargo: ${ROLE_LABELS[credenciaisCriadas.papel].label}\n\nAcesse pelo link: ${window.location.origin}/auth`
    : "";

  return (
    <AppShell
      title="Administração de Usuários"
      actions={
        <Button onClick={abrirModalNovo} className="gap-2 shadow-sm">
          <UserPlus className="h-4 w-4" /> Novo Usuário
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Painel de introdução */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Controle de Equipe e Permissões de Acesso
            </h2>
            <p className="text-xs text-muted-foreground">
              Cadastre novos colaboradores, defina senhas de login e controle cargos de
              administrador, técnico e atendente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Carregando colaboradores...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {busca
                  ? "Nenhum colaborador encontrado para essa busca."
                  : "Nenhum colaborador cadastrado ainda."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Colaborador</th>
                    <th className="px-4 py-3 font-semibold">Contato</th>
                    <th className="px-4 py-3 font-semibold">Função / Cargo</th>
                    <th className="px-4 py-3 font-semibold">Situação</th>
                    <th className="px-4 py-3 font-semibold">Cadastrado em</th>
                    <th className="px-4 py-3 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {usuariosFiltrados.map((u) => {
                    const RoleIcon = ROLE_LABELS[u.role]?.icon || ShieldCheck;
                    const ehVoce = u.id === usuarioAtual?.id;

                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                              {u.nome.charAt(0) || "U"}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                {u.nome}
                                {ehVoce && (
                                  <span className="rounded bg-primary/15 px-1 py-0.2 text-[9px] font-bold text-primary">
                                    Você
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {u.telefone || "—"}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`gap-1 text-[11px] font-medium ${ROLE_LABELS[u.role]?.class}`}
                            >
                              <RoleIcon className="h-3 w-3" />
                              {ROLE_LABELS[u.role]?.label || u.role}
                            </Badge>

                            {/* Dropdown rápido para alterar cargo */}
                            {!ehVoce && (
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  alterarPapel(u.id, e.target.value as AppRole, u.nome)
                                }
                                className="h-6 rounded border border-border bg-background px-1 text-[10px] text-muted-foreground hover:text-foreground focus:outline-none"
                                title="Alterar cargo do usuário"
                              >
                                <option value="tecnico">Técnico</option>
                                <option value="atendente">Atendente</option>
                                <option value="admin">Administrador</option>
                              </select>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {u.ativo ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              <UserCheck className="h-3 w-3" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                              <UserX className="h-3 w-3" /> Inativo
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-muted-foreground">
                          {dataCurta(u.created_at)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => enviarRedefinicaoSenha(u.email, u.nome)}
                              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              title="Enviar e-mail para o colaborador redefinir sua senha"
                            >
                              <KeyRound className="h-3.5 w-3.5" /> Senha
                            </Button>

                            {!ehVoce && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => alternarStatus(u.id, u.ativo, u.nome)}
                                className={`h-7 px-2 text-xs gap-1 ${
                                  u.ativo
                                    ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                    : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                }`}
                                title={u.ativo ? "Desativar acesso" : "Reativar acesso"}
                              >
                                {u.ativo ? (
                                  <>
                                    <UserX className="h-3.5 w-3.5" /> Desativar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5" /> Ativar
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO DE NOVO USUÁRIO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-primary">
                <UserPlus className="h-5 w-5" />
                <h3 className="text-base font-bold text-foreground">Novo Usuário do Sistema</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* SE JÁ CRIOU COM SUCESSO: EXIBE AS CREDENCIAIS PARA CÓPIA/ENVIO */}
            {credenciaisCriadas ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-lg mb-1">
                    ✓
                  </span>
                  <h4 className="font-bold text-foreground">Usuário Criado com Sucesso!</h4>
                  <p className="text-xs text-muted-foreground">
                    Envie os dados de acesso abaixo diretamente para o colaborador.
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Nome:
                    </span>
                    <span className="font-bold text-foreground">{credenciaisCriadas.nome}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      E-mail de Login:
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {credenciaisCriadas.email}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Senha Provisória:
                    </span>
                    <span className="font-mono font-bold text-primary text-sm bg-primary/10 px-2 py-0.5 rounded inline-block mt-0.5">
                      {credenciaisCriadas.senha}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                      Cargo / Função:
                    </span>
                    <span className="font-medium text-foreground">
                      {ROLE_LABELS[credenciaisCriadas.papel].label}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(textoAcessoWhatsApp);
                      toast.success("Dados de acesso copiados para a área de transferência!");
                    }}
                    className="w-full gap-2 font-bold shadow"
                  >
                    <Copy className="h-4 w-4" /> Copiar Dados de Acesso
                  </Button>

                  {credenciaisCriadas.telefone && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full gap-2 text-xs text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10"
                    >
                      <a
                        href={linkWhatsApp(credenciaisCriadas.telefone, textoAcessoWhatsApp)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Share2 className="h-4 w-4" /> Enviar Credenciais via WhatsApp
                      </a>
                    </Button>
                  )}
                </div>

                <div className="pt-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setModalAberto(false)}
                    className="text-xs text-muted-foreground"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              /* FORMULÁRIO DE CADASTRO */
              <form onSubmit={criarUsuario} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="nome" className="text-xs font-semibold">
                    Nome Completo *
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    E-mail de Acesso *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="carlos@br3tech.com"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="senha" className="text-xs font-semibold">
                      Senha Inicial *
                    </Label>
                    <button
                      type="button"
                      onClick={() => setSenha(gerarSenhaAleatoria())}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Gerar nova
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      required
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="papel" className="text-xs font-semibold">
                      Cargo / Função *
                    </Label>
                    <select
                      id="papel"
                      value={papel}
                      onChange={(e) => setPapel(e.target.value as AppRole)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-xs"
                    >
                      <option value="tecnico">Técnico (Bancada)</option>
                      <option value="atendente">Atendente (Recepção)</option>
                      <option value="admin">Administrador (Total)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="telefone"
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      WhatsApp (Opcional)
                    </Label>
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(92) 99999-9999"
                    />
                  </div>
                </div>

                {erro && (
                  <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                    {erro}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalAberto(false)}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={salvando} className="gap-1.5 font-bold">
                    {salvando ? "Criando usuário..." : "Salvar e Criar Usuário"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
