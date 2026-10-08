import { useState, useEffect } from "react";
import {
  Smartphone,
  Download,
  CheckCircle2,
  ExternalLink,
  X,
  Sparkles,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If prompt is not directly available, show instructions
      const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
      if (isAndroid) {
        toast.info(
          "Para instalar no Android: Toque nos 3 pontinhos (⋮) do Chrome e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'.",
          { duration: 6000 },
        );
      }
    }
  }

  if (!open) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5 text-primary">
            <Smartphone className="h-6 w-6 text-primary animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-foreground">App Android BR3 Tech</h3>
              <p className="text-xs text-muted-foreground">
                Instale no seu celular Android ou gere o pacote APK
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs">
          {/* Opção 1: Instalação Instantânea no Android (WebAPK) */}
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 font-bold text-foreground text-sm">
                  <Sparkles className="h-4 w-4 text-primary" /> Instalação Direta no Android
                  (Recomendado)
                </span>
                <p className="text-muted-foreground text-xs mt-1">
                  O Android cria automaticamente um aplicativo nativo (WebAPK) com ícone na gaveta
                  de apps, tela cheia e carregamento ultrarrápido.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                onClick={handleInstallClick}
                className="w-full gap-2 font-bold shadow-md shadow-primary/20"
              >
                <Download className="h-4 w-4" />
                {isInstalled
                  ? "Aplicativo já instalado!"
                  : deferredPrompt
                    ? "Instalar no meu Android Agora"
                    : "Instalar no Celular"}
              </Button>
            </div>

            <div className="space-y-1 text-[11px] text-muted-foreground/90 bg-background/50 rounded-lg p-2.5 border border-border/50">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Como funciona no celular
                Android:
              </div>
              <p>
                1. No navegador do celular (Google Chrome), toque no menu <strong>(⋮)</strong> no
                topo.
              </p>
              <p>
                2. Toque em <strong>"Instalar aplicativo"</strong> ou{" "}
                <strong>"Adicionar à tela inicial"</strong>.
              </p>
              <p>3. O Android baixará e instalará o app como um aplicativo nativo completo.</p>
            </div>
          </div>

          {/* Opção 2: Gerador de Arquivo APK */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Download className="h-4 w-4 text-sky-400" /> Gerar Arquivo .APK para Distribuição
              </span>
              <span className="text-[10px] uppercase font-bold bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded">
                PWABuilder / Google
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Se você precisa do arquivo binário <strong>.APK</strong> físico para enviar por
              WhatsApp ou instalar via sideloading:
            </p>

            <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs pl-1">
              <li>
                Acesse o gerador gratuito oficial:{" "}
                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                >
                  PWABuilder.com <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Cole a URL do sistema:{" "}
                <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono select-all">
                  {currentUrl}
                </code>
              </li>
              <li>
                Clique em <strong>"Package for Android"</strong> para baixar o pacote{" "}
                <strong>.apk</strong> assinado.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
