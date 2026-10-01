import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Printer,
  RotateCcw,
  Lock,
  ShieldCheck,
  Archive,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalReaberturaOS } from "@/components/ModalReaberturaOS";
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
import { deserializarEstadoEConferencia } from "@/lib/conferencia-aparelho";

const STATUS_FECHADOS: OsStatus[] = ["entregue", "cancelada", "orcamento_recusado"];

const searchSchema = z.object({
  status: z
    .enum(["todas", "abertas", "fechadas", ...OS_STATUS])
    .optional()
    .catch(undefined),
  aba: z.enum(["ativas", "fechadas"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/ordens/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Ordens de serviço — BR3 Tech" },
      {
        name: "description",
        content:
          "Lista de ordens de serviço da BR3 Tech com busca, reabertura e filtro por situação.",
      },
      { property: "og:title", content: "Ordens de serviço — BR3 Tech" },
      {
        property: "og:description",
        content:
          "Lista de ordens de serviço da BR3 Tech com busca, reabertura e filtro por situação.",
      },
    ],
  }),
  component: Ordens,
});

const FILTROS_ATIVAS = [
  { valor: "todas", label: "Todas em Andamento" },
  { valor: "abertas", label: "Abertas / Bancada" },
  ...ABERTAS.map((s) => ({ valor: s, label: STATUS_LABEL[s] })),
  { valor: "pronta", label: STATUS_LABEL["pronta"] },
] as const;

const FILTROS_FECHADAS = [
  { valor: "fechadas", label: "Todas as Fechadas" },
  { valor: "entregue", label: "Entregues ao Cliente" },
  { valor: "cancelada", label: "Canceladas" },
  { valor: "orcamento_recusado", label: "Orçamento Recusado" },
] as const;

function Ordens() {
  const searchParams = Route.useSearch();
  const [busca, setBusca] = useState("");
  const [osParaReabrir, setOsParaReabrir] = useState<any | null>(null);

  // Determina a aba ativa (padrão: "ativas", a menos que a URL especifique aba=fechadas ou status seja de fechada)
  const [abaAtiva, setAbaAtiva] = useState<"ativas" | "fechadas">(() => {
    if (searchParams.aba === "fechadas" || searchParams.status === "fechadas") {
      return "fechadas";
    }
    if (searchParams.status && STATUS_FECHADOS.includes(searchParams.status as OsStatus)) {
      return "fechadas";
    }
    return "ativas";
  });

  const { data, isLoading } = useQuery({
    queryKey: ["ordens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(
          "id, numero, status, prazo, aparelho, marca, modelo, valor_pecas, valor_mao_obra, created_at, entregue_em, estado_fisico, defeito_relatado, clientes(nome, telefone)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const termo = busca.trim().toLowerCase();

  // Separação entre ativas e fechadas
  const todasOrdens = data ?? [];
  const ordensFechadas = todasOrdens.filter((o) => STATUS_FECHADOS.includes(o.status as OsStatus));
  const ordensAtivas = todasOrdens.filter((o) => !STATUS_FECHADOS.includes(o.status as OsStatus));

  // Filtros da aba atual
  const statusFiltro = searchParams.status || (abaAtiva === "fechadas" ? "fechadas" : "todas");

  const listaFiltrada = (abaAtiva === "fechadas" ? ordensFechadas : ordensAtivas)
    .filter((o) => {
      if (abaAtiva === "fechadas") {
        if (statusFiltro === "fechadas") return true;
        return o.status === statusFiltro;
      }

      if (statusFiltro === "todas") return true;
      if (statusFiltro === "abertas") return ABERTAS.includes(o.status as OsStatus);
      return o.status === statusFiltro;
    })
    .filter((o) =>
      termo
        ? [
            o.numero,
            o.clientes?.nome,
            o.clientes?.telefone,
            o.marca,
            o.modelo,
            o.aparelho,
            o.defeito_relatado,
          ]
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
        {/* ========================================================================= */}
        {/* NAVEGAÇÃO PRINCIPAL ENTRE ORDENS ATIVAS E CAMPO INDEPENDENTE DE FECHADAS   */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAbaAtiva("ativas");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                abaAtiva === "ativas"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Ordens em Andamento</span>
              <span className="ml-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.2">
                {ordensAtivas.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAbaAtiva("fechadas");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                abaAtiva === "fechadas"
                  ? "bg-amber-600 text-white shadow-sm font-bold"
                  : "text-amber-500/80 hover:text-amber-400"
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>OS Fechadas & Reabertura</span>
              <span
                className={`ml-1 rounded-full text-[10px] font-bold px-1.5 py-0.2 ${
                  abaAtiva === "fechadas"
                    ? "bg-white/20 text-white"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {ordensFechadas.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground hidden sm:block">
            {abaAtiva === "fechadas" ? (
              <span className="flex items-center gap-1 text-amber-500/90 font-medium">
                <Lock className="h-3.5 w-3.5" /> Reabertura restrita com senha de administrador
              </span>
            ) : (
              <span>Gerenciamento operacional da bancada</span>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER DO CAMPO INDEPENDENTE DE OS FECHADAS                               */}
        {/* ========================================================================= */}
        {abaAtiva === "fechadas" && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 font-bold shrink-0">
                  <Archive className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>Central de Ordens Fechadas & Reabertura Controlada</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      Campo Independente
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lista exclusiva de todas as ordens com status <strong>Entregue</strong>,{" "}
                    <strong>Cancelada</strong> ou <strong>Orçamento Recusado</strong>. Apenas
                    administradores ou usuários com senha de liberação podem reabrir uma OS.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BARRA DE PESQUISA                                                         */}
        {/* ========================================================================= */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              abaAtiva === "fechadas"
                ? "Buscar nas OSs fechadas por número, cliente, modelo ou defeito..."
                : "Buscar ordens por número, cliente, marca ou modelo..."
            }
            maxLength={80}
            className="pl-9"
          />
        </div>

        {/* ========================================================================= */}
        {/* FILTROS RÁPIDOS ESPECÍFICOS DA ABA ATIVA                                  */}
        {/* ========================================================================= */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(abaAtiva === "fechadas" ? FILTROS_FECHADAS : FILTROS_ATIVAS).map((f) => {
            const selecionado =
              abaAtiva === "fechadas"
                ? (statusFiltro === "fechadas" && f.valor === "fechadas") ||
                  statusFiltro === f.valor
                : (statusFiltro === "todas" && f.valor === "todas") || statusFiltro === f.valor;

            return (
              <Link
                key={f.valor}
                to="/ordens"
                search={{
                  aba: abaAtiva,
                  status: f.valor,
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selecionado
                    ? abaAtiva === "fechadas"
                      ? "border-amber-500 bg-amber-600 text-white"
                      : "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* LISTAGEM DE ORDENS                                                        */}
        {/* ========================================================================= */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando ordens...</p>
        ) : listaFiltrada.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
            <Archive className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-semibold text-foreground">
              {abaAtiva === "fechadas"
                ? "Nenhuma ordem de serviço fechada encontrada com os critérios informados."
                : "Nenhuma ordem de serviço em andamento encontrada com esse filtro."}
            </p>
            <p className="text-xs text-muted-foreground">
              {termo ? "Tente alterar os termos da busca." : "Altere o filtro selecionado acima."}
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {listaFiltrada.map((o) => {
              const status = o.status as OsStatus;
              const ehFechada = STATUS_FECHADOS.includes(status);
              const { encerramento } = deserializarEstadoEConferencia(o.estado_fisico);
              const foiReabertaAnteriormente = Boolean(encerramento?.reabertoEm);

              return (
                <li
                  key={o.id}
                  className={`rounded-2xl border transition-all ${
                    ehFechada
                      ? "border-amber-500/30 bg-card hover:border-amber-500/60 p-4"
                      : "border-border bg-card hover:border-primary p-4"
                  }`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to="/ordens/$id"
                          params={{ id: o.id }}
                          className="font-bold text-base hover:underline text-foreground"
                        >
                          {o.numero} · {o.clientes?.nome ?? "Cliente"}
                        </Link>
                        {o.clientes?.telefone && (
                          <span className="text-xs text-muted-foreground">
                            ({o.clientes.telefone})
                          </span>
                        )}
                        {foiReabertaAnteriormente && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            <RotateCcw className="h-3 w-3" /> Já Reaberta Anteriormente
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {[o.aparelho, o.marca, o.modelo].filter(Boolean).join(" · ")}
                      </p>

                      {o.defeito_relatado && (
                        <p className="mt-1 text-xs text-muted-foreground/90 line-clamp-1">
                          <strong>Defeito:</strong> {o.defeito_relatado}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[status]}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>

                      {o.entregue_em && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Entregue: {dataCurta(o.entregue_em)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                      <span>Prazo: {dataCurta(o.prazo)}</span>
                      <span className="font-semibold text-foreground">
                        Total: {moeda(Number(o.valor_pecas) + Number(o.valor_mao_obra))}
                      </span>
                      {encerramento?.diagnosticoHardware && (
                        <span className="text-emerald-500 font-medium">
                          ✓ Laudo de Hardware Registrado
                        </span>
                      )}
                    </div>

                    {/* Ações do Card */}
                    <div className="flex items-center gap-2">
                      {/* BOTÃO EXCLUSIVO DE REABERTURA PARA ORDENS FECHADAS */}
                      {ehFechada && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setOsParaReabrir(o)}
                          className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm cursor-pointer h-8"
                          title="Reabrir esta Ordem de Serviço (Requer autorização de Administrador)"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reabrir OS</span>
                        </Button>
                      )}

                      <Button asChild variant="outline" size="sm" className="text-xs h-8 gap-1">
                        <Link to="/ordens/$id" params={{ id: o.id }}>
                          <span>Ver OS</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* MODAL DE REABERTURA DE ORDEM DE SERVIÇO */}
      {osParaReabrir && (
        <ModalReaberturaOS
          aberto={Boolean(osParaReabrir)}
          onFechar={() => setOsParaReabrir(null)}
          osId={osParaReabrir.id}
          osNumero={osParaReabrir.numero}
          statusAtual={osParaReabrir.status}
          clienteNome={osParaReabrir.clientes?.nome}
          aparelhoModelo={[osParaReabrir.aparelho, osParaReabrir.marca, osParaReabrir.modelo]
            .filter(Boolean)
            .join(" ")}
          onReabertoSucesso={() => {
            setOsParaReabrir(null);
            // Redireciona a visualização para a aba de ativas para ver a OS reaberta
            setAbaAtiva("ativas");
          }}
        />
      )}
    </AppShell>
  );
}
