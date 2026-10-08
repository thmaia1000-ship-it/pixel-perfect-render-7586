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
  Play,
  Eye,
  Film,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { InstallAppModal } from "@/components/InstallAppModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// Vídeos reais demonstrativos do perfil oficial @br3tech no TikTok
export interface VideoDemonstrativo {
  id: string;
  tiktokId: string;
  url: string;
  titulo: string;
  descricao: string;
  imagem: string;
  duracao: string;
  curtidas: string;
  visualizacoes: string;
  tag: string;
}

const VIDEOS_DEMONSTRATIVOS: VideoDemonstrativo[] = [
  {
    id: "video-1",
    tiktokId: "7683391509160742165",
    url: "https://www.tiktok.com/@br3tech/video/7683391509160742165",
    titulo: "Estrutura do Laboratório & Rotina de Bancada",
    descricao:
      "Conheça a infraestrutura profissional, instrumentação de bancada e organização do laboratório da BR3 Tech.",
    imagem: "/images/social/post3.jpg",
    duracao: "0:58",
    curtidas: "2.8k",
    visualizacoes: "18.4k",
    tag: "Bancada & Estrutura",
  },
  {
    id: "video-2",
    tiktokId: "7674659019780410645",
    url: "https://www.tiktok.com/@br3tech/video/7674659019780410645",
    titulo: "Microssoldagem & Recuperação de Placas",
    descricao:
      "Diagnóstico avançado de curto-circuito, reballing e soldagem de componentes SMD de alta precisão.",
    imagem: "/images/social/post1.jpg",
    duracao: "1:15",
    curtidas: "3.5k",
    visualizacoes: "26.1k",
    tag: "Microeletrônica",
  },
  {
    id: "video-3",
    tiktokId: "7668168924231486727",
    url: "https://www.tiktok.com/@br3tech/video/7668168924231486727",
    titulo: "Checklist de Hardware & Testes Finais de Saída",
    descricao:
      "Validação minuciosa de cada componente: câmeras, biometria, sensores, touch e tela antes da liberação.",
    imagem: "/images/social/post4.jpg",
    duracao: "0:45",
    curtidas: "1.9k",
    visualizacoes: "15.2k",
    tag: "Controle de Qualidade",
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
  const [modalAppAberto, setModalAppAberto] = useState(false);
  const [videoSelecionado, setVideoSelecionado] = useState<VideoDemonstrativo | null>(null);

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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalAppAberto(true)}
              className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">App Android</span>
            </Button>

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
              O controle completo para seu Laboratório ou assistência técnica em um só lugar
            </h1>

            <p className="mt-4 max-w-xl text-base text-muted-foreground leading-relaxed">
              Gestão de ponta a ponta: entrada com checklist fotográfico, aprovação com assinatura
              digital, testes de hardware de saída e controle integrado de peças e garantias.
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

        {/* SEÇÃO DE VÍDEOS DEMONSTRATIVOS ORIGINAIS @BR3TECH (TIKTOK & INSTAGRAM) */}
        <div className="mt-16 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                <Film className="h-3.5 w-3.5" />
                <span>Vídeos Demonstrativos do Laboratório</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-0.5">
                Veja a BR3 Tech em ação no @br3tech
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Snapshots e demonstrações reais publicadas em nosso perfil oficial no TikTok.
                Acompanhe a bancada, microeletrônica de precisão e nossos protocolos de liberação.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://www.tiktok.com/@br3tech"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 transition-colors"
              >
                <TikTokIcon className="h-3.5 w-3.5 text-cyan-400" />
                <span>Perfil no TikTok</span>
              </a>
              <a
                href="https://www.instagram.com/br3tech"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/80 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <Instagram className="h-3.5 w-3.5 text-pink-500" />
                <span>Instagram</span>
              </a>
            </div>
          </div>

          {/* GRID DE VÍDEOS DEMONSTRATIVOS REAIS */}
          <div className="grid gap-6 md:grid-cols-3">
            {VIDEOS_DEMONSTRATIVOS.map((video) => (
              <div
                key={video.id}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-lg shadow-black/50 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col"
              >
                {/* Snapshot do vídeo com botão Play */}
                <div
                  className="relative aspect-video overflow-hidden bg-slate-950 cursor-pointer"
                  onClick={() => setVideoSelecionado(video)}
                >
                  <img
                    src={video.imagem}
                    alt={video.titulo}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

                  {/* Badges superiores */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-bold text-white border border-white/10 shadow-sm">
                      <TikTokIcon className="h-3 w-3 text-cyan-400" />
                      <span>@br3tech</span>
                    </span>

                    <span className="rounded-full bg-cyan-950/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/40">
                      {video.tag}
                    </span>
                  </div>

                  {/* Botão Play central */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/90 text-black shadow-lg shadow-cyan-500/50 transition-all duration-300 group-hover:scale-110 group-hover:bg-cyan-400">
                      <Play className="h-5 w-5 fill-current translate-x-0.5" />
                    </div>
                  </div>

                  {/* Informações na base do snapshot */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-slate-300 pointer-events-none">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Eye className="h-3.5 w-3.5 text-cyan-400" />
                        {video.visualizacoes}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400/80" />
                        {video.curtidas}
                      </span>
                    </div>
                    <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 border border-white/10">
                      {video.duracao}
                    </span>
                  </div>
                </div>

                {/* Descrição e botões de ação */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3
                      onClick={() => setVideoSelecionado(video)}
                      className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      {video.titulo}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {video.descricao}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setVideoSelecionado(video)}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-8 gap-1.5 shadow-sm shadow-cyan-600/20"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Assistir</span>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 border-border hover:border-cyan-500/50 text-xs font-semibold"
                    >
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir diretamente no site/app do TikTok"
                      >
                        <TikTokIcon className="h-3.5 w-3.5 text-cyan-400" />
                        <ExternalLink className="h-3 w-3 ml-1 opacity-70" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BANNER COMPLEMENTAR DO INSTAGRAM */}
          <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-950/20 via-purple-950/15 to-transparent p-5 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-black/40">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white shadow-md shadow-pink-600/30">
                <Instagram className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Acompanhe os Stories diários no Instagram @br3tech
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bastidores do dia a dia, avisos de garantia e aparelhos recebidos em tempo real.
                </p>
              </div>
            </div>

            <Button
              asChild
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-pink-600/20 whitespace-nowrap"
            >
              <a href="https://www.instagram.com/br3tech" target="_blank" rel="noreferrer">
                <span>Seguir @br3tech</span>
                <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* MODAL / DIALOG PARA REPRODUÇÃO DO VÍDEO DO TIKTOK */}
        <Dialog
          open={!!videoSelecionado}
          onOpenChange={(open) => !open && setVideoSelecionado(null)}
        >
          <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden bg-slate-950 border-slate-800 text-foreground shadow-2xl">
            {videoSelecionado && (
              <div className="flex flex-col">
                <DialogHeader className="p-4 border-b border-slate-800 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                      <TikTokIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <DialogTitle className="text-sm font-bold text-white leading-tight">
                        {videoSelecionado.titulo}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-400 mt-0.5">
                        Laboratório BR3 Tech • TikTok Oficial @br3tech
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                {/* Player Responsivo TikTok Iframe */}
                <div className="relative aspect-[9/16] max-h-[540px] w-full bg-black flex items-center justify-center">
                  <iframe
                    src={`https://www.tiktok.com/embed/v2/${videoSelecionado.tiktokId}?lang=pt-BR`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={videoSelecionado.titulo}
                  />
                </div>

                {/* Rodapé com detalhes e link externo */}
                <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {videoSelecionado.descricao}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                      <a href={videoSelecionado.url} target="_blank" rel="noreferrer">
                        <TikTokIcon className="h-3.5 w-3.5" />
                        <span>Assistir no App do TikTok</span>
                        <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVideoSelecionado(null)}
                      className="text-xs border-slate-700 hover:bg-slate-800"
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
            © {new Date().getFullYear()} BR3 Tech — Laboratório de Tecnologia Especializado. Todos
            os direitos reservados.
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

      <InstallAppModal open={modalAppAberto} onClose={() => setModalAppAberto(false)} />
    </div>
  );
}
