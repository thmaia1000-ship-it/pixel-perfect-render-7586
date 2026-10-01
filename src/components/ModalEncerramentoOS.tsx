import React, { useState, useEffect } from "react";
import {
  Check,
  X,
  Minus,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  QrCode,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Save,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "@/components/QRCodeSVG";
import {
  ITENS_CHECKLIST_SAIDA,
  type ConferenciaChecklist,
  type StatusConferencia,
  type EncerramentoOS,
  type DiagnosticoExecutado,
} from "@/lib/conferencia-aparelho";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ModalEncerramentoOSProps {
  aberto: boolean;
  onFechar: () => void;
  osId: string;
  osNumero: string;
  aparelhoModelo: string;
  encerramentoAtual?: EncerramentoOS | null;
  onSalvarEncerramento: (novoEncerramento: EncerramentoOS) => Promise<void>;
  podeConcluirOS?: boolean;
  onConcluirOS?: () => Promise<void>;
}

export function ModalEncerramentoOS({
  aberto,
  onFechar,
  osId,
  osNumero,
  aparelhoModelo,
  encerramentoAtual,
  onSalvarEncerramento,
  podeConcluirOS = false,
  onConcluirOS,
}: ModalEncerramentoOSProps) {
  // Identifica a URL base correta: se for localhost, disponibiliza também o IP de rede local
  const originAtual = typeof window !== "undefined" ? window.location.origin : "";
  const hostnameAtual = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const portaAtual = typeof window !== "undefined" ? window.location.port || "3000" : "3000";

  // IP local detectado da máquina de desenvolvimento
  const ipRedeLocal = "192.168.1.13";
  const [usarIpRede, setUsarIpRede] = useState(
    hostnameAtual === "localhost" || hostnameAtual === "127.0.0.1",
  );

  // Sessão de autenticação do técnico para transferir login transparente ao smartphone via QR Code
  const [sessionAuth, setSessionAuth] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);
  const [incluirLoginAutomatico, setIncluirLoginAutomatico] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionAuth({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    });
  }, []);

  const urlBase =
    usarIpRede && (hostnameAtual === "localhost" || hostnameAtual === "127.0.0.1")
      ? `http://${ipRedeLocal}:${portaAtual}`
      : originAtual;

  const urlDiagnosticoLimpa = `${urlBase}/diagnostico/${osId}`;
  const urlDiagnosticoComAuth = sessionAuth
    ? `${urlDiagnosticoLimpa}#token=${encodeURIComponent(sessionAuth.access_token)}&refresh=${encodeURIComponent(sessionAuth.refresh_token)}`
    : urlDiagnosticoLimpa;

  const urlDiagnostico =
    incluirLoginAutomatico && sessionAuth ? urlDiagnosticoComAuth : urlDiagnosticoLimpa;

  // Checklist de saída manual
  const [checklist, setChecklist] = useState<ConferenciaChecklist>(() => {
    const inicial: ConferenciaChecklist = {};
    for (const item of ITENS_CHECKLIST_SAIDA) {
      inicial[item] = encerramentoAtual?.checklistSaida?.[item] ?? null;
    }
    return inicial;
  });

  const [obsSaida, setObsSaida] = useState(encerramentoAtual?.observacoesSaida || "");
  const [salvando, setSalvando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [mostrarQrCodeModal, setMostrarQrCodeModal] = useState(false);

  const diagnosticoHardware = encerramentoAtual?.diagnosticoHardware;

  const toggleItem = (item: string, status: "OK" | "Defeito" | "N/V") => {
    setChecklist((prev) => ({
      ...prev,
      [item]: prev[item] === status ? null : status,
    }));
  };

  const marcarTodos = (status: "OK" | "Defeito" | "N/V") => {
    const atualizado: ConferenciaChecklist = {};
    for (const item of ITENS_CHECKLIST_SAIDA) {
      atualizado[item] = status;
    }
    setChecklist(atualizado);
  };

  const contadores = React.useMemo(() => {
    let ok = 0;
    let defeito = 0;
    let nv = 0;
    let pendente = 0;
    for (const item of ITENS_CHECKLIST_SAIDA) {
      const st = checklist[item];
      if (st === "OK") ok++;
      else if (st === "Defeito") defeito++;
      else if (st === "N/V") nv++;
      else pendente++;
    }
    return { ok, defeito, nv, pendente };
  }, [checklist]);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const novo: EncerramentoOS = {
        checklistSaida: checklist,
        diagnosticoHardware: diagnosticoHardware || null,
        observacoesSaida: obsSaida.trim(),
        encerradoEm: new Date().toISOString(),
      };
      await onSalvarEncerramento(novo);
      toast.success("Checklist de saída salvo com sucesso!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar checklist de saída.");
    } finally {
      setSalvando(false);
    }
  };

  const handleConcluir = async () => {
    if (!onConcluirOS) return;
    setConcluindo(true);
    try {
      const novo: EncerramentoOS = {
        checklistSaida: checklist,
        diagnosticoHardware: diagnosticoHardware || null,
        observacoesSaida: obsSaida.trim(),
        encerradoEm: new Date().toISOString(),
      };
      await onSalvarEncerramento(novo);
      await onConcluirOS();
      toast.success(`Ordem #${osNumero} concluída com sucesso!`);
      onFechar();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao concluir ordem de serviço.");
    } finally {
      setConcluindo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <span>Checklist de Saída e Encerramento da OS</span>
              <span className="font-mono text-xs text-primary px-2 py-0.5 rounded bg-primary/10">
                #{osNumero}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Equipamento: <strong>{aparelhoModelo}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarQrCodeModal(!mostrarQrCodeModal)}
              className="gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10"
            >
              <QrCode className="h-4 w-4" />
              <span>{mostrarQrCodeModal ? "Ocultar QR Code" : "QR Code Teste *#0*#"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFechar}
              className="h-8 w-8 p-0 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Painel do QR Code para Teste Interativo de Hardware no celular (*#0*#) */}
        {mostrarQrCodeModal && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="shrink-0 bg-white p-3 rounded-2xl shadow-xl border-2 border-slate-300 flex flex-col items-center">
                <QRCodeSVG value={urlDiagnostico} size={200} />
                <span className="text-[10px] font-mono text-slate-800 mt-2 font-bold px-2 py-0.5 bg-slate-100 rounded">
                  {urlBase}
                </span>
              </div>
              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[11px] font-bold">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Diagnóstico no Aparelho</span>
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  Aponte a câmera do aparelho para este QR Code
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ele abre no celular a suíte de testes com os mesmos comandos do menu secreto{" "}
                  <code className="text-primary font-mono">*#0*#</code>: Red, Green, Blue, Touch
                  Grid, Speaker, Receiver, Câmeras, Microfone e Sensores.
                </p>

                {/* Alternância de IP para rede Wi-Fi */}
                {(hostnameAtual === "localhost" || hostnameAtual === "127.0.0.1") && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Link do QR:
                    </span>
                    <button
                      type="button"
                      onClick={() => setUsarIpRede(true)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                        usarIpRede
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                      title="Utiliza o IP da rede Wi-Fi (192.168.1.13) para o smartphone conseguir acessar o servidor local"
                    >
                      IP Rede Wi-Fi ({ipRedeLocal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsarIpRede(false)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                        !usarIpRede
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      Localhost
                    </button>
                  </div>
                )}

                {/* Opção de login automático do técnico */}
                {sessionAuth && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-emerald-400 font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={incluirLoginAutomatico}
                        onChange={(e) => setIncluirLoginAutomatico(e.target.checked)}
                        className="rounded border-border bg-background text-primary focus:ring-primary h-3.5 w-3.5 accent-primary"
                      />
                      <span>Login Automático via QR Code (Sem digitar senha no celular)</span>
                    </label>
                  </div>
                )}

                {/* Campo de link direto e cópia */}
                <div className="flex items-center gap-1.5 pt-1.5">
                  <input
                    type="text"
                    readOnly
                    value={urlDiagnostico}
                    className="flex-1 bg-background border border-border rounded px-2 py-1 text-[11px] font-mono select-all text-muted-foreground"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(urlDiagnostico);
                      toast.success("Link do teste copiado!");
                    }}
                    className="text-xs h-7 px-2"
                  >
                    Copiar
                  </Button>
                  <Button asChild size="sm" variant="outline" className="text-xs gap-1 h-7 px-2">
                    <a href={urlDiagnostico} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3 w-3" /> Testar
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo do Laudo de Hardware (*#0*#) já registrado */}
        {diagnosticoHardware && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Laudo de Testes de Hardware Registrado via QR
                Code
              </span>
              <span className="font-mono">
                {diagnosticoHardware.totalAprovados} OK / {diagnosticoHardware.totalReprovados}{" "}
                Falhas
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {Object.entries(diagnosticoHardware.testes).map(([testeId, res]) => (
                <div
                  key={testeId}
                  className={`p-1.5 rounded border text-[11px] font-medium flex flex-col justify-between ${
                    res.status === "aprovado"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                      : res.status === "reprovado"
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{testeId.replace("_", " ")}</span>
                    <span className="font-bold">
                      {res.status === "aprovado" ? "✓" : res.status === "reprovado" ? "✕" : "—"}
                    </span>
                  </div>
                  {res.detalhes && (
                    <span
                      className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1 opacity-90"
                      title={res.detalhes}
                    >
                      {res.detalhes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Checklist de Saída da Oficina */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Itens de Inspeção de Saída ({ITENS_CHECKLIST_SAIDA.length})
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-emerald-500">{contadores.ok} OK</span>
              {contadores.defeito > 0 && (
                <span className="text-xs font-semibold text-rose-500">
                  {contadores.defeito} Defeito
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => marcarTodos("OK")}
                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 hover:bg-emerald-500/20"
              >
                Marcar Todos OK
              </button>
              <button
                type="button"
                onClick={() => marcarTodos("N/V")}
                className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Todos N/V
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[38vh] overflow-y-auto p-1 border rounded-xl border-border/80 bg-background/50">
            {ITENS_CHECKLIST_SAIDA.map((item) => {
              const status = checklist[item];
              const isOk = status === "OK";
              const isDefeito = status === "Defeito";
              const isNV = status === "N/V";

              return (
                <div
                  key={item}
                  className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-colors ${
                    isOk
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : isDefeito
                        ? "border-rose-500/40 bg-rose-500/5"
                        : isNV
                          ? "border-border bg-muted/30 text-muted-foreground"
                          : "border-border/60 bg-card hover:bg-secondary/40"
                  }`}
                >
                  <span className="font-medium text-foreground truncate pr-1" title={item}>
                    {item}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleItem(item, "OK")}
                      className={`h-7 w-7 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                        isOk
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-500"
                      }`}
                      title="Item Aprovado"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleItem(item, "Defeito")}
                      className={`h-7 w-7 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                        isDefeito
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-rose-500/20 hover:text-rose-500"
                      }`}
                      title="Item com Defeito"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleItem(item, "N/V")}
                      className={`h-7 w-7 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                        isNV
                          ? "bg-slate-600 text-white shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                      title="Não verificado"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Observações da Saída */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">
            Observações Técnicas do Encerramento:
          </label>
          <textarea
            rows={2}
            value={obsSaida}
            onChange={(e) => setObsSaida(e.target.value)}
            placeholder="Ex: Peça original instalada; aparelho higienizado e entregue com 90 dias de garantia..."
            className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Rodapé e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" size="sm" onClick={onFechar} className="text-xs">
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={salvando}
              onClick={handleSalvar}
              className="text-xs gap-1.5 font-bold"
            >
              <Save className="h-3.5 w-3.5 text-primary" />
              <span>Salvar Checklist</span>
            </Button>

            {podeConcluirOS && (
              <Button
                type="button"
                size="sm"
                disabled={concluindo || salvando}
                onClick={handleConcluir}
                className="text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Salvar e Concluir OS</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
