import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ParticleKind } from '@/data/tracks'
import { usePlayerStore } from '@/store/usePlayerStore'

/** Lazy-built circular sprite for soft, round particles. */
let _softSprite: THREE.Texture | null = null
function getSoftSprite() {
  if (_softSprite) return _softSprite
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.65)')
  grad.addColorStop(0.8, 'rgba(255,255,255,0.05)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  _softSprite = tex
  return tex
}

type Props = {
  kind: ParticleKind
  count?: number
}

/**
 * 通用粒子层——按粒子种类切换颜色/大小/运动模式。
 * 每帧响应鼠标位置 + audioLevel。
 *
 * 简化版；正式上线前会按 kind 拆成各自的 shader。
 */
export function ParticleField({ kind, count = 800 }: Props) {
  const ref = useRef<THREE.Points>(null)
  const audioLevel = usePlayerStore((s) => s.audioLevel)

  const cfg = PARTICLE_CONFIG[kind]

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 18
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [count])

  const velocities = useMemo(() => {
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      vel[i * 3 + 0] = (Math.random() - 0.5) * cfg.driftX
      vel[i * 3 + 1] = -Math.random() * cfg.fall + cfg.lift
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01
    }
    return vel
  }, [count, cfg.driftX, cfg.fall, cfg.lift])

  useFrame((state, delta) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    const t = state.clock.elapsedTime
    const mx = state.pointer.x
    const my = state.pointer.y
    const dt = Math.min(delta, 0.05) * 60

    for (let i = 0; i < count; i++) {
      const ix = i * 3
      arr[ix + 0] += velocities[ix + 0] * dt
      arr[ix + 1] += velocities[ix + 1] * dt
      arr[ix + 2] += velocities[ix + 2] * dt

      // 鼠标轻微吸引
      arr[ix + 0] += mx * cfg.mouseInfluence * 0.015
      arr[ix + 1] += my * cfg.mouseInfluence * 0.015

      // 摇曳
      arr[ix + 0] += Math.sin(t * cfg.swayFreq + i * 0.3) * cfg.sway * delta
      arr[ix + 1] +=
        Math.cos(t * cfg.swayFreq * 0.7 + i * 0.5) * cfg.sway * delta * 0.4

      // audio-reactive 抖动
      arr[ix + 1] += audioLevel * cfg.audioPunch * Math.sin(t * 4 + i) * 0.01

      // wrap around
      if (arr[ix + 1] < -6) arr[ix + 1] = 6
      if (arr[ix + 1] > 6) arr[ix + 1] = -6
      if (arr[ix + 0] < -10) arr[ix + 0] = 10
      if (arr[ix + 0] > 10) arr[ix + 0] = -10
    }
    pos.needsUpdate = true
    ref.current.rotation.z = Math.sin(t * 0.05) * 0.02
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={cfg.size}
        sizeAttenuation
        transparent
        opacity={cfg.opacity}
        color={cfg.color}
        depthWrite={false}
        map={getSoftSprite()}
        alphaTest={0.001}
        blending={cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  )
}

type CfgEntry = {
  color: string
  size: number
  opacity: number
  fall: number
  lift: number
  driftX: number
  sway: number
  swayFreq: number
  mouseInfluence: number
  audioPunch: number
  additive: boolean
}

const PARTICLE_CONFIG: Record<ParticleKind, CfgEntry> = {
  willow:    { color: '#e8e2c4', size: 0.18, opacity: 0.75, fall: 0.005, lift: 0.005, driftX: 0.04,  sway: 0.4, swayFreq: 0.6, mouseInfluence: 1,   audioPunch: 0.6, additive: false },
  sakura:    { color: '#f5c4d3', size: 0.22, opacity: 0.85, fall: 0.02,  lift: 0,     driftX: 0.05,  sway: 0.5, swayFreq: 0.8, mouseInfluence: 0.8, audioPunch: 0.5, additive: false },
  firefly:   { color: '#ffd66e', size: 0.16, opacity: 1.0,  fall: 0,     lift: 0.005, driftX: 0.03,  sway: 0.6, swayFreq: 1.4, mouseInfluence: 1.5, audioPunch: 1.5, additive: true  },
  snow:      { color: '#f4f9ff', size: 0.20, opacity: 0.9,  fall: 0.04,  lift: 0,     driftX: 0.02,  sway: 0.3, swayFreq: 0.4, mouseInfluence: 0.4, audioPunch: 0.3, additive: false },
  firework:  { color: '#ffb074', size: 0.14, opacity: 0.95, fall: 0.06,  lift: 0,     driftX: 0.08,  sway: 0.2, swayFreq: 2,   mouseInfluence: 0.3, audioPunch: 3,   additive: true  },
  rain:      { color: '#b6c8d6', size: 0.08, opacity: 0.55, fall: 0.45,  lift: 0,     driftX: 0.005, sway: 0.05, swayFreq: 0.2, mouseInfluence: 0.2, audioPunch: 0.15, additive: false },
  dust:      { color: '#e8d4a3', size: 0.12, opacity: 0.55, fall: 0.002, lift: 0.002, driftX: 0.01,  sway: 0.2, swayFreq: 0.3, mouseInfluence: 0.6, audioPunch: 0.3, additive: true  },
  dandelion: { color: '#fbf6e7', size: 0.24, opacity: 0.9,  fall: 0.003, lift: 0.008, driftX: 0.03,  sway: 0.5, swayFreq: 0.5, mouseInfluence: 1.4, audioPunch: 0.6, additive: false },
  leaf:      { color: '#c89a64', size: 0.26, opacity: 0.85, fall: 0.025, lift: 0,     driftX: 0.06,  sway: 0.7, swayFreq: 0.6, mouseInfluence: 0.7, audioPunch: 0.6, additive: false },
  ripple:    { color: '#a8c4d4', size: 0.18, opacity: 0.6,  fall: 0,     lift: 0,     driftX: 0,     sway: 0.3, swayFreq: 1.2, mouseInfluence: 1.2, audioPunch: 1.0, additive: true  },
  thread:    { color: '#dcb578', size: 0.16, opacity: 0.85, fall: 0.01,  lift: 0.005, driftX: 0.04,  sway: 0.6, swayFreq: 0.7, mouseInfluence: 1,   audioPunch: 0.8, additive: false },
  ember:     { color: '#ffae7d', size: 0.16, opacity: 1.0,  fall: 0,     lift: 0.02,  driftX: 0.02,  sway: 0.4, swayFreq: 1,   mouseInfluence: 0.5, audioPunch: 2,   additive: true  },
}
