import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export const TIMELINE_STORAGE_KEY = 'track01_timeline'

const CLIP_LABELS = [
  '腕部特写', '坐着', '眼镜·奔跑', '短发·奔跑',
  '金色田野', '围栏', '奔跑B', '转场→走廊',
]
const CLIP_SRCS = [
  't01_flash_A_wrist.mp4', 't01_flash_B_sitting.mp4',
  't01_flash_F_running.mp4', 't01_flash_H_running.mp4',
  't01_flash_C_field.mp4', 't01_flash_D_fence.mp4',
  't01_flash_B_running.mp4', 't01_flash_G_transition.mp4',
]
const CLIP_COLORS = [
  '#c9a84c', '#d4916a', '#e07b5a', '#c4694d',
  '#5a9e7a', '#4a7fa0', '#3a5f8a', '#7a7a8a',
]
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.5, 2, 4]

export interface ClipConfig {
  duration: number   // wall-clock display time (ms)
  trimStart: number  // seconds into source video
  trimEnd: number    // seconds — 0 means natural loop
  speed: number      // playback rate
}

export interface TimelineConfig {
  clips: ClipConfig[]
  crossFade: number
}

export const DEFAULT_CLIPS: ClipConfig[] = [
  { duration: 3000, trimStart: 0, trimEnd: 0, speed: 1 },
  { duration: 3000, trimStart: 0, trimEnd: 0, speed: 1 },
  { duration: 3000, trimStart: 0, trimEnd: 0, speed: 1 },
  { duration: 3000, trimStart: 0, trimEnd: 0, speed: 1 },
  { duration: 3000, trimStart: 0, trimEnd: 0, speed: 1 },
  { duration: 3000, trimStart: 0, trimEnd: 0, speed: 1 },
  { duration: 3000, trimStart: 0, trimEnd: 0, speed: 1 },
  { duration: 1000, trimStart: 0, trimEnd: 0, speed: 4 },
]
export const DEFAULT_CROSSFADE = 600

export function loadTimelineConfig(): TimelineConfig {
  try {
    const s = localStorage.getItem(TIMELINE_STORAGE_KEY)
    if (s) {
      const raw = JSON.parse(s)
      // Current format
      if (Array.isArray(raw.clips) && raw.clips.length === DEFAULT_CLIPS.length) {
        return raw as TimelineConfig
      }
      // Migrate old format (durations[])
      if (Array.isArray(raw.durations) && raw.durations.length === DEFAULT_CLIPS.length) {
        return {
          clips: raw.durations.map((dur: number, i: number) => ({
            duration: dur,
            trimStart: 0,
            trimEnd: 0,
            speed: i === (raw.transitionClipIdx ?? 7) ? 4 : 1,
          })),
          crossFade: raw.crossFade ?? DEFAULT_CROSSFADE,
        }
      }
    }
  } catch {}
  return { clips: DEFAULT_CLIPS.map(c => ({ ...c })), crossFade: DEFAULT_CROSSFADE }
}

function saveConfig(cfg: TimelineConfig) {
  localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(cfg))
}

const MIN_DURATION = 200
const TIMELINE_HEIGHT = 56
const TRIM_MAX_S = 30  // max source video duration assumed for trim slider

// ── Two-handle trim bar ───────────────────────────────────────────
function TrimBar({
  trimStart, trimEnd, color, onChange,
}: {
  trimStart: number
  trimEnd: number
  color: string
  onChange: (start: number, end: number) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'in' | 'out' | null>(null)
  const effectiveEnd = trimEnd > 0 ? trimEnd : TRIM_MAX_S

  const snap = (v: number) => Math.round(v * 100) / 100

  const getPct = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const onPointerDown = (e: React.PointerEvent, handle: 'in' | 'out') => {
    e.stopPropagation()
    e.preventDefault()
    dragging.current = handle
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !barRef.current) return
    const t = getPct(e.clientX) * TRIM_MAX_S
    if (dragging.current === 'in') {
      const newStart = Math.max(0, Math.min(snap(t), effectiveEnd - 0.1))
      onChange(newStart, trimEnd)
    } else {
      const newEnd = Math.max(trimStart + 0.1, snap(t))
      // drag to far right → reset to natural end (0)
      onChange(trimStart, newEnd >= TRIM_MAX_S - 0.1 ? 0 : newEnd)
    }
  }

  const onPointerUp = () => { dragging.current = null }

  const inPct  = (trimStart / TRIM_MAX_S) * 100
  const outPct = (effectiveEnd / TRIM_MAX_S) * 100

  return (
    <div className="mt-5 mb-7">
      <div
        ref={barRef}
        className="relative h-7 w-full select-none rounded"
        style={{ background: 'rgba(255,255,255,0.05)' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Active zone */}
        <div
          className="pointer-events-none absolute top-0 h-full rounded-sm"
          style={{
            left: `${inPct}%`,
            width: `${Math.max(0, outPct - inPct)}%`,
            background: `${color}33`,
            borderLeft: `2px solid ${color}bb`,
            borderRight: `2px solid ${trimEnd > 0 ? color + 'bb' : color + '33'}`,
          }}
        />

        {/* In-point handle */}
        <div
          className="absolute top-0 h-full cursor-ew-resize"
          style={{ left: `${inPct}%`, width: 20, transform: 'translateX(-50%)', zIndex: 2 }}
          onPointerDown={(e) => onPointerDown(e, 'in')}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-2 rounded-sm border"
            style={{ background: '#1e1e24', borderColor: color }}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-px">
              <div className="w-1 h-px" style={{ background: color }} />
              <div className="w-1 h-px" style={{ background: color }} />
            </div>
          </div>
        </div>

        {/* Out-point handle */}
        <div
          className="absolute top-0 h-full cursor-ew-resize"
          style={{ left: `${outPct}%`, width: 20, transform: 'translateX(-50%)', zIndex: 2 }}
          onPointerDown={(e) => onPointerDown(e, 'out')}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-2 rounded-sm border"
            style={{
              background: '#1e1e24',
              borderColor: trimEnd > 0 ? color : color + '44',
              opacity: trimEnd > 0 ? 1 : 0.35,
            }}
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-px">
              <div className="w-1 h-px" style={{ background: trimEnd > 0 ? color : color + '66' }} />
              <div className="w-1 h-px" style={{ background: trimEnd > 0 ? color : color + '66' }} />
            </div>
          </div>
        </div>

        {/* Tick marks every 5s */}
        {[5, 10, 15, 20, 25].map(s => (
          <div
            key={s}
            className="pointer-events-none absolute top-0 h-full"
            style={{ left: `${(s / TRIM_MAX_S) * 100}%`, borderLeft: '1px solid rgba(255,255,255,0.07)' }}
          />
        ))}
      </div>

      {/* Labels below bar */}
      <div className="relative mt-1 h-4 text-[9px] tabular-nums text-mist-300/40">
        <span className="absolute" style={{ left: `${inPct}%`, transform: 'translateX(-50%)' }}>
          {trimStart.toFixed(2)}s
        </span>
        <span
          className="absolute"
          style={{ left: `${outPct}%`, transform: 'translateX(-50%)', opacity: trimEnd > 0 ? 1 : 0.4 }}
        >
          {trimEnd > 0 ? `${trimEnd.toFixed(2)}s` : '自然结束'}
        </span>
      </div>
      <div className="mt-1 text-[9px] text-mist-300/25">
        拖动左柄 = 入点 · 拖动右柄向左 = 出点 · 右柄拖到最右 = 自然循环
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────
export function TimelineEditor() {
  const navigate = useNavigate()
  const [cfg, setCfg] = useState<TimelineConfig>(loadTimelineConfig)
  const [selected, setSelected] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  const totalMs = cfg.clips.reduce((a, c) => a + c.duration, 0)

  const apply = useCallback((next: TimelineConfig) => {
    setCfg(next)
    saveConfig(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }, [])

  const updateClip = (idx: number, patch: Partial<ClipConfig>) => {
    const clips = cfg.clips.map((c, i) => i === idx ? { ...c, ...patch } : c)
    apply({ ...cfg, clips })
  }

  const reset = () => {
    apply({ clips: DEFAULT_CLIPS.map(c => ({ ...c })), crossFade: DEFAULT_CROSSFADE })
    setSelected(null)
  }

  // ── Drag resize (right edge of timeline block) ─────────────────
  const dragRef = useRef<{
    idx: number; startX: number; startDur: number; msPerPx: number
  } | null>(null)

  const onResizeDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.stopPropagation(); e.preventDefault()
    const w = timelineRef.current?.clientWidth ?? 800
    dragRef.current = { idx, startX: e.clientX, startDur: cfg.clips[idx].duration, msPerPx: totalMs / w }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [cfg.clips, totalMs])

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    const dr = dragRef.current
    if (!dr) return
    const next = Math.max(MIN_DURATION, Math.round((dr.startDur + (e.clientX - dr.startX) * dr.msPerPx) / 50) * 50)
    const clips = cfg.clips.map((c, i) => i === dr.idx ? { ...c, duration: next } : c)
    const nc = { ...cfg, clips }
    setCfg(nc); saveConfig(nc)
  }, [cfg])

  const onResizeUp = useCallback(() => {
    dragRef.current = null
    setSaved(true); setTimeout(() => setSaved(false), 1200)
  }, [])

  const sel = selected !== null ? cfg.clips[selected] : null

  return (
    <div
      className="relative flex h-full w-full flex-col bg-ink-900 font-sans text-mist-200 overflow-hidden"
      style={{ fontSize: 13, letterSpacing: '0.02em' }}
    >
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-mist-200/10 px-6 py-3">
        <div>
          <span className="font-mincho text-[15px] tracking-[0.2em] text-mist-200/80">时间线编辑器</span>
          <span className="ml-3 text-[11px] text-mist-300/40">Track 01 · 解开那束结</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] transition-opacity duration-300" style={{ color: '#5aad7a', opacity: saved ? 1 : 0 }}>
            ✓ 已同步
          </span>
          <button onClick={reset} className="rounded px-3 py-1 text-[11px] text-mist-300/50 hover:text-mist-200/80 transition border border-mist-200/10 hover:border-mist-200/20">
            重置默认
          </button>
          <button onClick={() => navigate('/')} className="rounded px-3 py-1 text-[11px] bg-ember/20 text-ember hover:bg-ember/30 transition border border-ember/30">
            预览场景 →
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="shrink-0 flex gap-6 border-b border-mist-200/10 px-6 py-2 text-[11px] text-mist-300/50">
        <span>总时长 <b className="text-mist-200/80">{(totalMs / 1000).toFixed(2)}s</b></span>
        <span>淡入淡出 <b className="text-mist-200/80">{cfg.crossFade}ms</b></span>
        <span>片段数 <b className="text-mist-200/80">{cfg.clips.length}</b></span>
      </div>

      {/* ── Timeline ── */}
      <div className="shrink-0 px-6 pt-5 pb-2">
        <div
          ref={timelineRef}
          className="relative w-full select-none"
          style={{ height: TIMELINE_HEIGHT }}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        >
          {cfg.clips.map((clip, i) => {
            const leftPct = cfg.clips.slice(0, i).reduce((a, c) => a + c.duration, 0) / totalMs * 100
            const widthPct = clip.duration / totalMs * 100
            const isSelected = selected === i

            return (
              <div
                key={i}
                className="absolute top-0 flex flex-col overflow-hidden rounded"
                style={{
                  left: `${leftPct}%`,
                  width: `calc(${widthPct}% - 2px)`,
                  height: TIMELINE_HEIGHT,
                  background: isSelected ? `${CLIP_COLORS[i]}cc` : `${CLIP_COLORS[i]}66`,
                  border: `1px solid ${isSelected ? CLIP_COLORS[i] : CLIP_COLORS[i] + '55'}`,
                  cursor: 'pointer',
                }}
                onClick={() => setSelected(i === selected ? null : i)}
              >
                <div className="flex h-full flex-col justify-between px-2 py-1 overflow-hidden">
                  <span className="truncate text-[10px] font-bold text-white/90" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {clip.speed !== 1 ? `${clip.speed}× ` : ''}{i + 1}. {CLIP_LABELS[i]}
                  </span>
                  <span className="text-[10px] text-white/70 tabular-nums" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {(clip.duration / 1000).toFixed(1)}s
                    {clip.trimStart > 0 ? ` @${clip.trimStart}s` : ''}
                  </span>
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-3 cursor-ew-resize"
                  style={{ background: 'rgba(255,255,255,0.12)' }}
                  onPointerDown={(e) => onResizeDown(e, i)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )
          })}

          {/* Crossfade markers */}
          {cfg.clips.slice(0, -1).map((_, i) => {
            const boundary = cfg.clips.slice(0, i + 1).reduce((a, c) => a + c.duration, 0) / totalMs * 100
            const cfPct = cfg.crossFade / totalMs * 100
            return (
              <div
                key={`cf-${i}`}
                className="pointer-events-none absolute top-0"
                style={{
                  left: `calc(${boundary}% - ${cfPct / 2}%)`,
                  width: `${cfPct}%`,
                  height: TIMELINE_HEIGHT,
                  background: 'rgba(255,255,255,0.05)',
                  borderLeft: '1px dashed rgba(255,255,255,0.15)',
                  borderRight: '1px dashed rgba(255,255,255,0.15)',
                }}
              />
            )
          })}
        </div>

        {/* Ruler */}
        <div className="relative mt-1 h-4 text-[9px] text-mist-300/30 tabular-nums">
          {Array.from({ length: Math.ceil(totalMs / 1000) + 1 }, (_, s) => (
            <span key={s} className="absolute" style={{ left: `${(s * 1000 / totalMs) * 100}%`, transform: 'translateX(-50%)' }}>
              {s}s
            </span>
          ))}
        </div>
      </div>

      {/* ── Scrollable bottom section ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Selected clip detail */}
        {selected !== null && sel && (
          <div className="mx-6 mt-2 rounded border border-mist-200/10 bg-mist-200/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm shrink-0" style={{ background: CLIP_COLORS[selected] }} />
              <span className="font-bold text-mist-200/90">#{selected + 1} · {CLIP_LABELS[selected]}</span>
              <span className="ml-1 text-[10px] text-mist-300/30">{CLIP_SRCS[selected]}</span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-3 mb-3">
              <label className="text-[11px] text-mist-300/50 w-14 shrink-0">显示时长</label>
              <input
                type="range" min={MIN_DURATION} max={8000} step={50}
                value={sel.duration}
                onChange={(e) => updateClip(selected, { duration: +e.target.value })}
                className="flex-1"
                style={{ accentColor: CLIP_COLORS[selected] }}
              />
              <input
                type="number" min={MIN_DURATION} max={8000} step={50}
                value={sel.duration}
                onChange={(e) => updateClip(selected, { duration: Math.max(MIN_DURATION, +e.target.value) })}
                className="w-20 rounded border border-mist-200/15 bg-mist-200/5 px-2 py-1 text-right text-[12px] text-mist-200/80 tabular-nums"
              />
              <span className="text-[11px] text-mist-300/40">ms</span>
            </div>

            {/* Speed */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-[11px] text-mist-300/50 w-14 shrink-0">播放速度</label>
              <div className="flex gap-1 flex-wrap">
                {SPEED_PRESETS.map(sp => (
                  <button
                    key={sp}
                    onClick={() => updateClip(selected, { speed: sp })}
                    className="rounded px-2 py-0.5 text-[11px] tabular-nums transition border"
                    style={{
                      borderColor: sel.speed === sp ? CLIP_COLORS[selected] : 'rgba(255,255,255,0.1)',
                      background: sel.speed === sp ? `${CLIP_COLORS[selected]}33` : 'transparent',
                      color: sel.speed === sp ? CLIP_COLORS[selected] : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {sp}×
                  </button>
                ))}
                {/* Custom speed input */}
                <input
                  type="number" min={0.1} max={16} step={0.05}
                  value={sel.speed}
                  onChange={(e) => updateClip(selected, { speed: Math.max(0.1, +e.target.value) })}
                  className="w-16 rounded border border-mist-200/10 bg-mist-200/5 px-2 py-0.5 text-[11px] text-mist-200/60 tabular-nums"
                  placeholder="自定"
                />
              </div>
            </div>

            {/* Trim bar */}
            <div>
              <div className="mb-1 text-[11px] text-mist-300/50">
                播放区间
                <span className="ml-2 text-mist-300/30">
                  {sel.trimStart > 0 || sel.trimEnd > 0
                    ? `${sel.trimStart.toFixed(2)}s → ${sel.trimEnd > 0 ? sel.trimEnd.toFixed(2) + 's' : '自然结束'}`
                    : '从头播 · 自然循环'}
                </span>
              </div>
              <TrimBar
                trimStart={sel.trimStart}
                trimEnd={sel.trimEnd}
                color={CLIP_COLORS[selected]}
                onChange={(start, end) => updateClip(selected, { trimStart: start, trimEnd: end })}
              />
            </div>
          </div>
        )}

        {/* Global crossfade */}
        <div className="mx-6 mt-3 rounded border border-mist-200/10 bg-mist-200/5 p-4">
          <div className="flex items-center gap-3">
            <label className="text-[11px] text-mist-300/50 w-20 shrink-0">全局淡入淡出</label>
            <input
              type="range" min={0} max={1200} step={50}
              value={cfg.crossFade}
              onChange={(e) => apply({ ...cfg, crossFade: +e.target.value })}
              className="flex-1"
              style={{ accentColor: '#c9a84c' }}
            />
            <input
              type="number" min={0} max={1200} step={50}
              value={cfg.crossFade}
              onChange={(e) => apply({ ...cfg, crossFade: +e.target.value })}
              className="w-20 rounded border border-mist-200/15 bg-mist-200/5 px-2 py-1 text-right text-[12px] text-mist-200/80 tabular-nums"
            />
            <span className="text-[11px] text-mist-300/40">ms</span>
          </div>
        </div>

        {/* Clip table */}
        <div className="mx-6 mt-3 mb-3 rounded border border-mist-200/10 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-mist-200/10 text-[10px] text-mist-300/40">
                <th className="px-3 py-2 text-left font-normal">#</th>
                <th className="px-3 py-2 text-left font-normal">片段</th>
                <th className="px-3 py-2 text-right font-normal">速度</th>
                <th className="px-3 py-2 text-right font-normal">入点</th>
                <th className="px-3 py-2 text-right font-normal">出点</th>
                <th className="px-3 py-2 text-right font-normal">显示</th>
                <th className="px-3 py-2 text-right font-normal">开始@</th>
              </tr>
            </thead>
            <tbody>
              {cfg.clips.map((clip, i) => {
                const startMs = cfg.clips.slice(0, i).reduce((a, c) => a + c.duration, 0)
                return (
                  <tr
                    key={i}
                    className="border-b border-mist-200/5 cursor-pointer"
                    style={{ background: selected === i ? `${CLIP_COLORS[i]}22` : 'transparent' }}
                    onClick={() => setSelected(i === selected ? null : i)}
                  >
                    <td className="px-3 py-1.5 tabular-nums text-mist-300/40">{i + 1}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-sm shrink-0" style={{ background: CLIP_COLORS[i] }} />
                        <span className="text-mist-200/75">{CLIP_LABELS[i]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums" style={{ color: clip.speed !== 1 ? '#e0a84c' : 'rgba(255,255,255,0.35)' }}>
                      {clip.speed}×
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-mist-300/40">
                      {clip.trimStart > 0 ? `${clip.trimStart}s` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-mist-300/40">
                      {clip.trimEnd > 0 ? `${clip.trimEnd}s` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-mist-200/70">
                      {(clip.duration / 1000).toFixed(2)}s
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-mist-300/40">
                      {(startMs / 1000).toFixed(2)}s
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="text-[11px] text-mist-300/50 border-t border-mist-200/10">
                <td colSpan={5} className="px-3 py-2 text-right">总计</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold text-mist-200/80">{(totalMs / 1000).toFixed(2)}s</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 pb-4 text-[10px] text-mist-300/20">
          拖拽片段右边缘 = 调时长 · 点击片段 = 精调入出点、速度 · 改动实时同步到场景
        </div>
      </div>
    </div>
  )
}
