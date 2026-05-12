import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Track 01 "解开那束结" — 21 秒闪回开场
 *
 * 叙事结构：
 *  1. flashback (0s → 21s) : 4 段闪回轮播，A/B 双缓冲交叉淡入（无黑屏）
 *  2. fading    (21s)      : 黑幕淡入 → navigate('/tracklist')
 *
 * A/B 双缓冲：两个 video ref 永不 unmount，通过 opacity 交替显示
 * 偶数 clipIndex → A 前景；奇数 → B 前景
 */

const FLASHBACK_CLIPS = [
  '/t01_flash_A_wrist.mp4',    // 近景：手腕系绳 (GPT-2)
  '/t01_flash_B_sitting.mp4',  // 中景：两人坐着 (GPT-2)
  '/t01_flash_B_running.mp4',  // 中景：金色田野跑步
  '/t01_flash_C_field.mp4',    // 单人张臂
  '/t01_flash_D_fence.mp4',    // 铁网
]
// 5 段 × 4200ms = 21000ms，刚好填满到跳转
const CLIP_DURATION_MS  = 4200
const CROSS_FADE_MS     = 600
const CORRIDOR_START_MS = 21000

type Phase = 'flashback' | 'fading'

export function Track01Scene() {
  const navigate = useNavigate()

  const [phase,      setPhase]    = useState<Phase>('flashback')
  const [clipIndex,  setClipIndex] = useState(0)
  const [showNext,   setShowNext]  = useState(false)

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)

  const aIsFront = clipIndex % 2 === 0
  const aOpacity = phase !== 'flashback' ? 0 : (aIsFront || showNext) ? 1 : 0
  const bOpacity = phase !== 'flashback' ? 0 : (!aIsFront || showNext) ? 1 : 0

  // ─── 初始化 ───────────────────────────────────────────────────────
  useEffect(() => {
    const va = videoARef.current
    const vb = videoBRef.current
    if (!va || !vb) return
    va.src = FLASHBACK_CLIPS[0]
    vb.src = FLASHBACK_CLIPS[1]
    va.play().catch(() => {})
  }, [])

  // ─── clipIndex 变化：更新新后景 src ───────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || clipIndex === 0) return
    const newBack = aIsFront ? videoBRef.current : videoARef.current
    if (newBack) {
      newBack.src = FLASHBACK_CLIPS[(clipIndex + 1) % FLASHBACK_CLIPS.length]
    }
  }, [clipIndex, phase, aIsFront])

  // ─── showNext：开始播放即将淡入的视频 ────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || !showNext) return
    const incoming = aIsFront ? videoBRef.current : videoARef.current
    incoming?.play().catch(() => {})
  }, [showNext, phase, aIsFront])

  // ─── 21s 后跳转目录 ───────────────────────────────────────────────
  useEffect(() => {
    const tFade = window.setTimeout(() => setPhase('fading'), CORRIDOR_START_MS)
    const tNav  = window.setTimeout(() => navigate('/tracklist'), CORRIDOR_START_MS + 900)
    return () => { clearTimeout(tFade); clearTimeout(tNav) }
  }, [navigate])

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
      {/* ── 视频 A ───────────────────────────────────────────────── */}
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

      {/* ── 视频 B ───────────────────────────────────────────────── */}
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

      {/* ── 全局渐变 & vignette ───────────────────────────────────── */}
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

      {/* ── 21s 跳转前黑幕淡入 ───────────────────────────────────── */}
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
