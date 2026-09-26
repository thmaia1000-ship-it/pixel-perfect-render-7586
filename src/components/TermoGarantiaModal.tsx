import React from "react";
import { Printer, X, Check, FileText, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import {
  ITENS_CONFERENCIA_ENTRADA,
  type ConferenciaChecklist,
  type MidiaConferencia,
} from "@/lib/conferencia-aparelho";
import { moeda, dataCurta } from "@/lib/br3";

interface TermoGarantiaModalProps {
  aberto: boolean;
  onFechar: () => void;
  os: {
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
    acessorios: string | null;
    estado_fisico: string | null;
    clientes?: {
      nome: string;
      telefone?: string | null;
      documento?: string | null;
    } | null;
    profiles?: {
      nome: string;
    } | null;
  };
  conferencia: ConferenciaChecklist;
  observacoesFisicas?: string;
  midias?: MidiaConferencia[];
}

export function TermoGarantiaModal({
  aberto,
  onFechar,
  os,
  conferencia,
  observacoesFisicas,
  midias = [],
}: TermoGarantiaModalProps) {
  if (!aberto) return null;

  const total = Number(os.valor_pecas) + Number(os.valor_mao_obra);
  const dataFormatada = dataCurta(os.created_at);

  const imprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-background p-6 shadow-2xl print:border-none print:shadow-none print:p-0">
        {/* Barra superior de ações na tela (oculta na impressão) */}
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-base font-bold">Termo de Garantia e Entrada (OS #{os.numero})</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={imprimir} size="sm" className="gap-1.5 font-semibold">
              <Printer className="h-4 w-4" /> Imprimir Termo
            </Button>
            <Button onClick={onFechar} variant="outline" size="sm">
              <X className="h-4 w-4" /> Fechar
            </Button>
          </div>
        </div>

        {/* DOCUMENTO IMPRESSO / FORMATO TERMO OFICIAL CONFORME ANEXO */}
        <div className="space-y-5 bg-white text-slate-900 p-6 md:p-8 rounded-xl border border-slate-200 text-xs sm:text-sm font-sans print:border-none print:p-4 print:text-black">
          {/* Cabeçalho */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-4">
            <div className="flex items-center gap-3">
              <Logo size="md" />
            </div>
            <div className="text-right">
              <h1 className="text-lg md:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                TERMO DE GARANTIA
              </h1>
              <p className="text-sm font-bold text-slate-800">OS Nº {os.numero}</p>
              <p className="text-xs text-slate-600">Data: {dataFormatada}</p>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 text-center border-b border-slate-200 pb-2">
            WhatsApp da Empresa: <span className="font-semibold text-slate-800">92992365757</span> ·
            E-mail: <span className="font-semibold text-slate-800">br3tech.am@gmail.com</span>
          </div>

          {/* DADOS DO CLIENTE */}
          <section>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
              DADOS DO CLIENTE
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">Nome</span>
                <span className="font-semibold text-slate-900">
                  {os.clientes?.nome || "Não informado"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  WhatsApp / Telefone
                </span>
                <span className="font-semibold text-slate-900">
                  {os.clientes?.telefone || "Não informado"}
                </span>
              </div>
            </div>
          </section>

          {/* EQUIPAMENTO E SERVIÇO */}
          <section>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
              EQUIPAMENTO E SERVIÇO
            </h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  Modelo do Aparelho
                </span>
                <span className="font-semibold text-slate-900">
                  {[os.marca, os.modelo].filter(Boolean).join(" ") || os.aparelho}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  IMEI / Número de Série
                </span>
                <span className="font-medium text-slate-900">{os.imei || "Não informado"}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  Tipo de Aparelho
                </span>
                <span className="font-medium text-slate-900">{os.aparelho}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  Valor Total
                </span>
                <span className="font-extrabold text-slate-900">{moeda(total)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  Prazo de Garantia
                </span>
                <span className="font-semibold text-emerald-700">
                  {os.garantia_dias ? `${os.garantia_dias} dias` : "3 meses"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  Acessórios Recebidos
                </span>
                <span className="font-medium text-slate-900">{os.acessorios || "Nenhum"}</span>
              </div>
              <div className="col-span-2">
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  Defeito Relatado / Observações
                </span>
                <span className="font-medium text-slate-900">{os.defeito_relatado}</span>
                {observacoesFisicas && (
                  <p className="mt-1 text-[11px] text-slate-600">
                    <span className="font-bold">Estado físico:</span> {observacoesFisicas}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* CONFERÊNCIA DE ENTRADA DO APARELHO */}
          <section className="pt-1">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
              CONFERÊNCIA DE ENTRADA DO APARELHO
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 py-1.5 px-3 text-left font-bold">
                      Item
                    </th>
                    <th className="border border-slate-300 py-1.5 px-3 text-center font-bold w-16 text-emerald-700">
                      OK
                    </th>
                    <th className="border border-slate-300 py-1.5 px-3 text-center font-bold w-16 text-rose-700">
                      Defeito
                    </th>
                    <th className="border border-slate-300 py-1.5 px-3 text-center font-bold w-16 text-slate-600">
                      N/V
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ITENS_CONFERENCIA_ENTRADA.map((item, idx) => {
                    const st = conferencia[item] ?? "N/V";
                    return (
                      <tr key={item} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-300 py-1 px-3 font-medium text-slate-800">
                          {item}
                        </td>
                        <td className="border border-slate-300 py-1 px-3 text-center font-bold text-emerald-600">
                          {st === "OK" ? "✓" : ""}
                        </td>
                        <td className="border border-slate-300 py-1 px-3 text-center font-bold text-rose-600">
                          {st === "Defeito" ? "✓" : ""}
                        </td>
                        <td className="border border-slate-300 py-1 px-3 text-center font-bold text-slate-500">
                          {st === "N/V" ? "✓" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[10px] italic text-slate-600">
              Cliente confere e concorda com o estado do aparelho descrito acima na entrada.
            </p>

            {/* Mídias de comprovação do checklist */}
            {midias.length > 0 && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 mb-1.5">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Registro Fotográfico / Vídeo de Entrada ({midias.length} arquivo(s) arquivado(s))
                </div>
                <div className="flex flex-wrap gap-2">
                  {midias.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2 py-1 text-[10px]"
                    >
                      {m.tipo === "imagem" ? (
                        <img
                          src={m.url}
                          alt={m.nome}
                          className="h-6 w-6 rounded object-cover border border-slate-200"
                        />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-100 text-amber-800 font-bold">
                          ▶
                        </span>
                      )}
                      <span className="font-medium text-slate-700 max-w-[120px] truncate">
                        {m.nome}
                      </span>
                      <span className="text-slate-400">({m.tamanhoFormatado})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* CONDIÇÕES DA ORDEM DE SERVIÇO */}
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
            <h3 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
              CONDIÇÕES DA ORDEM DE SERVIÇO
            </h3>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                O cliente declara que o aparelho foi entregue para diagnóstico/reparo e que as
                informações acima estão corretas.
              </li>
              <li>
                Prazo médio de diagnóstico: até 5 dias úteis. O orçamento será apresentado para
                aprovação antes de qualquer reparo.
              </li>
              <li>
                Aparelhos não retirados em até 90 dias após a comunicação do reparo poderão ser
                cobrados em armazenagem ou descartados conforme legislação.
              </li>
              <li>
                Não nos responsabilizamos por dados, fotos e arquivos armazenados no aparelho.
                Recomenda-se backup prévio.
              </li>
            </ul>
          </section>

          {/* ASSINATURAS */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-900">
                {os.clientes?.nome || "Assinatura do Cliente"}
              </div>
              <p className="text-[10px] text-slate-500">Cliente</p>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-900">
                {os.profiles?.nome || "BR3TECH"}
              </div>
              <p className="text-[10px] text-slate-500">Técnico Responsável</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
