import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  ABERTAS,
  OS_STATUS,
  STATUS_CLASS,
  STATUS_LABEL,
  dataCurta,
  moeda,
  type OsStatus,
} from "@/lib/br3";

const searchSchema = z.object({
  status: z.enum(["todas", "abertas", ...OS_STATUS]).catch("todas"),
});

export const Route = createFileRoute("/_authenticated/ordens/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Ordens de serviço — BR3 Tech" },
      {
        name: "description",
        content: "Lista de ordens de serviço da BR3 Tech com busca e filtro por situação.",
      },
      { property: "og:title", content: "Ordens de serviço — BR3 Tech" },
      {
        property: "og:description",
        content: "Lista de ordens de serviço da BR3 Tech com busca e filtro por situação.",
      },
    ],
  }),
  component: Ordens,
});

const FILTROS = [
  { valor: "todas", label: "Todas" },
  { valor: "abertas", label: "Abertas" },
  ...OS_STATUS.map((s) => ({ valor: s, label: STATUS_LABEL[s] })),
] as const;

function Ordens() {
  const { status } = Route.useSearch();
  const [busca, setBusca] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ordens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(
          "id, numero, status, prazo, aparelho, marca, modelo, valor_pecas, valor_mao_obra, created_at, clientes(nome, telefone)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const termo = busca.trim().toLowerCase();
  const lista = (data ?? [])
    .filter((o) =>
      status === "todas"
        ? true
        : status === "abertas"
          ? ABERTAS.includes(o.status as OsStatus)
          : o.status === status,
    )
    .filter((o) =>
      termo
        ? [o.numero, o.clientes?.nome, o.marca, o.modelo, o.aparelho]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(termo))
        : true,
    );

  return (
    <AppShell
      title="Ordens de serviço"
      actions={
        <Button asChild size="sm">
          <Link to="/ordens/nova">
            <Plus className="h-4 w-4" /> Nova OS
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, cliente, marca ou modelo"
            maxLength={80}
            className="pl-9"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTROS.map((f) => (
            <Link
              key={f.valor}
              to="/ordens"
              search={{ status: f.valor }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                status === f.valor
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando ordens...</p>
        ) : lista.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Nenhuma ordem de serviço encontrada com esse filtro.
          </p>
        ) : (
          <ul className="grid gap-3">
            {lista.map((o) => (
              <li key={o.id}>
                <Link
                  to="/ordens/$id"
                  params={{ id: o.id }}
                  className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {o.numero} · {o.clientes?.nome ?? "Cliente"}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {[o.aparelho, o.marca, o.modelo].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[o.status as OsStatus]}`}
                    >
                      {STATUS_LABEL[o.status as OsStatus]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    <span>Prazo: {dataCurta(o.prazo)}</span>
                    <span>
                      Total: {moeda(Number(o.valor_pecas) + Number(o.valor_mao_obra))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
