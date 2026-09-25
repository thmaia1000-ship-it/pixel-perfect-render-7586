import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Smartphone, Boxes, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BR3 Tech — Sistema de gestão da assistência técnica" },
      {
        name: "description",
        content:
          "Acesso ao sistema interno da BR3 Tech: ordens de serviço, clientes, estoque e prazos de celulares e computadores.",
      },
      { property: "og:title", content: "BR3 Tech — Sistema de gestão da assistência técnica" },
      {
        property: "og:description",
        content: "Entre no sistema da BR3 Tech para acompanhar reparos de celulares e computadores.",
      },
    ],
  }),
  component: Entrada,
});

const RECURSOS = [
  {
    icon: ClipboardList,
    titulo: "Ordens de serviço",
    texto: "Da entrada do aparelho até a entrega, com histórico de cada mudança.",
  },
  {
    icon: Smartphone,
    titulo: "Celulares e computadores",
    texto: "Marca, modelo, IMEI ou número de série, acessórios e estado físico.",
  },
  {
    icon: Boxes,
    titulo: "Estoque de peças",
    texto: "Quantidade, custo e aviso quando a peça está acabando.",
  },
  {
    icon: ShieldCheck,
    titulo: "Acesso protegido",
    texto: "Somente a equipe da BR3 Tech, com login e senha próprios.",
  },
];

function Entrada() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4">
          <Logo />
          <Button asChild size="sm">
            <Link to="/auth">Entrar no sistema</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Assistência técnica
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl">
          O controle completo da oficina da BR3 Tech em um só lugar
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          Registre aparelhos, acompanhe reparos, avise o cliente e feche o mês sabendo exatamente o
          que entrou e o que saiu.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/auth">Acessar o sistema</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RECURSOS.map((r) => (
            <div key={r.titulo} className="rounded-2xl border border-border bg-card p-5">
              <r.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-base font-bold">{r.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{r.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        BR3 Tech — uso interno da equipe
      </footer>
    </div>
  );
}
