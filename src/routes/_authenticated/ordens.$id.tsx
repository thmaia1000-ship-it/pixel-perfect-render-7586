import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Printer,
  ClipboardCheck,
  Camera,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConferenciaEntrada } from "@/components/ConferenciaEntrada";
import { UploadMidiaConferencia } from "@/components/UploadMidiaConferencia";
import { TermoGarantiaModal, type ModoDocumentoOS } from "@/components/TermoGarantiaModal";
import { supabase } from "@/integrations/supabase/client";
import { deserializarEstadoEConferencia } from "@/lib/conferencia-aparelho";
import {
  PROXIMOS_STATUS,
  STATUS_CLASS,
  STATUS_LABEL,
  dataCurta,
  dataHora,
  linkWhatsApp,
  moeda,
  type OsStatus,
} from "@/lib/br3";

export const Route = createFileRoute("/_authenticated/ordens/$id")({
  head: () => ({
    meta: [
      { title: "Ordem de serviço — BR3 Tech" },
      {
        name: "description",
        content: "Detalhes da ordem de serviço, situação, orçamento e histórico de atualizações.",
      },
      { property: "og:title", content: "Ordem de serviço — BR3 Tech" },
      {
        property: "og:description",
        content: "Detalhes da ordem de serviço, situação, orçamento e histórico de atualizações.",
      },
    ],
  }),
  component: DetalheOS,
});

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium break-words">{valor || "—"}</dd>
    </div>
  );
}

function DetalheOS() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [termoAberto, setTermoAberto] = useState(false);
  const [modoDocumento, setModoDocumento] = useState<ModoDocumentoOS>("entrada");

  const { data, isLoading } = useQuery({
    queryKey: ["os", id],
    queryFn: async () => {
      const [os, hist] = await Promise.all([
        supabase
          .from("ordens_servico")
          .select("*, clientes(id, nome, telefone, email), profiles(nome)")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("os_historico")
          .select("*")
          .eq("os_id", id)
          .order("created_at", { ascending: false }),
      ]);
      if (os.error) throw os.error;
      if (hist.error) throw hist.error;
      return { os: os.data, historico: hist.data };
    },
  });

  const os = data?.os;

  async function mudarStatus(novo: OsStatus) {
    if (!os) return;
    setSalvando(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          status: novo,
          entregue_em: novo === "entregue" ? new Date().toISOString() : os.entregue_em,
        })
        .eq("id", os.id);
      if (error) throw error;

      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", user.user?.id ?? "")
        .maybeSingle();

      await supabase.from("os_historico").insert({
        os_id: os.id,
        status: novo,
        observacao: observacao.trim().slice(0, 500) || null,
        usuario_id: user.user?.id ?? null,
        usuario_nome: perfil?.nome ?? user.user?.email ?? null,
      });

      setObservacao("");
      await queryClient.invalidateQueries();
      toast.success(`Situação alterada para ${STATUS_LABEL[novo]}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar a situação.");
    } finally {
      setSalvando(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Ordem de serviço">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </AppShell>
    );
  }

  if (!os) {
    return (
      <AppShell title="Ordem de serviço">
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Ordem não encontrada.{" "}
          <Link to="/ordens" className="font-medium text-primary hover:underline">
            Voltar para a lista
          </Link>
        </p>
      </AppShell>
    );
  }

  const total = Number(os.valor_pecas) + Number(os.valor_mao_obra);
  const status = os.status as OsStatus;
  const telefone = os.clientes?.telefone ?? "";
  const nomeCliente = os.clientes?.nome ?? "cliente";
  const {
    conferencia,
    observacoes: observacoesFisicas,
    midias,
  } = deserializarEstadoEConferencia(os.estado_fisico);

  const mensagens = [
    {
      titulo: "Orçamento",
      texto: `Olá, ${nomeCliente}! Aqui é da BR3 Tech. O orçamento da sua ${os.aparelho.toLowerCase()} (${os.numero}) ficou em ${moeda(total)}. Podemos seguir com o reparo?`,
    },
    {
      titulo: "Aprovação",
      texto: `Olá, ${nomeCliente}! Confirmamos a aprovação do serviço da ${os.numero}. Já iniciamos o reparo e avisamos assim que ficar pronto.`,
    },
    {
      titulo: "Serviço concluído",
      texto: `Olá, ${nomeCliente}! Seu aparelho da ordem ${os.numero} está pronto. Total: ${moeda(total)}.`,
    },
    {
      titulo: "Retirada",
      texto: `Olá, ${nomeCliente}! Lembrete da BR3 Tech: seu aparelho da ordem ${os.numero} está disponível para retirada.`,
    },
  ];

  return (
    <AppShell
      title={os.numero}
      actions={
        <div className="flex items-center gap-2">
          {status === "entregue" ? (
            <>
              <Button
                onClick={() => {
                  setModoDocumento("duas_vias");
                  setTermoAberto(true);
                }}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <FileText className="h-3.5 w-3.5" /> Via de Entrada
              </Button>
              <Button
                onClick={() => {
                  setModoDocumento("finalizada");
                  setTermoAberto(true);
                }}
                variant="outline"
                size="sm"
                className="gap-1.5 font-bold border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              >
                <Printer className="h-4 w-4 text-emerald-400" /> Imprimir OS Finalizada (PDF)
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setModoDocumento("duas_vias");
                setTermoAberto(true);
              }}
              variant="outline"
              size="sm"
              className="gap-1.5 font-medium border-border"
            >
              <Printer className="h-4 w-4 text-primary" /> Relatório de Entrada (Loja e Cliente)
            </Button>
          )}
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${STATUS_CLASS[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Cliente e aparelho</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Linha rotulo="Cliente" valor={nomeCliente} />
              <Linha rotulo="Telefone" valor={telefone} />
              <Linha rotulo="Aparelho" valor={os.aparelho} />
              <Linha
                rotulo="Marca / modelo"
                valor={[os.marca, os.modelo].filter(Boolean).join(" ")}
              />
              <Linha rotulo="IMEI / Nº de série" valor={os.imei} />
              <Linha rotulo="Acessórios" valor={os.acessorios} />
              <Linha rotulo="Observações físicas" valor={observacoesFisicas} />
              <Linha rotulo="Técnico responsável" valor={os.profiles?.nome} />
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  CONFERÊNCIA DE ENTRADA DO APARELHO
                </h2>
                <p className="text-xs text-muted-foreground">
                  Checklist conferido na recepção do equipamento.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setModoDocumento("duas_vias");
                  setTermoAberto(true);
                }}
                className="gap-1.5 text-xs font-semibold"
              >
                <Printer className="h-3.5 w-3.5 text-primary" /> Imprimir Relatório (2 Vias: Loja e
                Cliente)
              </Button>
            </div>

            <ConferenciaEntrada valor={conferencia} somenteLeitura />
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  FOTOS E VÍDEOS DE CONFERÊNCIA
                </h2>
                <p className="text-xs text-muted-foreground">
                  Registros visuais anexados no checklist de entrada.
                </p>
              </div>
            </div>

            <UploadMidiaConferencia midias={midias} somenteLeitura />
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Serviço e orçamento</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Linha rotulo="Defeito relatado" valor={os.defeito_relatado} />
              <Linha rotulo="Diagnóstico" valor={os.diagnostico} />
              <Linha rotulo="Peças" valor={moeda(os.valor_pecas)} />
              <Linha rotulo="Mão de obra" valor={moeda(os.valor_mao_obra)} />
              <Linha rotulo="Total" valor={<span className="text-primary">{moeda(total)}</span>} />
              <Linha rotulo="Prazo" valor={dataCurta(os.prazo)} />
              <Linha rotulo="Garantia" valor={`${os.garantia_dias} dias`} />
              <Linha rotulo="Entregue em" valor={dataHora(os.entregue_em)} />
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Histórico de atualizações</h2>
            <ul className="mt-4 grid gap-3">
              {(data?.historico ?? []).map((h) => (
                <li key={h.id} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm font-semibold">{STATUS_LABEL[h.status as OsStatus]}</p>
                  <p className="text-xs text-muted-foreground">
                    {dataHora(h.created_at)} · {h.usuario_nome ?? "Sistema"}
                  </p>
                  {h.observacao && <p className="mt-1 text-sm">{h.observacao}</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="grid gap-6">
          {status === "entregue" ? (
            <section className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-card via-card to-emerald-950/20 p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-foreground">OS Finalizada e Entregue</h2>
                  <p className="text-xs text-muted-foreground">
                    Ordem concluída com garantia ativa.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/60 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                  <span className="text-muted-foreground">Entregue em:</span>
                  <span className="font-semibold text-foreground">{dataHora(os.entregue_em)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                  <span className="text-muted-foreground">Valor Total Pago:</span>
                  <span className="font-bold text-primary text-sm">{moeda(total)}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                  <span className="text-muted-foreground">Garantia Vigente:</span>
                  <span className="font-semibold text-emerald-400">{os.garantia_dias} dias</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-muted-foreground">Técnico Responsável:</span>
                  <span className="font-medium text-foreground">
                    {os.profiles?.nome ?? "BR3 Tech"}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => {
                    setModoDocumento("finalizada");
                    setTermoAberto(true);
                  }}
                  className="w-full gap-2 font-bold shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Printer className="h-4 w-4" /> Imprimir Documento de OS Finalizada (PDF)
                </Button>

                <Button
                  onClick={() => {
                    setModoDocumento("entrada");
                    setTermoAberto(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <FileText className="h-3.5 w-3.5" /> Ver Termo de Entrada Original
                </Button>
              </div>

              <p className="mt-2.5 text-[11px] text-center text-muted-foreground">
                Gere a cópia física em papel A4 ou salve como PDF para arquivamento e entrega ao
                cliente.
              </p>
            </section>
          ) : (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-bold">Atualizar situação</h2>
              {PROXIMOS_STATUS[status].length === 0 ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Esta ordem está encerrada ({STATUS_LABEL[status]}).
                  </p>
                  <Button
                    onClick={() => {
                      setModoDocumento("finalizada");
                      setTermoAberto(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir Documento da OS (PDF)
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="obs">Observação (opcional)</Label>
                    <Textarea
                      id="obs"
                      rows={3}
                      maxLength={500}
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    {PROXIMOS_STATUS[status].map((s) => (
                      <Button
                        key={s}
                        variant={
                          s === "cancelada" || s === "orcamento_recusado" ? "outline" : "default"
                        }
                        disabled={salvando}
                        onClick={() => mudarStatus(s)}
                      >
                        {STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-bold">Mensagens para o cliente</h2>
            {telefone ? (
              <div className="mt-4 grid gap-2">
                {mensagens.map((m) => (
                  <Button key={m.titulo} asChild variant="outline" className="justify-start">
                    <a
                      href={linkWhatsApp(telefone, m.texto)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" /> {m.titulo}
                    </a>
                  </Button>
                ))}
                <p className="text-xs text-muted-foreground">
                  A mensagem abre no WhatsApp para você revisar antes de enviar.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Cadastre o telefone do cliente para enviar mensagens.
              </p>
            )}
          </section>
        </div>
      </div>

      <TermoGarantiaModal
        aberto={termoAberto}
        onFechar={() => setTermoAberto(false)}
        os={os}
        conferencia={conferencia}
        observacoesFisicas={observacoesFisicas}
        midias={midias}
        modoInicial={modoDocumento}
      />
    </AppShell>
  );
}
