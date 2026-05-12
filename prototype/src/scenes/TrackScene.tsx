import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useNavigate, useParams } from 'react-router-dom'
import { trackById } from '@/data/tracks'
import { usePlayerStore } from '@/store/usePlayerStore'
import { ParticleField } from './particles/ParticleField'
import { PlayerHud } from '@/components/PlayerHud'
import { TransitionVeil } from '@/components/TransitionVeil'

/**
 * 单首歌的"洞穴里的房间"。
 *
 * 三层 stack：
 *  - 底层：视频 plate（占位用同色渐变；后续接 AI 视频文件）
 *  - 中层：R3F Canvas，跑粒子系统
 *  - 上层：HTML 播放器 UI
 */
export function TrackScene() {
  const { id } = useParams()
  const navigate = useNavigate()
  const trackId = Number(id)
  const track = trackById(trackId)
  const phase = usePlayerStore((s) => s.phase)
  const goToTrack = usePlayerStore((s) => s.goToTrack)
  const setProgress = usePlayerStore((s) => s.setProgress)
  const setAudioLevel = usePlayerStore((s) => s.setAudioLevel)

  const rafRef = useRef<number | null>(null)
  const startedAt = useRef<number>(0)

  // 进入时同步 store
  useEffect(() => {
    if (!track) return
    if (phase !== 'transition' && phase !== 'track') {
      goToTrack(track.id)
    }
  }, [track, phase, goToTrack])

  // 占位：模拟播放进度 + audio level
  useEffect(() => {
    if (!track) return
    startedAt.current = performance.now()
    const tick = () => {
      const t = (performance.now() - startedAt.current) / 1000
      const dur = 220 // 占位平均 3min40s
      setProgress((t % dur) / dur)
      // 模拟音乐能量：低频起伏 + 偶尔脉冲
      const level =
        0.35 +
        0.25 * Math.sin(t * 1.2) +
        0.15 * Math.sin(t * 4.7) +
        (Math.sin(t * 0.4) > 0.95 ? 0.3 : 0)
      setAudioLevel(Math.max(0, Math.min(1, level)))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [track, setProgress, setAudioLevel])

  if (!track) {
    return (
      <div className="grid h-full place-items-center bg-ink-900 text-mist-300">
        <button
          onClick={() => navigate('/')}
          className="font-mincho text-sm tracking-[0.3em] hover:text-ember"
        >
          回 入口
        </button>
      </div>
    )
  }

  // 占位 plate 渐变——按 particle 类型切色
  const plateGradient = PLATE_BG[track.particle]

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-900">
      {/* 底层：视频 plate 占位 */}
      <div
        className="absolute inset-0"
        style={{
          background: plateGradient,
          animation: 'plate-breathe 12s ease-in-out infinite',
        }}
      />
      {/* 微噪点 + vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_50%,transparent_30%,rgba(10,10,13,0.85)_100%)]" />

      {/* 中层：R3F 粒子 */}
      <div className="absolute inset-0">
        <Canvas
          dpr={[1, 1.6]}
          camera={{ position: [0, 0, 8], fov: 55 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <ParticleField kind={track.particle} count={1000} />
        </Canvas>
      </div>

      {/* 上层 UI */}
      <PlayerHud track={track} />

      {/* 进出转场 */}
      <TransitionVeil active={phase === 'transition'} />

      <style>{`
        @keyframes plate-breathe {
          0%, 100% { filter: brightness(0.85) saturate(1); }
          50% { filter: brightness(1.05) saturate(1.1); }
        }
      `}</style>
    </div>
  )
}

import type { ParticleKind } from '@/data/tracks'

const PLATE_BG: Record<ParticleKind, string> = {
  willow:    'radial-gradient(60% 70% at 40% 60%, #4a5847, #1a1f1d 70%, #0a0a0d)',
  sakura:    'radial-gradient(60% 70% at 50% 60%, #5e3a4a, #1f1518 70%, #0a0a0d)',
  firefly:   'radial-gradient(60% 70% at 50% 70%, #2b2e1f, #0e0f0a 70%, #050505)',
  snow:      'radial-gradient(60% 70% at 50% 60%, #2c3340, #0e1116 70%, #050609)',
  firework:  'radial-gradient(60% 70% at 50% 80%, #3b1f24, #18090d 70%, #050203)',
  rain:      'radial-gradient(60% 70% at 50% 60%, #1d2933, #0b0f14 70%, #050709)',
  dust:      'radial-gradient(60% 70% at 50% 60%, #483d2a, #1a1610 70%, #08070a)',
  dandelion: 'radial-gradient(60% 70% at 50% 60%, #4f4632, #1a1814 70%, #0a0a0a)',
  leaf:      'radial-gradient(60% 70% at 50% 60%, #3a2d1f, #14100a 70%, #060607)',
  ripple:    'radial-gradient(60% 70% at 50% 60%, #1f323a, #0a141a 70%, #050709)',
  thread:    'radial-gradient(60% 70% at 50% 60%, #2e2530, #14111a 70%, #08080a)',
  ember:     'radial-gradient(60% 70% at 50% 75%, #3a1c14, #160808 70%, #060304)',
}
