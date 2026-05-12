import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const BASE = import.meta.env.BASE_URL
const FLASHBACK_CLIPS = [
  `${BASE}t01_flash_A_wrist.mp4`,
  `${BASE}t01_flash_B_sitting.mp4`,
  `${BASE}t01_flash_F_running.mp4`,   // 眼镜女孩侧面特写
  `${BASE}t01_flash_H_running.mp4`,   // 短发女孩侧面特写
  `${BASE}t01_flash_C_field.mp4`,
  `${BASE}t01_flash_D_fence.mp4`,
  `${BASE}t01_flash_B_running.mp4`,
  `${BASE}t01_flash_G_transition.mp4`, // field→dark 转场 clip
]
const CLIP_DURATION_MS    = 3000
const CROSS_FADE_MS       = 600
// 7 clips × 3s = 21s，+1s 转场 clip（4s 素材 4× 快放）= 22s
const TOTAL_MS            = 22000
const TRANSITION_CLIP_IDX = 7   // FLASHBACK_CLIPS 最后一个

type Phase = 'waiting' | 'flashback' | 'fading'

// 等 canplay 再 play，避免黑帧
function playWhenReady(v: HTMLVideoElement) {
  if (v.readyState >= 3) {
    v.play().catch(() => {})
  } else {
    const handler = () => { v.play().catch(() => {}); v.removeEventListener('canplay', handler) }
    v.addEventListener('canplay', handler)
  }
}

export function Track01Scene() {
  const navigate = useNavigate()

  const [phase,     setPhase]    = useState<Phase>('waiting')
  const [clipIndex, setClipIndex] = useState(0)
  const [showNext,  setShowNext]  = useState(false)

  const videoARef = useRef<HTMLVideoElement>(null)
  const videoBRef = useRef<HTMLVideoElement>(null)

  const aIsFront = clipIndex % 2 === 0
  const aOpacity = phase !== 'flashback' ? 0 : (aIsFront || showNext) ? 1 : 0
  const bOpacity = phase !== 'flashback' ? 0 : (!aIsFront || showNext) ? 1 : 0

  // ─── 初始化：预加载，不调 load()，src 赋值自动重置 currentTime ────
  useEffect(() => {
    const va = videoARef.current
    const vb = videoBRef.current
    if (!va || !vb) return
    va.src = FLASHBACK_CLIPS[0]
    vb.src = FLASHBACK_CLIPS[1]
  }, [])

  // ─── 点击：视频 + 音频同时启动 ──────────────────────────────────
  const handleClick = useCallback(() => {
    if (phase !== 'waiting') return
    const va = videoARef.current
    const audio = document.querySelector('audio') as HTMLAudioElement | null
    if (va) playWhenReady(va)
    if (audio) audio.play().catch(() => {})
    setPhase('flashback')
  }, [phase])

  // ─── 22s 后黑幕 + 跳目录 ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'flashback') return
    const t = window.setTimeout(() => {
      setPhase('fading')
      navigate('/tracklist')
    }, TOTAL_MS)
    return () => clearTimeout(t)
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

  // ─── 新后景 src（src 赋值自动 reset currentTime，不需要 load()）──
  useEffect(() => {
    if (phase !== 'flashback' || clipIndex === 0) return
    const back = aIsFront ? videoBRef.current : videoARef.current
    if (back) back.src = FLASHBACK_CLIPS[(clipIndex + 1) % FLASHBACK_CLIPS.length]
  }, [clipIndex, phase, aIsFront])

  // ─── 播放淡入中的视频，转场 clip 4× 快放 ──────────────────────
  useEffect(() => {
    if (phase !== 'flashback' || !showNext) return
    const incoming = aIsFront ? videoBRef.current : videoARef.current
    if (!incoming) return
    // 下一个 clip 是转场素材时，4× 快放填满 1s 窗口
    const nextIdx = (clipIndex + 1) % FLASHBACK_CLIPS.length
    incoming.playbackRate = nextIdx === TRANSITION_CLIP_IDX ? 4 : 1
    playWhenReady(incoming)
  }, [showNext, phase, aIsFront, clipIndex])

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
          objectFit: 'cover',
          objectPosition: '50% 0%',
          opacity: aOpacity,
          transition: `opacity ${CROSS_FADE_MS}ms ease-in-out`,
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
          objectFit: 'cover',
          objectPosition: '50% 0%',
          opacity: bOpacity,
          transition: `opacity ${CROSS_FADE_MS}ms ease-in-out`,
          filter: 'brightness(0.92) saturate(1.05)',
          animation: phase === 'flashback' ? 'handheld 6s ease-in-out infinite 0.4s' : 'none',
          zIndex: aIsFront ? 1 : 2,
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/20 via-transparent to-ink-900/60"
        style={{ zIndex: 3 }}
      />

      {/* 点击提示 */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10 select-none"
        style={{
          zIndex: 10,
          opacity: phase === 'waiting' ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      >
        <div className="font-mincho text-[11px] tracking-[0.6em] text-mist-200/50 animate-pulse">
          點 擊 播 放
        </div>
      </div>

      <style>{`
        @keyframes handheld {
          0%   { transform: translate3d(0px,   0px,  0) scale(1.03); }
          25%  { transform: translate3d(-2px, -3px,  0) scale(1.03); }
          50%  { transform: translate3d(1px,  -1px,  0) scale(1.03); }
          75%  { transform: translate3d(-1px,  2px,  0) scale(1.03); }
          100% { transform: translate3d(0px,   0px,  0) scale(1.03); }
        }
      `}</style>

      {/* 预加载走廊视频，navigate 时已在缓存里，无黑屏 */}
      <video
        src={`${BASE}tracklist_corridor.mp4`}
        preload="auto"
        muted
        style={{ display: 'none' }}
      />
    </div>
  )
}
