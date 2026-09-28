import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Wrench,
  Smartphone,
  Phone,
  Share2,
  FileCheck,
  XCircle,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AssinaturaDigitalCanvas } from "@/components/AssinaturaDigitalCanvas";
import { supabase } from "@/integrations/supabase/client";
import {
  deserializarEstadoEConferencia,
  serializarEstadoEConferencia,
  type AssinaturaAutorizacao,
} from "@/lib/conferencia-aparelho";
import { moeda, dataCurta, dataHora, linkWhatsApp } from "@/lib/br3";

interface DadosOSAprovacao {
  id: string;
  numero: string;
  created_at: string;
  aparelho: string;
  marca: string | null;
  modelo: string | null;
  imei: string | null;
  defeito_relatado: string;
  diagnostico: string | null;
  valor_pecas: number;
  valor_mao_obra: number;
  garantia_dias: number;
  prazo: string | null;
  estado_fisico: string | null;
  status: string;
  clientes?: {
    id: string;
    nome: string;
    telefone?: string | null;
    email?: string | null;
    documento?: string | null;
  } | null;
  profiles?: {
    nome: string;
  } | null;
}

export const Route = createFileRoute("/aprovacao/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Aprovação de Orçamento — BR3 Tech" },
      {
        name: "description",
        content:
          "Assine digitalmente e autorize a execução do serviço do seu aparelho na BR3 Tech.",
      },
      { property: "og:title", content: "Aprovação de Orçamento — BR3 Tech" },
      {
        property: "og:description",
        content:
          "Assine digitalmente e autorize a execução do serviço do seu aparelho na BR3 Tech.",
      },
    ],
  }),
  component: PaginaAprovacaoCliente,
});

function PaginaAprovacaoCliente() {
  const { id } = Route.useParams();
  const [carregando, setCarregando] = useState(true);
  const [os, setOs] = useState<DadosOSAprovacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Form de assinatura
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string | null>(null);
  const [nomeSignatario, setNomeSignatario] = useState("");
  const [documentoSignatario, setDocumentoSignatario] = useState("");
  const [concordouTermos, setConcordouTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Modal / Confirmação de recusa
  const [mostrandoRecusa, setMostrandoRecusa] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [recusado, setRecusado] = useState(false);

  useEffect(() => {
    async function carregarOS() {
      setCarregando(true);
      setErro(null);
      try {
        const { data, error } = await supabase
          .from("ordens_servico")
          .select("*, clientes(id, nome, telefone, email, documento), profiles(nome)")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setErro("Ordem de serviço não encontrada ou link expirado.");
          return;
        }

        setOs(data);
        if (data.clientes?.nome) {
          setNomeSignatario(data.clientes.nome);
        }
        if (data.clientes?.documento) {
          setDocumentoSignatario(data.clientes.documento);
        }

        // Verifica se já possui assinatura registrada
        const { assinaturaAutorizacao } = deserializarEstadoEConferencia(data.estado_fisico);
        if (assinaturaAutorizacao) {
          if (assinaturaAutorizacao.recusado) {
            setRecusado(true);
          } else {
            setSucesso(true);
            setAssinaturaDataUrl(assinaturaAutorizacao.dataUrl);
            setNomeSignatario(assinaturaAutorizacao.nome_signatario);
          }
        }
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao carregar dados do orçamento.");
      } finally {
        setCarregando(false);
      }
    }

    if (id) {
      carregarOS();
    }
  }, [id]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-muted-foreground">
            Carregando detalhes do orçamento...
          </p>
        </div>
      </div>
    );
  }

  if (erro || !os) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Acesso ao Orçamento</h2>
          <p className="mt-2 text-sm text-muted-foreground">{erro || "Ordem não encontrada."}</p>
          <div className="mt-6 flex flex-col gap-2">
            <a
              href="https://wa.me/5592992365757"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              <Phone className="h-4 w-4" /> Falar com a Assistência BR3 Tech
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { conferencia, observacoes, midias, assinaturaAutorizacao } =
    deserializarEstadoEConferencia(os.estado_fisico);
  const total = Number(os.valor_pecas) + Number(os.valor_mao_obra);
  const modeloAparelho = [os.marca, os.modelo].filter(Boolean).join(" ") || os.aparelho;
  const telefoneLojaWhatsApp = "5592992365757";

  const mensagemDuvida = `Olá, BR3 Tech! Gostaria de tirar dúvidas sobre o orçamento da minha OS #${os.numero} (${modeloAparelho}), valor total ${moeda(total)}.`;

  async function handleAprovar(e: React.FormEvent) {
    e.preventDefault();
    if (!assinaturaDataUrl) {
      toast.error("Por favor, desenhe sua assinatura na tela antes de confirmar.");
      return;
    }
    if (!nomeSignatario.trim()) {
      toast.error("Por favor, informe o seu nome completo.");
      return;
    }
    if (!concordouTermos) {
      toast.error("Por favor, confirme que concorda com os valores e autoriza a execução.");
      return;
    }

    setEnviando(true);
    try {
      const dataHoraAtual = new Date().toISOString();
      const novaAssinatura: AssinaturaAutorizacao = {
        dataUrl: assinaturaDataUrl,
        aprovado_em: dataHoraAtual,
        nome_signatario: nomeSignatario.trim(),
        documento_signatario: documentoSignatario.trim() || null,
        recusado: false,
      };

      const novoEstadoFisico = serializarEstadoEConferencia(
        conferencia,
        observacoes,
        midias,
        novaAssinatura,
      );

      // Atualiza OS para "em_reparo" (serviço aprovado e iniciado)
      const { error: erroOS } = await supabase
        .from("ordens_servico")
        .update({
          status: "em_reparo",
          estado_fisico: novoEstadoFisico,
        })
        .eq("id", os.id);

      if (erroOS) throw erroOS;

      // Registra no histórico
      await supabase.from("os_historico").insert({
        os_id: os.id,
        status: "em_reparo",
        observacao: `Aprovação digital com assinatura na tela confirmada por ${nomeSignatario.trim()}${
          documentoSignatario ? ` (Doc: ${documentoSignatario})` : ""
        }. Orçamento total: ${moeda(total)}.`,
        usuario_nome: `Cliente (${nomeSignatario.trim()})`,
      });

      setSucesso(true);
      toast.success("Orçamento aprovado com sucesso! Já notificamos nossa equipe.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar aprovação do orçamento.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRecusar() {
    setEnviando(true);
    try {
      const dataHoraAtual = new Date().toISOString();
      const assinaturaRecusa: AssinaturaAutorizacao = {
        dataUrl: "",
        aprovado_em: dataHoraAtual,
        nome_signatario: nomeSignatario.trim() || os.clientes?.nome || "Cliente",
        documento_signatario: documentoSignatario.trim() || null,
        recusado: true,
        motivo_recusa: motivoRecusa.trim() || "Cliente optou por não realizar o serviço.",
      };

      const novoEstadoFisico = serializarEstadoEConferencia(
        conferencia,
        observacoes,
        midias,
        assinaturaRecusa,
      );

      const { error: erroOS } = await supabase
        .from("ordens_servico")
        .update({
          status: "orcamento_recusado",
          estado_fisico: novoEstadoFisico,
        })
        .eq("id", os.id);

      if (erroOS) throw erroOS;

      await supabase.from("os_historico").insert({
        os_id: os.id,
        status: "orcamento_recusado",
        observacao: `Orçamento recusado pelo cliente. Motivo: ${motivoRecusa || "Não informado"}.`,
        usuario_nome: `Cliente (${nomeSignatario.trim() || "Cliente"})`,
      });

      setRecusado(true);
      setMostrandoRecusa(false);
      toast.info("A recusa do orçamento foi registrada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao recusar orçamento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased py-6 px-3 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Cabeçalho Oficial */}
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm text-center space-y-2">
          <div className="flex justify-center">
            <Logo size="md" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground">
              Aprovação de Orçamento e Execução de Serviço
            </h1>
            <p className="text-xs text-muted-foreground">
              BR3 Tech · Assistência Técnica Especializada · Manaus/AM
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary">
            Ordem de Serviço Nº #{os.numero}
          </div>
        </header>

        {/* TELA DE SUCESSO SE JÁ APROVADO */}
        {sucesso && (
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center shadow-md space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-emerald-950 dark:text-emerald-200">
                Orçamento Aprovado com Sucesso!
              </h2>
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                Sua autorização digital foi registrada e nossa equipe técnica já foi notificada para
                iniciar o reparo do seu equipamento.
              </p>
            </div>

            {assinaturaDataUrl && (
              <div className="mx-auto max-w-sm rounded-xl border border-emerald-500/30 bg-white dark:bg-slate-900 p-3 shadow-inner">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Assinatura Digital Capturada
                </p>
                <img
                  src={assinaturaDataUrl}
                  alt="Assinatura do cliente"
                  className="mx-auto max-h-24 w-auto object-contain"
                />
                <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-1">
                  Signatário: <strong>{nomeSignatario}</strong>
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2">
              <a
                href={linkWhatsApp(telefoneLojaWhatsApp, mensagemDuvida)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-500"
              >
                <Share2 className="h-4 w-4" /> Acompanhar pelo WhatsApp da Loja
              </a>
            </div>
          </section>
        )}

        {/* TELA SE RECUSADO */}
        {recusado && (
          <section className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-card p-6 text-center shadow-md space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <XCircle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Orçamento Não Autorizado</h2>
            <p className="text-sm text-muted-foreground">
              Você optou por não autorizar a execução do serviço. Seu aparelho permanecerá
              aguardando retirada na assistência.
            </p>
            <div className="pt-2">
              <a
                href={linkWhatsApp(
                  telefoneLojaWhatsApp,
                  `Olá, BR3 Tech! Gostaria de conversar sobre a OS #${os.numero}.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                Precisa de uma nova proposta? Fale conosco no WhatsApp
              </a>
            </div>
          </section>
        )}

        {/* DETALHES DO APARELHO & ORÇAMENTO */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Equipamento e Cliente</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
                Cliente
              </span>
              <span className="font-bold text-sm text-foreground">
                {os.clientes?.nome || "Não informado"}
              </span>
            </div>
            <div>
              <span className="block text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
                Aparelho / Modelo
              </span>
              <span className="font-bold text-sm text-foreground">{modeloAparelho}</span>
            </div>
            {os.imei && (
              <div>
                <span className="block text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
                  IMEI / Nº de Série
                </span>
                <span className="font-mono text-foreground">{os.imei}</span>
              </div>
            )}
            <div>
              <span className="block text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
                Data de Entrada
              </span>
              <span className="font-medium text-foreground">{dataCurta(os.created_at)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 space-y-1.5 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px]">
              Defeito Relatado pelo Cliente:
            </span>
            <p className="text-foreground">{os.defeito_relatado}</p>
          </div>

          {os.diagnostico && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-3 space-y-1.5 text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-300 uppercase text-[10px] flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5" /> Diagnóstico da Equipe Técnica:
              </span>
              <p className="text-foreground">{os.diagnostico}</p>
            </div>
          )}
        </section>

        {/* DISCRIMINAÇÃO DO ORÇAMENTO */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Valores do Orçamento</h2>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              Garantia: {os.garantia_dias || 90} dias
            </span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-muted-foreground">Peças e Componentes de Reposição:</span>
              <span className="font-semibold text-foreground">{moeda(os.valor_pecas)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-muted-foreground">Serviço Técnico / Mão de Obra:</span>
              <span className="font-semibold text-foreground">{moeda(os.valor_mao_obra)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 text-base sm:text-lg font-black text-primary">
              <span>VALOR TOTAL DO SERVIÇO:</span>
              <span className="text-xl sm:text-2xl">{moeda(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground border-t border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>
                Previsão de conclusão:{" "}
                <strong className="text-foreground">{dataCurta(os.prazo)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>
                Garantia legal:{" "}
                <strong className="text-foreground">
                  {os.garantia_dias || 90} dias sobre o reparo
                </strong>
              </span>
            </div>
          </div>
        </section>

        {/* FOTOS DA CONFERÊNCIA INICIAL (SE HOUVER) */}
        {midias.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              Fotos da Conferência de Entrada ({midias.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Registros visuais do estado físico do aparelho no momento do recebimento.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {midias.map((m, idx) => (
                <a
                  key={m.id || idx}
                  href={m.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block aspect-video overflow-hidden rounded-lg border border-border bg-slate-100 dark:bg-slate-900"
                >
                  <img
                    src={m.url}
                    alt={m.nome}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] text-white">
                    Foto {idx + 1}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* FORMULÁRIO DE ASSINATURA NA TELA (SE PENDENTE) */}
        {!sucesso && !recusado && (
          <form
            onSubmit={handleAprovar}
            className="rounded-2xl border-2 border-primary/30 bg-card p-5 sm:p-6 shadow-xl space-y-5"
          >
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Assinatura na Tela para Aprovação
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Ao assinar abaixo, você autoriza formalmente a BR3 Tech a executar os serviços e
                utilizar as peças descritas neste orçamento.
              </p>
            </div>

            {/* Canvas de Assinatura */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                Desenhe sua Assinatura Digital no Quadro Abaixo: *
              </Label>
              <AssinaturaDigitalCanvas
                altura={180}
                onAssinaturaAlterada={(url) => setAssinaturaDataUrl(url)}
              />
            </div>

            {/* Dados do Signatário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="nomeSignatario" className="text-xs font-bold">
                  Nome Completo do Titular ou Responsável: *
                </Label>
                <Input
                  id="nomeSignatario"
                  value={nomeSignatario}
                  onChange={(e) => setNomeSignatario(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="docSignatario"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  CPF ou RG (Opcional):
                </Label>
                <Input
                  id="docSignatario"
                  value={documentoSignatario}
                  onChange={(e) => setDocumentoSignatario(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            {/* Checkbox de Aceite */}
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3">
              <Checkbox
                id="termos"
                checked={concordouTermos}
                onCheckedChange={(checked) => setConcordouTermos(Boolean(checked))}
                className="mt-0.5"
              />
              <label
                htmlFor="termos"
                className="text-xs text-foreground leading-relaxed cursor-pointer"
              >
                Declaro que li e concordo com os valores de peças e serviços orçados no total de{" "}
                <strong>{moeda(total)}</strong>, e autorizo a assistência técnica BR3 Tech a iniciar
                o reparo do meu equipamento conforme as condições e garantias especificadas.
              </label>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                disabled={enviando || !assinaturaDataUrl || !concordouTermos}
                className="w-full h-12 text-sm sm:text-base font-bold shadow-lg gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {enviando ? "Registrando aprovação..." : "✓ Confirmar e Assinar Aprovação"}
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <a
                  href={linkWhatsApp(telefoneLojaWhatsApp, mensagemDuvida)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-emerald-600" /> Tirar dúvidas no WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => setMostrandoRecusa(!mostrandoRecusa)}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Não desejo aprovar este orçamento
                </button>
              </div>

              {/* Caixa expansível para recusa */}
              {mostrandoRecusa && (
                <div className="mt-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3 text-xs">
                  <h4 className="font-bold text-rose-900 dark:text-rose-300">
                    Recusar Orçamento de Serviço
                  </h4>
                  <p className="text-muted-foreground">
                    Caso não aprove o reparo, seu aparelho ficará disponível para retirada no balcão
                    da assistência.
                  </p>
                  <div>
                    <Label htmlFor="motivo" className="text-[11px] font-semibold">
                      Motivo (opcional):
                    </Label>
                    <Input
                      id="motivo"
                      value={motivoRecusa}
                      onChange={(e) => setMotivoRecusa(e.target.value)}
                      placeholder="Ex: Valor acima do esperado, optou por comprar outro, etc."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrandoRecusa(false)}
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRecusar}
                      disabled={enviando}
                    >
                      Confirmar Recusa
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}

        {/* Rodapé institucional */}
        <footer className="text-center text-xs text-muted-foreground space-y-1 py-4">
          <p>BR3 Tech · Especialistas em reparo de smartphones, tablets e computadores</p>
          <p>Manaus/AM · WhatsApp: (92) 99236-5757</p>
        </footer>
      </div>
    </div>
  );
}
