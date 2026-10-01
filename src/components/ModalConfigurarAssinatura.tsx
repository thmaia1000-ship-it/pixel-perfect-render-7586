import React, { useState, useEffect, useRef } from "react";
import {
  PenTool,
  Upload,
  CheckCircle2,
  Trash2,
  X,
  FileSignature,
  Eye,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AssinaturaDigitalCanvas } from "@/components/AssinaturaDigitalCanvas";
import {
  salvarAssinaturaUsuario,
  removerAssinaturaUsuario,
  obterAssinaturaUsuario,
} from "@/lib/assinatura-usuario";

interface ModalConfigurarAssinaturaProps {
  aberto: boolean;
  onFechar: () => void;
  userId: string;
  userNome: string;
  userCargo?: string;
  onSalvo?: (dataUrl: string | null) => void;
}

export function ModalConfigurarAssinatura({
  aberto,
  onFechar,
  userId,
  userNome,
  userCargo,
  onSalvo,
}: ModalConfigurarAssinaturaProps) {
  const [modo, setModo] = useState<"desenho" | "upload">("desenho");
  const [assinaturaDataUrl, setAssinaturaDataUrl] = useState<string | null>(null);
  const [assinaturaExistente, setAssinaturaExistente] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (aberto && userId) {
      const existente = obterAssinaturaUsuario(userId);
      setAssinaturaExistente(existente);
      setAssinaturaDataUrl(existente);
      setModo("desenho");
    }
  }, [aberto, userId]);

  if (!aberto) return null;

  const handleUploadImagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG ou JPG).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setAssinaturaDataUrl(base64);
        toast.success("Imagem da assinatura carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSalvar = async () => {
    if (!assinaturaDataUrl) {
      toast.error("Por favor, desenhe ou envie uma assinatura antes de salvar.");
      return;
    }

    setSalvando(true);
    try {
      await salvarAssinaturaUsuario(userId, assinaturaDataUrl, userNome, modo);
      toast.success(
        `✓ Assinatura digital de ${userNome} salva e vinculada com sucesso a impressos e relatórios!`,
      );
      onSalvo?.(assinaturaDataUrl);
      onFechar();
    } catch (err: any) {
      console.error("Erro ao salvar assinatura:", err);
      toast.error("Não foi possível salvar a assinatura. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async () => {
    if (confirm(`Deseja realmente remover a assinatura digital de ${userNome}?`)) {
      setSalvando(true);
      try {
        await removerAssinaturaUsuario(userId);
        setAssinaturaExistente(null);
        setAssinaturaDataUrl(null);
        toast.success(`Assinatura digital de ${userNome} removida.`);
        onSalvo?.(null);
        onFechar();
      } catch (err) {
        toast.error("Erro ao remover assinatura.");
      } finally {
        setSalvando(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold shrink-0">
              <FileSignature className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Assinatura Digital do Usuário</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Colaborador: <strong className="text-foreground">{userNome}</strong>
                {userCargo ? ` (${userCargo})` : ""}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onFechar}
            disabled={salvando}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Informação explicativa */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">
              Aplicação Automática em Documentos Oficiais
            </p>
            <p className="text-[11px] mt-0.5 leading-relaxed">
              Esta assinatura será impressa automaticamente nas Ordens de Serviço, Termos de Entrada
              e Garantia, Laudos Técnicos e Recibos Avulsos nos quais este colaborador for o
              técnico/responsável.
            </p>
          </div>
        </div>

        {/* Alternância entre Desenho e Upload */}
        <div className="flex rounded-lg border border-border bg-secondary/40 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModo("desenho")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-colors cursor-pointer ${
              modo === "desenho"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Desenhar na Tela</span>
          </button>
          <button
            type="button"
            onClick={() => setModo("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-colors cursor-pointer ${
              modo === "upload"
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Enviar Imagem / Rubrica</span>
          </button>
        </div>

        {/* Área de Captura de Assinatura */}
        {modo === "desenho" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Use o mouse, caneta touch ou dedo na tela para desenhar sua assinatura:
            </p>
            <AssinaturaDigitalCanvas
              altura={150}
              onAssinaturaAlterada={(url) => setAssinaturaDataUrl(url)}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">
              Carregue uma imagem limpa da sua assinatura ou rubrica (fundo transparente
              preferencial):
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/webp"
              onChange={handleUploadImagem}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary rounded-xl p-6 text-center cursor-pointer transition-colors bg-card hover:bg-secondary/20 space-y-2"
            >
              <Upload className="h-8 w-8 mx-auto text-primary opacity-80" />
              <p className="text-xs font-bold text-foreground">
                Clique aqui para selecionar a imagem da assinatura
              </p>
              <p className="text-[10px] text-muted-foreground">PNG, JPG ou WEBP (máx. 2MB)</p>
            </div>
          </div>
        )}

        {/* Preview da Assinatura Selecionada/Carregada */}
        {assinaturaDataUrl && (
          <div className="rounded-xl border border-slate-300 bg-white p-3 space-y-1 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Pré-visualização da Assinatura Digital
            </span>
            <div className="h-16 flex items-center justify-center border-b border-slate-300 pb-1">
              <img
                src={assinaturaDataUrl}
                alt="Prévia da Assinatura"
                className="max-h-14 max-w-full object-contain"
              />
            </div>
            <div className="text-[10px] font-bold text-slate-900 pt-1">{userNome}</div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
          {assinaturaExistente ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemover}
              disabled={salvando}
              className="text-xs text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remover Assinatura</span>
            </Button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFechar}
              disabled={salvando}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              disabled={salvando || !assinaturaDataUrl}
              className="text-xs gap-1.5 font-bold bg-primary text-primary-foreground shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{salvando ? "Salvando..." : "Salvar Assinatura Digital"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
