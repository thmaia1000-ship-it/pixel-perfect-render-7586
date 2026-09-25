import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, dataCurta, type OsStatus } from "@/lib/br3";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — BR3 Tech" },
      {
        name: "description",
        content: "Cadastro de clientes da BR3 Tech com histórico de aparelhos e serviços.",
      },
      { property: "og:title", content: "Clientes — BR3 Tech" },
      {
        property: "og:description",
        content: "Cadastro de clientes da BR3 Tech com histórico de aparelhos e serviços.",
      },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState({ nome: "", telefone: "", email: "", documento: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["clientes-com-os"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select(
          "id, nome, telefone, email, documento, ordens_servico(id, numero, status, aparelho, marca, modelo, created_at)",
        )
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const nome = z.string().trim().min(2, "Informe o nome").max(100).safeParse(novo.nome);
    const tel = z.string().trim().min(8, "Informe o telefone").max(20).safeParse(novo.telefone);
    if (!nome.success) return setErro(nome.error.issues[0]!.message);
    if (!tel.success) return setErro(tel.error.issues[0]!.message);

    setSalvando(true);
    const { error } = await supabase.from("clientes").insert({
      nome: nome.data,
      telefone: tel.data,
      email: novo.email.trim().slice(0, 255) || null,
      documento: novo.documento.trim().slice(0, 30) || null,
    });
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar o cliente.");
      return;
    }
    setNovo({ nome: "", telefone: "", email: "", documento: "" });
    setAberto(false);
    await queryClient.invalidateQueries();
    toast.success("Cliente cadastrado.");
  }

  const termo = busca.trim().toLowerCase();
  const lista = (data ?? []).filter((c) =>
    termo
      ? [c.nome, c.telefone, c.email, c.documento]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo))
      : true,
  );

  return (
    <AppShell
      title="Clientes"
      actions={
        <Button size="sm" onClick={() => setAberto((v) => !v)}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      }
    >
      <div className="grid gap-4">
        {aberto && (
          <form onSubmit={salvar} className="grid gap-4 rounded-2xl border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  maxLength={100}
                  value={novo.nome}
                  onChange={(e) => setNovo((c) => ({ ...c, nome: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <Input
                  id="telefone"
                  maxLength={20}
                  value={novo.telefone}
                  onChange={(e) => setNovo((c) => ({ ...c, telefone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  maxLength={255}
                  value={novo.email}
                  onChange={(e) => setNovo((c) => ({ ...c, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="documento">CPF / CNPJ</Label>
                <Input
                  id="documento"
                  maxLength={30}
                  value={novo.documento}
                  onChange={(e) => setNovo((c) => ({ ...c, documento: e.target.value }))}
                />
              </div>
            </div>
            {erro && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            )}
            <div>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar cliente"}
              </Button>
            </div>
          </form>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome, telefone ou documento"
            maxLength={80}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando clientes...</p>
        ) : (
          <ul className="grid gap-3">
            {lista.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.nome}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[c.telefone, c.email, c.documento].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {c.ordens_servico.length} OS
                  </span>
                </div>
                {c.ordens_servico.length > 0 && (
                  <ul className="mt-3 grid gap-1.5 border-t border-border pt-3">
                    {c.ordens_servico.map((o) => (
                      <li key={o.id}>
                        <Link
                          to="/ordens/$id"
                          params={{ id: o.id }}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1 text-sm hover:bg-secondary"
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-medium">{o.numero}</span> ·{" "}
                            {[o.aparelho, o.marca, o.modelo].filter(Boolean).join(" ")} ·{" "}
                            {STATUS_LABEL[o.status as OsStatus]}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {dataCurta(o.created_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
