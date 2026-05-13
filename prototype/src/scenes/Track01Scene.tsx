import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadTimelineConfig } from './TimelineEditor'

const BASE = import.meta.env.BASE_URL
const CLIP_SRCS = [
  `${BASE}t01_flash_A_wrist.mp4`,
  `${BASE}t01_flash_B_sitting.mp4`,
  `${BASE}t01_flash_F_running.mp4`,
  `${BASE}t01_flash_H_running.mp4`,
  `${BASE}t01_flash_C_field.mp4`,
  `${BASE}t01_flash_D_fence.mp4`,
  `${BASE}t01_flash_B_running.mp4`,
  `${BASE}t01_flash_G_transition.mp4`,
]

type Phase = 'waiting' | 'flashback' | 'fading'

function playWhenReady(v: HTMLVideoElement) {
  if (v.readyState >= 3) {
    v.play().catch(() => {})
  } else {
    const handler = () => { v.play().catch(() => {}); v.removeEventListener('canplay', handler) }
    v.addEventListener('canplay', handler)
  }
}

async function preloadAllClips(srcs: string[]): Promise<string[]> {
  const results = await Promise.allSettled(
    srcs.map(src => fetch(src).then(r => r.blob()).then(b => URL.createObjectURL(b)))
  )
  return results.map((r, i) => r.status === 'fulfilled' ? r.value : srcs[i])
}

export function Track01Scene() {
  const navigate = useNavigate()

  const cfg       = loadTimelineConfig()
  const clipCfgs  = cfg.clips
  const crossFadeMs = cfg.crossFade
  const totalMs   = clipCfgs.reduce((a, c) => a + c.duration, 0)

  const [phase,     setPhase]    = useState<Phase>('waiting')
  const [clipIndex, setClipIndex] = useState(0)
  const [showNext,  setShowNext]  = useState(false)
  const [clips,     setClips]    = useState<string[]>(CLIP_SRCS)
  const [preloaded, setPreloaded] = useState(false)

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)
  const blobsRef  = useRef<string[]>([])
  const trimRafRef = useRef<number>(0)

  const aIsFront = clipIndex % 2 === 0
  const aOpacity = phase !== 'flashback' ? 0 : (aIsFront || showNext) ? 1 : 0
  const bOpacity = phase !== 'flashback' ? 0 : (!aIsFront || showNext) ? 1 : 0

  // ── Preload all clips as blobs ──────────────────────────────────
  useEffect(() => {
    let cancelled = false
    preloadAllClips(CLIP_SRCS).then(urls => {
      if (cancelled) { urls.forEach(u => u.startsWith('blob:') && URL.revokeObjectURL(u)); return }
      blobsRef.current = urls
      setClips(urls)
      setPreloaded(true)
    })
    return () => {
      cancelled = true
      blobsRef.current.forEach(u => u.startsWith('blob:') && URL.revokeObjectURL(u))
    }
  }, [])

  // ── Prime video elements once blobs are ready ──────────────────
  useEffect(() => {
    const va = videoARef.current
    const vb = videoBRef.current
    if (!va || !vb) return
    va.src = clips[0]
    vb.src = clips[1]
    // Apply initial trimStart for clip 0
    if (clipCfgs[0]?.trimStart > 0) va.currentTime = clipCfgs[0].trimStart
  }, [clips])

  // ── Click: start playback ───────────────────────────────────────
  const handleClick = useCallback(() => {
    if (phase !== 'waiting') return
    const va = videoARef.current
    const audio = document.querySelector('audio') as HTMLAudioElement | null
    if (va) {
      va.playbackRate = clipCfgs[0]?.speed ?? 1
      playWhenReady(va)
    }
    if (audio) audio.play().catch(() => {})
    setPhase('flashback')
  }, [phase, clipCfgs])

  // ── Navigate after totalMs ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback') return
    const t = window.setTimeout(() => { setPhase('fading'); navigate('/tracklist') }, totalMs)
    return () => clearTimeout(t)
  }, [phase, navigate, totalMs])

  // ── Per-clip crossfade timer ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback') return
    const clip = clipCfgs[clipIndex % clipCfgs.length]
    const dur  = clip.duration
    const safe = Math.max(crossFadeMs + 50, dur)
    const tFade = window.setTimeout(() => setShowNext(true), safe - crossFadeMs)
    const tNext = window.setTimeout(() => { setClipIndex(i => i + 1); setShowNext(false) }, safe)
    return () => { clearTimeout(tFade); clearTimeout(tNext) }
  }, [clipIndex, phase, clipCfgs, crossFadeMs])

  // ── trimEnd enforcement via rAF on the front video ─────────────
  useEffect(() => {
    cancelAnimationFrame(trimRafRef.current)
    if (phase !== 'flashback') return
    const clip = clipCfgs[clipIndex % clipCfgs.length]
    if (!clip.trimEnd) return
    const front = aIsFront ? videoARef.current : videoBRef.current
    if (!front) return
    const { trimStart, trimEnd } = clip
    const loop = () => {
      if (front.currentTime >= trimEnd) front.currentTime = trimStart
      trimRafRef.current = requestAnimationFrame(loop)
    }
    trimRafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(trimRafRef.current)
  }, [clipIndex, phase, aIsFront, clipCfgs])

  // ── Load next-next clip into back buffer ────────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || clipIndex === 0) return
    const back = aIsFront ? videoBRef.current : videoARef.current
    const nextIdx = (clipIndex + 1) % clips.length
    if (!back) return
    back.src = clips[nextIdx]
    const nextCfg = clipCfgs[nextIdx % clipCfgs.length]
    if (nextCfg.trimStart > 0) back.currentTime = nextCfg.trimStart
  }, [clipIndex, phase, aIsFront, clips, clipCfgs])

  // ── Play incoming video with correct speed + trimStart ──────────
  useEffect(() => {
    if (phase !== 'flashback' || !showNext) return
    const incoming = aIsFront ? videoBRef.current : videoARef.current
    if (!incoming) return
    const nextIdx = (clipIndex + 1) % clips.length
    const nextCfg = clipCfgs[nextIdx % clipCfgs.length]
    incoming.playbackRate = nextCfg.speed
    if (nextCfg.trimStart > 0) incoming.currentTime = nextCfg.trimStart
    playWhenReady(incoming)
  }, [showNext, phase, aIsFront, clipIndex, clips, clipCfgs])

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-ink-900 cursor-pointer"
      onClick={handleClick}
    >
      <video
        ref={videoARef}
        loop muted playsInline preload="auto"
        className="absolute inset-0 h-full w-full select-none"
        style={{
          objectFit: 'cover', objectPosition: '50% 0%',
          opacity: aOpacity,
          transition: `opacity ${crossFadeMs}ms ease-in-out`,
          filter: 'brightness(0.92) saturate(1.05)',
          animation: phase === 'flashback' ? 'handheld 6s ease-in-out infinite' : 'none',
          zIndex: aIsFront ? 2 : 1,
        }}
      />
      <video
        ref={videoBRef}
        loop muted playsInline preload="auto"
        className="absolute inset-0 h-full w-full select-none"
        style={{
          objectFit: 'cover', objectPosition: '50% 0%',
          opacity: bOpacity,
          transition: `opacity ${crossFadeMs}ms ease-in-out`,
          filter: 'brightness(0.92) saturate(1.05)',
          animation: phase === 'flashback' ? 'handheld 6s ease-in-out infinite 0.4s' : 'none',
          zIndex: aIsFront ? 1 : 2,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/20 via-transparent to-ink-900/60"
        style={{ zIndex: 3 }}
      />

      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10 select-none"
        style={{ zIndex: 10, opacity: phase === 'waiting' ? 1 : 0, transition: 'opacity 0.8s ease' }}
      >
        <div className="font-mincho text-[11px] tracking-[0.6em] text-mist-200/50 animate-pulse">
          {preloaded ? '點 擊 播 放' : '載 入 中 …'}
        </div>
      </div>

      <style>{`
        @keyframes handheld {
          0%   { transform: translate3d(0px,   0px, 0) scale(1.03); }
          25%  { transform: translate3d(-2px, -3px, 0) scale(1.03); }
          50%  { transform: translate3d(1px,  -1px, 0) scale(1.03); }
          75%  { transform: translate3d(-1px,  2px, 0) scale(1.03); }
          100% { transform: translate3d(0px,   0px, 0) scale(1.03); }
        }
      `}</style>

      <video src={`${BASE}tracklist_corridor.mp4`} preload="auto" muted style={{ display: 'none' }} />
    </div>
  )
}
