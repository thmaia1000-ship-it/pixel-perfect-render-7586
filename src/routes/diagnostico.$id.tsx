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
  Power,
  Maximize2,
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

interface PermissoesHardwareState {
  camera: "granted" | "denied" | "prompt" | "unsupported";
  microfone: "granted" | "denied" | "prompt" | "unsupported";
  audio: "ready" | "pending";
  sensores: "granted" | "denied" | "prompt" | "unsupported";
  vibracao: "supported" | "unsupported";
  solicitando: boolean;
}

interface BotaoSubKeyConfig {
  id: "vol_up" | "vol_down" | "power" | "assist";
  nome: string;
  teclaFisicaLabel: string;
  teclasEvent: string[];
  keyCodes: number[];
  freqAudio: number;
  corBg: string;
  corBorder: string;
  corText: string;
  corAtiva: string;
  corBadge: string;
  obrigatorio: boolean;
  instrucao: string;
  descricaoDica: string;
}

const BOTOES_SUB_KEY: BotaoSubKeyConfig[] = [
  {
    id: "vol_up",
    nome: "Volume (+)",
    teclaFisicaLabel: "Botão Aumentar Volume",
    teclasEvent: ["AudioVolumeUp", "VolumeUp", "+", "ArrowUp", "KeyW"],
    keyCodes: [24, 175, 38, 87, 107, 187], // 24: Android KEYCODE_VOLUME_UP, 175: Web VK_VOLUME_UP
    freqAudio: 880,
    corBg: "bg-blue-600 hover:bg-blue-500",
    corBorder: "border-blue-500",
    corText: "text-blue-400",
    corAtiva:
      "border-blue-500 bg-blue-500/20 text-blue-300 ring-2 ring-blue-500 shadow-lg shadow-blue-500/25",
    corBadge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    obrigatorio: true,
    instrucao: "Pressione a tecla física de VOLUME (+) na lateral do smartphone",
    descricaoDica: "Validação do botão mecânico de aumentar volume",
  },
  {
    id: "vol_down",
    nome: "Volume (-)",
    teclaFisicaLabel: "Botão Diminuir Volume",
    teclasEvent: ["AudioVolumeDown", "VolumeDown", "-", "ArrowDown", "KeyS"],
    keyCodes: [25, 174, 40, 83, 109, 189], // 25: Android KEYCODE_VOLUME_DOWN, 174: Web VK_VOLUME_DOWN
    freqAudio: 660,
    corBg: "bg-amber-600 hover:bg-amber-500",
    corBorder: "border-amber-500",
    corText: "text-amber-400",
    corAtiva:
      "border-amber-500 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500 shadow-lg shadow-amber-500/25",
    corBadge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    obrigatorio: true,
    instrucao: "Pressione a tecla física de VOLUME (-) na lateral do smartphone",
    descricaoDica: "Validação do botão mecânico de diminuir volume",
  },
  {
    id: "power",
    nome: "Power / Liga",
    teclaFisicaLabel: "Botão Power / Desbloqueio",
    teclasEvent: ["Power", "Sleep", "WakeUp", "KeyP"],
    keyCodes: [26, 182, 183, 80], // 26: Android KEYCODE_POWER, 182/183: Sleep
    freqAudio: 520,
    corBg: "bg-rose-600 hover:bg-rose-500",
    corBorder: "border-rose-500",
    corText: "text-rose-400",
    corAtiva:
      "border-rose-500 bg-rose-500/20 text-rose-300 ring-2 ring-rose-500 shadow-lg shadow-rose-500/25",
    corBadge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    obrigatorio: true,
    instrucao: "Pressione o botão POWER / LIGA do aparelho",
    descricaoDica: "Validação do clique físico e mecanismo do botão Power",
  },
  {
    id: "assist",
    nome: "Ação / Bixby",
    teclaFisicaLabel: "Botão Lateral de Ação ou Assistente",
    teclasEvent: ["LaunchAssistant", "F1", "F2", "Camera", "KeyA"],
    keyCodes: [27, 231, 112, 113, 65], // 27: Camera, 231: Assist, 112/113: F1/F2
    freqAudio: 1040,
    corBg: "bg-purple-600 hover:bg-purple-500",
    corBorder: "border-purple-500",
    corText: "text-purple-400",
    corAtiva:
      "border-purple-500 bg-purple-500/20 text-purple-300 ring-2 ring-purple-500 shadow-lg shadow-purple-500/25",
    corBadge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    obrigatorio: false,
    instrucao: "Pressione o botão extra (se disponível) ou avance se não possuir",
    descricaoDica: "Botão de Ação (iPhones recentes) ou tecla Bixby (Samsung)",
  },
];

// Total de células para cobrir 100% da tela edge-to-edge no teste de Touch (8 colunas x 15 linhas)
const TOTAL_CELULAS_TOUCH = 120;

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
  const [modoSequencial, setModoSequencial] = useState(false);

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
  const [touchGrid, setTouchGrid] = useState<boolean[]>(Array(TOTAL_CELULAS_TOUCH).fill(false));
  const [vibrandoAgora, setVibrandoAgora] = useState(false);
  const [somTocando, setSomTocando] = useState(false);
  const [sensorValues, setSensorValues] = useState<{ x: number; y: number; z: number } | null>(
    null,
  );
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [segundosRestantesMic, setSegundosRestantesMic] = useState(3);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [teclasDetectadas, setTeclasDetectadas] = useState<string[]>([]);
  // Estados da rotina interativa do Sub Key (Teclas Físicas)
  const [subKeyEtapaIndex, setSubKeyEtapaIndex] = useState<number>(0);
  const [subKeyStatus, setSubKeyStatus] = useState<
    Record<string, "pendente" | "aprovado" | "falha" | "ignorado">
  >({
    vol_up: "pendente",
    vol_down: "pendente",
    power: "pendente",
    assist: "pendente",
  });
  const subKeyStatusRef = useRef<Record<string, "pendente" | "aprovado" | "falha" | "ignorado">>({
    vol_up: "pendente",
    vol_down: "pendente",
    power: "pendente",
    assist: "pendente",
  });
  const [subKeyUltimaAcao, setSubKeyUltimaAcao] = useState<{
    botaoId: string;
    nome: string;
    status: "aprovado" | "falha" | "ignorado";
    mensagem: string;
    timestamp: number;
  } | null>(null);
  const [subKeyAnimando, setSubKeyAnimando] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervaloMicRef = useRef<any>(null);
  const touchContainerRef = useRef<HTMLDivElement | null>(null);
  const [emTelaCheiaTouch, setEmTelaCheiaTouch] = useState<boolean>(false);

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
          "Atenção: Seu navegador pode exigir que as permissões de câmera/microfone sejam liberadas no ícone do cadeado da barra de endereços.",
        );
      } else {
        toast.error("Permissões negadas. Ative o acesso nas configurações do navegador.");
      }
    }
  };

  // Controle de Tela Cheia Imersiva (Oculta barras de navegação e endereço do navegador)
  const solicitarTelaCheia = async (elemento?: HTMLElement | null) => {
    if (typeof document === "undefined") return;
    const el = (elemento || touchContainerRef.current || document.documentElement) as any;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: "hide" });
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      setEmTelaCheiaTouch(true);
    } catch {}
  };

  const sairTelaCheia = () => {
    if (typeof document === "undefined") return;
    const doc = document as any;
    try {
      if (
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      ) {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch {}
    setEmTelaCheiaTouch(false);
  };

  // Monitora alterações de tela cheia do navegador
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFs = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setEmTelaCheiaTouch(isFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Limpeza de recursos ao sair de teste
  const pararRecursosAtuais = () => {
    sairTelaCheia();
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

  // Beep sonoro curto e independente para cliques e feedback de botões
  const tocarBeepCurto = (freq: number = 880, duracaoMs: number = 130) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracaoMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duracaoMs / 1000);
    } catch {}
  };

  // Som comemorativo de finalização de Sub Key
  const tocarSucessoSubKey = () => {
    tocarBeepCurto(523.25, 120);
    setTimeout(() => tocarBeepCurto(659.25, 120), 130);
    setTimeout(() => tocarBeepCurto(783.99, 220), 260);
  };

  // Acionamento de botão na rotina de Sub Key (hardware ou toque de confirmação)
  const acionarBotaoSubKey = (
    botaoId: string,
    status: "aprovado" | "falha" | "ignorado" = "aprovado",
    origem: "hardware" | "toque" = "toque",
  ) => {
    const botaoCfg = BOTOES_SUB_KEY.find((b) => b.id === botaoId);
    if (!botaoCfg) return;

    if (status === "aprovado") {
      tocarBeepCurto(botaoCfg.freqAudio, 140);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(80);
        } catch {}
      }
      dispararRumbleAcustico(120);
      setSubKeyAnimando(true);
      setTimeout(() => setSubKeyAnimando(false), 450);
    } else if (status === "falha") {
      tocarBeepCurto(320, 200);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([100, 50, 100]);
        } catch {}
      }
    }

    setSubKeyStatus((prev) => {
      const next = { ...prev, [botaoId]: status };
      subKeyStatusRef.current = next;

      // Se todos os obrigatórios foram testados com aprovação
      const todosObrigOk =
        next.vol_up === "aprovado" && next.vol_down === "aprovado" && next.power === "aprovado";

      if (todosObrigOk) {
        tocarSucessoSubKey();
        toast.success("🎉 Todas as teclas físicas validadas com sucesso! Concluindo...", {
          duration: 2200,
        });
        setTimeout(() => {
          concluirRotinaSubKey("aprovado", next);
        }, 400);
      }

      return next;
    });

    setTeclasDetectadas((prev) => (prev.includes(botaoCfg.nome) ? prev : [...prev, botaoCfg.nome]));

    const msg =
      status === "aprovado"
        ? `${botaoCfg.nome}: Validado com sucesso (${origem === "hardware" ? "Tecla Física Detectada" : "Toque Sentido no Display"})!`
        : status === "falha"
          ? `${botaoCfg.nome}: Registrada falha mecânica/elétrica!`
          : `${botaoCfg.nome}: Botão ausente neste aparelho (ignorado).`;

    setSubKeyUltimaAcao({
      botaoId,
      nome: botaoCfg.nome,
      status,
      mensagem: msg,
      timestamp: Date.now(),
    });

    if (status === "aprovado") {
      toast.success(msg, { duration: 1500 });
    } else if (status === "falha") {
      toast.error(msg, { duration: 2200 });
    } else {
      toast.info(msg, { duration: 1500 });
    }

    // Avança automaticamente para o próximo botão pendente da rotina se o atual era o selecionado
    const currentIndex = BOTOES_SUB_KEY.findIndex((b) => b.id === botaoId);
    if (currentIndex < BOTOES_SUB_KEY.length - 1 && currentIndex === subKeyEtapaIndex) {
      setTimeout(() => {
        setSubKeyEtapaIndex(currentIndex + 1);
      }, 350);
    }
  };

  // Listener de teclas físicas (Sub Key) com suporte a Android (KeyCodes 24/25/26), iOS e Web
  useEffect(() => {
    if (testeAtivo !== "sub_key") return;

    const testarCorrespondenciaTecla = (e: KeyboardEvent) => {
      const key = (e.key || "").toLowerCase();
      const code = (e.code || "").toLowerCase();
      const keyCode = e.keyCode || e.which;

      // 1. Volume Up
      if (
        keyCode === 24 || // Android KEYCODE_VOLUME_UP
        keyCode === 175 || // VK_VOLUME_UP
        keyCode === 38 || // ArrowUp
        keyCode === 87 || // KeyW
        keyCode === 107 ||
        keyCode === 187 ||
        key === "audiovolumeup" ||
        key === "volumeup" ||
        key === "+" ||
        code === "audiovolumeup" ||
        code === "arrowup"
      ) {
        e.preventDefault();
        acionarBotaoSubKey("vol_up", "aprovado", "hardware");
        return;
      }

      // 2. Volume Down
      if (
        keyCode === 25 || // Android KEYCODE_VOLUME_DOWN
        keyCode === 174 || // VK_VOLUME_DOWN
        keyCode === 40 || // ArrowDown
        keyCode === 83 || // KeyS
        keyCode === 109 ||
        keyCode === 189 ||
        key === "audiovolumedown" ||
        key === "volumedown" ||
        key === "-" ||
        code === "audiovolumedown" ||
        code === "arrowdown"
      ) {
        e.preventDefault();
        acionarBotaoSubKey("vol_down", "aprovado", "hardware");
        return;
      }

      // 3. Power / Sleep
      if (
        keyCode === 26 || // Android KEYCODE_POWER
        keyCode === 182 ||
        keyCode === 183 ||
        keyCode === 80 || // KeyP
        key === "power" ||
        key === "sleep" ||
        key === "wakeup" ||
        code === "power"
      ) {
        e.preventDefault();
        acionarBotaoSubKey("power", "aprovado", "hardware");
        return;
      }

      // 4. Assist / Bixby / Camera
      if (
        keyCode === 27 || // KEYCODE_CAMERA
        keyCode === 231 || // KEYCODE_ASSIST
        keyCode === 112 || // F1
        keyCode === 113 || // F2
        keyCode === 65 || // KeyA
        key === "launchassistant" ||
        key === "camera" ||
        code === "launchassistant"
      ) {
        e.preventDefault();
        acionarBotaoSubKey("assist", "aprovado", "hardware");
        return;
      }

      // 5. Se bater com a lista configurada de qualquer botão
      const botaoEncontrado = BOTOES_SUB_KEY.find(
        (b) =>
          b.keyCodes.includes(keyCode) ||
          b.teclasEvent.some((te) => te.toLowerCase() === key || te.toLowerCase() === code),
      );

      if (botaoEncontrado) {
        e.preventDefault();
        acionarBotaoSubKey(botaoEncontrado.id, "aprovado", "hardware");
      }
    };

    window.addEventListener("keydown", testarCorrespondenciaTecla, {
      capture: true,
      passive: false,
    });
    window.addEventListener("keyup", testarCorrespondenciaTecla, { capture: true, passive: false });
    document.addEventListener("keydown", testarCorrespondenciaTecla, {
      capture: true,
      passive: false,
    });
    document.addEventListener("keyup", testarCorrespondenciaTecla, {
      capture: true,
      passive: false,
    });

    // Detecção física do botão Power através do ciclo de tela desligada / ligada
    let telaApagouNoPower = false;
    const handleVisibilidadePower = () => {
      if (document.visibilityState === "hidden") {
        telaApagouNoPower = true;
      } else if (document.visibilityState === "visible" && telaApagouNoPower) {
        telaApagouNoPower = false;
        acionarBotaoSubKey("power", "aprovado", "hardware");
        toast.success("Botão físico Power / Liga detectado com sucesso pelo ciclo de tela!", {
          duration: 2500,
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilidadePower);

    return () => {
      window.removeEventListener("keydown", testarCorrespondenciaTecla, { capture: true } as any);
      window.removeEventListener("keyup", testarCorrespondenciaTecla, { capture: true } as any);
      document.removeEventListener("keydown", testarCorrespondenciaTecla, { capture: true } as any);
      document.removeEventListener("keyup", testarCorrespondenciaTecla, { capture: true } as any);
      document.removeEventListener("visibilitychange", handleVisibilidadePower);
    };
  }, [testeAtivo, subKeyEtapaIndex]);

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

  // Dispara oscilação acústico-háptica em sub-grave (55Hz)
  // Faz o chassis e membranas dos transdutores vibrarem mecanicamente (funciona em iOS Safari e Android)
  const dispararRumbleAcustico = (duracaoMs: number = 350) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // 55Hz (nota Lá1) ressoa fortemente no hardware de autofalantes de smartphones
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(55, ctx.currentTime);
      gain.gain.setValueAtTime(0.85, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + Math.min(duracaoMs, 1200) / 1000,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + Math.min(duracaoMs, 1200) / 1000);
    } catch {}
  };

  // Vibração com padrões variados (suporte aprimorado para Android, iOS e Web)
  const acionarVibracao = (padrao: number | number[] = [400, 200, 400, 200, 600]) => {
    const duracaoTotal = Array.isArray(padrao) ? padrao.reduce((acc, v) => acc + v, 0) : padrao;

    setVibrandoAgora(true);
    setTimeout(
      () => {
        setVibrandoAgora(false);
      },
      Math.max(duracaoTotal, 350),
    );

    let vibrouHardware = false;

    // 1. Tenta acionamento nativo via navigator.vibrate (Android Chrome / Webview)
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(0); // Reseta qualquer ciclo anterior em execução
        if (Array.isArray(padrao)) {
          vibrouHardware = navigator.vibrate(padrao);
          if (!vibrouHardware && padrao.length === 1) {
            vibrouHardware = navigator.vibrate(padrao[0]);
          }
        } else {
          vibrouHardware = navigator.vibrate(padrao);
        }
      } catch (e) {
        console.warn("Erro ao invocar navigator.vibrate:", e);
      }
    }

    // 2. Dispara ressonância acústico-háptica de 55Hz (faz o celular e a mão vibrarem em iOS/Android)
    dispararRumbleAcustico(duracaoTotal);

    if (vibrouHardware) {
      toast.success("Vibração do motor acionada com sucesso!", { duration: 1800 });
    } else {
      toast.info("Pulso de vibração e ressonância disparado no aparelho!", { duration: 1800 });
    }
  };

  // Lógica de rastreamento do Touch Screen em tela cheia com auto-conclusão
  const marcarCelulaTouch = (index: number) => {
    if (index < 0 || index >= TOTAL_CELULAS_TOUCH) return;
    setTouchGrid((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;

      // Micro-beep leve ao preencher a célula para feedback tátil/sonoro contínuo
      tocarBeepCurto(480 + (index % 16) * 45, 30);

      // Checa se todas as células do display foram preenchidas (100% da tela)
      if (next.every(Boolean)) {
        tocarSucessoSubKey();
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate([150, 80, 250]);
          } catch {}
        }
        toast.success("✨ Touch 100% calibrado e aprovado com sucesso!");
        setTimeout(() => {
          gravarResultado("touch", "aprovado");
        }, 280);
      }
      return next;
    });
  };

  const processarCoordenadaTouch = (clientX: number, clientY: number) => {
    // 1. Tenta acionar modo tela cheia caso o navegador tenha exigido gesto de toque direto
    if (typeof document !== "undefined") {
      const doc = document as any;
      if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
        solicitarTelaCheia(touchContainerRef.current);
      }
    }

    // 2. Cálculo geométrico exato relativo à tela inteira (alcança 100% dos 4 cantos e bordas)
    if (touchContainerRef.current) {
      const rect = touchContainerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        // Clampa entre 0 e rect.width / rect.height para cobrir bordas e cantos extremos
        const col = Math.min(7, Math.max(0, Math.floor((relX / rect.width) * 8)));
        const row = Math.min(14, Math.max(0, Math.floor((relY / rect.height) * 15)));
        const index = row * 8 + col;
        marcarCelulaTouch(index);
        return;
      }
    }

    // 3. Fallback de elemento sob o ponteiro
    const el = document.elementFromPoint(clientX, clientY);
    const idxAttr = el?.getAttribute("data-cell-touch");
    if (idxAttr !== null && idxAttr !== undefined) {
      marcarCelulaTouch(Number(idxAttr));
    }
  };

  // Efeito dedicado ao teste de touch: solicita tela cheia e bloqueia rolagem e overscroll da página
  useEffect(() => {
    if (testeAtivo === "touch") {
      solicitarTelaCheia(touchContainerRef.current);
      const originalOverflow = document.body.style.overflow;
      const originalOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.overscrollBehavior = originalOverscroll;
        sairTelaCheia();
      };
    }
  }, [testeAtivo]);

  // Iniciar Câmera (Frontal ou Traseira) com suporte a múltiplos dispositivos
  const iniciarCamera = async (facingMode: "user" | "environment") => {
    pararRecursosAtuais();

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error(
        "Acesso à câmera indisponível neste navegador. Em redes locais, certifique-se de liberar as permissões no cadeado da barra de endereço.",
      );
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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
          : `Acesso à câmera indisponível: ${e?.message || "permissão negada"}`,
      );
    }
  };

  // Teste de Gravação de Microfone com suporte a Android e iOS
  const iniciarGravacaoMic = async () => {
    pararRecursosAtuais();
    setAudioUrl(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error(
        "Acesso ao microfone indisponível. Libere o acesso no ícone de configurações/cadeado da barra de endereços.",
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
          : `Não foi possível acessar o microfone: ${e?.message || "bloqueado"}`,
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

  // Registra status de um teste com suporte a fluxo sequencial automático
  const gravarResultado = (
    id: TesteHardwareId,
    status: "aprovado" | "reprovado" | "ignorado",
    detalhes?: string,
  ) => {
    pararRecursosAtuais();
    setResultados((prev) => ({
      ...prev,
      [id]: {
        id,
        status,
        dataHora: new Date().toISOString(),
        ...(detalhes ? { detalhes } : {}),
      },
    }));

    if (modoSequencial) {
      const currentIndex = LISTA_TESTES_HARDWARE.findIndex((item) => item.id === id);
      const nextItem = LISTA_TESTES_HARDWARE[currentIndex + 1];

      if (nextItem) {
        toast.info(
          `Teste ${status === "aprovado" ? "aprovado" : "registrado"}! Próximo: ${nextItem.titulo}...`,
          {
            duration: 1600,
          },
        );
        setTimeout(() => {
          abrirTeste(nextItem.id);
        }, 350);
      } else {
        setModoSequencial(false);
        setTesteAtivo(null);
        toast.success("🎉 Bateria completa de testes finalizada com sucesso!", {
          duration: 3500,
        });
      }
    } else {
      setTesteAtivo(null);
    }
  };

  // Iniciar bateria sequencial completa de testes
  const iniciarBateriaSequencial = () => {
    setModoSequencial(true);
    // Inicia pelo primeiro teste pendente, ou reinicia do início
    const pendente = LISTA_TESTES_HARDWARE.find((item) => !resultados[item.id]);
    const testeParaIniciar = pendente ? pendente.id : LISTA_TESTES_HARDWARE[0].id;
    abrirTeste(testeParaIniciar);
  };

  // Pular teste atual no modo sequencial
  const pularParaProximo = () => {
    if (!testeAtivo) return;
    const currentIndex = LISTA_TESTES_HARDWARE.findIndex((item) => item.id === testeAtivo);
    const nextItem = LISTA_TESTES_HARDWARE[currentIndex + 1];
    if (nextItem) {
      toast.info(`Pulando para: ${nextItem.titulo}`, { duration: 1200 });
      abrirTeste(nextItem.id);
    } else {
      setModoSequencial(false);
      pararRecursosAtuais();
      setTesteAtivo(null);
      toast.info("Você chegou ao final da bateria de testes.");
    }
  };

  // Finalização da rotina guiada do Sub Key
  const concluirRotinaSubKey = (
    statusFinal?: "aprovado" | "reprovado",
    mapaStatus?: Record<string, "pendente" | "aprovado" | "falha" | "ignorado">,
  ) => {
    const statusAtual = mapaStatus || subKeyStatusRef.current;
    const partesDetalhes: string[] = [];
    BOTOES_SUB_KEY.forEach((b) => {
      const st = statusAtual[b.id];
      if (st === "aprovado") partesDetalhes.push(`${b.nome}: OK`);
      else if (st === "falha") partesDetalhes.push(`${b.nome}: FALHA`);
      else if (st === "ignorado") partesDetalhes.push(`${b.nome}: N/A`);
      else if (b.obrigatorio) partesDetalhes.push(`${b.nome}: Pendente`);
    });

    const temFalhaObrigatoria =
      statusAtual.vol_up === "falha" ||
      statusAtual.vol_down === "falha" ||
      statusAtual.power === "falha";

    const statusEfetivo = statusFinal ?? (temFalhaObrigatoria ? "reprovado" : "aprovado");
    const detalhesTexto = partesDetalhes.join(" · ");

    if (statusEfetivo === "aprovado") {
      tocarSucessoSubKey();
    }

    gravarResultado("sub_key", statusEfetivo, detalhesTexto);
    toast.success(
      statusEfetivo === "aprovado"
        ? "Sub Key aprovado! Registrado no laudo da OS."
        : "Sub Key finalizado com falhas registradas.",
    );
  };

  // Aprovação expressa de todas as teclas físicas com 1 clique
  const aprovarTodosBotoesSubKey = () => {
    tocarSucessoSubKey();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([100, 50, 150]);
      } catch {}
    }
    dispararRumbleAcustico(200);

    const statusAprovado: Record<string, "pendente" | "aprovado" | "falha" | "ignorado"> = {
      vol_up: "aprovado",
      vol_down: "aprovado",
      power: "aprovado",
      assist: "aprovado",
    };
    subKeyStatusRef.current = statusAprovado;
    setSubKeyStatus(statusAprovado);
    setTeclasDetectadas(["Volume (+)", "Volume (-)", "Power / Liga", "Ação / Bixby"]);
    toast.success("✨ Todas as teclas físicas foram aprovadas com sucesso!", { duration: 2000 });

    setTimeout(() => {
      concluirRotinaSubKey("aprovado", statusAprovado);
    }, 300);
  };

  // Inicializa o teste selecionado
  const abrirTeste = (item: TesteHardwareId) => {
    pararRecursosAtuais();
    setTesteAtivo(item);

    if (item === "touch") {
      setTouchGrid(Array(TOTAL_CELULAS_TOUCH).fill(false));
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
      setSubKeyEtapaIndex(0);
      setSubKeyStatus({
        vol_up: "pendente",
        vol_down: "pendente",
        power: "pendente",
        assist: "pendente",
      });
      setSubKeyUltimaAcao(null);
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
                As ordens de serviço e laudos de hardware da BR3 Tech são restritos. Entre com sua
                conta no celular para carregar o equipamento e salvar o checklist de saída.
              </p>
            </div>
            <div className="pt-2 space-y-2">
              <Button
                asChild
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 gap-2 shadow-lg shadow-primary/20"
              >
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
              💡 <strong>Dica:</strong> No computador, no modal de encerramento da OS, marque a
              opção <em>"Login Automático via QR Code"</em> para entrar no celular sem precisar
              digitar sua senha!
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
  const proximoPendente = LISTA_TESTES_HARDWARE.find((item) => !resultados[item.id]);
  const activeTestIndex = testeAtivo
    ? LISTA_TESTES_HARDWARE.findIndex((item) => item.id === testeAtivo)
    : -1;
  const activeTestConfig = testeAtivo
    ? LISTA_TESTES_HARDWARE.find((item) => item.id === testeAtivo)
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-primary/30">
      {/* ========================================================================= */}
      {/* TELA CHEIA / EXECUÇÃO DO TESTE ATIVO (*#0*# EXPERIENCE)                   */}
      {/* ========================================================================= */}
      {testeAtivo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white h-[100dvh] max-h-[100dvh] overflow-hidden">
          {/* BARRA SUPERIOR DE CONTROLE E PROGRESSO SEQUENCIAL */}
          {testeAtivo !== "touch" && (
            <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3.5 py-2 flex items-center justify-between text-xs z-50 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-[10px] bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded font-black">
                  {activeTestIndex + 1}/{totalTestes}
                </span>
                <span className="font-bold text-white truncate text-xs">
                  {activeTestConfig?.titulo}
                </span>
                {modoSequencial && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Sequencial
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {modoSequencial && activeTestIndex < totalTestes - 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={pularParaProximo}
                    className="text-slate-300 hover:text-white h-7 px-2 text-[11px] font-medium"
                  >
                    Pular <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    setModoSequencial(false);
                    pararRecursosAtuais();
                    setTesteAtivo(null);
                  }}
                  className="text-slate-400 hover:text-white h-7 px-2 text-[11px]"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Sair
                </Button>
              </div>
            </div>
          )}
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

              <div className="flex gap-4 pb-6 w-full max-w-sm shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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

          {/* 2. TESTE DE TOUCH GRID EM TELA INTEIRA (EDGE-TO-EDGE COM AUTO-CONCLUSÃO) */}
          {testeAtivo === "touch" && (
            <div
              ref={touchContainerRef}
              className="fixed inset-0 z-[99999] bg-black touch-none select-none flex flex-col overflow-hidden w-screen h-screen h-[100dvh] w-[100dvw] m-0 p-0"
              style={{
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                minHeight: "100dvh",
                maxHeight: "100dvh",
                overscrollBehavior: "none",
                touchAction: "none",
              }}
              onPointerDown={(e) => {
                processarCoordenadaTouch(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (e.buttons > 0 || e.pointerType === "touch") {
                  processarCoordenadaTouch(e.clientX, e.clientY);
                }
              }}
              onTouchStart={(e) => {
                for (let i = 0; i < e.touches.length; i++) {
                  processarCoordenadaTouch(e.touches[i].clientX, e.touches[i].clientY);
                }
              }}
              onTouchMove={(e) => {
                for (let i = 0; i < e.touches.length; i++) {
                  processarCoordenadaTouch(e.touches[i].clientX, e.touches[i].clientY);
                }
              }}
            >
              {/* GRADE DE 120 QUADRADOS (8 COLUNAS X 15 LINHAS) PREENCHENDO 100% DA TELA ATÉ OS CANTOS */}
              <div className="w-full h-full grid grid-cols-8 grid-rows-[repeat(15,minmax(0,1fr))] gap-[1px] p-0 m-0 bg-black">
                {touchGrid.map((preenchido, idx) => (
                  <div
                    key={idx}
                    data-cell-touch={idx}
                    onPointerEnter={(e) => {
                      if (e.buttons > 0) marcarCelulaTouch(idx);
                    }}
                    className={`w-full h-full transition-colors duration-75 border ${
                      preenchido
                        ? "bg-emerald-500 border-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.8)]"
                        : "bg-slate-950 border-slate-800/60 active:bg-emerald-500/50"
                    }`}
                  />
                ))}
              </div>

              {/* HUD CENTRAL FLUTUANTE (NÃO COBRE NENHUM CANTO NEM BORDA DA TELA) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none z-20">
                <div className="bg-black/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-2xl shadow-black/95">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white tracking-wide">
                    TOUCH: {touchGrid.filter(Boolean).length}/{TOTAL_CELULAS_TOUCH} (
                    {Math.round((touchGrid.filter(Boolean).length / TOTAL_CELULAS_TOUCH) * 100)}%)
                  </span>
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                  {!emTelaCheiaTouch && (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => solicitarTelaCheia(touchContainerRef.current)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground border border-primary/40 text-[11px] font-bold h-7 px-3 rounded-full shadow-lg"
                    >
                      <Maximize2 className="h-3 w-3 mr-1" /> Tela Cheia
                    </Button>
                  )}

                  <Button
                    size="sm"
                    type="button"
                    onClick={() =>
                      gravarResultado(
                        "touch",
                        "reprovado",
                        "Zona morta / falha no digitalizador de toque",
                      )
                    }
                    className="bg-rose-900/85 hover:bg-rose-800 text-rose-200 border border-rose-700/60 text-[11px] font-bold h-7 px-3 rounded-full shadow-lg"
                  >
                    <X className="h-3 w-3 mr-1" /> Reprovar
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setModoSequencial(false);
                      pararRecursosAtuais();
                      setTesteAtivo(null);
                    }}
                    className="bg-slate-900/85 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-[11px] h-7 px-3 rounded-full shadow-lg"
                  >
                    Sair
                  </Button>
                </div>
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
                  {testeAtivo === "receiver"
                    ? "Receiver (Auricular de Chamada)"
                    : "Speaker (Alto-falante Viva-voz)"}
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

              <div className="flex gap-4 pb-6 w-full max-w-sm shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
                  <Radio
                    className={`h-10 w-10 text-red-500 ${gravandoAudio ? "animate-ping" : ""}`}
                  />
                  {gravandoAudio && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
                      {segundosRestantesMic}s
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-black uppercase">Microfone (Gravação & Loopback)</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Grave um áudio de voz ("1, 2, 3 testando") e ouça a reprodução para certificar a
                    captação limpa.
                  </p>
                </div>

                {permissoes.microfone === "denied" && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300 text-left space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      Permissão de microfone negada no navegador
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Toque no ícone de cadeado/ajustes no topo da tela do navegador, acesse{" "}
                      <strong>Permissões</strong> e marque <strong>Microfone</strong> como{" "}
                      <em>Permitir</em>.
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

              <div className="flex gap-4 pb-6 w-full max-w-sm shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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
            <div className="flex-1 flex flex-col bg-black min-h-0 relative overflow-hidden justify-between">
              {/* Barra superior de status da Câmera */}
              <div className="p-2 sm:p-2.5 text-center bg-slate-950/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      {testeAtivo === "camera_front"
                        ? "Front Cam (Câmera Frontal)"
                        : "Mega Cam (Câmera Traseira)"}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {testeAtivo === "camera_front"
                        ? "Sensor frontal de selfie"
                        : "Sensor principal traseiro com foco"}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    iniciarCamera(testeAtivo === "camera_front" ? "user" : "environment")
                  }
                  className="h-8 text-[11px] border-slate-700 bg-slate-900 text-slate-200 gap-1.5 hover:bg-slate-850 hover:text-white px-2.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reconectar</span>
                </Button>
              </div>

              {/* Visor da Câmera com altura controlada para não empurrar os botões */}
              <div className="flex-1 min-h-0 max-h-[56vh] relative flex items-center justify-center overflow-hidden bg-black p-2.5">
                {permissoes.camera === "denied" ? (
                  <div className="max-w-xs text-center p-6 bg-slate-900/90 rounded-2xl border border-rose-500/40 text-rose-300 space-y-2">
                    <AlertTriangle className="h-8 w-8 mx-auto text-rose-400" />
                    <h4 className="font-bold text-sm text-white">Permissão de Câmera Bloqueada</h4>
                    <p className="text-xs text-slate-400">
                      Libere o acesso da câmera nas configurações ou ícone de cadeado do navegador
                      para exibir o visor.
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
                  <div
                    onClick={() => gravarResultado(testeAtivo, "aprovado")}
                    className="w-full h-full relative rounded-2xl overflow-hidden flex items-center justify-center bg-slate-950 border-2 border-slate-800 shadow-2xl cursor-pointer group"
                    title="Toque na imagem para confirmar OK"
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-contain"
                    />

                    {/* Alvo guia de foco central no visor */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
                      <div className="w-24 h-24 border-2 border-dashed border-white rounded-2xl" />
                    </div>

                    {/* Pill informativo de toque rápido no visor */}
                    <div className="absolute bottom-2.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[10px] text-slate-300 pointer-events-none shadow-md">
                      Toque no visor ou no botão abaixo
                    </div>
                  </div>
                )}
              </div>

              {/* PAINEL DE CONTROLE E APROVAÇÃO COM ALTURA E ESPAÇAMENTO GENEROSOS */}
              <div className="p-4 bg-slate-950/98 backdrop-blur-lg border-t border-slate-800 shrink-0 z-30 shadow-2xl space-y-2.5 pb-[max(2.75rem,env(safe-area-inset-bottom)+1.5rem))]">
                {/* Botão Principal de Aprovação (Grande, Amplo e Impossível de Errar) */}
                <Button
                  type="button"
                  onClick={() => gravarResultado(testeAtivo, "aprovado")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black h-14 text-sm sm:text-base tracking-wide uppercase shadow-xl shadow-emerald-950/80 rounded-2xl flex items-center justify-center gap-2"
                >
                  <Check className="h-6 w-6" />
                  <span>Imagem Nítida e Foco OK</span>
                </Button>

                {/* Linha Secundária: Falha ou Alternar/Reconectar */}
                <div className="flex gap-2.5">
                  <Button
                    type="button"
                    onClick={() => gravarResultado(testeAtivo, "reprovado")}
                    variant="destructive"
                    className="flex-1 font-bold h-11 text-xs shadow-md shadow-rose-950/50 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    <span>Falha na Câmera</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      iniciarCamera(testeAtivo === "camera_front" ? "user" : "environment")
                    }
                    className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-semibold h-11 px-3.5 rounded-xl gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reconectar</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 6. VIBRAÇÃO & HÁPTICO */}
          {testeAtivo === "vibration" && (
            <div className="flex-1 flex flex-col items-center justify-between p-6 bg-slate-950 text-center">
              <div className="pt-6 space-y-4 max-w-sm w-full">
                <div
                  className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                    vibrandoAgora
                      ? "bg-amber-500/40 border-4 border-amber-400 ring-8 ring-amber-500/30 scale-110 shadow-2xl shadow-amber-500/50 animate-bounce"
                      : "bg-amber-500/20 border-2 border-amber-500"
                  }`}
                >
                  <Vibrate
                    className={`h-12 w-12 text-amber-400 ${vibrandoAgora ? "animate-pulse" : ""}`}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase text-white">
                    Vibration (Motor de Vibração)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sinta a resposta mecânica e tátil do aparelho clicando nos padrões de teste
                    abaixo:
                  </p>
                </div>

                {vibrandoAgora && (
                  <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold py-1.5 px-3 rounded-lg animate-pulse flex items-center justify-center gap-1.5 shadow-md">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    MOTOR ACIONADO — VIBRANDO AGORA...
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Button
                    type="button"
                    onClick={() => acionarVibracao([350])}
                    variant="outline"
                    className="border-amber-500/60 bg-amber-950/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold h-12 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  >
                    <span>Pulso Curto</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">350 ms</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => acionarVibracao([700])}
                    variant="outline"
                    className="border-amber-500/60 bg-amber-950/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold h-12 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  >
                    <span>Pulso Longo</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">700 ms</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => acionarVibracao([200, 100, 200, 100, 450])}
                    variant="outline"
                    className="border-amber-500/60 bg-amber-950/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold h-12 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  >
                    <span>Padrão Triplo</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">Ritmo Háptico</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => acionarVibracao([1000])}
                    variant="outline"
                    className="border-amber-500/60 bg-amber-950/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold h-12 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  >
                    <span>Contínuo</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">1 segundo</span>
                  </Button>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-left space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <span>💡 Resposta Háptica & Mecânica Integrada</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Dispara o motor de vibração físico e, simultaneamente, oscilação de ressonância
                    mecânica de 55Hz (sub-grave) nos transdutores de áudio, permitindo sentir a
                    vibração física até mesmo em navegadores iOS (Apple Safari).
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <Button
                  onClick={() => gravarResultado("vibration", "aprovado")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold h-12 shadow-lg shadow-emerald-950/60"
                >
                  <Check className="h-5 w-5 mr-1" /> Vibrou Firme
                </Button>
                <Button
                  onClick={() => gravarResultado("vibration", "reprovado")}
                  variant="destructive"
                  className="flex-1 font-bold h-12 shadow-lg shadow-rose-950/60 active:scale-95"
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
                <h2 className="text-xl font-black uppercase">
                  Dimming (Transição de Luminosidade)
                </h2>
                <p className="text-xs text-slate-300">
                  Teste o gradiente de iluminação do display, verificando se há cintilação ou
                  flickering.
                </p>
              </div>

              <div className="flex gap-4 pb-6 w-full max-w-sm shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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

              <div className="flex gap-4 pb-6 w-full max-w-sm shrink-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
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

          {/* 9. SUB KEY (ROTINA INTERATIVA DE TESTE DE BOTÕES FÍSICOS *#0*#) */}
          {testeAtivo === "sub_key" &&
            (() => {
              const todosObrigatoriosTestados =
                subKeyStatus.vol_up === "aprovado" &&
                subKeyStatus.vol_down === "aprovado" &&
                subKeyStatus.power === "aprovado";
              const totalAprovados = Object.values(subKeyStatus).filter(
                (s) => s === "aprovado",
              ).length;

              return (
                <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-6 bg-slate-950 text-white overflow-y-auto select-none">
                  {/* Cabeçalho do Teste com Ação Expressa */}
                  <div className="space-y-3 max-w-md mx-auto w-full pt-1">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <KeyRound className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                            <span>Sub Key (Teclas Físicas)</span>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">
                              *#0*#
                            </span>
                          </h2>
                          <p className="text-[11px] text-slate-400">
                            Pressione as teclas físicas ou toque nos botões na tela
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => setTesteAtivo(null)}
                        className="text-slate-400 hover:text-white h-8 px-2"
                      >
                        <X className="h-4 w-4 mr-1" /> Sair
                      </Button>
                    </div>

                    {/* BOTÃO MESTRE DE APROVAÇÃO EXPRESSA (1 CLIQUE) */}
                    <Button
                      type="button"
                      onClick={aprovarTodosBotoesSubKey}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black h-12 rounded-xl shadow-lg shadow-emerald-950/70 border border-emerald-400/40 text-xs sm:text-sm tracking-wide uppercase flex items-center justify-center gap-2 transition-transform cursor-pointer"
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                      <span>Validar Todas as Teclas (100% OK)</span>
                    </Button>

                    {/* Contador de Progresso */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                        Progresso das Teclas:
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {totalAprovados} de {BOTOES_SUB_KEY.length} Teclas Testadas
                      </span>
                    </div>

                    {/* CARDS GRANDES DE TESTE DE TOQUE IMEDIATO PARA CADA BOTÃO */}
                    <div className="space-y-2.5 pt-1">
                      {BOTOES_SUB_KEY.map((b) => {
                        const status = subKeyStatus[b.id];
                        const isAprovado = status === "aprovado";
                        const isFalha = status === "falha";

                        return (
                          <div
                            key={b.id}
                            onClick={() => acionarBotaoSubKey(b.id, "aprovado", "toque")}
                            className={`group rounded-2xl border-2 p-3.5 transition-all cursor-pointer select-none active:scale-[0.98] ${
                              isAprovado
                                ? "bg-emerald-950/60 border-emerald-500/80 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/60"
                                : isFalha
                                  ? "bg-rose-950/60 border-rose-500/80 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/60"
                                  : `${b.corBorder} bg-slate-900/90 shadow-md hover:border-slate-500 hover:bg-slate-800/80`
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              {/* Informações do Botão */}
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-black shrink-0 ${
                                    isAprovado
                                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40"
                                      : isFalha
                                        ? "bg-rose-600 text-white"
                                        : `${b.corBg} text-white`
                                  }`}
                                >
                                  {b.id === "vol_up" && <Volume2 className="h-5 w-5" />}
                                  {b.id === "vol_down" && <Volume1 className="h-5 w-5" />}
                                  {b.id === "power" && <Power className="h-5 w-5" />}
                                  {b.id === "assist" && <Sparkles className="h-5 w-5" />}
                                </div>

                                <div className="text-left">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-sm text-white">{b.nome}</h4>
                                    {!b.obrigatorio && (
                                      <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                        Opcional
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-300">
                                    {isAprovado
                                      ? "✓ Tecla validada com sucesso"
                                      : isFalha
                                        ? "✕ Registrado defeito físico"
                                        : b.teclaFisicaLabel}
                                  </p>
                                </div>
                              </div>

                              {/* Badge de Toque e Validação Direta */}
                              <div
                                className={`h-10 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shrink-0 ${
                                  isAprovado
                                    ? "bg-emerald-500 text-white shadow-emerald-500/40 ring-2 ring-emerald-300"
                                    : isFalha
                                      ? "bg-rose-700 text-white"
                                      : `${b.corBg} text-white shadow-lg ring-2 ring-white/20 animate-pulse group-hover:scale-105`
                                }`}
                              >
                                {isAprovado ? (
                                  <>
                                    <Check className="h-4 w-4" />
                                    <span>OK</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                                    <span>VALIDAR</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Ações Secundárias (Marcar Falha ou Ignorar se Opcional) */}
                            <div className="flex items-center justify-end gap-3 mt-2.5 pt-2 border-t border-slate-800/80">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acionarBotaoSubKey(b.id, "falha", "toque");
                                }}
                                className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium flex items-center gap-1 p-0.5 cursor-pointer"
                              >
                                <AlertTriangle className="h-3 w-3" /> Registrar Falha no Botão
                              </button>

                              {!b.obrigatorio && status !== "ignorado" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    acionarBotaoSubKey(b.id, "ignorado", "toque");
                                  }}
                                  className="text-[11px] text-slate-400 hover:text-slate-300 underline font-medium p-0.5 cursor-pointer"
                                >
                                  Aparelho sem este botão (Pular)
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-slate-400 text-center leading-tight pt-1">
                      💡 Dica: Pressione o botão físico no celular ou toque em qualquer um dos cards
                      acima para validar a tecla instantaneamente.
                    </p>
                  </div>

                  {/* BARRA DE CONCLUSÃO / APROVAÇÃO NO RODAPÉ */}
                  <div className="pt-3 pb-2 max-w-md mx-auto w-full space-y-2 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {todosObrigatoriosTestados && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs text-center font-bold animate-in fade-in flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Todas as teclas obrigatórias aprovadas!</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          if (todosObrigatoriosTestados) {
                            concluirRotinaSubKey("aprovado");
                          } else {
                            aprovarTodosBotoesSubKey();
                          }
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold h-12 shadow-lg shadow-emerald-950/60 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="h-5 w-5" />
                        <span>
                          {todosObrigatoriosTestados
                            ? "Concluir Sub Key (Aprovado)"
                            : "Aprovar e Avançar"}
                        </span>
                      </Button>

                      <Button
                        type="button"
                        onClick={() => concluirRotinaSubKey("reprovado")}
                        variant="destructive"
                        className="px-4 font-bold h-12 shadow-lg shadow-rose-950/60 rounded-xl cursor-pointer"
                      >
                        <X className="h-5 w-5 mr-1" /> Falha
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSubKeyEtapaIndex(0);
                          const resetStatus: Record<
                            string,
                            "pendente" | "aprovado" | "falha" | "ignorado"
                          > = {
                            vol_up: "pendente",
                            vol_down: "pendente",
                            power: "pendente",
                            assist: "pendente",
                          };
                          subKeyStatusRef.current = resetStatus;
                          setSubKeyStatus(resetStatus);
                          setTeclasDetectadas([]);
                          setSubKeyUltimaAcao(null);
                          toast.info("Rotina Sub Key reiniciada.");
                        }}
                        className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 px-3 h-12 rounded-xl cursor-pointer"
                        title="Reiniciar rotina"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
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
                  Libere o acesso da câmera, microfone e áudio para os testes funcionarem sem
                  bloqueios no dispositivo.
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
                  Toque no <strong>ícone de ajustes/cadeado</strong> ao lado do endereço no topo do
                  navegador (Chrome ou Safari), selecione <strong>Permissões</strong> e marque{" "}
                  <strong>Câmera</strong> e <strong>Microfone</strong> como <em>Permitir</em>.
                </p>
              </div>
            </div>
          )}
        </div>
        {/* Card Principal: Iniciar Bateria Sequencial de Testes */}
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-slate-900 to-slate-950 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-md shadow-primary/30 shrink-0">
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Bateria de Testes</span>
                  <span className="text-[10px] bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.2 rounded font-mono font-bold">
                    *#0*#
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300">
                  {totalExecutados === 0
                    ? "Inicie a bateria de testes sequencial contínua de ponta a ponta."
                    : `${totalExecutados} de ${totalTestes} testes concluídos (${totalAprovados} OK, ${totalReprovados} Falhas).`}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs font-black text-emerald-400">
              {Math.round((totalExecutados / totalTestes) * 100)}%
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/60">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${Math.max(totalExecutados > 0 ? 5 : 0, Math.round((totalExecutados / totalTestes) * 100))}%`,
              }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={iniciarBateriaSequencial}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm tracking-wide uppercase shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4 fill-current" />
              {totalExecutados === 0
                ? "Iniciar Teste"
                : totalExecutados >= totalTestes
                  ? "Reiniciar Bateria Completa"
                  : `Continuar Teste (${proximoPendente?.titulo || "Próximo"})`}
            </Button>

            {totalExecutados > 0 && totalExecutados < totalTestes && (
              <Button
                type="button"
                onClick={() => {
                  setModoSequencial(true);
                  abrirTeste(LISTA_TESTES_HARDWARE[0].id);
                }}
                variant="outline"
                className="border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 text-xs font-bold h-12 px-3"
                title="Reiniciar do 1º teste"
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Reiniciar
              </Button>
            )}
          </div>
        </div>

        {/* Grade de botões inspirada no menu de serviço Samsung *#0*# */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
              Grade de Módulos Individuais ({totalTestes})
            </span>
            <span className="text-slate-500 text-[10px]">
              Toque em qualquer teste para executá-lo individualmente
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {LISTA_TESTES_HARDWARE.map((item, idx) => {
              const res = resultados[item.id];
              const isOk = res?.status === "aprovado";
              const isDef = res?.status === "reprovado";

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    // Ao tocar em um teste avulso, abre ele individualmente
                    setModoSequencial(false);
                    abrirTeste(item.id);
                  }}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all active:scale-95 shadow-sm min-h-[92px] ${
                    isOk
                      ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                      : isDef
                        ? "bg-rose-950/40 border-rose-500/60 text-rose-300"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-850"
                  }`}
                >
                  {/* Número de ordem sequencial */}
                  <span className="absolute top-1.5 left-2 font-mono text-[9px] font-bold text-slate-500">
                    {String(idx + 1).padStart(2, "0")}
                  </span>

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

                  <span className="text-xs font-black uppercase tracking-tight line-clamp-1 mt-2">
                    {item.titulo}
                  </span>
                  <span className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                    {item.descricao}
                  </span>
                </button>
              );
            })}
          </div>
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
