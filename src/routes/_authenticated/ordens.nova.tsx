import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles, Smartphone, ClipboardCheck, Camera } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConferenciaEntrada } from "@/components/ConferenciaEntrada";
import { UploadMidiaConferencia } from "@/components/UploadMidiaConferencia";
import { supabase } from "@/integrations/supabase/client";
import {
  MARCAS_POPULARES_POR_TIPO,
  getModelosIndividuais,
  MAIS_BUSCADOS_ASSISTENCIA,
} from "@/lib/dispositivos-populares";
import {
  criarConferenciaPadrao,
  serializarEstadoEConferencia,
  type ConferenciaChecklist,
  type MidiaConferencia,
} from "@/lib/conferencia-aparelho";

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
  const [modeloManual, setModeloManual] = useState(false);
  const [conferencia, setConferencia] = useState<ConferenciaChecklist>(() =>
    criarConferenciaPadrao(),
  );
  const [midias, setMidias] = useState<MidiaConferencia[]>([]);
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
          estado_fisico: serializarEstadoEConferencia(conferencia, form.estado_fisico, midias),
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">Aparelho</h2>
              <p className="text-xs text-muted-foreground">
                Selecione marcas e modelos mais populares no Brasil (lançados a partir de 2016) ou
                digite livremente.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Sugestões 2016+
            </span>
          </div>

          {/* Atalhos rápidos para os modelos mais frequentes no Brasil */}
          <div className="mt-4 rounded-xl border border-border/60 bg-secondary/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> Modelos frequentes na bancada
              (clique para selecionar):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MAIS_BUSCADOS_ASSISTENCIA.slice(0, 12).map((disp) => (
                <button
                  key={`${disp.marca}-${disp.modelo}`}
                  type="button"
                  onClick={() => {
                    setModeloManual(false);
                    setForm((f) => ({
                      ...f,
                      aparelho: disp.tipo,
                      marca: disp.marca,
                      modelo: disp.modelo,
                    }));
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    form.marca === disp.marca && form.modelo === disp.modelo
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20"
                      : "border-border/80 bg-card/80 text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <span
                    className={
                      form.marca === disp.marca && form.modelo === disp.modelo
                        ? "text-primary-foreground font-bold"
                        : "font-semibold text-primary"
                    }
                  >
                    {disp.marca}
                  </span>{" "}
                  {disp.modelo}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="aparelho">Tipo de aparelho</Label>
              <select
                id="aparelho"
                value={form.aparelho}
                onChange={(e) => {
                  const novoTipo = e.target.value;
                  setModeloManual(false);
                  setForm((f) => ({
                    ...f,
                    aparelho: novoTipo,
                  }));
                }}
                className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
              <Input
                id="imei"
                placeholder="Ex: 356789101112131"
                maxLength={40}
                {...campo("imei")}
              />
            </div>

            {/* Campo Marca com Select e botões rápidos */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="marca-select">Marca</Label>
                <span className="text-[11px] text-muted-foreground">Escolha a marca</span>
              </div>
              <select
                id="marca-select"
                value={form.marca}
                onChange={(e) => {
                  const novaMarca = e.target.value;
                  setModeloManual(false);
                  setForm((f) => ({ ...f, marca: novaMarca, modelo: "" }));
                }}
                className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Selecione a marca...</option>
                {(
                  MARCAS_POPULARES_POR_TIPO[form.aparelho] ?? MARCAS_POPULARES_POR_TIPO["Celular"]
                ).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Pílulas de marcas populares para seleção rápida com 1 clique */}
              <div className="flex flex-wrap gap-1 pt-1">
                {(MARCAS_POPULARES_POR_TIPO[form.aparelho] ?? MARCAS_POPULARES_POR_TIPO["Celular"])
                  .slice(0, 6)
                  .map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModeloManual(false);
                        setForm((f) => ({ ...f, marca: m, modelo: "" }));
                      }}
                      className={`rounded-md px-2 py-0.5 text-[11px] transition-colors ${
                        form.marca.toLowerCase() === m.toLowerCase()
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-secondary text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
              </div>
            </div>

            {/* Campo Modelo: cada modelo é um item individual no select */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="modelo-select">Modelo</Label>
                {form.marca && (
                  <span className="text-[11px] text-primary font-medium">
                    {getModelosIndividuais(form.marca).length} modelos ({form.marca})
                  </span>
                )}
              </div>

              <select
                id="modelo-select"
                value={modeloManual ? "__outro__" : form.modelo}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__outro__") {
                    setModeloManual(true);
                    setForm((f) => ({ ...f, modelo: "" }));
                  } else {
                    setModeloManual(false);
                    setForm((f) => ({ ...f, modelo: val }));
                  }
                }}
                className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">
                  {form.marca
                    ? "Selecione o modelo na lista..."
                    : "Selecione primeiro uma marca..."}
                </option>
                {getModelosIndividuais(form.marca).map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
                <option value="__outro__">Outro modelo (digitar manualmente)...</option>
              </select>

              {/* Se o usuário escolheu digitar manualmente */}
              {modeloManual ? (
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    id="modelo-input"
                    placeholder="Digite o modelo exato do aparelho..."
                    value={form.modelo}
                    onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                    maxLength={70}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setModeloManual(false)}
                    className="shrink-0 text-xs font-semibold text-primary hover:underline"
                  >
                    Voltar ao select
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    Não encontrou na lista?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setModeloManual(true);
                        setForm((f) => ({ ...f, modelo: "" }));
                      }}
                      className="text-primary hover:underline font-semibold"
                    >
                      Digitar manualmente
                    </button>
                  </span>
                  {form.modelo && (
                    <span className="text-[11px] text-foreground font-medium truncate max-w-[200px]">
                      Selecionado: <span className="text-primary font-bold">{form.modelo}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="acessorios">Acessórios recebidos</Label>
              <Input
                id="acessorios"
                placeholder="Ex: Capinha, carregador original, película..."
                maxLength={300}
                {...campo("acessorios")}
              />
            </div>

            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="estado_fisico">Observações do estado físico (opcional)</Label>
              <Input
                id="estado_fisico"
                placeholder="Ex: Marcas de uso na tampa traseira, sem riscos na lente..."
                maxLength={300}
                {...campo("estado_fisico")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                CONFERÊNCIA DE ENTRADA DO APARELHO
              </h2>
              <p className="text-xs text-muted-foreground">
                Marque cada item da conferência conforme o estado do aparelho recebido (OK, Defeito
                ou Não Verificado).
              </p>
            </div>
          </div>

          <ConferenciaEntrada valor={conferencia} onChange={setConferencia} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                FOTOS E VÍDEOS DE CONFERÊNCIA
              </h2>
              <p className="text-xs text-muted-foreground">
                Anexe fotos ou vídeos do aparelho (marcas de uso, tela trincada, número de série ou
                teste rápido) para comprovação no checklist de entrada.
              </p>
            </div>
          </div>

          <UploadMidiaConferencia midias={midias} onChange={setMidias} />
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
                <Input
                  id="valor_pecas"
                  inputMode="decimal"
                  maxLength={12}
                  {...campo("valor_pecas")}
                />
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
                <Input
                  id="garantia"
                  inputMode="numeric"
                  maxLength={4}
                  {...campo("garantia_dias")}
                />
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
