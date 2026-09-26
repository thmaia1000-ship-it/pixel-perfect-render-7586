import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      throw redirect({ to: "/painel" });
    }
  },
  head: () => ({
    meta: [
      { title: "Entrar — BR3 Tech" },
      { name: "description", content: "Acesso da equipe ao sistema de gestão da BR3 Tech." },
      { property: "og:title", content: "Entrar — BR3 Tech" },
      { property: "og:description", content: "Acesso da equipe ao sistema de gestão da BR3 Tech." },
    ],
  }),
  component: Acesso,
});

const emailSchema = z.string().trim().email("Informe um e-mail válido").max(255);
const senhaSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72);

type Modo = "login" | "recuperar" | "cadastro";

function Acesso() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const emailLimpo = email.trim().toLowerCase();
    const emailOk = emailSchema.safeParse(emailLimpo);
    if (!emailOk.success) {
      setErro(emailOk.error.issues[0]!.message);
      return;
    }

    setEnviando(true);
    try {
      if (modo === "recuperar") {
        const { error } = await supabase.auth.resetPasswordForEmail(emailOk.data, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu e-mail.");
        setModo("login");
        return;
      }

      const senhaOk = senhaSchema.safeParse(senha);
      if (!senhaOk.success) {
        setErro(senhaOk.error.issues[0]!.message);
        return;
      }

      if (modo === "cadastro") {
        const nomeOk = z.string().trim().min(2, "Informe o nome completo").max(100).safeParse(nome);
        if (!nomeOk.success) {
          setErro(nomeOk.error.issues[0]!.message);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: emailOk.data,
          password: senhaOk.data,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome: nomeOk.data },
          },
        });
        if (error) {
          setErro(
            /database error|BR3_SOMENTE_ADMIN/i.test(error.message)
              ? "O sistema já possui um administrador. Peça a ele para criar a sua conta."
              : error.message,
          );
          return;
        }
        if (data.session) {
          toast.success("Conta de administrador criada.");
          await new Promise((r) => setTimeout(r, 150));
          navigate({ to: "/painel" });
        } else {
          toast.success("Conta criada. Confirme o e-mail pelo link que enviamos para entrar.");
          setModo("login");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailOk.data,
        password: senha,
      });
      if (error) {
        setErro(
          error.message.toLowerCase().includes("invalid")
            ? "E-mail ou senha incorretos."
            : error.message.toLowerCase().includes("email not confirmed")
              ? "E-mail ainda não confirmado. Verifique sua caixa de entrada."
              : error.message,
        );
        return;
      }
      toast.success("Bem-vindo de volta!");
      // Pequeno intervalo para sincronização do token via postMessage com a interface do Lovable
      await new Promise((r) => setTimeout(r, 150));
      navigate({ to: "/painel" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const titulo =
    modo === "login"
      ? "Entrar no sistema"
      : modo === "recuperar"
        ? "Recuperar senha"
        : "Criar conta de administrador";

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <div className="px-4 py-5">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6">
        <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card/85 backdrop-blur-2xl p-6 shadow-2xl shadow-black/60">
          <div className="mb-4 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">{titulo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {modo === "recuperar"
                ? "Informe seu e-mail para receber o link de redefinição."
                : "Área restrita à equipe da BR3 Tech."}
            </p>
          </div>

          <form onSubmit={enviar} className="mt-6 grid gap-4">
            {modo === "cadastro" && (
              <div className="grid gap-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={100}
                  autoComplete="name"
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                autoComplete="email"
              />
            </div>

            {modo !== "recuperar" && (
              <div className="grid gap-1.5">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    maxLength={72}
                    autoComplete={modo === "cadastro" ? "new-password" : "current-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                    title={mostrarSenha ? "Ocultar senha" : "Ver senha"}
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {erro && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            )}

            <Button type="submit" disabled={enviando}>
              {enviando
                ? "Aguarde..."
                : modo === "login"
                  ? "Entrar"
                  : modo === "recuperar"
                    ? "Enviar link"
                    : "Criar conta"}
            </Button>
          </form>

          <div className="mt-5 grid gap-2 text-sm">
            {modo !== "login" && (
              <button
                type="button"
                className="text-left font-medium text-primary hover:underline"
                onClick={() => {
                  setErro(null);
                  setModo("login");
                }}
              >
                Voltar para o login
              </button>
            )}
            {modo === "login" && (
              <button
                type="button"
                className="text-left font-medium text-primary hover:underline"
                onClick={() => {
                  setErro(null);
                  setModo("recuperar");
                }}
              >
                Esqueci minha senha
              </button>
            )}
            {modo === "login" && (
              <>
                <button
                  type="button"
                  className="text-left font-medium text-primary hover:underline"
                  onClick={() => {
                    setErro(null);
                    setModo("cadastro");
                  }}
                >
                  Criar a primeira conta de administrador
                </button>
                <p className="text-muted-foreground">
                  Depois da primeira conta, novos usuários são criados pelo administrador.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
