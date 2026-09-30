import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Smartphone,
  Boxes,
  ShieldCheck,
  Instagram,
  ArrowUpRight,
  Sparkles,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BR3 Tech — Laboratório de Tecnologia Especializado" },
      {
        name: "description",
        content:
          "Laboratório especializado em reparos avançados de celulares, microeletrônica e computadores. Acompanhe a BR3 Tech no Instagram e TikTok @br3tech.",
      },
      { property: "og:title", content: "BR3 Tech — Laboratório de Tecnologia Especializado" },
      {
        name: "description",
        content:
          "Laboratório especializado em reparos avançados de celulares, microeletrônica e computadores. Siga @br3tech.",
      },
    ],
  }),
  component: Entrada,
});

// Ícone personalizado do TikTok em SVG
function TikTokIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.42a6.35 6.35 0 0 0-.85-.06 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 9.07 5.7 6.27 6.27 0 0 0 3.61-5.69V8.87a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.3z" />
    </svg>
  );
}

const POSTS_SOCIAIS = [
  {
    id: 1,
    imagem: "/images/social/post1.jpg",
    titulo: "Microsoldagem Avançada de Placa",
    descricao: "Recuperação de trilhas e reballing de circuito integrado com microscópio de precisão.",
    curtidas: "1.4k",
    comentarios: "82",
    tag: "Microeletrônica",
    rede: "Instagram",
  },
  {
    id: 2,
    imagem: "/images/social/post2.jpg",
    titulo: "Troca de Telas & Displays Originais",
    descricao: "Substituição com calibração completa do touch, biometria e vedação de fábrica.",
    curtidas: "956",
    comentarios: "45",
    tag: "Bancada",
    rede: "Instagram",
  },
  {
    id: 3,
    imagem: "/images/social/post3.jpg",
    titulo: "Tour pelo Laboratório BR3 Tech",
    descricao: "Equipamentos de padrão industrial para diagnósticos térmicos e testes minuciosos.",
    curtidas: "2.8k",
    comentarios: "140",
    tag: "Estrutura",
    rede: "TikTok",
  },
  {
    id: 4,
    imagem: "/images/social/post4.jpg",
    titulo: "Protocolo de Testes *#0*# de Saída",
    descricao: "Cada aparelho só é liberado após aprovação de 100% dos sensores e componentes de hardware.",
    curtidas: "1.9k",
    comentarios: "67",
    tag: "Garantia",
    rede: "TikTok",
  },
];

const RECURSOS = [
  {
    icon: ClipboardList,
    titulo: "Ordens de serviço",
    texto: "Da entrada do aparelho até a entrega, com histórico detalhado e checklist interativo.",
  },
  {
    icon: Smartphone,
    titulo: "Celulares e computadores",
    texto: "Marca, modelo, IMEI ou número de série, fotos anexadas e laudo de hardware.",
  },
  {
    icon: Boxes,
    titulo: "Estoque de peças",
    texto: "Quantidade, custo e aviso em tempo real quando a peça está acabando.",
  },
  {
    icon: ShieldCheck,
    titulo: "Acesso protegido",
    texto: "Ambiente restrito e seguro para os técnicos e gestores da BR3 Tech.",
  },
];

function Entrada() {
  const [estaLogado, setEstaLogado] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEstaLogado(!!data.session?.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEstaLogado(!!session?.user);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-transparent">
      {/* HEADER */}
      <header className="border-b border-border/60 bg-card/75 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Logo />

          <div className="flex items-center gap-3">
            {/* Redes Sociais no topo */}
            <div className="hidden sm:flex items-center gap-1.5 border-r border-border/60 pr-3 mr-1">
              <a
                href="https://www.instagram.com/br3tech"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10 transition-colors"
                title="Siga no Instagram @br3tech"
              >
                <Instagram className="h-4 w-4 text-pink-500" />
                <span>@br3tech</span>
              </a>
              <a
                href="https://www.tiktok.com/@br3tech"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                title="Siga no TikTok @br3tech"
              >
                <TikTokIcon className="h-3.5 w-3.5 text-cyan-400" />
                <span>TikTok</span>
              </a>
            </div>

            <Button asChild size="sm" className="shadow-lg shadow-primary/20 font-semibold">
              <Link to={estaLogado ? "/painel" : "/auth"}>
                {estaLogado ? "Acessar o Painel" : "Entrar no sistema"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-primary shadow-sm shadow-primary/20">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Laboratório de tecnologia especializado
            </div>

            <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight md:text-5xl text-foreground drop-shadow-sm">
              O controle completo do Laboratório da BR3 Tech em um só lugar
            </h1>

            <p className="mt-4 max-w-xl text-base text-muted-foreground leading-relaxed">
              Gestão de ponta a ponta: entrada com checklist fotográfico, aprovação com assinatura digital,
              testes de hardware de saída (*#0*#) e controle integrado de peças e garantias.
            </p>

            {/* BOTÕES DE REDES SOCIAIS NA HOME (substituindo o botão duplicado) */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="https://www.instagram.com/br3tech"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Instagram className="h-4 w-4" />
                <span>Instagram @br3tech</span>
                <ArrowUpRight className="h-4 w-4 opacity-80" />
              </a>

              <a
                href="https://www.tiktok.com/@br3tech"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/40 hover:border-cyan-500/50 hover:bg-slate-850 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <TikTokIcon className="h-4 w-4 text-cyan-400" />
                <span>TikTok @br3tech</span>
                <ArrowUpRight className="h-4 w-4 opacity-80 text-cyan-400" />
              </a>
            </div>
          </div>

          <div className="hidden md:flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/40 to-emerald-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
              <img
                src="/images/logo3d.jpg"
                alt="BR3 Tech 3D Logo"
                className="relative h-64 w-64 rounded-3xl object-cover border-2 border-primary/40 shadow-2xl shadow-primary/20 backdrop-blur-xl bg-black/60 transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>

        {/* FEED DE POSTS DAS REDES SOCIAIS @BR3TECH */}
        <div className="mt-16 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Direto do Laboratório</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-0.5">
                Acompanhe nosso trabalho em @br3tech
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Veja o dia a dia da bancada, reparos de alta complexidade e diagnósticos nas nossas redes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/br3tech"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <Instagram className="h-3.5 w-3.5 text-pink-500" />
                <span>Ver no Instagram</span>
              </a>
              <a
                href="https://www.tiktok.com/@br3tech"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <TikTokIcon className="h-3.5 w-3.5 text-cyan-400" />
                <span>Ver no TikTok</span>
              </a>
            </div>
          </div>

          {/* GRID DOS POSTS */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {POSTS_SOCIAIS.map((post) => (
              <div
                key={post.id}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 backdrop-blur-xl shadow-lg shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 flex flex-col"
              >
                {/* Imagem do post */}
                <div className="relative aspect-square overflow-hidden bg-slate-900">
                  <img
                    src={post.imagem}
                    alt={post.titulo}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Badge da rede e categoria */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/10">
                      {post.rede === "Instagram" ? (
                        <Instagram className="h-3 w-3 text-pink-400" />
                      ) : (
                        <TikTokIcon className="h-2.5 w-2.5 text-cyan-400" />
                      )}
                      <span>{post.rede}</span>
                    </span>

                    <span className="rounded-full bg-primary/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30">
                      {post.tag}
                    </span>
                  </div>

                  {/* Estatísticas simuladas */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/80" />
                      {post.curtidas}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <MessageCircle className="h-3.5 w-3.5 text-slate-300" />
                      {post.comentarios}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do post */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {post.titulo}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {post.descricao}
                    </p>
                  </div>

                  <a
                    href={post.rede === "Instagram" ? "https://www.instagram.com/br3tech" : "https://www.tiktok.com/@br3tech"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-2 border-t border-border/40"
                  >
                    <span>Assistir no {post.rede}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARDS DE RECURSOS DO SISTEMA */}
        <div className="mt-16">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Recursos do Sistema de Gestão Interna
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Desenvolvido sob medida para a produtividade da equipe e excelência no atendimento.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map((r) => (
              <div
                key={r.titulo}
                className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/40 transition-all hover:border-primary/50 hover:shadow-primary/10"
              >
                <div className="inline-flex rounded-xl bg-primary/10 p-2.5 text-primary border border-primary/20">
                  <r.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{r.titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 bg-card/40 backdrop-blur-md py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            © {new Date().getFullYear()} BR3 Tech — Laboratório de Tecnologia Especializado. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <a
              href="https://www.instagram.com/br3tech"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-pink-400 transition-colors"
            >
              <Instagram className="h-4 w-4 text-pink-500" />
              <span>@br3tech</span>
            </a>
            <a
              href="https://www.tiktok.com/@br3tech"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
            >
              <TikTokIcon className="h-4 w-4 text-cyan-400" />
              <span>TikTok</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
