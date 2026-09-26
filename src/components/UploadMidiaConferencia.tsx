import React, { useRef, useState } from "react";
import {
  Camera,
  Video,
  Upload,
  Trash2,
  Maximize2,
  X,
  Play,
  FileImage,
  Film,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MidiaConferencia } from "@/lib/conferencia-aparelho";
import { comprimirImagem, processarVideo } from "@/lib/midia-utils";

interface UploadMidiaConferenciaProps {
  midias: MidiaConferencia[];
  onChange?: (novasMidias: MidiaConferencia[]) => void;
  somenteLeitura?: boolean;
}

export function UploadMidiaConferencia({
  midias,
  onChange,
  somenteLeitura = false,
}: UploadMidiaConferenciaProps) {
  const [carregando, setCarregando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [itemVisualizando, setItemVisualizando] = useState<MidiaConferencia | null>(null);

  const fotoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const geralInputRef = useRef<HTMLInputElement>(null);

  const processarArquivos = async (arquivos: FileList | File[]) => {
    if (somenteLeitura || !onChange) return;

    const lista = Array.from(arquivos);
    if (lista.length === 0) return;

    setCarregando(true);
    const novos: MidiaConferencia[] = [];

    for (const arq of lista) {
      const ehImagem = arq.type.startsWith("image/");
      const ehVideo = arq.type.startsWith("video/");

      if (!ehImagem && !ehVideo) {
        toast.error(`"${arq.name}" não é um formato de imagem ou vídeo suportado.`);
        continue;
      }

      // Limite preventivo para vídeos grandes (25 MB)
      if (ehVideo && arq.size > 25 * 1024 * 1024) {
        toast.error(
          `O vídeo "${arq.name}" excede 25 MB. Grave vídeos curtos de até 20 segundos para a conferência.`,
        );
        continue;
      }

      try {
        if (ehImagem) {
          const resultado = await comprimirImagem(arq);
          novos.push({
            id: `midia-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            nome: arq.name,
            tipo: "imagem",
            url: resultado.url,
            tamanhoFormatado: resultado.tamanhoFormatado,
            tamanhoBytes: resultado.tamanhoBytes,
            criadoEm: new Date().toISOString(),
          });
        } else if (ehVideo) {
          const resultado = await processarVideo(arq);
          novos.push({
            id: `midia-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            nome: arq.name,
            tipo: "video",
            url: resultado.url,
            tamanhoFormatado: resultado.tamanhoFormatado,
            tamanhoBytes: resultado.tamanhoBytes,
            criadoEm: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(err);
        toast.error(`Erro ao processar "${arq.name}".`);
      }
    }

    setCarregando(false);

    if (novos.length > 0) {
      onChange([...midias, ...novos]);
      toast.success(
        `${novos.length} ${novos.length === 1 ? "arquivo adicionado" : "arquivos adicionados"} à conferência!`,
      );
    }
  };

  const removerMidia = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (somenteLeitura || !onChange) return;
    onChange(midias.filter((m) => m.id !== id));
    toast.info("Arquivo removido da conferência.");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!somenteLeitura) setArrastando(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (somenteLeitura) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processarArquivos(e.dataTransfer.files);
    }
  };

  const totalFotos = midias.filter((m) => m.tipo === "imagem").length;
  const totalVideos = midias.filter((m) => m.tipo === "video").length;

  return (
    <div className="space-y-4">
      {/* Resumo de mídias */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {totalFotos > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <FileImage className="h-3 w-3" /> {totalFotos} {totalFotos === 1 ? "foto" : "fotos"}
            </span>
          )}
          {totalVideos > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Film className="h-3 w-3" /> {totalVideos} {totalVideos === 1 ? "vídeo" : "vídeos"}
            </span>
          )}
          {midias.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Nenhuma foto ou vídeo anexado ainda.
            </span>
          )}
        </div>

        {!somenteLeitura && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fotoInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processarArquivos(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={videoInputRef}
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processarArquivos(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              type="file"
              ref={geralInputRef}
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processarArquivos(e.target.files);
                e.target.value = "";
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={carregando}
              onClick={() => fotoInputRef.current?.click()}
              className="gap-1.5 text-xs font-medium"
            >
              <Camera className="h-3.5 w-3.5 text-primary" /> Adicionar Fotos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={carregando}
              onClick={() => videoInputRef.current?.click()}
              className="gap-1.5 text-xs font-medium"
            >
              <Video className="h-3.5 w-3.5 text-amber-500" /> Adicionar Vídeo
            </Button>
          </div>
        )}
      </div>

      {/* Zona de Drop para Upload (quando não for somente leitura) */}
      {!somenteLeitura && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => geralInputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
            arrastando
              ? "border-primary bg-primary/10 shadow-inner"
              : "border-border/80 bg-secondary/20 hover:border-primary/60 hover:bg-secondary/40"
          }`}
        >
          {carregando ? (
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Otimizando e processando mídia...
              </p>
              <p className="text-xs text-muted-foreground">Comprimindo para carregamento rápido</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              <div className="flex items-center gap-2 text-primary">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                  <Camera className="h-5 w-5" />
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                  <Video className="h-5 w-5" />
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                Clique aqui ou arraste fotos e vídeos do aparelho
              </p>
              <p className="text-xs text-muted-foreground">
                Comprove trincados, arranhões, carcaça ou teste de funcionamento gravado
              </p>
            </div>
          )}
        </div>
      )}

      {/* Grade de Mídias Carregadas */}
      {midias.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {midias.map((midia) => (
            <div
              key={midia.id}
              onClick={() => setItemVisualizando(midia)}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary hover:shadow-md"
            >
              {/* Miniatura ou Player de Vídeo */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                {midia.tipo === "imagem" ? (
                  <img
                    src={midia.url}
                    alt={midia.nome}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="relative flex h-full w-full items-center justify-center bg-slate-900">
                    <video
                      src={midia.url}
                      className="h-full w-full object-cover opacity-80"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      </span>
                    </div>
                  </div>
                )}

                {/* Badge de tipo de mídia */}
                <div className="absolute top-1.5 left-1.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ${
                      midia.tipo === "imagem" ? "bg-blue-600/90" : "bg-amber-600/90"
                    }`}
                  >
                    {midia.tipo === "imagem" ? (
                      <FileImage className="h-3 w-3" />
                    ) : (
                      <Film className="h-3 w-3" />
                    )}
                    {midia.tipo === "imagem" ? "Foto" : "Vídeo"}
                  </span>
                </div>

                {/* Botão de excluir */}
                {!somenteLeitura && (
                  <button
                    type="button"
                    onClick={(e) => removerMidia(midia.id, e)}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white/90 opacity-0 transition-opacity hover:bg-rose-600 hover:text-white group-hover:opacity-100"
                    title="Excluir arquivo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Ícone de zoom overlay */}
                <div className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-black/50 text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                  <Maximize2 className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Informações do arquivo */}
              <div className="p-2">
                <p className="truncate text-xs font-semibold text-foreground" title={midia.nome}>
                  {midia.nome}
                </p>
                <p className="text-[10px] text-muted-foreground">{midia.tamanhoFormatado}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Lightbox para visualização em alta definição */}
      {itemVisualizando && (
        <div
          onClick={() => setItemVisualizando(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-950 p-4 shadow-2xl"
          >
            {/* Barra do Modal */}
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2 text-white">
              <div className="flex items-center gap-2">
                {itemVisualizando.tipo === "imagem" ? (
                  <FileImage className="h-4 w-4 text-blue-400" />
                ) : (
                  <Film className="h-4 w-4 text-amber-400" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-white">{itemVisualizando.nome}</h4>
                  <span className="text-[11px] text-slate-400">
                    {itemVisualizando.tamanhoFormatado}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemVisualizando(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo: Imagem ou Vídeo com controles */}
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-xl bg-black/60 p-2">
              {itemVisualizando.tipo === "imagem" ? (
                <img
                  src={itemVisualizando.url}
                  alt={itemVisualizando.nome}
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <video
                  src={itemVisualizando.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] w-full rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
