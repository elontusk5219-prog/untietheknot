import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE = import.meta.env.BASE_URL
const FLASHBACK_CLIPS = [
  `${BASE}t01_flash_A_wrist.mp4`,
  `${BASE}t01_flash_B_sitting.mp4`,
  `${BASE}t01_flash_B_running.mp4`,
  `${BASE}t01_flash_C_field.mp4`,
  `${BASE}t01_flash_D_fence.mp4`,
]
const CLIP_DURATION_MS = 5000
const CROSS_FADE_MS    = 700
const TOTAL_MS         = 25000

type Phase = 'loading' | 'flashback' | 'fading'

export function Track01Scene() {
  const navigate = useNavigate()

  const [phase,     setPhase]    = useState<Phase>('loading')
  const [clipIndex, setClipIndex] = useState(0)
  const [showNext,  setShowNext]  = useState(false)
  // 用户点击后音频解锁，提示消失
  const [unlocked,  setUnlocked]  = useState(false)

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)

  const aIsFront = clipIndex % 2 === 0
  const aOpacity = phase !== 'flashback' ? 0 : (aIsFront || showNext) ? 1 : 0
  const bOpacity = phase !== 'flashback' ? 0 : (!aIsFront || showNext) ? 1 : 0

  // ─── 初始化：等 canplay 再开始计时 ──────────────────────────────
  useEffect(() => {
    const va = videoARef.current
    const vb = videoBRef.current
    if (!va || !vb) return
    va.src = FLASHBACK_CLIPS[0]
    vb.src = FLASHBACK_CLIPS[1]

    const start = () => {
      va.play().catch(() => {})
      setPhase('flashback')
    }
    va.addEventListener('canplay', start, { once: true })
    const fallback = window.setTimeout(start, 5000)
    return () => { va.removeEventListener('canplay', start); clearTimeout(fallback) }
  }, [])

  // ─── 25s 后黑幕 + 立刻跳目录 ────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback') return
    // 黑幕淡入同时立刻导航，TracklistScene 在黑幕下渲染好再淡出
    const tFade = window.setTimeout(() => {
      setPhase('fading')
      navigate('/tracklist')
    }, TOTAL_MS)
    return () => clearTimeout(tFade)
  }, [phase, navigate])

  // ─── 闪回轮播 ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback') return
    const tFade = window.setTimeout(() => setShowNext(true), CLIP_DURATION_MS - CROSS_FADE_MS)
    const tNext = window.setTimeout(() => {
      setClipIndex(i => i + 1)
      setShowNext(false)
    }, CLIP_DURATION_MS)
    return () => { clearTimeout(tFade); clearTimeout(tNext) }
  }, [clipIndex, phase])

  // ─── 新后景 src ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || clipIndex === 0) return
    const back = aIsFront ? videoBRef.current : videoARef.current
    if (back) back.src = FLASHBACK_CLIPS[(clipIndex + 1) % FLASHBACK_CLIPS.length]
  }, [clipIndex, phase, aIsFront])

  // ─── 播放淡入中的视频 ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || !showNext) return
    const incoming = aIsFront ? videoBRef.current : videoARef.current
    incoming?.play().catch(() => {})
  }, [showNext, phase, aIsFront])

  // ─── 点击：解锁音频 + 隐藏提示 ───────────────────────────────────
  const handleClick = useCallback(() => {
    const audio = document.querySelector('audio') as HTMLAudioElement | null
    if (audio) {
      audio.play().catch(() => {})
    }
    setUnlocked(true)
  }, [])

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-ink-900"
      onClick={handleClick}
    >
      {/* ── 视频 A ─────────────────────────────────────────────── */}
      <video
        ref={videoARef}
        loop muted playsInline preload="auto"
        className="absolute inset-0 h-full w-full object-cover select-none"
        style={{
          opacity: aOpacity,
          transition: `opacity ${CROSS_FADE_MS}ms ease-in-out`,
          filter: 'brightness(0.92) saturate(1.05)',
          objectPosition: 'center 25%',
          zIndex: aIsFront ? 2 : 1,
        }}
      />

      {/* ── 视频 B ─────────────────────────────────────────────── */}
      <video
        ref={videoBRef}
        loop muted playsInline preload="auto"
        className="absolute inset-0 h-full w-full object-cover select-none"
        style={{
          opacity: bOpacity,
          transition: `opacity ${CROSS_FADE_MS}ms ease-in-out`,
          filter: 'brightness(0.92) saturate(1.05)',
          objectPosition: 'center 25%',
          zIndex: aIsFront ? 1 : 2,
        }}
      />

      {/* ── vignette ───────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/20 via-transparent to-ink-900/60"
        style={{ zIndex: 3 }}
      />

      {/* ── 音频解锁提示（未点击时常显）────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10 select-none"
        style={{
          zIndex: 10,
          opacity: unlocked ? 0 : 1,
          transition: 'opacity 0.8s ease',
        }}
      >
        <div className="font-mincho text-[11px] tracking-[0.6em] text-mist-200/50 animate-pulse">
          點 擊 播 放
        </div>
      </div>

      {/* ── 加载中（loading 阶段）──────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        style={{
          zIndex: 10,
          opacity: phase === 'loading' ? 1 : 0,
          transition: 'opacity 0.5s',
        }}
      >
        <div className="font-mincho text-[10px] tracking-[0.8em] text-mist-300/25 animate-pulse">
          載　入　中
        </div>
      </div>

      {/* ── 跳转时黑幕（fading 阶段）───────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{
          zIndex: 20,
          opacity: phase === 'fading' ? 1 : 0,
          transition: 'opacity 0.8s ease-in',
        }}
      />
    </div>
  )
}
