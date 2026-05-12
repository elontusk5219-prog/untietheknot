import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayerStore } from '@/store/usePlayerStore'
import { CharmButtons } from './CharmButtons'

/**
 * 入口场景（v16 静帧 + 12 挂件可点击 + Canvas 2D 横向雨条）。
 *
 * 布局：bg-cover 全屏铺满，桌面 + 移动都是满的。
 * 用 object-position: 25% 65% 把 cluster (在 v16 图的左下) 锚定到 viewport 左中下区域，
 * 移动竖屏裁切右半（道路+logo 那边）；桌面横屏裁切上下。
 *
 * 12 挂件按钮 % 定位是相对全 viewport，所以在桌面 16:9 上对得最准；移动竖屏会有 offset
 * （后续做 portrait 变体 plate 解决）。
 */
export function EntryScene() {
  const navigate = useNavigate()
  const phase = usePlayerStore((s) => s.phase)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (phase === 'unraveling') {
      const t = window.setTimeout(() => navigate('/tracklist'), 1400)
      return () => window.clearTimeout(t)
    }
  }, [phase, navigate])

  const unraveling = phase === 'unraveling'

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-ink-900"
    >
      {/* 入口 plate —— Kling FLF 循环视频（首尾帧都是 v16，无缝接） */}
      <video
        src="/entry_loop.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/entry_plate.png"
        aria-hidden
        className="absolute inset-0 h-full w-full select-none transition-all duration-[1400ms] ease-out"
        style={{
          objectFit: 'cover',
          objectPosition: '25% 60%',
          transform: unraveling ? 'scale(1.18)' : 'scale(1.02)',
          filter: unraveling
            ? 'brightness(0.4) blur(8px) saturate(0.7)'
            : 'brightness(0.95) saturate(1.05)',
        }}
      />

      {/* 顶底渐变压暗 + vignette */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/15 via-transparent to-ink-900/55" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(140% 100% at 50% 50%, transparent 55%, rgba(10,10,13,0.65) 100%)',
        }}
      />

      {/* 标题：HTML 竖排明朝（和歌单同 font stack） */}
      <div
        className={`pointer-events-none absolute z-10 select-none transition-opacity duration-1000 ${
          unraveling ? 'opacity-0' : 'opacity-95'
        }`}
        style={{ right: '7%', top: '10%' }}
      >
        <div
          className="font-mincho writing-vertical text-[clamp(48px,7vw,96px)] leading-[1.25] tracking-[0.18em] text-mist-200"
          style={{
            textShadow:
              '0 0 28px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.7), 0 0 60px rgba(201,138,107,0.18)',
          }}
        >
          解開那束結
        </div>
      </div>

      {/* RUBEN 25 / 26 副标题 */}
      <div
        className={`pointer-events-none absolute z-10 transition-opacity duration-1000 ${
          unraveling ? 'opacity-0' : 'opacity-70'
        }`}
        style={{ right: '5%', bottom: '5%' }}
      >
        <div className="font-sans text-[10px] tracking-[0.5em] text-mist-300/80">
          RUBEN 25 / 26
        </div>
      </div>

      {/* 12 挂件按钮 → 12 首歌（基于 viewport 的 % 定位） */}
      <CharmButtons disabled={unraveling} />

      {/* 底部 hint */}
      <div
        className={`absolute left-1/2 bottom-3 -translate-x-1/2 z-10 select-none transition-opacity duration-700 ${
          unraveling ? 'opacity-0' : 'opacity-50'
        }`}
      >
        <div className="font-mincho text-[11px] tracking-[0.5em] text-mist-300">
          點 · 一 · 件 · 進 · 入
        </div>
      </div>

      {unraveling && <UnravelingOverlay />}
    </div>
  )
}

function UnravelingOverlay() {
  const threads = Array.from({ length: 18 })
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div
        className="absolute"
        style={{ left: '20%', top: '70%', width: 0, height: 0 }}
      >
        {threads.map((_, i) => {
          const angle = (i / threads.length) * Math.PI * 2
          const dist = 800 + Math.random() * 400
          const colors = [
            '#6f5d77',
            '#b08a4f',
            '#6e7d8a',
            '#b48a8e',
            '#7a8264',
          ]
          const color = colors[i % colors.length]
          return (
            <span
              key={i}
              className="absolute left-0 top-0 origin-left"
              style={{
                width: `${dist}px`,
                height: '1px',
                background: `linear-gradient(to right, ${color} 0%, transparent 90%)`,
                transform: `rotate(${angle}rad) scaleX(0)`,
                animation: `thread-out 1.3s ${0.02 * i}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                opacity: 0.7,
              }}
            />
          )
        })}
      </div>
      <style>{`
        @keyframes thread-out {
          0% { transform-origin: left; transform: scaleX(0); opacity: 0; }
          30% { opacity: 0.9; }
          100% { transform-origin: left; transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
