import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Printer,
  Receipt,
  Banknote,
  DollarSign,
  Share2,
  Trash2,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  TrendingUp,
  Clock,
  User,
  Wrench,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReciboImpressoModal } from "@/components/ReciboImpressoModal";
import { supabase } from "@/integrations/supabase/client";
import {
  type ReciboAvulso,
  type FormaPagamentoRecibo,
  FORMAS_PAGAMENTO_LABELS,
  converterParaExtenso,
  gerarProximoNumeroRecibo,
  listarRecibos,
  salvarRecibo,
  excluirRecibo,
  gerarTextoWhatsAppRecibo,
} from "@/lib/recibos";
import { moeda, dataCurta } from "@/lib/br3";

const searchSchema = z.object({
  aba: z.enum(["recibos", "resumo"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/financeiro")({
  validateSearch: searchSchema,
  beforeLoad: async () => {
    // Revalida a sessão com o provedor de autenticação conforme regras de arquitetura
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "Financeiro & Recibos — BR3 Tech" },
      {
        name: "description",
        content:
          "Gestão financeira, faturamento de ordens de serviço e emissão de recibos avulsos.",
      },
      { property: "og:title", content: "Financeiro & Recibos — BR3 Tech" },
      {
        property: "og:description",
        content:
          "Gestão financeira, faturamento de ordens de serviço e emissão de recibos avulsos.",
      },
    ],
  }),
  component: Financeiro,
});

const SUGESTOES_REFERENTE = [
  "Manutenção preventiva e limpeza técnica interna",
  "Troca de tela frontal / display touch",
  "Substituição de bateria de alta performance",
  "Reparo avançado em placa-mãe / microssolda",
  "Venda de carregador / fonte de alimentação",
  "Venda de película de vidro e capa protetora",
  "Formatação, reinstalação de sistema e backup",
  "Desoxidação química após contato com líquido",
  "Taxa de diagnóstico técnico e análise de bancada",
];

function Financeiro() {
  const searchParams = Route.useSearch();
  const queryClient = useQueryClient();

  const [abaAtiva, setAbaAtiva] = useState<"recibos" | "resumo">(searchParams.aba || "recibos");
  const [buscaRecibo, setBuscaRecibo] = useState("");
  const [modalNovoReciboAberto, setModalNovoReciboAberto] = useState(false);
  const [reciboParaVisualizar, setReciboParaVisualizar] = useState<ReciboAvulso | null>(null);

  // Lista local sincronizada de recibos avulsos
  const [recibos, setRecibos] = useState<ReciboAvulso[]>(() => listarRecibos());

  const atualizarListaRecibos = () => {
    setRecibos(listarRecibos());
  };

  useEffect(() => {
    window.addEventListener("br3_recibos_atualizados", atualizarListaRecibos);
    return () => {
      window.removeEventListener("br3_recibos_atualizados", atualizarListaRecibos);
    };
  }, []);

  // Dados do usuário logado para preenchimento de assinatura
  const { data: usuarioAtual } = useQuery({
    queryKey: ["usuario-atual-financeiro"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", data.user.id)
        .maybeSingle();

      return {
        id: data.user.id,
        nome: profile?.nome || data.user.user_metadata?.nome || "BR3 Tech",
        email: data.user.email,
      };
    },
  });

  // Lista de clientes cadastrados no banco para autocompletar
  const { data: clientesCadastrados = [] } = useQuery({
    queryKey: ["clientes-select-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone, documento")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Consulta de ordens de serviço para resumo financeiro
  const { data: ordensServico = [] } = useQuery({
    queryKey: ["ordens-financeiro-metricas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("id, numero, status, valor_pecas, valor_mao_obra, created_at, entregue_em")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Métricas financeiras consolidadas
  const totalRecebidoOS = ordensServico
    .filter((o) => o.status === "entregue")
    .reduce((acc, o) => acc + (Number(o.valor_pecas) + Number(o.valor_mao_obra)), 0);

  const totalPrevisaoBancada = ordensServico
    .filter(
      (o) =>
        o.status !== "entregue" && o.status !== "cancelada" && o.status !== "orcamento_recusado",
    )
    .reduce((acc, o) => acc + (Number(o.valor_pecas) + Number(o.valor_mao_obra)), 0);

  const totalRecibosAvulsos = recibos.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
  const totalGeralRecebido = totalRecebidoOS + totalRecibosAvulsos;

  // Estado do formulário de novo recibo
  const [formNumero, setFormNumero] = useState("");
  const [formDataEmissao, setFormDataEmissao] = useState(new Date().toISOString().split("T")[0]);
  const [formValor, setFormValor] = useState<number | "">("");
  const [formClienteNome, setFormClienteNome] = useState("");
  const [formClienteDoc, setFormClienteDoc] = useState("");
  const [formClienteTelefone, setFormClienteTelefone] = useState("");
  const [formReferente, setFormReferente] = useState("");
  const [formFormaPagamento, setFormFormaPagamento] = useState<FormaPagamentoRecibo>("pix");
  const [formModelo, setFormModelo] = useState<"duas_vias" | "pagina_unica" | "termica_80mm">(
    "duas_vias",
  );
  const [formObservacoes, setFormObservacoes] = useState("");

  const abrirNovoRecibo = () => {
    setFormNumero(gerarProximoNumeroRecibo());
    setFormDataEmissao(new Date().toISOString().split("T")[0]);
    setFormValor("");
    setFormClienteNome("");
    setFormClienteDoc("");
    setFormClienteTelefone("");
    setFormReferente("");
    setFormFormaPagamento("pix");
    setFormModelo("duas_vias");
    setFormObservacoes("");
    setModalNovoReciboAberto(true);
  };

  const aoSelecionarClienteExistente = (clienteId: string) => {
    const c = clientesCadastrados.find((item) => item.id === clienteId);
    if (c) {
      setFormClienteNome(c.nome);
      if (c.documento) setFormClienteDoc(c.documento);
      if (c.telefone) setFormClienteTelefone(c.telefone);
    }
  };

  const handleSalvarRecibo = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formClienteNome.trim()) {
      toast.error("Informe o nome do cliente / pagador.");
      return;
    }

    const valorNumerico = Number(formValor);
    if (!valorNumerico || isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error("Informe um valor válido em reais maior que zero.");
      return;
    }

    if (!formReferente.trim()) {
      toast.error("Informe a qual serviço ou produto o recibo se refere.");
      return;
    }

    const valorExtenso = converterParaExtenso(valorNumerico);

    const novo = salvarRecibo({
      numero: formNumero.trim() || gerarProximoNumeroRecibo(),
      clienteNome: formClienteNome.trim(),
      clienteDocumento: formClienteDoc.trim() || undefined,
      clienteTelefone: formClienteTelefone.trim() || undefined,
      valor: valorNumerico,
      valorExtenso,
      referente: formReferente.trim(),
      formaPagamento: formFormaPagamento,
      dataEmissao: new Date(formDataEmissao).toISOString(),
      cidade: "Manaus - AM",
      emitenteNome: usuarioAtual?.nome || "BR3 Tech",
      emitenteCargo: "Atendimento e Assistência Técnica",
      observacoes: formObservacoes.trim() || undefined,
      modeloImpressao: formModelo,
    });

    toast.success(`Recibo #${novo.numero} emitido com sucesso!`);
    setModalNovoReciboAberto(false);
    setReciboParaVisualizar(novo);
  };

  const handleExcluirRecibo = (id: string, numero: string) => {
    if (confirm(`Tem certeza que deseja excluir o recibo ${numero}?`)) {
      excluirRecibo(id);
      toast.success(`Recibo ${numero} excluído.`);
    }
  };

  // Filtro de busca na lista de recibos
  const termoRecibo = buscaRecibo.trim().toLowerCase();
  const recibosFiltrados = recibos.filter((r) => {
    if (!termoRecibo) return true;
    return (
      r.numero?.toLowerCase().includes(termoRecibo) ||
      r.clienteNome?.toLowerCase().includes(termoRecibo) ||
      r.referente?.toLowerCase().includes(termoRecibo) ||
      r.clienteDocumento?.toLowerCase().includes(termoRecibo) ||
      r.clienteTelefone?.toLowerCase().includes(termoRecibo)
    );
  });

  return (
    <AppShell
      title="Financeiro"
      actions={
        <Button
          type="button"
          size="sm"
          onClick={abrirNovoRecibo}
          className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Emitir Recibo Avulso
        </Button>
      }
    >
      <div className="grid gap-5">
        {/* ========================================================================= */}
        {/* CARDS DE RESUMO FINANCEIRO RÁPIDO NO TOPO                                 */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Recibos Avulsos</span>
              <Receipt className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold font-mono text-foreground">
              {moeda(totalRecibosAvulsos)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {recibos.length} recibo(s) emitido(s)
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Faturamento de OSs</span>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold font-mono text-foreground">{moeda(totalRecebidoOS)}</p>
            <p className="text-[11px] text-muted-foreground">Ordens de serviço entregues</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Previsão Bancada</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold font-mono text-foreground">
              {moeda(totalPrevisaoBancada)}
            </p>
            <p className="text-[11px] text-muted-foreground">OSs em diagnóstico/reparo</p>
          </div>

          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-primary font-bold">
              <span>Total Consolidado</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-black font-mono text-primary">{moeda(totalGeralRecebido)}</p>
            <p className="text-[11px] text-primary/80 font-medium">
              OSs entregues + Recibos avulsos
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ABAS DO MÓDULO FINANCEIRO                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/60 border border-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAbaAtiva("recibos")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                abaAtiva === "recibos"
                  ? "bg-primary text-primary-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Recibo Avulso</span>
              <span className="ml-1 rounded-full bg-black/20 text-current text-[10px] font-bold px-1.5 py-0.2">
                {recibos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("resumo")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                abaAtiva === "resumo"
                  ? "bg-background text-foreground font-bold shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Faturamento de Ordens</span>
            </button>
          </div>

          {abaAtiva === "recibos" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={abrirNovoRecibo}
              className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Recibo
            </Button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CONTEÚDO DA ABA 1: RECIBO AVULSO (DESTAQUE PRINCIPAL)                    */}
        {/* ========================================================================= */}
        {abaAtiva === "recibos" && (
          <div className="space-y-4">
            {/* Banner de Apresentação do Recibo Avulso */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Emissão e Controle de Recibos Avulsos
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Design Padrão BR3 Tech
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Emita recibos comerciais com preenchimento automático por extenso, modelos em
                    duas vias (A4) ou cupom térmico (80mm) e envio direto pelo WhatsApp.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={abrirNovoRecibo}
                className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Emitir Recibo Avulso
              </Button>
            </div>

            {/* Barra de Pesquisa de Recibos */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={buscaRecibo}
                onChange={(e) => setBuscaRecibo(e.target.value)}
                placeholder="Buscar recibos por número, cliente, documento ou descrição do serviço..."
                maxLength={80}
                className="pl-9"
              />
            </div>

            {/* Listagem de Recibos Emitidos */}
            {recibosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
                <Receipt className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {termoRecibo
                      ? "Nenhum recibo avulso encontrado com esses termos de busca."
                      : "Nenhum recibo avulso emitido ainda."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique no botão abaixo para gerar o primeiro recibo avulso com o design padrão.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={abrirNovoRecibo}
                  className="gap-1.5 text-xs font-bold mx-auto"
                >
                  <Plus className="h-3.5 w-3.5" /> Emitir Primeiro Recibo
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {recibosFiltrados.map((recibo) => {
                  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }).format(new Date(recibo.dataEmissao));

                  return (
                    <div
                      key={recibo.id}
                      className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/60 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                              {recibo.numero}
                            </span>
                            <span className="font-bold text-base text-foreground">
                              {recibo.clienteNome}
                            </span>
                            {recibo.clienteDocumento && (
                              <span className="text-xs text-muted-foreground">
                                ({recibo.clienteDocumento})
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-1">
                            <strong className="text-foreground">Referente a:</strong>{" "}
                            {recibo.referente}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-black font-mono text-foreground">
                            {moeda(recibo.valor)}
                          </div>
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                            {FORMAS_PAGAMENTO_LABELS[recibo.formaPagamento] ||
                              recibo.formaPagamento}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>
                            Emissão: <strong className="text-foreground">{dataFormatada}</strong>
                          </span>
                          {recibo.clienteTelefone && <span>Tel: {recibo.clienteTelefone}</span>}
                          <span className="italic">({recibo.valorExtenso})</span>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const texto = encodeURIComponent(gerarTextoWhatsAppRecibo(recibo));
                              const fone = (recibo.clienteTelefone || "").replace(/\D/g, "");
                              const url = fone
                                ? `https://wa.me/55${fone}?text=${texto}`
                                : `https://api.whatsapp.com/send?text=${texto}`;
                              window.open(url, "_blank");
                            }}
                            className="h-8 gap-1.5 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                            title="Enviar recibo para o WhatsApp do cliente"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setReciboParaVisualizar(recibo)}
                            className="h-8 gap-1.5 text-xs font-bold bg-primary text-primary-foreground shadow-sm"
                            title="Visualizar e imprimir recibo"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Imprimir / PDF</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirRecibo(recibo.id, recibo.numero)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Excluir recibo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONTEÚDO DA ABA 2: RESUMO FINANCEIRO DE ORDENS                           */}
        {/* ========================================================================= */}
        {abaAtiva === "resumo" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Faturamento por Ordens de Serviço Entregues
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Histórico de OSs que foram concluídas e entregues aos clientes com quitação
                    registrada.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Total Entregue</span>
                  <span className="text-lg font-black font-mono text-primary">
                    {moeda(totalRecebidoOS)}
                  </span>
                </div>
              </div>

              {ordensServico.filter((o) => o.status === "entregue").length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Nenhuma ordem de serviço com status Entregue registrada ainda.
                </p>
              ) : (
                <div className="divide-y divide-border border-t border-border">
                  {ordensServico
                    .filter((o) => o.status === "entregue")
                    .slice(0, 15)
                    .map((os) => {
                      const totalOS = Number(os.valor_pecas) + Number(os.valor_mao_obra);
                      return (
                        <div
                          key={os.id}
                          className="py-2.5 flex items-center justify-between text-xs gap-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              #{os.numero}
                            </span>
                            <span className="text-muted-foreground">
                              {os.entregue_em
                                ? `Entregue em ${dataCurta(os.entregue_em)}`
                                : `Criada em ${dataCurta(os.created_at)}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-foreground">
                              {moeda(totalOS)}
                            </span>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link to="/ordens/$id" params={{ id: os.id }}>
                                Ver OS
                              </Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CRIAÇÃO DE NOVO RECIBO AVULSO                                    */}
      {/* ========================================================================= */}
      {modalNovoReciboAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold shrink-0">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>Emitir Novo Recibo Avulso</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                      {formNumero}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Preencha os dados de quitação para gerar o documento oficial padrão.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalNovoReciboAberto(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarRecibo} className="space-y-4 text-xs">
              {/* Grid: Número e Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="rec-numero">Número do Recibo</Label>
                  <Input
                    id="rec-numero"
                    value={formNumero}
                    onChange={(e) => setFormNumero(e.target.value)}
                    required
                    className="font-mono text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rec-data">Data de Emissão</Label>
                  <Input
                    id="rec-data"
                    type="date"
                    value={formDataEmissao}
                    onChange={(e) => setFormDataEmissao(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Valor e Extenso Automático */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rec-valor" className="font-bold text-foreground">
                      Valor do Recibo (R$) *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                        R$
                      </span>
                      <Input
                        id="rec-valor"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0,00"
                        value={formValor}
                        onChange={(e) =>
                          setFormValor(e.target.value === "" ? "" : parseFloat(e.target.value))
                        }
                        required
                        className="pl-9 font-mono font-bold text-sm text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="rec-forma" className="font-bold text-foreground">
                      Forma de Pagamento *
                    </Label>
                    <select
                      id="rec-forma"
                      value={formFormaPagamento}
                      onChange={(e) =>
                        setFormFormaPagamento(e.target.value as FormaPagamentoRecibo)
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                    >
                      {Object.entries(FORMAS_PAGAMENTO_LABELS).map(([chave, rotulo]) => (
                        <option key={chave} value={chave}>
                          {rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Exibição em tempo real do valor por extenso */}
                {formValor && Number(formValor) > 0 && (
                  <div className="text-[11px] text-muted-foreground bg-background/80 p-2 rounded border border-border">
                    <span className="font-semibold text-foreground">Valor por Extenso: </span>
                    <span className="italic text-primary font-medium">
                      ({converterParaExtenso(Number(formValor))})
                    </span>
                  </div>
                )}
              </div>

              {/* Dados do Cliente / Pagador */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rec-cliente" className="font-semibold text-foreground">
                    Cliente / Pagador *
                  </Label>
                  {clientesCadastrados.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) aoSelecionarClienteExistente(e.target.value);
                      }}
                      defaultValue=""
                      className="text-[11px] text-primary bg-transparent underline cursor-pointer focus:outline-none"
                    >
                      <option value="" disabled>
                        Puxar cliente cadastrado...
                      </option>
                      {clientesCadastrados.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.telefone ? `(${c.telefone})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <Input
                  id="rec-cliente"
                  placeholder="Nome completo do cliente ou empresa pagadora"
                  value={formClienteNome}
                  onChange={(e) => setFormClienteNome(e.target.value)}
                  required
                  className="text-xs"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <Label htmlFor="rec-doc" className="text-[11px] text-muted-foreground">
                      CPF ou CNPJ (Opcional)
                    </Label>
                    <Input
                      id="rec-doc"
                      placeholder="000.000.000-00"
                      value={formClienteDoc}
                      onChange={(e) => setFormClienteDoc(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rec-tel" className="text-[11px] text-muted-foreground">
                      Telefone / WhatsApp (Opcional)
                    </Label>
                    <Input
                      id="rec-tel"
                      placeholder="(92) 90000-0000"
                      value={formClienteTelefone}
                      onChange={(e) => setFormClienteTelefone(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Referente a (Descrição) */}
              <div className="space-y-1.5">
                <Label htmlFor="rec-referente" className="font-semibold text-foreground">
                  Referente a (Descrição dos Serviços ou Produtos) *
                </Label>
                <Textarea
                  id="rec-referente"
                  rows={2}
                  placeholder="Ex: Serviço técnico de substituição de bateria e tela frontal do smartphone iPhone 12."
                  value={formReferente}
                  onChange={(e) => setFormReferente(e.target.value)}
                  required
                  className="text-xs resize-none"
                />

                {/* Sugestões Rápidas de 1 clique */}
                <div className="flex flex-wrap gap-1 pt-1">
                  <span className="text-[10px] text-muted-foreground self-center mr-1">
                    Sugestões:
                  </span>
                  {SUGESTOES_REFERENTE.slice(0, 5).map((sugestao) => (
                    <button
                      type="button"
                      key={sugestao}
                      onClick={() => setFormReferente(sugestao)}
                      className="text-[10px] rounded-full bg-secondary hover:bg-secondary/80 px-2 py-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border"
                    >
                      + {sugestao.split(" / ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modelo de Impressão Padrão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="rec-modelo" className="text-[11px] text-muted-foreground">
                    Formato Padrão de Impressão
                  </Label>
                  <select
                    id="rec-modelo"
                    value={formModelo}
                    onChange={(e) =>
                      setFormModelo(e.target.value as "duas_vias" | "pagina_unica" | "termica_80mm")
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="duas_vias">Duas Vias A4 (Cliente + Loja)</option>
                    <option value="pagina_unica">Via Única A4 (Comercial)</option>
                    <option value="termica_80mm">Cupom Térmico 80mm</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="rec-obs" className="text-[11px] text-muted-foreground">
                    Observações Adicionais (Opcional)
                  </Label>
                  <Input
                    id="rec-obs"
                    placeholder="Garantia de 90 dias, peças originais..."
                    value={formObservacoes}
                    onChange={(e) => setFormObservacoes(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalNovoReciboAberto(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="text-xs gap-1.5 font-bold bg-primary text-primary-foreground shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Emitir e Visualizar Recibo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE IMPRESSÃO / VISUALIZAÇÃO DO RECIBO EMITIDO                       */}
      {/* ========================================================================= */}
      {reciboParaVisualizar && (
        <ReciboImpressoModal
          aberto={Boolean(reciboParaVisualizar)}
          onFechar={() => setReciboParaVisualizar(null)}
          recibo={reciboParaVisualizar}
        />
      )}
    </AppShell>
  );
}
