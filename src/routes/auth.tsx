import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
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
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);


  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const emailOk = emailSchema.safeParse(email);
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
        const nomeOk = z
          .string()
          .trim()
          .min(2, "Informe o nome completo")
          .max(100)
          .safeParse(nome);
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
        if (error) throw error;
        if (data.session) {
          toast.success("Conta de administrador criada.");
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
            : error.message,
        );
        return;
      }
      toast.success("Bem-vindo de volta!");
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
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-4 py-5">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modo === "recuperar"
              ? "Informe seu e-mail para receber o link de redefinição."
              : "Área restrita à equipe da BR3 Tech."}
          </p>

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
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  maxLength={72}
                  autoComplete={modo === "cadastro" ? "new-password" : "current-password"}
                />
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
