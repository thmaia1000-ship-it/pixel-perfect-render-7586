export const OS_STATUS = [
  "recebida",
  "em_diagnostico",
  "orcamento_enviado",
  "aguardando_aprovacao",
  "em_reparo",
  "pronta",
  "entregue",
  "orcamento_recusado",
  "cancelada",
] as const;

export type OsStatus = (typeof OS_STATUS)[number];

export const STATUS_LABEL: Record<OsStatus, string> = {
  recebida: "Recebida",
  em_diagnostico: "Em diagnóstico",
  orcamento_enviado: "Orçamento enviado",
  aguardando_aprovacao: "Aguardando aprovação",
  em_reparo: "Em reparo",
  pronta: "Pronta",
  entregue: "Entregue",
  orcamento_recusado: "Orçamento recusado",
  cancelada: "Cancelada",
};

export const STATUS_CLASS: Record<OsStatus, string> = {
  recebida: "bg-secondary text-secondary-foreground",
  em_diagnostico: "bg-info/15 text-info",
  orcamento_enviado: "bg-info/15 text-info",
  aguardando_aprovacao: "bg-warning/25 text-warning-foreground",
  em_reparo: "bg-accent text-accent-foreground",
  pronta: "bg-primary/15 text-primary",
  entregue: "bg-primary text-primary-foreground",
  orcamento_recusado: "bg-destructive/12 text-destructive",
  cancelada: "bg-destructive/12 text-destructive",
};

/** Próximos passos permitidos a partir de cada situação. */
export const PROXIMOS_STATUS: Record<OsStatus, OsStatus[]> = {
  recebida: ["em_diagnostico", "cancelada"],
  em_diagnostico: ["orcamento_enviado", "em_reparo", "cancelada"],
  orcamento_enviado: ["aguardando_aprovacao", "orcamento_recusado", "cancelada"],
  aguardando_aprovacao: ["em_reparo", "orcamento_recusado", "cancelada"],
  em_reparo: ["pronta", "cancelada"],
  pronta: ["entregue"],
  entregue: [],
  orcamento_recusado: ["entregue", "cancelada"],
  cancelada: [],
};

export const ABERTAS: OsStatus[] = [
  "recebida",
  "em_diagnostico",
  "orcamento_enviado",
  "aguardando_aprovacao",
  "em_reparo",
];

export function moeda(valor: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(valor ?? 0),
  );
}

export function dataCurta(valor: string | null | undefined) {
  if (!valor) return "—";
  const d = new Date(valor.length <= 10 ? `${valor}T12:00:00` : valor);
  return d.toLocaleDateString("pt-BR");
}

export function dataHora(valor: string | null | undefined) {
  if (!valor) return "—";
  return new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function somenteDigitos(v: string) {
  return v.replace(/\D/g, "");
}

export function linkWhatsApp(telefone: string, mensagem: string) {
  const num = somenteDigitos(telefone);
  const comPais = num.length <= 11 ? `55${num}` : num;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(mensagem.slice(0, 900))}`;
}
