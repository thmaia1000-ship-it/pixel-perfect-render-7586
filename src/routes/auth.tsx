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
  validateSearch: (search: Record<string, unknown>) => {
    return {
      returnTo: typeof search["returnTo"] === "string" ? (search["returnTo"] as string) : undefined,
    };
  },
  beforeLoad: async ({ search }) => {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      const destino = (search as any)?.returnTo || "/painel";
      throw redirect({ to: destino });
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

type Modo = "login" | "recuperar";

function Acesso() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [modo, setModo] = useState<Modo>("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailOk.data,
        password: senha,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        setErro(
          msg.includes("invalid")
            ? "E-mail ou senha incorretos."
            : msg.includes("email not confirmed")
              ? "E-mail ainda não confirmado. Verifique sua caixa de entrada."
              : msg.includes("failed to fetch")
                ? "Erro de conexão com o servidor de autenticação. Verifique sua conexão e tente novamente."
                : error.message,
        );
        return;
      }
      if (!data.session?.user) {
        setErro("Não foi possível iniciar sua sessão. Tente entrar novamente.");
        return;
      }
      toast.success("Bem-vindo de volta!");
      const destino = (search as { returnTo?: string })?.returnTo || "/painel";
      await navigate({ to: destino as any, replace: true });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Não foi possível concluir. Tente novamente.";
      if (msg.toLowerCase().includes("failed to fetch")) {
        setErro(
          "Não foi possível conectar ao servidor de login. Verifique sua conexão ou tente novamente.",
        );
      } else {
        setErro(msg);
      }
    } finally {
      setEnviando(false);
    }
  }

  const titulo = modo === "login" ? "Entrar no sistema" : "Recuperar senha";

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
                    autoComplete="current-password"
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
              {enviando ? "Aguarde..." : modo === "login" ? "Entrar" : "Enviar link"}
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
          </div>
        </div>
      </div>
    </div>
  );
}
