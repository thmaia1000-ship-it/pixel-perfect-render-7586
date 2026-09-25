import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — BR3 Tech" },
      { name: "description", content: "Defina uma nova senha de acesso ao sistema da BR3 Tech." },
      { property: "og:title", content: "Redefinir senha — BR3 Tech" },
      {
        property: "og:description",
        content: "Defina uma nova senha de acesso ao sistema da BR3 Tech.",
      },
    ],
  }),
  component: Redefinir,
});

function Redefinir() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const ok = z
      .string()
      .min(8, "A senha precisa ter pelo menos 8 caracteres")
      .max(72)
      .safeParse(senha);
    if (!ok.success) return setErro(ok.error.issues[0]!.message);
    if (senha !== confirma) return setErro("As senhas não são iguais.");

    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      setErro("Não foi possível alterar a senha. Abra o link do e-mail novamente.");
      return;
    }
    toast.success("Senha alterada com sucesso.");
    navigate({ to: "/painel" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-4 py-5">
        <Logo />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-6">
        <form
          onSubmit={enviar}
          className="grid w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <h1 className="text-xl font-bold">Nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma senha com pelo menos 8 caracteres.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="confirma">Confirmar senha</Label>
            <Input
              id="confirma"
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>
          {erro && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}
          <Button type="submit" disabled={enviando}>
            {enviando ? "Salvando..." : "Salvar senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
