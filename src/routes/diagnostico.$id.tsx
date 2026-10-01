import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Smartphone,
  Volume2,
  Volume1,
  Eye,
  Camera,
  Vibrate,
  Sliders,
  Compass,
  KeyRound,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Check,
  X,
  VolumeX,
  Radio,
  Mic,
  MicOff,
  AlertTriangle,
  Info,
  Lock,
  Unlock,
  RefreshCw,
  Play,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import {
  LISTA_TESTES_HARDWARE,
  deserializarEstadoEConferencia,
  serializarEstadoEConferencia,
  type TesteHardwareId,
  type ResultadoTesteHardware,
  type DiagnosticoExecutado,
} from "@/lib/conferencia-aparelho";

export const Route = createFileRoute("/diagnostico/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Diagnóstico de Hardware — BR3 Tech" },
      {
        name: "description",
        content: "Bateria de testes interativos de hardware do equipamento via QR Code.",
      },
    ],
  }),
  component: PaginaDiagnosticoAparelho,
});

export interface PermissoesHardwareState {
  camera: "granted" | "denied" | "prompt" | "unsupported";
  microfone: "granted" | "denied" | "prompt" | "unsupported";
  audio: "ready" | "pending";
  sensores: "granted" | "denied" | "prompt" | "unsupported";
  vibracao: "supported" | "unsupported";
  solicitando: boolean;
}

function PaginaDiagnosticoAparelho() {
  const { id } = Route.useParams();
  const [carregando, setCarregando] = useState(true);
  const [os, setOs] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [precisaLogin, setPrecisaLogin] = useState(false);

  // Estado dos testes
  const [testeAtivo, setTesteAtivo] = useState<TesteHardwareId | null>(null);
  const [resultados, setResultados] = useState<Record<string, ResultadoTesteHardware>>({});
  const [salvandoDiagnostico, setSalvandoDiagnostico] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [observacoesTech, setObservacoesTech] = useState("");

  // Estado do gerenciamento de permissões de hardware
  const [permissoes, setPermissoes] = useState<PermissoesHardwareState>({
    camera: "prompt",
    microfone: "prompt",
    audio: "pending",
    sensores: "prompt",
    vibracao: "supported",
    solicitando: false,
  });
  const [isSecureOrigin, setIsSecureOrigin] = useState(true);

  // Estados interativos específicos para cada teste
  const [touchGrid, setTouchGrid] = useState<boolean[]>(Array(60).fill(false));
  const [somTocando, setSomTocando] = useState(false);
  const [sensorValues, setSensorValues] = useState<{ x: number; y: number; z: number } | null>(null);
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [segundosRestantesMic, setSegundosRestantesMic] = useState(3);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [teclasDetectadas, setTeclasDetectadas] = useState<string[]>([]);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervaloMicRef = useRef<any>(null);

  // Checagem inicial de compatibilidade e permissões
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSecureOrigin(window.isSecureContext);
      const temVibracao = typeof navigator !== "undefined" && "vibrate" in navigator;

      setPermissoes((prev) => ({
        ...prev,
        vibracao: temVibracao ? "supported" : "unsupported",
      }));

      // Checa permissões via Permissions API se disponível
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: "camera" as any })
          .then((p) => {
            setPermissoes((prev) => ({ ...prev, camera: p.state as any }));
            p.onchange = () => setPermissoes((prev) => ({ ...prev, camera: p.state as any }));
          })
          .catch(() => {});

        navigator.permissions
          .query({ name: "microphone" as any })
          .then((p) => {
            setPermissoes((prev) => ({ ...prev, microfone: p.state as any }));
            p.onchange = () => setPermissoes((prev) => ({ ...prev, microfone: p.state as any }));
          })
          .catch(() => {});
      }
    }
  }, []);

  // Carrega OS com suporte a auto-login transferido via QR Code do técnico
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro(null);
      setPrecisaLogin(false);

      try {
        // 1. Verifica se a URL contém tokens de autenticação (transferidos via QR Code do técnico)
        if (typeof window !== "undefined") {
          const hash = window.location.hash.replace(/^#/, "");
          const hashParams = new URLSearchParams(hash);
          const queryParams = new URLSearchParams(window.location.search);

          const token =
            hashParams.get("token") ||
            hashParams.get("access_token") ||
            queryParams.get("token") ||
            queryParams.get("access_token");

          const refresh =
            hashParams.get("refresh") ||
            hashParams.get("refresh_token") ||
            queryParams.get("refresh") ||
            queryParams.get("refresh_token");

          if (token && refresh) {
            try {
              const { error: sessErr } = await supabase.auth.setSession({
                access_token: decodeURIComponent(token),
                refresh_token: decodeURIComponent(refresh),
              });
              if (!sessErr) {
                // Remove o token da URL para não ficar exposto na barra de endereços
                window.history.replaceState(null, "", window.location.pathname);
              }
            } catch (err) {
              console.warn("Aviso ao definir sessão do QR Code:", err);
            }
          }
        }

        // 2. Checa status da sessão atual
        const { data: sessData } = await supabase.auth.getSession();
        const estaAutenticado = !!sessData?.session?.user;

        // 3. Busca os dados da Ordem de Serviço
        const { data, error } = await supabase
          .from("ordens_servico")
          .select("*, clientes(nome, telefone), profiles(nome)")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          if (!estaAutenticado) {
            setPrecisaLogin(true);
            setErro("Acesso protegido. Entre com sua conta de técnico da BR3 Tech.");
            return;
          }
          throw error;
        }

        if (!data) {
          if (!estaAutenticado) {
            setPrecisaLogin(true);
            setErro("Acesso restrito. Faça login como técnico para visualizar esta OS.");
            return;
          }
          setErro("Ordem de serviço não encontrada.");
          return;
        }

        setOs(data);

        // Se já tiver diagnóstico anterior gravado, pré-carrega
        const { encerramento } = deserializarEstadoEConferencia(data.estado_fisico);
        if (encerramento?.diagnosticoHardware?.testes) {
          setResultados(encerramento.diagnosticoHardware.testes);
          if (encerramento.diagnosticoHardware.observacoes) {
            setObservacoesTech(encerramento.diagnosticoHardware.observacoes);
          }
        }
      } catch (err: any) {
        setErro(err?.message || "Erro ao carregar OS.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id]);

  // Rotina Completa para Solicitar Todas as Permissões de Hardware
  const solicitarTodasPermissoes = async () => {
    setPermissoes((prev) => ({ ...prev, solicitando: true }));
    toast.info("Iniciando rotina de liberação de hardware...");

    let micOk = false;
    let camOk = false;

    // 1. Áudio Context (desbloqueia áudio de saída para o navegador móvel)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const testCtx = new AudioCtx();
        if (testCtx.state === "suspended") {
          await testCtx.resume();
        }
        testCtx.close().catch(() => {});
        setPermissoes((prev) => ({ ...prev, audio: "ready" }));
      }
    } catch (e) {
      console.warn("Falha AudioContext:", e);
    }

    // 2. Microfone
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const streamMic = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamMic.getTracks().forEach((t) => t.stop());
        micOk = true;
        setPermissoes((prev) => ({ ...prev, microfone: "granted" }));
      } catch (err: any) {
        console.warn("Permissão de microfone:", err);
        setPermissoes((prev) => ({
          ...prev,
          microfone: err?.name === "NotAllowedError" ? "denied" : "unsupported",
        }));
      }
    } else {
      setPermissoes((prev) => ({ ...prev, microfone: "unsupported" }));
    }

    // 3. Câmera
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const streamCam = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        streamCam.getTracks().forEach((t) => t.stop());
        camOk = true;
        setPermissoes((prev) => ({ ...prev, camera: "granted" }));
      } catch (err: any) {
        console.warn("Permissão de câmera:", err);
        setPermissoes((prev) => ({
          ...prev,
          camera: err?.name === "NotAllowedError" ? "denied" : "unsupported",
        }));
      }
    } else {
      setPermissoes((prev) => ({ ...prev, camera: "unsupported" }));
    }

    // 4. Sensores de Movimento (iOS Safari requer solicitação explícita por gesto)
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === "function") {
      try {
        const resp = await (DeviceOrientationEvent as any).requestPermission();
        setPermissoes((prev) => ({
          ...prev,
          sensores: resp === "granted" ? "granted" : "denied",
        }));
      } catch {
        setPermissoes((prev) => ({ ...prev, sensores: "denied" }));
      }
    } else {
      setPermissoes((prev) => ({ ...prev, sensores: "granted" }));
    }

    // 5. Teste de Vibração tátil
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(80);
        setPermissoes((prev) => ({ ...prev, vibracao: "supported" }));
      } catch {}
    }

    setPermissoes((prev) => ({ ...prev, solicitando: false }));

    if (micOk && camOk) {
      toast.success("Todas as permissões de hardware foram concedidas com sucesso!");
    } else if (micOk || camOk) {
      toast.info("Permissões parcialmente concedidas. Verifique os avisos na tela.");
    } else {
      if (!window.isSecureContext) {
        toast.warning(
          "Atenção: Seu navegador pode exigir que as permissões de câmera/microfone sejam liberadas no ícone do cadeado da barra de endereços."
        );
      } else {
        toast.error("Permissões negadas. Ative o acesso nas configurações do navegador.");
      }
    }
  };

  // Limpeza de recursos ao sair de teste
  const pararRecursosAtuais = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (intervaloMicRef.current) {
      clearInterval(intervaloMicRef.current);
      intervaloMicRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setSomTocando(false);
    setGravandoAudio(false);
  };

  // Sensor de movimento (Acelerômetro)
  useEffect(() => {
    if (testeAtivo !== "sensor") return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      setSensorValues({
        x: Math.round(e.gamma || 0),
        y: Math.round(e.beta || 0),
        z: Math.round(e.alpha || 0),
      });
    };

    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, [testeAtivo]);

  // Listener de teclas físicas (Sub Key)
  useEffect(() => {
    if (testeAtivo !== "sub_key") return;

    const handleKey = (e: KeyboardEvent) => {
      const keyName = e.key || e.code;
      setTeclasDetectadas((prev) => (prev.includes(keyName) ? prev : [...prev, keyName]));
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [testeAtivo]);

  // Função para tocar tom de áudio (Receiver 1000Hz ou Speaker 440Hz)
  const tocarTom = async (freq: number) => {
    try {
      pararRecursosAtuais();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        toast.error("Web Audio API indisponível neste navegador.");
        return;
      }

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      // Destrava reprodução móvel
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setSomTocando(true);
      setPermissoes((prev) => ({ ...prev, audio: "ready" }));
    } catch (e) {
      console.warn("Erro tom:", e);
      toast.error("Não foi possível acionar o sistema de áudio.");
    }
  };

  // Vibração com padrões variados
  const acionarVibracao = (padrao: number[] = [400, 200, 400, 200, 600]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        const ok = navigator.vibrate(padrao);
        if (ok) {
          toast.success("Comando de vibração disparado no hardware!");
        } else {
          toast.info("Disparo de vibração enviado ao sistema.");
        }
      } catch {
        toast.error("Erro ao acionar vibração.");
      }
    } else {
      toast.info(
        "A API de vibração não é suportada por navegadores iOS (Apple Safari). Teste fisicamente o hardware."
      );
    }
  };

  // Iniciar Câmera (Frontal ou Traseira) com suporte a múltiplos dispositivos
  const iniciarCamera = async (facingMode: "user" | "environment") => {
    pararRecursosAtuais();

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error(
        "Acesso à câmera indisponível neste navegador. Em redes locais, certifique-se de liberar as permissões no cadeado da barra de endereço."
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // Fallback genérico sem restrições de resolução/facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setCameraStream(stream);
      setPermissoes((prev) => ({ ...prev, camera: "granted" }));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      console.warn("Erro câmera:", e);
      setPermissoes((prev) => ({
        ...prev,
        camera: e?.name === "NotAllowedError" ? "denied" : "unsupported",
      }));
      toast.error(
        e?.name === "NotAllowedError"
          ? "Permissão de câmera negada. Toque no ícone do cadeado no topo do navegador para liberar."
          : `Acesso à câmera indisponível: ${e?.message || "permissão negada"}`
      );
    }
  };

  // Teste de Gravação de Microfone com suporte a Android e iOS
  const iniciarGravacaoMic = async () => {
    pararRecursosAtuais();
    setAudioUrl(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error(
        "Acesso ao microfone indisponível. Libere o acesso no ícone de configurações/cadeado da barra de endereços."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Seleção inteligente de codec suportado pelo navegador (Chrome, Safari iOS, etc.)
      let mimeTypeEscolhido = "";
      if (typeof MediaRecorder !== "undefined") {
        const formatos = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/aac",
          "audio/ogg",
        ];
        for (const f of formatos) {
          if (MediaRecorder.isTypeSupported(f)) {
            mimeTypeEscolhido = f;
            break;
          }
        }
      }

      const recorder = mimeTypeEscolhido
        ? new MediaRecorder(stream, { mimeType: mimeTypeEscolhido })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeTypeEscolhido || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setGravandoAudio(true);
      setSegundosRestantesMic(3);
      setPermissoes((prev) => ({ ...prev, microfone: "granted" }));
      toast.info("Gravando teste de áudio... Fale no microfone!");

      // Contagem regressiva de 3 segundos
      let seg = 3;
      intervaloMicRef.current = setInterval(() => {
        seg -= 1;
        setSegundosRestantesMic(seg);
        if (seg <= 0) {
          clearInterval(intervaloMicRef.current);
          intervaloMicRef.current = null;
          if (recorder.state === "recording") {
            recorder.stop();
            setGravandoAudio(false);
            toast.success("Gravação concluída! Teste a reprodução abaixo.");
          }
        }
      }, 1000);
    } catch (e: any) {
      console.warn("Erro mic:", e);
      setPermissoes((prev) => ({
        ...prev,
        microfone: e?.name === "NotAllowedError" ? "denied" : "unsupported",
      }));
      toast.error(
        e?.name === "NotAllowedError"
          ? "Permissão de microfone negada. Toque no cadeado da barra de endereço para autorizar."
          : `Não foi possível acessar o microfone: ${e?.message || "bloqueado"}`
      );
    }
  };

  const pararGravacaoMic = () => {
    if (intervaloMicRef.current) {
      clearInterval(intervaloMicRef.current);
      intervaloMicRef.current = null;
    }
    if (mediaRecorderRef.current && gravandoAudio) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      setGravandoAudio(false);
    }
  };

  // Registra status de um teste
  const gravarResultado = (id: TesteHardwareId, status: "aprovado" | "reprovado" | "ignorado") => {
    pararRecursosAtuais();
    setResultados((prev) => ({
      ...prev,
      [id]: {
        id,
        status,
        dataHora: new Date().toISOString(),
      },
    }));
    setTesteAtivo(null);
  };

  // Inicializa o teste selecionado
  const abrirTeste = (item: TesteHardwareId) => {
    pararRecursosAtuais();
    setTesteAtivo(item);

    if (item === "touch") {
      setTouchGrid(Array(60).fill(false));
    } else if (item === "receiver") {
      tocarTom(1000); // 1 kHz agudo
    } else if (item === "speaker") {
      tocarTom(440); // 440 Hz grave
    } else if (item === "vibration") {
      acionarVibracao();
    } else if (item === "camera_front") {
      iniciarCamera("user");
    } else if (item === "camera_back") {
      iniciarCamera("environment");
    } else if (item === "sub_key") {
      setTeclasDetectadas([]);
    } else if (item === "mic") {
      setAudioUrl(null);
    }
  };

  // Salvar diagnóstico no banco de dados na ordem de serviço
  const salvarNoBanco = async () => {
    if (!os) return;
    setSalvandoDiagnostico(true);

    try {
      const aprovados = Object.values(resultados).filter((r) => r.status === "aprovado").length;
      const reprovados = Object.values(resultados).filter((r) => r.status === "reprovado").length;

      const diagnostico: DiagnosticoExecutado = {
        executadoEm: new Date().toISOString(),
        aparelhoInfo: `${os.marca || ""} ${os.modelo || ""} (${navigator.userAgent})`,
        testes: resultados,
        observacoes: observacoesTech.trim(),
        totalAprovados: aprovados,
        totalReprovados: reprovados,
      };

      const dadosAtuais = deserializarEstadoEConferencia(os.estado_fisico);
      const novoEncerramento = {
        checklistSaida: dadosAtuais.encerramento?.checklistSaida || {},
        diagnosticoHardware: diagnostico,
        observacoesSaida: dadosAtuais.encerramento?.observacoesSaida || observacoesTech.trim(),
        encerradoEm: dadosAtuais.encerramento?.encerradoEm || new Date().toISOString(),
        tecnicoNome: os.profiles?.nome || "Técnico",
      };

      const novoEstadoFisico = serializarEstadoEConferencia(
        dadosAtuais.conferencia,
        dadosAtuais.observacoes,
        dadosAtuais.midias,
        dadosAtuais.assinaturaAutorizacao,
        novoEncerramento,
      );

      const { error } = await supabase
        .from("ordens_servico")
        .update({ estado_fisico: novoEstadoFisico })
        .eq("id", os.id);

      if (error) throw error;

      await supabase.from("os_historico").insert({
        os_id: os.id,
        status: os.status,
        observacao: `Bateria de Testes de Hardware (*#0*#) executada no equipamento: ${aprovados} aprovados, ${reprovados} reprovados.`,
        usuario_id: null,
        usuario_nome: "Diagnóstico Hardware QR Code",
      });

      setConcluido(true);
      toast.success("Diagnóstico de hardware sincronizado com a Ordem de Serviço!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gravar diagnóstico.");
    } finally {
      setSalvandoDiagnostico(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-sm font-medium">Iniciando Menu de Testes de Hardware...</p>
        </div>
      </div>
    );
  }

  if (erro || !os) {
    if (precisaLogin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
          <div className="max-w-md w-full rounded-2xl border border-amber-500/40 bg-slate-900/95 p-6 text-center space-y-4 shadow-2xl">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Identificação do Técnico Necessária</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                As ordens de serviço e laudos de hardware da BR3 Tech são restritos. Entre com sua conta no celular para carregar o equipamento e salvar o checklist de saída.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 gap-2 shadow-lg shadow-primary/20">
                <Link to="/auth" search={{ returnTo: `/diagnostico/${id}` }}>
                  <LogIn className="h-4 w-4" />
                  <span>Fazer Login como Técnico no Celular</span>
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Tentar Recarregar Página
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
              💡 <strong>Dica:</strong> No computador, no modal de encerramento da OS, marque a opção <em>"Login Automático via QR Code"</em> para entrar no celular sem precisar digitar sua senha!
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full rounded-2xl border border-rose-800/40 bg-rose-950/20 p-6 text-center space-y-3">
          <XCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="text-lg font-bold">Diagnóstico Indisponível</h2>
          <p className="text-xs text-muted-foreground">{erro}</p>
          <div className="pt-3 flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1 border-slate-700 text-xs">
              <Link to="/auth" search={{ returnTo: `/diagnostico/${id}` }}>
                Entrar com Conta
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="flex-1 border-slate-700 text-xs"
            >
              Recarregar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const modeloAparelho = [os.marca, os.modelo].filter(Boolean).join(" ") || os.aparelho;
  const totalTestes = LISTA_TESTES_HARDWARE.length;
  const totalExecutados = Object.keys(resultados).length;
  const totalAprovados = Object.values(resultados).filter((r) => r.status === "aprovado").length;
  const totalReprovados = Object.values(resultados).filter((r) => r.status === "reprovado").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-primary/30">
      {/* ========================================================================= */}
      {/* TELA CHEIA / EXECUÇÃO DO TESTE ATIVO (*#0*# EXPERIENCE)                   */}
      {/* ========================================================================= */}
      {testeAtivo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          {/* 1. TESTES DE CORES PURAS (RED, GREEN, BLUE, WHITE, BLACK) */}
          {(testeAtivo === "red" ||
            testeAtivo === "green" ||
            testeAtivo === "blue" ||
            testeAtivo === "white" ||
            testeAtivo === "black") && (
            <div
              className={`flex-1 flex flex-col items-center justify-between p-6 ${
                testeAtivo === "red"
                  ? "bg-red-600 text-white"
                  : testeAtivo === "green"
                    ? "bg-green-600 text-white"
                    : testeAtivo === "blue"
                      ? "bg-blue-600 text-white"
                      : testeAtivo === "white"
                        ? "bg-white text-black"
                        : "bg-black text-white border border-slate-800"
              }`}
            >
              <div className="text-center pt-8">
                <h2 className="text-2xl font-black uppercase tracking-wider">{testeAtivo}</h2>
                <p className="text-xs opacity-90 mt-1">
                  Verifique se há pixels mortos, faixas, burn-in ou sombras na tela.
                </p>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm">
                <Button
                  onClick={() => gravarResultado(testeAtivo, "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg"
                >
                  <Check className="h-5 w-5 mr-1" /> Cor Perfeita
                </Button>
                <Button
                  onClick={() => gravarResultado(testeAtivo, "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12 shadow-lg"
                >
                  <X className="h-5 w-5 mr-1" /> Falha / Defeito
                </Button>
              </div>
            </div>
          )}

          {/* 2. TESTE DE TOUCH GRID (GRADE DE TOQUE) */}
          {testeAtivo === "touch" && (
            <div className="flex-1 flex flex-col bg-slate-900 select-none">
              <div className="p-3 text-center bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-400">
                  Touch Grid: Toque e arraste o dedo por todos os quadrados
                </span>
                <span className="text-xs font-mono">
                  {touchGrid.filter(Boolean).length}/{touchGrid.length}
                </span>
              </div>

              <div
                className="flex-1 grid grid-cols-6 grid-rows-10 gap-1 p-2 touch-none"
                onPointerMove={(e) => {
                  const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
                  const idxStr = target?.getAttribute("data-cell-index");
                  if (idxStr !== null && idxStr !== undefined) {
                    const idx = Number(idxStr);
                    setTouchGrid((prev) => {
                      if (prev[idx]) return prev;
                      const next = [...prev];
                      next[idx] = true;
                      return next;
                    });
                  }
                }}
              >
                {touchGrid.map((preenchido, idx) => (
                  <div
                    key={idx}
                    data-cell-index={idx}
                    onPointerDown={() => {
                      setTouchGrid((prev) => {
                        const next = [...prev];
                        next[idx] = true;
                        return next;
                      });
                    }}
                    className={`rounded transition-colors border ${
                      preenchido
                        ? "bg-emerald-500 border-emerald-400 shadow-sm"
                        : "bg-slate-800 border-slate-700/60"
                    }`}
                  />
                ))}
              </div>

              <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-3">
                <Button
                  onClick={() => gravarResultado("touch", "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11"
                >
                  <Check className="h-4 w-4 mr-1" /> Touch 100% OK
                </Button>
                <Button
                  onClick={() => gravarResultado("touch", "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-11"
                >
                  <X className="h-4 w-4 mr-1" /> Zona Morta / Falha
                </Button>
              </div>
            </div>
          )}

          {/* 3. TESTE DE RECEIVER & SPEAKER (ÁUDIO) */}
          {(testeAtivo === "receiver" || testeAtivo === "speaker") && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-slate-950 text-center">
              <div className="pt-10 space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                  <Volume2 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-black uppercase">
                  {testeAtivo === "receiver" ? "Receiver (Auricular de Chamada)" : "Speaker (Alto-falante Viva-voz)"}
                </h2>
                <p className="text-xs text-slate-400 max-w-sm">
                  {testeAtivo === "receiver"
                    ? "Aproxime o ouvido da parte superior do aparelho. O som de teste deve estar nítido, sem ruídos ou chiados."
                    : "Ouça o alto-falante principal na potência máxima. O áudio deve soar limpo sem distorções."}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => tocarTom(testeAtivo === "receiver" ? 1000 : 440)}
                    className="border-primary/50 text-primary hover:bg-primary/20"
                  >
                    Repetir Tom Sonoro
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm">
                <Button
                  onClick={() => gravarResultado(testeAtivo, "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12"
                >
                  <Check className="h-5 w-5 mr-1" /> Áudio Nítido
                </Button>
                <Button
                  onClick={() => gravarResultado(testeAtivo, "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12"
                >
                  <X className="h-5 w-5 mr-1" /> Chiado / Mudo
                </Button>
              </div>
            </div>
          )}

          {/* 4. TESTE DE MICROFONE */}
          {testeAtivo === "mic" && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-slate-950 text-center">
              <div className="pt-8 space-y-4 max-w-sm w-full">
                <div className="mx-auto w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center relative">
                  <Radio className={`h-10 w-10 text-red-500 ${gravandoAudio ? "animate-ping" : ""}`} />
                  {gravandoAudio && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
                      {segundosRestantesMic}s
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-black uppercase">Microfone (Gravação & Loopback)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Grave um áudio de voz ("1, 2, 3 testando") e ouça a reprodução para certificar a captação limpa.
                  </p>
                </div>

                {permissoes.microfone === "denied" && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 text-left space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      Permissão de microfone negada no navegador
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Toque no ícone de cadeado/ajustes no topo da tela do navegador, acesse <strong>Permissões</strong> e marque <strong>Microfone</strong> como <em>Permitir</em>.
                    </p>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  {!gravandoAudio ? (
                    <Button
                      onClick={iniciarGravacaoMic}
                      className="bg-red-600 hover:bg-red-500 font-bold w-full h-11 shadow-lg shadow-red-950/60 gap-2"
                    >
                      <Mic className="h-4 w-4" />
                      <span>{audioUrl ? "Gravar Novamente (3s)" : "Iniciar Gravação (3s)"}</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={pararGravacaoMic}
                      variant="destructive"
                      className="font-bold w-full h-11 animate-pulse gap-2"
                    >
                      <Radio className="h-4 w-4 animate-spin" />
                      <span>Gravando... Parar ({segundosRestantesMic}s)</span>
                    </Button>
                  )}

                  {audioUrl && (
                    <div className="pt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        Reprodução do Áudio Gravado:
                      </span>
                      <audio controls src={audioUrl} className="w-full h-10 rounded" autoPlay />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm">
                <Button
                  onClick={() => gravarResultado("mic", "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg"
                >
                  <Check className="h-5 w-5 mr-1" /> Captação OK
                </Button>
                <Button
                  onClick={() => gravarResultado("mic", "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12 shadow-lg"
                >
                  <X className="h-5 w-5 mr-1" /> Sem Áudio
                </Button>
              </div>
            </div>
          )}

          {/* 5. TESTE DE CÂMERAS (FRONTAL / TRASEIRA) */}
          {(testeAtivo === "camera_front" || testeAtivo === "camera_back") && (
            <div className="flex-1 flex flex-col bg-black">
              <div className="p-3 text-center bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  {testeAtivo === "camera_front" ? "Front Cam (Câmera Frontal)" : "Mega Cam (Câmera Traseira)"}
                </h3>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    iniciarCamera(testeAtivo === "camera_front" ? "user" : "environment")
                  }
                  className="h-7 text-[11px] border-slate-700 text-slate-300 gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reconectar</span>
                </Button>
              </div>

              <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
                {permissoes.camera === "denied" ? (
                  <div className="max-w-xs text-center p-6 bg-slate-900/90 rounded-2xl border border-rose-500/40 text-rose-300 space-y-2">
                    <AlertTriangle className="h-8 w-8 mx-auto text-rose-400" />
                    <h4 className="font-bold text-sm text-white">Permissão de Câmera Bloqueada</h4>
                    <p className="text-xs text-slate-400">
                      Libere o acesso da câmera nas configurações ou ícone de cadeado do navegador para exibir o visor.
                    </p>
                    <Button
                      size="sm"
                      onClick={() =>
                        iniciarCamera(testeAtivo === "camera_front" ? "user" : "environment")
                      }
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs mt-2"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 flex gap-3">
                <Button
                  onClick={() => gravarResultado(testeAtivo, "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg"
                >
                  <Check className="h-4 w-4 mr-1" /> Imagem e Foco OK
                </Button>
                <Button
                  onClick={() => gravarResultado(testeAtivo, "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12 shadow-lg"
                >
                  <X className="h-4 w-4 mr-1" /> Falha na Câmera
                </Button>
              </div>
            </div>
          )}

          {/* 6. VIBRAÇÃO & SENSORES */}
          {testeAtivo === "vibration" && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-slate-950 text-center">
              <div className="pt-8 space-y-4 max-w-sm w-full">
                <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center animate-bounce">
                  <Vibrate className="h-10 w-10 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase">Vibration (Motor de Vibração)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sinta a resposta tátil do motor háptico do aparelho ao acionar os pulsos abaixo:
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    onClick={() => acionarVibracao([300])}
                    variant="outline"
                    className="border-amber-500/60 text-amber-300 hover:bg-amber-500/20 text-xs font-bold h-11"
                  >
                    Pulso Curto
                  </Button>
                  <Button
                    onClick={() => acionarVibracao([600])}
                    variant="outline"
                    className="border-amber-500/60 text-amber-300 hover:bg-amber-500/20 text-xs font-bold h-11"
                  >
                    Pulso Longo
                  </Button>
                  <Button
                    onClick={() => acionarVibracao([200, 100, 200, 100, 400])}
                    variant="outline"
                    className="col-span-2 border-amber-500/60 text-amber-300 hover:bg-amber-500/20 text-xs font-bold h-11"
                  >
                    Padrão Triplo (Háptico)
                  </Button>
                </div>

                {permissoes.vibracao === "unsupported" && (
                  <p className="text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    ℹ️ Aparelhos iOS (iPhone) desabilitam vibração via web por diretriz da Apple. Teste a vibração física de chamadas/notificações e selecione abaixo.
                  </p>
                )}
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm">
                <Button
                  onClick={() => gravarResultado("vibration", "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg"
                >
                  <Check className="h-5 w-5 mr-1" /> Vibrou Firme
                </Button>
                <Button
                  onClick={() => gravarResultado("vibration", "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12 shadow-lg"
                >
                  <X className="h-5 w-5 mr-1" /> Sem Resposta
                </Button>
              </div>
            </div>
          )}

          {/* 7. DIMMING (CONTROLE DE BRILHO) */}
          {testeAtivo === "dimming" && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-white via-slate-500 to-black text-center text-slate-950">
              <div className="pt-10 space-y-3 bg-black/60 text-white p-4 rounded-xl border border-white/20">
                <h2 className="text-xl font-black uppercase">Dimming (Transição de Luminosidade)</h2>
                <p className="text-xs text-slate-300">
                  Teste o gradiente de iluminação do display, verificando se há cintilação ou flickering.
                </p>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm">
                <Button
                  onClick={() => gravarResultado("dimming", "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12"
                >
                  <Check className="h-5 w-5 mr-1" /> Brilho Uniforme
                </Button>
                <Button
                  onClick={() => gravarResultado("dimming", "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12"
                >
                  <X className="h-5 w-5 mr-1" /> Falha no Display
                </Button>
              </div>
            </div>
          )}

          {/* 8. SENSOR (ACELERÔMETRO / ORIENTAÇÃO) */}
          {testeAtivo === "sensor" && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-slate-950 text-center">
              <div className="pt-10 space-y-4 max-w-sm">
                <div className="mx-auto w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center">
                  <Compass className="h-10 w-10 text-indigo-400" />
                </div>
                <h2 className="text-xl font-black uppercase">Sensor (Acelerômetro e Giro)</h2>
                <p className="text-xs text-slate-400">
                  Movimente e incline o aparelho para conferir os eixos de leitura em tempo real:
                </p>

                <div className="grid grid-cols-3 gap-2 font-mono text-sm bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="block text-[10px] text-slate-500">X (Gama)</span>
                    <span className="font-bold text-emerald-400">{sensorValues?.x ?? "—"}°</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">Y (Beta)</span>
                    <span className="font-bold text-emerald-400">{sensorValues?.y ?? "—"}°</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500">Z (Alpha)</span>
                    <span className="font-bold text-emerald-400">{sensorValues?.z ?? "—"}°</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm">
                <Button
                  onClick={() => gravarResultado("sensor", "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12"
                >
                  <Check className="h-5 w-5 mr-1" /> Sensores Ativos
                </Button>
                <Button
                  onClick={() => gravarResultado("sensor", "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12"
                >
                  <X className="h-5 w-5 mr-1" /> Sem Leitura
                </Button>
              </div>
            </div>
          )}

          {/* 9. SUB KEY (BOTÕES FÍSICOS COM SUPORTE A TOQUE TÁTIL) */}
          {testeAtivo === "sub_key" && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-slate-950 text-center">
              <div className="pt-8 space-y-4 max-w-sm w-full">
                <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center">
                  <KeyRound className="h-10 w-10 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase">Sub Key (Teclas Físicas)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Pressione os botões de Volume (+) e Volume (-) do aparelho ou confirme cada tecla física abaixo:
                  </p>
                </div>

                {/* Botões de validação para teclas físicas capturadas pelo sistema móvel */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    {["Volume (+)", "Volume (-)", "Power / Liga", "Bixby / Assistente"].map((botao) => {
                      const respondendo = teclasDetectadas.includes(botao);
                      return (
                        <button
                          key={botao}
                          type="button"
                          onClick={() => {
                            if ("vibrate" in navigator) navigator.vibrate(60);
                            setTeclasDetectadas((prev) =>
                              prev.includes(botao) ? prev : [...prev, botao]
                            );
                          }}
                          className={`p-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            respondendo
                              ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/40"
                              : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850"
                          }`}
                        >
                          {respondendo ? `✓ ${botao}` : botao}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Como o Android/iOS costuma reservar os botões de volume para a mídia do sistema, clique acima após sentir o clique físico do botão.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm">
                <Button
                  onClick={() => gravarResultado("sub_key", "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 shadow-lg"
                >
                  <Check className="h-5 w-5 mr-1" /> Teclas Respondendo
                </Button>
                <Button
                  onClick={() => gravarResultado("sub_key", "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12 shadow-lg"
                >
                  <X className="h-5 w-5 mr-1" /> Falha de Botão
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TELA PRINCIPAL DO MENU DE DIAGNÓSTICO (ESTILO MATRIZ DE SERVIÇO)          */}
      {/* ========================================================================= */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <div>
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>TESTE DE HARDWARE</span>
                <span className="text-[10px] bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.2 rounded font-mono">
                  *#0*#
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                OS #{os.numero} · {modeloAparelho}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {totalAprovados} OK
            </span>
            {totalReprovados > 0 && (
              <span className="ml-2 text-xs font-bold text-rose-400 font-mono">
                {totalReprovados} Falhas
              </span>
            )}
            <p className="text-[10px] text-slate-500 font-mono">
              {totalExecutados}/{totalTestes} testes
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4">
        {/* CARD CENTRAL DE ROTINA DE PERMISSÕES DE HARDWARE */}
        <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 via-slate-900/95 to-slate-950 p-4 shadow-xl shadow-black/40 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Permissões de Hardware do Aparelho</span>
                  {permissoes.camera === "granted" && permissoes.microfone === "granted" ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                      ✓ Liberado
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                      Pendente
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Libere o acesso da câmera, microfone e áudio para os testes funcionarem sem bloqueios no dispositivo.
                </p>
              </div>
            </div>
          </div>

          {/* Grid de Status dos Recursos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            {/* Câmera */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                <span>Câmera</span>
              </div>
              {permissoes.camera === "granted" ? (
                <span className="text-emerald-400 font-bold text-[10px]">Liberada ✓</span>
              ) : permissoes.camera === "denied" ? (
                <span className="text-rose-400 font-bold text-[10px]">Bloqueada ✕</span>
              ) : (
                <span className="text-amber-400 font-medium text-[10px]">Pendente</span>
              )}
            </div>

            {/* Microfone */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Radio className="h-3.5 w-3.5 text-rose-400" />
                <span>Microfone</span>
              </div>
              {permissoes.microfone === "granted" ? (
                <span className="text-emerald-400 font-bold text-[10px]">Liberado ✓</span>
              ) : permissoes.microfone === "denied" ? (
                <span className="text-rose-400 font-bold text-[10px]">Bloqueado ✕</span>
              ) : (
                <span className="text-amber-400 font-medium text-[10px]">Pendente</span>
              )}
            </div>

            {/* Áudio */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Áudio</span>
              </div>
              {permissoes.audio === "ready" ? (
                <span className="text-emerald-400 font-bold text-[10px]">Ativado ✓</span>
              ) : (
                <span className="text-amber-400 font-medium text-[10px]">Pendente</span>
              )}
            </div>

            {/* Vibração */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Vibrate className="h-3.5 w-3.5 text-purple-400" />
                <span>Vibração</span>
              </div>
              {permissoes.vibracao === "supported" ? (
                <span className="text-emerald-400 font-bold text-[10px]">Suportada ✓</span>
              ) : (
                <span className="text-slate-400 font-medium text-[10px]">Manual (iOS)</span>
              )}
            </div>
          </div>

          {/* Botão de Solicitação Geral com 1 toque */}
          <div className="pt-1">
            <Button
              type="button"
              onClick={solicitarTodasPermissoes}
              disabled={permissoes.solicitando}
              className={`w-full font-bold text-xs h-10 gap-2 shadow-lg transition-all ${
                permissoes.camera === "granted" && permissoes.microfone === "granted"
                  ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40"
              }`}
            >
              {permissoes.solicitando ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Solicitando acesso ao navegador...</span>
                </>
              ) : permissoes.camera === "granted" && permissoes.microfone === "granted" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Permissões Concedidas (Toque para re-testar)</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Liberar Todas as Permissões de Hardware</span>
                </>
              )}
            </Button>
          </div>

          {/* Instrução clara caso o navegador bloqueie em HTTP local */}
          {(!isSecureOrigin ||
            permissoes.camera === "denied" ||
            permissoes.microfone === "denied") && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Como autorizar pelo navegador móvel:</p>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  Toque no <strong>ícone de ajustes/cadeado</strong> ao lado do endereço no topo do navegador (Chrome ou Safari), selecione <strong>Permissões</strong> e marque <strong>Câmera</strong> e <strong>Microfone</strong> como <em>Permitir</em>.
                </p>
              </div>
            </div>
          )}
        </div>
        {/* Banner informativo de execução no próprio aparelho */}
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Diagnóstico Ativo Conectado</span>
          </div>
          <p className="text-slate-300 text-[11.5px] leading-relaxed">
            Execute os módulos de diagnóstico abaixo no próprio aparelho. Ao concluir, salve o laudo para vincular o fechamento com o termo de garantia da OS.
          </p>
        </div>

        {/* Grade de botões inspirada no menu de serviço Samsung *#0*# */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {LISTA_TESTES_HARDWARE.map((item) => {
            const res = resultados[item.id];
            const isOk = res?.status === "aprovado";
            const isDef = res?.status === "reprovado";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => abrirTeste(item.id)}
                className={`relative flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all active:scale-95 shadow-sm min-h-[90px] ${
                  isOk
                    ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                    : isDef
                      ? "bg-rose-950/40 border-rose-500/60 text-rose-300"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-850"
                }`}
              >
                {/* Ícone de status no canto */}
                {isOk && (
                  <span className="absolute top-1.5 right-1.5 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
                {isDef && (
                  <span className="absolute top-1.5 right-1.5 text-rose-400">
                    <XCircle className="h-4 w-4" />
                  </span>
                )}

                <span className="text-xs font-black uppercase tracking-tight line-clamp-1">
                  {item.titulo}
                </span>
                <span className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                  {item.descricao}
                </span>
              </button>
            );
          })}
        </div>

        {/* Campo de observações do técnico */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Observações Técnicas Adicionais da Saída:
          </label>
          <textarea
            rows={2}
            value={observacoesTech}
            onChange={(e) => setObservacoesTech(e.target.value)}
            placeholder="Ex: Carga testada com carregador original 25W; tela substituída com touch 100% calibrado."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Botão de Encerramento e Gravação */}
        <div className="pt-2">
          <Button
            onClick={salvarNoBanco}
            disabled={salvandoDiagnostico || totalExecutados === 0}
            className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 gap-2"
          >
            {salvandoDiagnostico ? (
              "Sincronizando laudo com a OS..."
            ) : concluido ? (
              <>
                <Check className="h-4 w-4" /> Diagnóstico Sincronizado com a OS #{os.numero}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Finalizar e Gravar Diagnóstico na OS
              </>
            )}
          </Button>

          {concluido && (
            <p className="text-center text-xs text-emerald-400 mt-2 font-medium">
              ✓ Os resultados já estão armazenados e disponíveis no fechamento da ordem de serviço.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
