import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, X, MapPin, FileText, Phone, Mail, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, dataCurta, type OsStatus } from "@/lib/br3";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — BR3 Tech" },
      {
        name: "description",
        content: "Cadastro e edição de clientes da BR3 Tech com histórico de aparelhos e serviços.",
      },
      { property: "og:title", content: "Clientes — BR3 Tech" },
      {
        property: "og:description",
        content: "Cadastro e edição de clientes da BR3 Tech com histórico de aparelhos e serviços.",
      },
    ],
  }),
  component: Clientes,
});

interface ClienteItem {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  documento: string | null;
  endereco: string | null;
  observacoes: string | null;
  ordens_servico: Array<{
    id: string;
    numero: string;
    status: string;
    aparelho: string;
    marca: string | null;
    modelo: string | null;
    created_at: string;
  }>;
}

function Clientes() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState({
    nome: "",
    telefone: "",
    email: "",
    documento: "",
    endereco: "",
    observacoes: "",
  });

  // Estado para edição do cliente
  const [clienteEditando, setClienteEditando] = useState<{
    id: string;
    nome: string;
    telefone: string;
    email: string;
    documento: string;
    endereco: string;
    observacoes: string;
  } | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ClienteItem[]>({
    queryKey: ["clientes-com-os"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select(
          "id, nome, telefone, email, documento, endereco, observacoes, ordens_servico(id, numero, status, aparelho, marca, modelo, created_at)",
        )
        .order("nome");
      if (error) throw error;
      return (data || []) as ClienteItem[];
    },
  });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const nome = z.string().trim().min(2, "Informe o nome").max(100).safeParse(novo.nome);
    const tel = z.string().trim().min(8, "Informe o telefone").max(20).safeParse(novo.telefone);
    if (!nome.success) return setErro(nome.error.issues[0]!.message);
    if (!tel.success) return setErro(tel.error.issues[0]!.message);

    setSalvando(true);
    const { error } = await supabase.from("clientes").insert({
      nome: nome.data,
      telefone: tel.data,
      email: novo.email.trim().slice(0, 255) || null,
      documento: novo.documento.trim().slice(0, 30) || null,
      endereco: novo.endereco.trim().slice(0, 300) || null,
      observacoes: novo.observacoes.trim().slice(0, 500) || null,
    });
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar o cliente.");
      return;
    }
    setNovo({
      nome: "",
      telefone: "",
      email: "",
      documento: "",
      endereco: "",
      observacoes: "",
    });
    setAberto(false);
    await queryClient.invalidateQueries({ queryKey: ["clientes-com-os"] });
    toast.success("Cliente cadastrado com sucesso.");
  }

  function iniciarEdicao(c: ClienteItem) {
    setErroEdicao(null);
    setClienteEditando({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone || "",
      email: c.email || "",
      documento: c.documento || "",
      endereco: c.endereco || "",
      observacoes: c.observacoes || "",
    });
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteEditando) return;
    setErroEdicao(null);

    const nome = z
      .string()
      .trim()
      .min(2, "Informe o nome do cliente")
      .max(100)
      .safeParse(clienteEditando.nome);
    const tel = z
      .string()
      .trim()
      .min(8, "Informe o telefone do cliente")
      .max(20)
      .safeParse(clienteEditando.telefone);

    if (!nome.success) return setErroEdicao(nome.error.issues[0]!.message);
    if (!tel.success) return setErroEdicao(tel.error.issues[0]!.message);

    setSalvandoEdicao(true);
    try {
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: nome.data,
          telefone: tel.data,
          email: clienteEditando.email.trim().slice(0, 255) || null,
          documento: clienteEditando.documento.trim().slice(0, 30) || null,
          endereco: clienteEditando.endereco.trim().slice(0, 300) || null,
          observacoes: clienteEditando.observacoes.trim().slice(0, 500) || null,
        })
        .eq("id", clienteEditando.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["clientes-com-os"] });
      toast.success("Dados do cliente atualizados com sucesso!");
      setClienteEditando(null);
    } catch (err) {
      setErroEdicao(err instanceof Error ? err.message : "Não foi possível atualizar o cliente.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  const termo = busca.trim().toLowerCase();
  const lista = (data ?? []).filter((c) =>
    termo
      ? [c.nome, c.telefone, c.email, c.documento, c.endereco]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo))
      : true,
  );

  return (
    <AppShell
      title="Clientes"
      actions={
        <Button size="sm" onClick={() => setAberto((v) => !v)} className="gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      }
    >
      <div className="grid gap-4">
        {aberto && (
          <form
            onSubmit={salvar}
            className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Cadastrar Novo Cliente
              </h3>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  maxLength={100}
                  value={novo.nome}
                  onChange={(e) => setNovo((c) => ({ ...c, nome: e.target.value }))}
                  placeholder="Ex: João da Silva"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="telefone">Telefone / WhatsApp *</Label>
                <Input
                  id="telefone"
                  maxLength={20}
                  value={novo.telefone}
                  onChange={(e) => setNovo((c) => ({ ...c, telefone: e.target.value }))}
                  placeholder="(92) 99999-9999"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  maxLength={255}
                  value={novo.email}
                  onChange={(e) => setNovo((c) => ({ ...c, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="documento">CPF / CNPJ</Label>
                <Input
                  id="documento"
                  maxLength={30}
                  value={novo.documento}
                  onChange={(e) => setNovo((c) => ({ ...c, documento: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="endereco">Endereço Completo (Opcional)</Label>
                <Input
                  id="endereco"
                  maxLength={300}
                  value={novo.endereco}
                  onChange={(e) => setNovo((c) => ({ ...c, endereco: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="observacoes">Observações (Opcional)</Label>
                <Input
                  id="observacoes"
                  maxLength={500}
                  value={novo.observacoes}
                  onChange={(e) => setNovo((c) => ({ ...c, observacoes: e.target.value }))}
                  placeholder="Ex: Cliente preferencial, horários de contato, etc."
                />
              </div>
            </div>

            {erro && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando} className="font-bold">
                {salvando ? "Salvando..." : "Salvar cliente"}
              </Button>
            </div>
          </form>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente por nome, telefone, documento ou endereço..."
            maxLength={80}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando clientes...</p>
        ) : (
          <ul className="grid gap-3">
            {lista.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-border/80 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-base text-foreground">{c.nome}</p>
                      <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground font-medium">
                        {c.ordens_servico.length} {c.ordens_servico.length === 1 ? "OS" : "OSs"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {c.telefone && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-emerald-500" /> {c.telefone}
                        </span>
                      )}
                      {c.email && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Mail className="h-3 w-3 text-sky-400" /> {c.email}
                        </span>
                      )}
                      {c.documento && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <FileText className="h-3 w-3" /> CPF/CNPJ: {c.documento}
                        </span>
                      )}
                    </div>

                    {c.endereco && (
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1 pt-0.5">
                        <MapPin className="h-3 w-3 text-amber-500 shrink-0" />
                        <span className="truncate">{c.endereco}</span>
                      </p>
                    )}

                    {c.observacoes && (
                      <p className="text-[11px] text-muted-foreground/80 italic pt-0.5">
                        Nota: {c.observacoes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => iniciarEdicao(c)}
                      className="gap-1.5 text-xs font-semibold hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5 text-primary" /> Editar dados
                    </Button>
                  </div>
                </div>

                {c.ordens_servico.length > 0 && (
                  <ul className="mt-3 grid gap-1.5 border-t border-border/60 pt-3">
                    {c.ordens_servico.map((o) => (
                      <li key={o.id}>
                        <Link
                          to="/ordens/$id"
                          params={{ id: o.id }}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary/70 transition-colors"
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-bold text-foreground">{o.numero}</span> ·{" "}
                            {[o.aparelho, o.marca, o.modelo].filter(Boolean).join(" ")} ·{" "}
                            <span className="text-muted-foreground font-medium">
                              {STATUS_LABEL[o.status as OsStatus]}
                            </span>
                          </span>
                          <span className="shrink-0 text-muted-foreground font-mono">
                            {dataCurta(o.created_at)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DE DADOS DO CLIENTE */}
      {clienteEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Pencil className="h-5 w-5" />
                <h3 className="text-base font-bold text-foreground">Editar Dados do Cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setClienteEditando(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={salvarEdicao} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-nome" className="text-xs font-semibold">
                    Nome Completo *
                  </Label>
                  <Input
                    id="edit-nome"
                    value={clienteEditando.nome}
                    onChange={(e) =>
                      setClienteEditando((c) => (c ? { ...c, nome: e.target.value } : null))
                    }
                    maxLength={100}
                    placeholder="Nome completo do cliente"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-telefone" className="text-xs font-semibold">
                    Telefone / WhatsApp *
                  </Label>
                  <Input
                    id="edit-telefone"
                    value={clienteEditando.telefone}
                    onChange={(e) =>
                      setClienteEditando((c) => (c ? { ...c, telefone: e.target.value } : null))
                    }
                    maxLength={20}
                    placeholder="(92) 99999-9999"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-documento" className="text-xs font-semibold">
                    CPF / CNPJ
                  </Label>
                  <Input
                    id="edit-documento"
                    value={clienteEditando.documento}
                    onChange={(e) =>
                      setClienteEditando((c) => (c ? { ...c, documento: e.target.value } : null))
                    }
                    maxLength={30}
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-email" className="text-xs font-semibold">
                    E-mail
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={clienteEditando.email}
                    onChange={(e) =>
                      setClienteEditando((c) => (c ? { ...c, email: e.target.value } : null))
                    }
                    maxLength={255}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-endereco" className="text-xs font-semibold">
                    Endereço Completo
                  </Label>
                  <Input
                    id="edit-endereco"
                    value={clienteEditando.endereco}
                    onChange={(e) =>
                      setClienteEditando((c) => (c ? { ...c, endereco: e.target.value } : null))
                    }
                    maxLength={300}
                    placeholder="Rua, número, complemento, bairro, cidade"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-observacoes" className="text-xs font-semibold">
                    Observações Internas
                  </Label>
                  <Textarea
                    id="edit-observacoes"
                    value={clienteEditando.observacoes}
                    onChange={(e) =>
                      setClienteEditando((c) => (c ? { ...c, observacoes: e.target.value } : null))
                    }
                    maxLength={500}
                    rows={2}
                    placeholder="Informações adicionais sobre o cliente, preferências, etc."
                  />
                </div>
              </div>

              {erroEdicao && (
                <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                  {erroEdicao}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClienteEditando(null)}
                  disabled={salvandoEdicao}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={salvandoEdicao} className="font-bold gap-1.5">
                  {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
