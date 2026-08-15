// Player do YouTube com IFrame API e rastreamento de progresso real.
// Calcula conclusão com base em segundos efetivamente reproduzidos, não na posição.

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2, AlertCircle } from "lucide-react";

let apiPromise = null;

function loadYouTubeAPI() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

function formatTime(seconds) {
  if (!seconds || seconds < 0 || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function YouTubePlayer({ videoId, lessonId, userId = "demo", initialProgress, onProgress, onComplete, onReady }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const lastTickRef = useRef(null);
  const accumulatedRef = useRef(0);
  const durationRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const completedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchedPercent, setWatchedPercent] = useState(initialProgress?.watchedPercent || 0);
  const [showContinue, setShowContinue] = useState(false);

  const saveProgress = useCallback((status, extra = {}) => {
    if (!playerRef.current || !onProgress) return;
    const pos = playerRef.current.getCurrentTime?.() || 0;
    const dur = playerRef.current.getDuration?.() || durationRef.current;
    const pct = dur > 0 ? Math.min(100, (accumulatedRef.current / dur) * 100) : 0;
    const payload = {
      lessonId,
      userId,
      currentPositionSeconds: Math.floor(pos),
      accumulatedPlayedSeconds: Math.floor(accumulatedRef.current),
      durationSeconds: Math.floor(dur),
      watchedPercent: Math.round(pct * 10) / 10,
      status: status || (pct >= 90 ? "completed" : pct > 0 ? "in_progress" : "not_started"),
      lastWatchedAt: new Date().toISOString(),
      ...extra,
    };
    onProgress(payload);
    if (payload.status === "completed" && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(payload);
    }
  }, [lessonId, userId, onProgress, onComplete]);

  // Timer para acumular segundos reproduzidos
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    lastTickRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      accumulatedRef.current += delta;
      const pos = playerRef.current?.getCurrentTime?.() || 0;
      const dur = playerRef.current?.getDuration?.() || 0;
      setCurrentTime(pos);
      setDuration(dur);
      const pct = dur > 0 ? Math.min(100, (accumulatedRef.current / dur) * 100) : 0;
      setWatchedPercent(pct);
      // Salvar a cada 5 segundos
      if (Math.floor(accumulatedRef.current) % 5 === 0) {
        saveProgress(pct >= 90 ? "completed" : "in_progress");
      }
    }, 1000);
  }, [saveProgress]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Inicializar player
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);
    completedRef.current = false;
    accumulatedRef.current = initialProgress?.accumulatedPlayedSeconds || 0;

    loadYouTubeAPI().then((YT) => {
      if (!mounted || !containerRef.current) return;

      // Limpar container
      containerRef.current.innerHTML = "";
      const playerDiv = document.createElement("div");
      playerDiv.style.width = "100%";
      playerDiv.style.height = "100%";
      containerRef.current.appendChild(playerDiv);

      playerRef.current = new YT.Player(playerDiv, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            if (!mounted) return;
            setLoading(false);
            const dur = e.target.getDuration() || 0;
            durationRef.current = dur;
            setDuration(dur);
            // Se tem progresso, mostrar opção de continuar
            if (initialProgress?.currentPositionSeconds > 5 && initialProgress?.status !== "completed") {
              setShowContinue(true);
            }
            onReady?.(e.target);
          },
          onStateChange: (e) => {
            if (!mounted) return;
            const state = e.data;
            if (state === YT.PlayerState.PLAYING) {
              setPlaying(true);
              wasPlayingRef.current = true;
              startTimer();
              // Se estava pausado e tem posição salva, não reseta
            } else if (state === YT.PlayerState.PAUSED) {
              setPlaying(false);
              stopTimer();
              saveProgress("in_progress");
            } else if (state === YT.PlayerState.ENDED) {
              setPlaying(false);
              stopTimer();
              // No final do vídeo, garantir que acumulou
              const dur = playerRef.current?.getDuration?.() || durationRef.current;
              if (dur > 0 && accumulatedRef.current < dur) {
                accumulatedRef.current = dur;
              }
              saveProgress("completed");
            } else if (state === YT.PlayerState.BUFFERING) {
              stopTimer();
            }
          },
          onError: () => {
            if (!mounted) return;
            setError(true);
            setLoading(false);
          },
        },
      });
    }).catch(() => {
      if (mounted) {
        setError(true);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      stopTimer();
      saveProgress("in_progress");
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Salvar ao desmontar / trocar aba
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        stopTimer();
        saveProgress("in_progress");
      }
    };
    const handleBeforeUnload = () => {
      saveProgress("in_progress");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleMute = () => {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  };

  const handleFullscreen = () => {
    const iframe = containerRef.current?.querySelector("iframe");
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const handleRestart = () => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0, true);
    accumulatedRef.current = 0;
    completedRef.current = false;
    setWatchedPercent(0);
    playerRef.current.playVideo();
  };

  const handleContinue = () => {
    if (!playerRef.current || !initialProgress?.currentPositionSeconds) return;
    playerRef.current.seekTo(initialProgress.currentPositionSeconds, true);
    setShowContinue(false);
    playerRef.current.playVideo();
  };

  const handleStartFromBeginning = () => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0, true);
    setShowContinue(false);
    playerRef.current.playVideo();
  };

  const handleSeek = (e) => {
    if (!playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const dur = playerRef.current.getDuration() || 0;
    if (dur > 0) {
      playerRef.current.seekTo(dur * pct, true);
      setCurrentTime(dur * pct);
    }
  };

  const handleSeekKeyboard = (e) => {
    if (!playerRef.current) return;
    const dur = playerRef.current.getDuration() || 0;
    if (dur <= 0) return;
    const STEP = 5; // segundos por seta
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(dur, currentTime + STEP);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, currentTime - STEP);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = dur;
    if (next !== null) {
      e.preventDefault();
      playerRef.current.seekTo(next, true);
      setCurrentTime(next);
    }
  };

  if (error) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-border bg-muted/30 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm font-medium text-foreground">Não foi possível carregar esta aula.</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setError(false); setLoading(true); setTimeout(() => window.location.reload(), 100); }}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Player */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-overlay">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-overlay">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />

        {/* Overlay continuar */}
        {showContinue && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-overlay/80 backdrop-blur-sm">
            <p className="text-sm font-medium text-white">Continuar de {formatTime(initialProgress?.currentPositionSeconds)}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={handleContinue}>Continuar</Button>
              <Button size="sm" variant="outline" onClick={handleStartFromBeginning}>Assistir do início</Button>
            </div>
          </div>
        )}
      </div>

      {/* Controles customizados */}
      {!loading && (
        <div className="space-y-2">
          {/* Barra de progresso */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{formatTime(currentTime)}</span>
            <div
              className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-muted"
              role="slider"
              tabIndex={0}
              aria-label="Posição do vídeo"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
              onClick={handleSeek}
              onKeyDown={handleSeekKeyboard}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              <div
                className="absolute top-0 h-full rounded-full bg-status-info/60"
                style={{ width: `${watchedPercent}%` }}
              />
            </div>
            <span className="tabular-nums">{formatTime(duration)}</span>
          </div>

          {/* Botões de controle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={handlePlayPause} aria-label={playing ? "Pausar" : "Reproduzir"}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleMute} aria-label={muted ? "Ativar som" : "Silenciar"}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleRestart} aria-label="Reiniciar">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round(watchedPercent)}% assistido
              </span>
              <Button size="icon" variant="ghost" onClick={handleFullscreen} aria-label="Tela cheia">
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Indicador de conclusão */}
          {watchedPercent >= 90 && (
            <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-status-success-text">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
              Aula concluída
            </div>
          )}
        </div>
      )}
    </div>
  );
}