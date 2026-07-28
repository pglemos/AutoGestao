import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { calculateLessonProgress } from '../consultingJourneyRules'
import { createConsultingVideoTracker } from '../consultingVideoTracker'
import type { ConsultingLessonProgress } from '../consultingJourney.types'

type YoutubePlayer = {
  destroy(): void
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
}
type YoutubeNamespace = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YoutubePlayer
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
}
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<YoutubeNamespace> | null = null
const readYoutubeApi = () => window.YT as unknown as YoutubeNamespace | undefined

function getYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.split('/').filter(Boolean)[0] || null
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || null
      return parsed.searchParams.get('v')
    }
  } catch {
    return null
  }
  return null
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds || 0))
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`
}

function loadYoutubeApi(): Promise<YoutubeNamespace> {
  const existingApi = readYoutubeApi()
  if (existingApi?.Player) return Promise.resolve(existingApi)
  if (youtubeApiPromise) return youtubeApiPromise
  youtubeApiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      const loadedApi = readYoutubeApi()
      if (loadedApi?.Player) resolve(loadedApi)
      else reject(new Error('API do YouTube indisponível.'))
    }
    if (!document.querySelector('script[data-mx-youtube-api]')) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.mxYoutubeApi = 'true'
      script.onerror = () => reject(new Error('Não foi possível carregar o player do YouTube.'))
      document.head.appendChild(script)
    }
  })
  return youtubeApiPromise
}

export function ConsultingVideoPlayer({
  url,
  initialProgress,
  onSave,
}: {
  url: string
  initialProgress: ConsultingLessonProgress | null
  onSave(input: { positionSeconds: number; durationSeconds: number; playedDeltaSeconds: number }): Promise<unknown>
}) {
  const resumePosition = initialProgress?.positionSeconds || 0
  const needsResumeChoice = resumePosition > 0
  const [startPosition, setStartPosition] = useState<number | null>(() => needsResumeChoice ? null : 0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const youtubeContainerRef = useRef<HTMLDivElement | null>(null)
  const youtubePlayerRef = useRef<YoutubePlayer | null>(null)
  const playingRef = useRef(false)
  const durationRef = useRef(initialProgress?.durationSeconds || 0)
  const trackerRef = useRef(createConsultingVideoTracker({ positionSeconds: startPosition || 0 }))
  const saveInFlightRef = useRef<Promise<unknown> | null>(null)
  const queuedSaveRef = useRef(false)
  const queuedDeltaRef = useRef(0)
  const [playedSeconds, setPlayedSeconds] = useState(initialProgress?.playedSeconds || 0)
  const [durationSeconds, setDurationSeconds] = useState(initialProgress?.durationSeconds || 0)
  const [error, setError] = useState<string | null>(null)
  const youtubeId = useMemo(() => getYoutubeId(url), [url])
  const progress = calculateLessonProgress({ playedSeconds, durationSeconds })

  const readPosition = useCallback(() => {
    if (youtubePlayerRef.current) return youtubePlayerRef.current.getCurrentTime() || 0
    return videoRef.current?.currentTime || 0
  }, [])
  const readDuration = useCallback(() => {
    if (youtubePlayerRef.current) return youtubePlayerRef.current.getDuration() || durationRef.current
    return videoRef.current?.duration || durationRef.current
  }, [])
  const sample = useCallback(() => {
    if (startPosition === null) return
    const nextDuration = Math.max(0, readDuration())
    durationRef.current = nextDuration
    setDurationSeconds(nextDuration)
    const delta = trackerRef.current.sample({ positionSeconds: readPosition(), playing: playingRef.current })
    if (delta > 0) setPlayedSeconds(value => Math.min(nextDuration || Number.MAX_SAFE_INTEGER, value + delta))
  }, [readDuration, readPosition, startPosition])

  const flush = useCallback(async () => {
    if (startPosition === null) return
    sample()
    queuedDeltaRef.current += trackerRef.current.drainPlayedDelta()
    if (saveInFlightRef.current) {
      queuedSaveRef.current = true
      return saveInFlightRef.current
    }
    const duration = Math.max(0, Math.round(readDuration()))
    if (duration <= 0) return
    const delta = queuedDeltaRef.current
    queuedDeltaRef.current = 0
    const payload = {
      positionSeconds: Math.max(0, Math.round(readPosition())),
      durationSeconds: duration,
      playedDeltaSeconds: delta,
    }
    let succeeded = false
    const operation = onSave(payload)
    saveInFlightRef.current = operation
    try {
      await operation
      succeeded = true
      setError(null)
    } catch (cause) {
      queuedDeltaRef.current += payload.playedDeltaSeconds
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o progresso.')
    } finally {
      saveInFlightRef.current = null
      const shouldFlushAgain = succeeded && (queuedSaveRef.current || queuedDeltaRef.current > 0)
      queuedSaveRef.current = false
      if (shouldFlushAgain) void flush()
    }
  }, [onSave, readDuration, readPosition, sample, startPosition])

  useEffect(() => {
    const nextResume = initialProgress?.positionSeconds || 0
    setStartPosition(nextResume > 0 ? null : 0)
    trackerRef.current.reset(0)
    queuedDeltaRef.current = 0
    setPlayedSeconds(initialProgress?.playedSeconds || 0)
    setDurationSeconds(initialProgress?.durationSeconds || 0)
  }, [initialProgress?.durationSeconds, initialProgress?.playedSeconds, initialProgress?.positionSeconds, url])

  useEffect(() => {
    if (startPosition === null) return
    trackerRef.current.reset(startPosition)
    const sampleTimer = window.setInterval(sample, 1000)
    const saveTimer = window.setInterval(() => { void flush() }, 5000)
    const onVisibility = () => { if (document.visibilityState === 'hidden') void flush() }
    const onBeforeUnload = () => { void flush() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.clearInterval(sampleTimer)
      window.clearInterval(saveTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flush()
    }
  }, [flush, sample, startPosition])

  useEffect(() => {
    if (!youtubeId || !youtubeContainerRef.current || startPosition === null) return
    let active = true
    loadYoutubeApi().then(YT => {
      if (!active || !youtubeContainerRef.current) return
      youtubePlayerRef.current = new YT.Player(youtubeContainerRef.current, {
        videoId: youtubeId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (event: { target: YoutubePlayer }) => {
            durationRef.current = event.target.getDuration() || initialProgress?.durationSeconds || 0
            setDurationSeconds(durationRef.current)
            if (startPosition > 0) event.target.seekTo(startPosition, true)
            trackerRef.current.reset(startPosition)
          },
          onStateChange: (event: { data: number }) => {
            playingRef.current = event.data === YT.PlayerState.PLAYING
            sample()
            if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) void flush()
          },
          onError: () => setError('Não foi possível reproduzir esta aula.'),
        },
      })
    }).catch(cause => setError(cause instanceof Error ? cause.message : 'Player indisponível.'))
    return () => {
      active = false
      youtubePlayerRef.current?.destroy()
      youtubePlayerRef.current = null
    }
  }, [flush, initialProgress?.durationSeconds, sample, startPosition, youtubeId])

  const onLoadedMetadata = () => {
    const video = videoRef.current
    if (!video || startPosition === null) return
    durationRef.current = video.duration || initialProgress?.durationSeconds || 0
    setDurationSeconds(durationRef.current)
    if (startPosition > 0 && startPosition < video.duration) video.currentTime = startPosition
    trackerRef.current.reset(startPosition)
  }

  if (startPosition === null) {
    return (
      <section className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h4 className="text-base font-semibold text-foreground">Continuar aula?</h4>
        <p className="mt-1 text-sm text-muted-foreground">Seu último ponto salvo foi {formatTime(resumePosition)}. O tempo efetivamente assistido permanece registrado nas duas opções.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setStartPosition(resumePosition)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Continuar de {formatTime(resumePosition)}</button>
          <button type="button" onClick={() => setStartPosition(0)} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">Assistir do início</button>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-3">
      <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
        {youtubeId ? <div ref={youtubeContainerRef} className="h-full w-full" aria-label="Aula em vídeo" /> : (
          <video ref={videoRef} src={url} controls preload="metadata" className="h-full w-full" onLoadedMetadata={onLoadedMetadata} onPlay={() => { playingRef.current = true; sample() }} onPause={() => { playingRef.current = false; void flush() }} onEnded={() => { playingRef.current = false; void flush() }} onSeeking={() => sample()} aria-label="Aula em vídeo" />
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{Math.round(progress.percentage)}% efetivamente assistido</span><span>{progress.completed ? 'Aula concluída' : 'Conclusão em 90%'}</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percentage}><div className="h-full bg-primary transition-[width]" style={{ width: `${progress.percentage}%` }} /></div>
      </div>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  )
}
