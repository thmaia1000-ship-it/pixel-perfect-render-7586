import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, Check, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssinaturaDigitalCanvasProps {
  onAssinaturaAlterada: (dataUrl: string | null) => void;
  largura?: number;
  altura?: number;
}

export function AssinaturaDigitalCanvas({
  onAssinaturaAlterada,
  altura = 180,
}: AssinaturaDigitalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [desenhando, setDesenhando] = useState(false);
  const [temAssinatura, setTemAssinatura] = useState(false);

  // Redimensiona o canvas para preencher a largura do container mantendo nitidez de retina display
  const ajustarDimensoes = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.max(rect.width, 280);

    // Se já tinha desenho, salva temporariamente
    let imagemTemporaria: string | null = null;
    if (temAssinatura) {
      imagemTemporaria = canvas.toDataURL("image/png");
    }

    canvas.width = displayWidth * dpr;
    canvas.height = altura * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${altura}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a"; // Slate 900 escuro

    // Restaura desenho se havia
    if (imagemTemporaria) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, altura);
      };
      img.src = imagemTemporaria;
    }
  }, [altura, temAssinatura]);

  useEffect(() => {
    ajustarDimensoes();
    window.addEventListener("resize", ajustarDimensoes);
    return () => window.removeEventListener("resize", ajustarDimensoes);
  }, [ajustarDimensoes]);

  const obterCoordenadas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const iniciarDesenho = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setDesenhando(true);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = obterCoordenadas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Desenha um ponto caso seja apenas um toque rápido
    ctx.lineTo(x + 0.5, y + 0.5);
    ctx.stroke();
  };

  const desenhar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const { x, y } = obterCoordenadas(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!temAssinatura) {
      setTemAssinatura(true);
    }
  };

  const finalizarDesenho = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignora caso pointerId já tenha sido liberado
      }
    }
    setDesenhando(false);

    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setTemAssinatura(true);
      onAssinaturaAlterada(dataUrl);
    }
  };

  const limpar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTemAssinatura(false);
    onAssinaturaAlterada(null);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white dark:bg-slate-950/60 shadow-inner"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={iniciarDesenho}
          onPointerMove={desenhar}
          onPointerUp={finalizarDesenho}
          onPointerCancel={finalizarDesenho}
          className="block w-full cursor-crosshair select-none bg-transparent"
        />

        {/* Linha guia visual da assinatura */}
        <div className="pointer-events-none absolute bottom-8 left-8 right-8 border-b border-slate-300 dark:border-slate-700"></div>

        {/* Placeholder quando vazio */}
        {!temAssinatura && !desenhando && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-slate-400 dark:text-slate-500">
            <PenTool className="h-5 w-5 opacity-60" />
            <span className="text-xs font-medium">Assine com o dedo ou mouse aqui</span>
          </div>
        )}

        {/* Indicador de assinatura capturada */}
        {temAssinatura && (
          <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <Check className="h-3 w-3" /> Assinatura desenhada
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Use o dedo na tela do celular ou mouse no computador.</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={limpar}
          disabled={!temAssinatura}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Limpar assinatura
        </Button>
      </div>
    </div>
  );
}
