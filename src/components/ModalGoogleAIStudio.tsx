import { useState, useEffect } from "react";
import { Sparkles, Key, CheckCircle2, AlertCircle, ExternalLink, Bot, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  obterChaveGoogleAIStudio,
  salvarChaveGoogleAIStudio,
  testarChaveGoogleAIStudio,
  gerarParecerTecnicoComIA,
  type DadosParaLaudoIA,
} from "@/lib/gemini";

interface ModalGoogleAIStudioProps {
  aberto: boolean;
  onFechar: () => void;
  dadosOS?: DadosParaLaudoIA;
  onAplicarLaudo?: (textoLaudo: string) => void;
}

export function ModalGoogleAIStudio({
  aberto,
  onFechar,
  dadosOS,
  onAplicarLaudo,
}: ModalGoogleAIStudioProps) {
  const [chave, setChave] = useState("");
  const [testando, setTestando] = useState(false);
  const [statusConexao, setStatusConexao] = useState<{ valida: boolean; mensagem: string } | null>(null);
  const [gerandoLaudo, setGerandoLaudo] = useState(false);
  const [laudoGerado, setLaudoGerado] = useState<string | null>(null);

  useEffect(() => {
    if (aberto) {
      const atual = obterChaveGoogleAIStudio();
      setChave(atual);
      if (atual) {
        setStatusConexao({ valida: true, mensagem: "Chave configurada e salva neste navegador." });
      } else {
        setStatusConexao(null);
      }
    }
  }, [aberto]);

  if (!aberto) return null;

  const handleSalvarETestar = async () => {
    if (!chave.trim()) {
      toast.error("Por favor, cole sua chave de API do Google AI Studio.");
      return;
    }

    setTestando(true);
    salvarChaveGoogleAIStudio(chave.trim());
    const res = await testarChaveGoogleAIStudio(chave.trim());
    setTestando(false);
    setStatusConexao(res);

    if (res.valida) {
      toast.success(res.mensagem);
    } else {
      toast.error(res.mensagem);
    }
  };

  const handleGerarLaudo = async () => {
    if (!dadosOS) {
      toast.error("Nenhum dado de Ordem de Serviço disponível para gerar laudo.");
      return;
    }

    setGerandoLaudo(true);
    setLaudoGerado(null);
    toast.info("Consultando o Google AI Studio (Gemini) para emissão do laudo...");

    const res = await gerarParecerTecnicoComIA(dadosOS);
    setGerandoLaudo(false);

    if (res.sucesso && res.texto) {
      setLaudoGerado(res.texto);
      toast.success("Parecer técnico formulado com sucesso pela IA!");
    } else {
      toast.error(res.erro || "Falha ao gerar laudo com IA.");
    }
  };

  const handleAplicar = () => {
    if (laudoGerado && onAplicarLaudo) {
      onAplicarLaudo(laudoGerado);
      toast.success("Laudo técnico aplicado à Ordem de Serviço!");
      onFechar();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-white space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-wide flex items-center gap-2">
                <span>Google AI Studio & Gemini</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono">
                  IA Oficial
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gere laudos periciais, diagnósticos e análises automatizadas
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Bloco de Configuração de Chave de API */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-indigo-400" />
              Chave de API do Google AI Studio (Gemini)
            </Label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold underline"
            >
              Criar chave gratuita <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Cole sua chave AIzaSy..."
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              className="bg-slate-900 border-slate-700 text-xs font-mono h-10 text-white placeholder:text-slate-600"
            />
            <Button
              type="button"
              onClick={handleSalvarETestar}
              disabled={testando || !chave.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold shrink-0 h-10 px-3.5"
            >
              {testando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar & Salvar"}
            </Button>
          </div>

          {statusConexao && (
            <div
              className={`text-[11px] p-2.5 rounded-lg border flex items-center gap-2 ${
                statusConexao.valida
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}
            >
              {statusConexao.valida ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{statusConexao.mensagem}</span>
            </div>
          )}
        </div>

        {/* Bloco de Ação: Gerar Laudo para a OS Aberta */}
        {dadosOS && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-indigo-400" />
                Assistente de Laudo Técnico da OS #{dadosOS.osNumero || ""}
              </h4>
              <Button
                type="button"
                onClick={handleGerarLaudo}
                disabled={gerandoLaudo}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold h-9 gap-1.5 shadow-lg shadow-indigo-950/60"
              >
                {gerandoLaudo ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando com Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Gerar Parecer com IA
                  </>
                )}
              </Button>
            </div>

            {laudoGerado && (
              <div className="space-y-2.5">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-500/30 text-xs text-slate-200 whitespace-pre-wrap max-h-60 overflow-y-auto font-sans leading-relaxed">
                  {laudoGerado}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAplicar}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Aplicar ao Laudo da OS
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(laudoGerado);
                      toast.success("Texto copiado para a área de transferência!");
                    }}
                    className="border-slate-700 bg-slate-900 text-slate-300 text-xs h-10 px-3 gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé informativo */}
        <div className="text-[11px] text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
          <p className="font-semibold text-slate-300">💡 Sobre a Publicação no Google AI Studio</p>
          <p className="leading-relaxed">
            Este projeto conta com arquivos nativos de ambiente e nuvem do Google (<code>.idx/dev.nix</code>, <code>apphosting.yaml</code> e <code>Dockerfile</code>), permitindo importação com 1 clique no Google Project IDX e publicação no Google Cloud Run.
          </p>
        </div>
      </div>
    </div>
  );
}
