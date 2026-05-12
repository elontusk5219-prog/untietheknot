import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Track 01 "解开那束结" — 25 秒闪回开场
 *
 * 叙事结构：
 *  1. loading   : 等第一个视频 canplay 后再开始计时（网络慢时不提前跳）
 *  2. flashback : 5 段闪回轮播，A/B 双缓冲交叉淡入（无黑屏）
 *  3. fading    : 黑幕淡入 → navigate('/tracklist')
 */

const BASE = import.meta.env.BASE_URL   // '/preview/' 生产, '/' 开发
const FLASHBACK_CLIPS = [
  `${BASE}t01_flash_A_wrist.mp4`,
  `${BASE}t01_flash_B_sitting.mp4`,
  `${BASE}t01_flash_B_running.mp4`,
  `${BASE}t01_flash_C_field.mp4`,
  `${BASE}t01_flash_D_fence.mp4`,
]
// 5 段 × 5000ms = 25000ms，匹配音乐节拍
const CLIP_DURATION_MS  = 5000
const CROSS_FADE_MS     = 700
const TOTAL_MS          = 25000   // 25s 后跳目录

type Phase = 'loading' | 'flashback' | 'fading'

export function Track01Scene() {
  const navigate = useNavigate()

  const [phase,     setPhase]    = useState<Phase>('loading')
  const [clipIndex, setClipIndex] = useState(0)
  const [showNext,  setShowNext]  = useState(false)

  const videoARef  = useRef<HTMLVideoElement>(null)
  const videoBRef  = useRef<HTMLVideoElement>(null)
  const timerStart = useRef<number>(0)   // 记录实际开始时间

  const aIsFront = clipIndex % 2 === 0
  const aOpacity = phase !== 'flashback' ? 0 : (aIsFront || showNext) ? 1 : 0
  const bOpacity = phase !== 'flashback' ? 0 : (!aIsFront || showNext) ? 1 : 0

  // ─── 初始化：设好 src，等第一帧 canplay ───────────────────────────
  useEffect(() => {
    const va = videoARef.current
    const vb = videoBRef.current
    if (!va || !vb) return
    va.src = FLASHBACK_CLIPS[0]
    vb.src = FLASHBACK_CLIPS[1]

    const onCanPlay = () => {
      va.play().catch(() => {})
      timerStart.current = performance.now()
      setPhase('flashback')
    }
    va.addEventListener('canplay', onCanPlay, { once: true })
    // 5s 保底：就算没触发 canplay 也强制开始
    const fallback = window.setTimeout(() => {
      va.play().catch(() => {})
      timerStart.current = performance.now()
      setPhase('flashback')
    }, 5000)

    return () => {
      va.removeEventListener('canplay', onCanPlay)
      clearTimeout(fallback)
    }
  }, [])

  // ─── 25s 后跳转（从 flashback 实际开始算）────────────────────────
  useEffect(() => {
    if (phase !== 'flashback') return
    const tFade = window.setTimeout(() => setPhase('fading'), TOTAL_MS)
    const tNav  = window.setTimeout(() => navigate('/tracklist'), TOTAL_MS + 900)
    return () => { clearTimeout(tFade); clearTimeout(tNav) }
  }, [phase, navigate])

  // ─── 闪回轮播定时器 ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback') return
    const tFade = window.setTimeout(() => setShowNext(true),  CLIP_DURATION_MS - CROSS_FADE_MS)
    const tNext = window.setTimeout(() => {
      setClipIndex(i => i + 1)
      setShowNext(false)
    }, CLIP_DURATION_MS)
    return () => { clearTimeout(tFade); clearTimeout(tNext) }
  }, [clipIndex, phase])

  // ─── clipIndex 变化：更新后景 src ─────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || clipIndex === 0) return
    const newBack = aIsFront ? videoBRef.current : videoARef.current
    if (newBack) {
      newBack.src = FLASHBACK_CLIPS[(clipIndex + 1) % FLASHBACK_CLIPS.length]
    }
  }, [clipIndex, phase, aIsFront])

  // ─── showNext：播放即将淡入的视频 ────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || !showNext) return
    const incoming = aIsFront ? videoBRef.current : videoARef.current
    incoming?.play().catch(() => {})
  }, [showNext, phase, aIsFront])

  // ─── 音频兜底解锁 ────────────────────────────────────────────────
  const handleClick = useCallback(() => {
    const audio = document.querySelector('audio') as HTMLAudioElement | null
    if (audio?.paused) audio.play().catch(() => {})
  }, [])

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-ink-900"
      onClick={handleClick}
    >
      {/* ── 视频 A ─────────────────────────────────────────────────── */}
      <video
        ref={videoARef}
        loop muted playsInline preload="auto"
        className="absolute inset-0 h-full w-full object-cover select-none"
        style={{
          opacity: aOpacity,
          transition: `opacity ${CROSS_FADE_MS}ms ease-in-out`,
          filter: 'brightness(0.92) saturate(1.05)',
          zIndex: aIsFront ? 2 : 1,
        }}
      />

      {/* ── 视频 B ─────────────────────────────────────────────────── */}
      <video
        ref={videoBRef}
        loop muted playsInline preload="auto"
        className="absolute inset-0 h-full w-full object-cover select-none"
        style={{
          opacity: bOpacity,
          transition: `opacity ${CROSS_FADE_MS}ms ease-in-out`,
          filter: 'brightness(0.92) saturate(1.05)',
          zIndex: aIsFront ? 1 : 2,
        }}
      />

      {/* ── vignette ───────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/20 via-transparent to-ink-900/60"
        style={{ zIndex: 3 }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 3,
          background: 'radial-gradient(130% 90% at 50% 50%, transparent 40%, rgba(10,10,13,0.7) 100%)',
        }}
      />

      {/* ── 加载中提示（loading 阶段，超过 1s 才显示避免闪烁）──────── */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center pb-12"
        style={{
          zIndex: 10,
          opacity: phase === 'loading' ? 1 : 0,
          transition: 'opacity 0.5s',
        }}
      >
        <div className="font-mincho text-[10px] tracking-[0.6em] text-mist-300/30 animate-pulse">
          載　入　中
        </div>
      </div>

      {/* ── 跳转前黑幕淡入 ─────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 20,
          background: 'black',
          opacity: phase === 'fading' ? 1 : 0,
          transition: 'opacity 0.9s ease-in',
        }}
      />
    </div>
  )
}
