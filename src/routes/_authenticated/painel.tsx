import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Plus } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ABERTAS, moeda, dataCurta, STATUS_LABEL, type OsStatus } from "@/lib/br3";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — BR3 Tech" },
      {
        name: "description",
        content: "Resumo das ordens de serviço, faturamento, prazos e estoque da BR3 Tech.",
      },
      { property: "og:title", content: "Painel — BR3 Tech" },
      {
        property: "og:description",
        content: "Resumo das ordens de serviço, faturamento, prazos e estoque da BR3 Tech.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { data, isLoading } = useQuery({
    queryKey: ["painel"],
    queryFn: async () => {
      const [ordens, pecas] = await Promise.all([
        supabase
          .from("ordens_servico")
          .select(
            "id, numero, status, prazo, valor_pecas, valor_mao_obra, entregue_em, clientes(nome)",
          )
          .order("created_at", { ascending: false }),
        supabase.from("pecas").select("id, nome, quantidade, quantidade_minima"),
      ]);
      if (ordens.error) throw ordens.error;
      if (pecas.error) throw pecas.error;
      return { ordens: ordens.data, pecas: pecas.data };
    },
  });

  const ordens = data?.ordens ?? [];
  const pecasBaixas = (data?.pecas ?? []).filter((p) => p.quantidade <= p.quantidade_minima);

  const conta = (s: OsStatus) => ordens.filter((o) => o.status === s).length;
  const abertas = ordens.filter((o) => ABERTAS.includes(o.status as OsStatus)).length;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const faturamento = ordens
    .filter((o) => o.entregue_em && new Date(o.entregue_em) >= inicioMes)
    .reduce((soma, o) => soma + Number(o.valor_pecas) + Number(o.valor_mao_obra), 0);

  const limite = new Date();
  limite.setHours(23, 59, 59, 999);
  limite.setDate(limite.getDate() + 2);
  const prazoProximo = ordens.filter(
    (o) =>
      o.prazo &&
      new Date(`${o.prazo}T12:00:00`) <= limite &&
      !["entregue", "cancelada", "orcamento_recusado"].includes(o.status),
  );

  const cards = [
    { label: "Abertas", valor: abertas, para: "abertas" as const },
    {
      label: "Aguardando aprovação",
      valor: conta("aguardando_aprovacao"),
      para: "aguardando_aprovacao" as const,
    },
    { label: "Em reparo", valor: conta("em_reparo"), para: "em_reparo" as const },
    { label: "Prontas", valor: conta("pronta"), para: "pronta" as const },
    { label: "Entregues", valor: conta("entregue"), para: "entregue" as const },
  ];

  return (
    <AppShell
      title="Painel"
      actions={
        <Button asChild size="sm">
          <Link to="/ordens/nova">
            <Plus className="h-4 w-4" /> Nova OS
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando informações...</p>
      ) : (
        <div className="grid gap-6">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {cards.map((c) => (
              <Link
                key={c.label}
                to="/ordens"
                search={{ status: c.para }}
                className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="mt-2 font-display text-3xl font-extrabold">{c.valor}</p>
              </Link>
            ))}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Faturamento do mês (entregues)</p>
              <p className="mt-2 font-display text-2xl font-extrabold text-primary">
                {moeda(faturamento)}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-warning" />
                <h2 className="text-base font-bold">Prazos próximos</h2>
              </div>
              {prazoProximo.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum prazo vencendo agora.</p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {prazoProximo.slice(0, 5).map((o) => (
                    <li key={o.id}>
                      <Link
                        to="/ordens/$id"
                        params={{ id: o.id }}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-secondary"
                      >
                        <span className="min-w-0 truncate text-sm">
                          <span className="font-semibold">{o.numero}</span> ·{" "}
                          {o.clientes?.nome ?? "Cliente"} · {STATUS_LABEL[o.status as OsStatus]}
                        </span>
                        <span className="shrink-0 text-sm text-muted-foreground">
                          {dataCurta(o.prazo)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h2 className="text-base font-bold">Peças com estoque baixo</h2>
            </div>
            {pecasBaixas.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Estoque em dia.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {pecasBaixas.map((p) => (
                  <li
                    key={p.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-secondary px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{p.nome}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {p.quantidade} un. (mín. {p.quantidade_minima})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
