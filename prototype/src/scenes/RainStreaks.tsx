import { useEffect, useRef } from 'react'

/**
 * Canvas 2D 雨幕——径向向外的"驾车迎雨"效果。
 *
 * 物理模型：每滴雨在 v16 路面消失点（右上）的 z=far 位置 spawn，沿径向方向加速朝
 * 摄影机（z=0）飞过来。投影到 2D 后表现为：从消失点向外辐射、越靠外 streak 越长越快。
 * 这模拟了"骑车朝深处冲过去时被迎面打过来的雨"——雨方向 = 主体前进方向。
 *
 * 参考: https://dev.to/soorajsnblaze333/make-it-rain-in-html-canvas-1fj0
 */
export function RainStreaks() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0

    type Drop = {
      angle: number      // 角度（从消失点出发的方向）
      dist: number       // 距离（径向 px，从消失点到当前位置）
      speed: number      // 当前帧增量
      accel: number      // 加速度因子
      trail: number      // 拖尾长度因子
      width: number
      alpha: number
    }
    let drops: Drop[] = []

    const COUNT = 220
    let dpr = 1

    function resize() {
      if (!canvas) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    function spawn(d?: Drop): Drop {
      // v16 路面消失点在画面 ~78% 横, ~52% 竖
      // 雨主要朝下半画面 + 左侧（车前进方向）扩散
      const drop = d ?? ({} as Drop)
      // 偏离平均向下/向左的角度分布（车朝左前进 → 大部分雨朝左下方扩散到画面里）
      // 角度：以消失点为中心，0 = 正右，π = 正左，π/2 = 下，-π/2 = 上
      // 偏好的范围：往下 + 往左为主，少量上方/右方做点缀
      const r = Math.random()
      let angle: number
      if (r < 0.6) {
        // 主流：下半 + 左前方  (rad: π/2 ~ 3π/2)
        angle = Math.PI / 2 + Math.random() * Math.PI
      } else if (r < 0.85) {
        // 次：上方左侧
        angle = Math.PI + Math.random() * (Math.PI / 2)
      } else {
        // 少：右下，呼应跟随车后被甩出的雨
        angle = Math.PI / 2 + Math.random() * (Math.PI / 4) - Math.PI / 8
      }
      drop.angle = angle
      drop.dist = 20 + Math.random() * 60 // 起点小半径
      drop.speed = 1.6 + Math.random() * 1.2
      drop.accel = 1.018 + Math.random() * 0.015 // 加速度（每帧距离倍增系数）
      drop.trail = 0.18 + Math.random() * 0.18 // tail 占当前 dist 的比例
      drop.width = 0.7 + Math.random() * 1.4
      drop.alpha = 0.18 + Math.random() * 0.55
      return drop
    }

    drops = Array.from({ length: COUNT }, () => {
      const d = spawn()
      // initial spread across various distances so rain is not "starting from blank"
      d.dist = 20 + Math.random() * 600
      return d
    })

    function tick() {
      const w = window.innerWidth
      const h = window.innerHeight
      const vpx = w * 0.78
      const vpy = h * 0.52
      const maxDist = Math.hypot(w, h) * 1.1

      ctx.clearRect(0, 0, w, h)
      ctx.lineCap = 'round'

      for (const d of drops) {
        // accelerate outward (perspective foreshortening: as drop approaches camera, speed grows)
        const step = d.speed * Math.pow(d.accel, d.dist * 0.05)
        d.dist += step

        const cosA = Math.cos(d.angle)
        const sinA = Math.sin(d.angle)
        const headX = vpx + cosA * d.dist
        const headY = vpy + sinA * d.dist
        const tailLen = d.dist * d.trail + step * 4
        const tailX = vpx + cosA * (d.dist - tailLen)
        const tailY = vpy + sinA * (d.dist - tailLen)

        // off-screen → respawn
        if (
          d.dist > maxDist ||
          headX < -50 || headX > w + 50 ||
          headY < -50 || headY > h + 50
        ) {
          spawn(d)
          continue
        }

        // streak — gradient from tail (transparent) to head (bright)
        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY)
        grad.addColorStop(0, `rgba(220, 232, 242, 0)`)
        grad.addColorStop(0.6, `rgba(220, 232, 242, ${d.alpha * 0.45})`)
        grad.addColorStop(1, `rgba(255, 255, 255, ${d.alpha})`)
        ctx.strokeStyle = grad
        // streak width grows slightly with depth (perspective)
        ctx.lineWidth = d.width * (0.6 + d.dist * 0.0008)
        ctx.beginPath()
        ctx.moveTo(tailX, tailY)
        ctx.lineTo(headX, headY)
        ctx.stroke()
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 z-[5]"
    />
  )
}
