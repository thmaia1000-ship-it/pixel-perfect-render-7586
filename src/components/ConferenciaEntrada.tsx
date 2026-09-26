import React from "react";
import { Check, X, Minus, CheckCircle2, AlertTriangle, HelpCircle, RotateCcw } from "lucide-react";
import {
  ITENS_CONFERENCIA_ENTRADA,
  type ConferenciaChecklist,
  type StatusConferencia,
} from "@/lib/conferencia-aparelho";

interface ConferenciaEntradaProps {
  valor: ConferenciaChecklist;
  onChange?: (novoValor: ConferenciaChecklist) => void;
  somenteLeitura?: boolean;
}

export function ConferenciaEntrada({
  valor,
  onChange,
  somenteLeitura = false,
}: ConferenciaEntradaProps) {
  const contadores = React.useMemo(() => {
    let ok = 0;
    let defeito = 0;
    let nv = 0;
    let desmarcados = 0;
    for (const item of ITENS_CONFERENCIA_ENTRADA) {
      const st = valor[item];
      if (st === "OK") ok++;
      else if (st === "Defeito") defeito++;
      else if (st === "N/V") nv++;
      else desmarcados++;
    }
    return { ok, defeito, nv, desmarcados };
  }, [valor]);

  const toggleItem = (item: string, status: "OK" | "Defeito" | "N/V") => {
    if (somenteLeitura || !onChange) return;
    const atual = valor[item];
    // Se clicar na mesma opção que já está marcada, desmarca ela (vira null)
    const novoStatus: StatusConferencia = atual === status ? null : status;
    onChange({
      ...valor,
      [item]: novoStatus,
    });
  };

  const marcarTodos = (status: "OK" | "Defeito" | "N/V") => {
    if (somenteLeitura || !onChange) return;
    const atualizado: ConferenciaChecklist = {};
    for (const item of ITENS_CONFERENCIA_ENTRADA) {
      atualizado[item] = status;
    }
    onChange(atualizado);
  };

  const desmarcarTodos = () => {
    if (somenteLeitura || !onChange) return;
    const atualizado: ConferenciaChecklist = {};
    for (const item of ITENS_CONFERENCIA_ENTRADA) {
      atualizado[item] = null;
    }
    onChange(atualizado);
  };

  return (
    <div className="space-y-3">
      {/* Barra de ações rápidas e resumo */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> {contadores.ok} OK
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-3 w-3" /> {contadores.defeito} Defeito
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <HelpCircle className="h-3 w-3" /> {contadores.nv} N/V
          </span>
          {contadores.desmarcados > 0 && !somenteLeitura && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              {contadores.desmarcados} sem marcação
            </span>
          )}
        </div>

        {!somenteLeitura && (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => marcarTodos("OK")}
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
            >
              Marcar todos OK
            </button>
            <button
              type="button"
              onClick={() => marcarTodos("N/V")}
              className="rounded-md border border-border bg-secondary/80 px-2.5 py-1 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Marcar todos N/V
            </button>
            <button
              type="button"
              onClick={desmarcarTodos}
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-2.5 py-1 font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              title="Limpar todas as marcações da conferência"
            >
              <RotateCcw className="h-3 w-3" /> Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Tabela de conferência */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Item</th>
              <th className="w-24 py-2.5 px-2 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                OK
              </th>
              <th className="w-24 py-2.5 px-2 text-center font-semibold text-rose-600 dark:text-rose-400">
                Defeito
              </th>
              <th className="w-24 py-2.5 px-2 text-center font-semibold text-muted-foreground">
                N/V
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {ITENS_CONFERENCIA_ENTRADA.map((item, idx) => {
              const statusAtual = valor[item];

              return (
                <tr
                  key={item}
                  className={`transition-colors ${
                    idx % 2 === 0 ? "bg-card" : "bg-muted/15"
                  } hover:bg-muted/30`}
                >
                  <td className="py-2.5 px-4 font-medium text-foreground">{item}</td>

                  {/* Coluna OK */}
                  <td className="py-2 px-2 text-center">
                    {somenteLeitura ? (
                      statusAtual === "OK" ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleItem(item, "OK")}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                          statusAtual === "OK"
                            ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 ring-2 ring-emerald-500/30"
                            : "border-border/80 bg-background text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600"
                        }`}
                        title={
                          statusAtual === "OK"
                            ? `Desmarcar OK em "${item}"`
                            : `Marcar "${item}" como OK`
                        }
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </td>

                  {/* Coluna Defeito */}
                  <td className="py-2 px-2 text-center">
                    {somenteLeitura ? (
                      statusAtual === "Defeito" ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold">
                          <X className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleItem(item, "Defeito")}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                          statusAtual === "Defeito"
                            ? "border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/30 ring-2 ring-rose-500/30"
                            : "border-border/80 bg-background text-muted-foreground hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-600"
                        }`}
                        title={
                          statusAtual === "Defeito"
                            ? `Desmarcar Defeito em "${item}"`
                            : `Marcar "${item}" como Defeito`
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </td>

                  {/* Coluna N/V */}
                  <td className="py-2 px-2 text-center">
                    {somenteLeitura ? (
                      statusAtual === "N/V" ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground font-bold">
                          <Minus className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleItem(item, "N/V")}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                          statusAtual === "N/V"
                            ? "border-muted-foreground/40 bg-muted text-foreground font-semibold shadow-sm ring-2 ring-foreground/10"
                            : "border-border/80 bg-background text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
                        }`}
                        title={
                          statusAtual === "N/V"
                            ? `Desmarcar N/V em "${item}"`
                            : `Marcar "${item}" como Não Verificado`
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground pt-1">
        <p className="italic">
          Cliente confere e concorda com o estado do aparelho descrito acima na entrada.
        </p>
        {!somenteLeitura && (
          <span className="text-[11px] font-medium text-primary">
            💡 Dica: clique sobre uma opção já marcada para desmarcá-la a qualquer momento.
          </span>
        )}
      </div>
    </div>
  );
}
