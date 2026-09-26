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
        content:
          "Entre no sistema da BR3 Tech para acompanhar reparos de celulares e computadores.",
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
    <div className="min-h-screen bg-transparent">
      <header className="border-b border-border/60 bg-card/75 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4">
          <Logo />
          <Button asChild size="sm" className="shadow-lg shadow-primary/20">
            <Link to="/auth">Entrar no sistema</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary shadow-sm shadow-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Assistência técnica especializada
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl text-foreground drop-shadow-sm">
              O controle completo do Laboratório da BR3 Tech em um só lugar
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground">
              Registre aparelhos, acompanhe reparos, avise o cliente e feche o mês sabendo
              exatamente o que entrou e o que saiu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all font-semibold"
              >
                <Link to="/auth">Acessar o sistema</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/30 to-emerald-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              <img
                src="/images/logo3d.jpg"
                alt="BR3 Tech 3D Logo"
                className="relative h-60 w-60 rounded-2xl object-cover border border-primary/40 shadow-2xl shadow-primary/20 backdrop-blur-xl bg-black/60"
              />
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RECURSOS.map((r) => (
            <div
              key={r.titulo}
              className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/40 transition-all hover:border-primary/50 hover:shadow-primary/10"
            >
              <div className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary border border-primary/20">
                <r.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-base font-bold text-foreground">{r.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{r.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 bg-card/40 backdrop-blur-md py-6 text-center text-sm text-muted-foreground">
        BR3 Tech — sistema de gestão interna da equipe
      </footer>
    </div>
  );
}
