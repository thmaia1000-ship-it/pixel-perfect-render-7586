import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ordens/nova")({
  head: () => ({
    meta: [
      { title: "Nova ordem de serviço — BR3 Tech" },
      {
        name: "description",
        content: "Cadastro de nova ordem de serviço com cliente, aparelho, defeito e orçamento.",
      },
      { property: "og:title", content: "Nova ordem de serviço — BR3 Tech" },
      {
        property: "og:description",
        content: "Cadastro de nova ordem de serviço com cliente, aparelho, defeito e orçamento.",
      },
    ],
  }),
  component: NovaOS,
});

const texto = (max: number) => z.string().trim().max(max);

function NovaOS() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [novoCliente, setNovoCliente] = useState({ nome: "", telefone: "", email: "" });
  const [form, setForm] = useState({
    aparelho: "Celular",
    marca: "",
    modelo: "",
    imei: "",
    acessorios: "",
    defeito_relatado: "",
    estado_fisico: "",
    diagnostico: "",
    valor_pecas: "",
    valor_mao_obra: "",
    prazo: "",
    tecnico_id: "",
    garantia_dias: "90",
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, telefone")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: tecnicos } = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  function campo(k: keyof typeof form) {
    return {
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value })),
    };
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    let cliente = clienteId;
    try {
      if (!cliente) {
        const nome = texto(100).min(2, "Informe o nome do cliente").safeParse(novoCliente.nome);
        const tel = texto(20).min(8, "Informe um telefone válido").safeParse(novoCliente.telefone);
        if (!nome.success) return setErro(nome.error.issues[0]!.message);
        if (!tel.success) return setErro(tel.error.issues[0]!.message);
        setSalvando(true);
        const { data, error } = await supabase
          .from("clientes")
          .insert({
            nome: nome.data,
            telefone: tel.data,
            email: novoCliente.email.trim() || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        cliente = data.id;
      }

      const defeito = texto(1000)
        .min(5, "Descreva o defeito relatado")
        .safeParse(form.defeito_relatado);
      if (!defeito.success) {
        setSalvando(false);
        return setErro(defeito.error.issues[0]!.message);
      }

      setSalvando(true);
      const { data: user } = await supabase.auth.getUser();
      const { data: os, error } = await supabase
        .from("ordens_servico")
        .insert({
          cliente_id: cliente,
          aparelho: form.aparelho.trim().slice(0, 60),
          marca: form.marca.trim().slice(0, 60) || null,
          modelo: form.modelo.trim().slice(0, 60) || null,
          imei: form.imei.trim().slice(0, 40) || null,
          acessorios: form.acessorios.trim().slice(0, 300) || null,
          defeito_relatado: defeito.data,
          estado_fisico: form.estado_fisico.trim().slice(0, 300) || null,
          diagnostico: form.diagnostico.trim().slice(0, 1000) || null,
          valor_pecas: Number(form.valor_pecas.replace(",", ".")) || 0,
          valor_mao_obra: Number(form.valor_mao_obra.replace(",", ".")) || 0,
          prazo: form.prazo || null,
          tecnico_id: form.tecnico_id || null,
          garantia_dias: Number(form.garantia_dias) || 90,
          created_by: user.user?.id ?? null,
        })
        .select("id, numero, status")
        .single();
      if (error) throw error;

      await supabase.from("os_historico").insert({
        os_id: os.id,
        status: os.status,
        observacao: "Ordem de serviço criada",
        usuario_id: user.user?.id ?? null,
        usuario_nome: user.user?.email ?? null,
      });

      await queryClient.invalidateQueries();
      toast.success(`Ordem ${os.numero} criada com sucesso.`);
      navigate({ to: "/ordens/$id", params: { id: os.id } });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar a ordem.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell title="Nova ordem de serviço">
      <form onSubmit={salvar} className="grid gap-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Cliente</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cliente">Cliente já cadastrado</Label>
              <select
                id="cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Cadastrar novo cliente —</option>
                {(clientes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} · {c.telefone}
                  </option>
                ))}
              </select>
            </div>

            {!clienteId && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="nome">Nome</Label>
                  <Input
                    id="nome"
                    maxLength={100}
                    value={novoCliente.nome}
                    onChange={(e) => setNovoCliente((c) => ({ ...c, nome: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                  <Input
                    id="telefone"
                    maxLength={20}
                    value={novoCliente.telefone}
                    onChange={(e) => setNovoCliente((c) => ({ ...c, telefone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="emailCliente">E-mail (opcional)</Label>
                  <Input
                    id="emailCliente"
                    type="email"
                    maxLength={255}
                    value={novoCliente.email}
                    onChange={(e) => setNovoCliente((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Aparelho</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="aparelho">Tipo</Label>
              <select
                id="aparelho"
                value={form.aparelho}
                onChange={(e) => setForm((f) => ({ ...f, aparelho: e.target.value }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Celular</option>
                <option>Notebook</option>
                <option>Computador</option>
                <option>Tablet</option>
                <option>Outro</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="imei">IMEI / Nº de série</Label>
              <Input id="imei" maxLength={40} {...campo("imei")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" maxLength={60} {...campo("marca")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" maxLength={60} {...campo("modelo")} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="acessorios">Acessórios recebidos</Label>
              <Input id="acessorios" maxLength={300} {...campo("acessorios")} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="estado_fisico">Estado físico</Label>
              <Input id="estado_fisico" maxLength={300} {...campo("estado_fisico")} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Serviço</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="defeito">Defeito relatado</Label>
              <Textarea id="defeito" maxLength={1000} rows={3} {...campo("defeito_relatado")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="diagnostico">Diagnóstico (opcional)</Label>
              <Textarea id="diagnostico" maxLength={1000} rows={3} {...campo("diagnostico")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label htmlFor="valor_pecas">Peças (R$)</Label>
                <Input id="valor_pecas" inputMode="decimal" maxLength={12} {...campo("valor_pecas")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="valor_mao_obra">Mão de obra (R$)</Label>
                <Input
                  id="valor_mao_obra"
                  inputMode="decimal"
                  maxLength={12}
                  {...campo("valor_mao_obra")}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="prazo">Prazo</Label>
                <Input id="prazo" type="date" {...campo("prazo")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="garantia">Garantia (dias)</Label>
                <Input id="garantia" inputMode="numeric" maxLength={4} {...campo("garantia_dias")} />
              </div>
            </div>
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label htmlFor="tecnico">Técnico responsável</Label>
              <select
                id="tecnico"
                value={form.tecnico_id}
                onChange={(e) => setForm((f) => ({ ...f, tecnico_id: e.target.value }))}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Não definido</option>
                {(tecnicos ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {erro && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Criar ordem de serviço"}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link to="/ordens">Cancelar</Link>
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
