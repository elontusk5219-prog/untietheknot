import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export const TIMELINE_STORAGE_KEY = 'track01_timeline'
const BASE = import.meta.env.BASE_URL

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
const MIN_DURATION  = 200   // ms
const TRIM_S_PER_PX = 0.05  // seconds per pixel for trimStart drag

export interface ClipConfig {
  duration: number   // wall-clock display (ms)
  trimStart: number  // source seek point (s)
  trimEnd: number    // source loop point (s), 0 = natural
  speed: number
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
      if (Array.isArray(raw.clips) && raw.clips.length === DEFAULT_CLIPS.length) return raw
      if (Array.isArray(raw.durations) && raw.durations.length === DEFAULT_CLIPS.length) {
        return {
          clips: raw.durations.map((dur: number, i: number) => ({
            duration: dur, trimStart: 0, trimEnd: 0,
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

function fmt(s: number) { return s.toFixed(2) + 's' }
function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(1).padStart(4, '0')
  return `${m}:${sec}`
}

// ── Drag state ────────────────────────────────────────────────────
type DragState =
  | { type: 'idle' }
  | { type: 'trimLeft';  idx: number; startX: number; startVal: number }
  | { type: 'trimRight'; idx: number; startX: number; startVal: number; msPerPx: number }
  | { type: 'reorder';   idx: number; startX: number; currentX: number }

export function TimelineEditor() {
  const navigate = useNavigate()
  const [cfg, setCfg]         = useState<TimelineConfig>(loadTimelineConfig)
  const [selected, setSelected] = useState<number | null>(0)
  const [saved, setSaved]     = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [previewDur, setPreviewDur]   = useState(0)
  const [previewPlaying, setPreviewPlaying] = useState(false)

  const timelineRef   = useRef<HTMLDivElement>(null)
  const previewRef    = useRef<HTMLVideoElement>(null)
  const dragRef       = useRef<DragState>({ type: 'idle' })
  const trimRafRef    = useRef<number>(0)

  // ── Sequence playback ─────────────────────────────────────────
  const [seqPlaying,  setSeqPlaying]  = useState(false)
  const [seqClipIdx,  setSeqClipIdx]  = useState(-1)
  const [seqTime,     setSeqTime]     = useState(0)
  const seqTimeRef    = useRef(0)         // authoritative time (no stale-closure)
  const seqStartRef   = useRef(0)         // performance.now() anchor
  const seqClipIdxRef = useRef(-1)        // last loaded clip
  const seqRafRef     = useRef(0)

  const totalMs = cfg.clips.reduce((a, c) => a + c.duration, 0)
  const [audioDurMs, setAudioDurMs] = useState(0)

  // Load audio duration once so the timeline can show the full song window
  useEffect(() => {
    const a = new Audio(`${BASE}t01_audio.mp3`)
    a.addEventListener('loadedmetadata', () => setAudioDurMs(a.duration * 1000), { once: true })
    a.load()
  }, [])

  // Timeline scale = clips + 10% headroom. Audio track shown as mini context bar separately.
  const timelineMs = totalMs * 1.1

  // ── Apply + save ─────────────────────────────────────────────
  const apply = useCallback((next: TimelineConfig) => {
    setCfg(next)
    saveConfig(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }, [])

  const updateClip = useCallback((idx: number, patch: Partial<ClipConfig>) => {
    const clips = cfg.clips.map((c, i) => i === idx ? { ...c, ...patch } : c)
    apply({ ...cfg, clips })
  }, [cfg, apply])

  // ── Single-clip preview (only when not in sequence mode) ────────
  useEffect(() => {
    if (selected !== null && !seqPlaying) loadSingleClip(selected)
  }, [selected])

  useEffect(() => {
    if (selected === null || seqPlaying) return
    const video = previewRef.current
    if (video) video.playbackRate = cfg.clips[selected].speed
  }, [selected !== null ? cfg.clips[selected]?.speed : null])

  // Time update
  useEffect(() => {
    const video = previewRef.current
    if (!video) return
    const onTime = () => setPreviewTime(video.currentTime)
    const onPlay = () => setPreviewPlaying(true)
    const onPause = () => setPreviewPlaying(false)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play',  onPlay)
    video.addEventListener('pause', onPause)
    return () => {
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play',  onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [])

  // trimEnd loop in preview
  useEffect(() => {
    cancelAnimationFrame(trimRafRef.current)
    const video = previewRef.current
    if (!video || selected === null) return
    const clip = cfg.clips[selected]
    if (!clip.trimEnd) return
    const loop = () => {
      if (video.currentTime >= clip.trimEnd) video.currentTime = clip.trimStart
      trimRafRef.current = requestAnimationFrame(loop)
    }
    trimRafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(trimRafRef.current)
  }, [selected, selected !== null ? cfg.clips[selected]?.trimEnd : 0,
      selected !== null ? cfg.clips[selected]?.trimStart : 0])

  // Return clip index at a given scene time (ms)
  const clipAtMs = useCallback((ms: number) => {
    let acc = 0
    for (let i = 0; i < cfg.clips.length; i++) {
      if (ms < acc + cfg.clips[i].duration) return i
      acc += cfg.clips[i].duration
    }
    return cfg.clips.length - 1
  }, [cfg.clips])

  // rAF loop — updates seqTime and fires clip-index changes
  useEffect(() => {
    cancelAnimationFrame(seqRafRef.current)
    if (!seqPlaying) return
    seqStartRef.current = performance.now() - seqTimeRef.current
    const tick = () => {
      const t = Math.min(performance.now() - seqStartRef.current, totalMs)
      seqTimeRef.current = t
      setSeqTime(t)
      const idx = clipAtMs(t)
      if (idx !== seqClipIdxRef.current) {
        seqClipIdxRef.current = idx
        setSeqClipIdx(idx)
      }
      if (t < totalMs) {
        seqRafRef.current = requestAnimationFrame(tick)
      } else {
        setSeqPlaying(false)
      }
    }
    seqRafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(seqRafRef.current)
  }, [seqPlaying, totalMs, clipAtMs])

  // Switch video src when the active clip changes during sequence playback
  useEffect(() => {
    if (!seqPlaying || seqClipIdx < 0) return
    const video = previewRef.current
    if (!video) return
    const clip = cfg.clips[seqClipIdx]
    video.pause()
    video.src = `${BASE}${CLIP_SRCS[seqClipIdx]}`
    video.playbackRate = clip.speed
    const onMeta = () => {
      video.currentTime = clip.trimStart
      video.play().catch(() => {})
    }
    video.addEventListener('loadedmetadata', onMeta, { once: true })
    video.load()
  }, [seqClipIdx, seqPlaying])

  // Load selected clip into preview when not in sequence mode
  const loadSingleClip = useCallback((idx: number) => {
    if (seqPlaying) return
    const video = previewRef.current
    if (!video) return
    const clip = cfg.clips[idx]
    video.src = `${BASE}${CLIP_SRCS[idx]}`
    video.playbackRate = clip.speed
    video.load()
    video.addEventListener('loadedmetadata', () => {
      setPreviewDur(video.duration)
      video.currentTime = clip.trimStart
      setPreviewTime(clip.trimStart)
    }, { once: true })
  }, [seqPlaying, cfg.clips])

  const toggleSeq = () => {
    if (seqPlaying) {
      // Pause
      setSeqPlaying(false)
      previewRef.current?.pause()
    } else {
      // Start or resume
      if (seqTimeRef.current >= totalMs) {
        seqTimeRef.current = 0
        setSeqTime(0)
        seqClipIdxRef.current = -1
        setSeqClipIdx(-1)
      }
      setSeqPlaying(true)
    }
  }

  const stopSeq = () => {
    setSeqPlaying(false)
    setSeqTime(0)
    seqTimeRef.current = 0
    seqClipIdxRef.current = -1
    setSeqClipIdx(-1)
    previewRef.current?.pause()
    // Return to single-clip preview
    if (selected !== null) loadSingleClip(selected)
  }

  // Scrub the sequence to a given ms position
  const seekSeq = (ms: number) => {
    const t = Math.max(0, Math.min(ms, totalMs))
    seqTimeRef.current = t
    setSeqTime(t)
    seqStartRef.current = performance.now() - t
    const idx = clipAtMs(t)
    // Compute time-into-clip and seek video
    let acc = 0
    for (let i = 0; i < idx; i++) acc += cfg.clips[i].duration
    const msInClip = t - acc
    const clip = cfg.clips[idx]
    const video = previewRef.current
    if (video) {
      video.pause()
      video.src = `${BASE}${CLIP_SRCS[idx]}`
      video.playbackRate = clip.speed
      video.load()
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = clip.trimStart + (msInClip / 1000) * clip.speed
        if (seqPlaying) video.play().catch(() => {})
      }, { once: true })
    }
    seqClipIdxRef.current = idx
    setSeqClipIdx(idx)
  }

  // ── Pointer events on timeline ────────────────────────────────
  const getTimelineScale = () => {
    const w = timelineRef.current?.clientWidth ?? 800
    return timelineMs / w   // ms per pixel
  }

  const onTimelinePointerDown = useCallback((e: React.PointerEvent, idx: number, zone: 'left' | 'body' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSelected(idx)
    if (!seqPlaying) loadSingleClip(idx)

    if (zone === 'left') {
      dragRef.current = { type: 'trimLeft', idx, startX: e.clientX, startVal: cfg.clips[idx].trimStart }
    } else if (zone === 'right') {
      dragRef.current = { type: 'trimRight', idx, startX: e.clientX, startVal: cfg.clips[idx].duration, msPerPx: getTimelineScale() }
    } else {
      dragRef.current = { type: 'reorder', idx, startX: e.clientX, currentX: e.clientX }
    }
  }, [cfg.clips, totalMs])

  const onTimelinePointerMove = useCallback((e: React.PointerEvent) => {
    const dr = dragRef.current
    if (dr.type === 'idle') return

    if (dr.type === 'trimLeft') {
      const deltaPx = e.clientX - dr.startX
      const newStart = Math.max(0, Math.round((dr.startVal + deltaPx * TRIM_S_PER_PX) * 100) / 100)
      const clips = cfg.clips.map((c, i) => i === dr.idx ? { ...c, trimStart: newStart } : c)
      const nc = { ...cfg, clips }
      setCfg(nc); saveConfig(nc)
      // Update preview
      const video = previewRef.current
      if (video && !previewPlaying) video.currentTime = newStart

    } else if (dr.type === 'trimRight') {
      const deltaPx = e.clientX - dr.startX
      const next = Math.max(MIN_DURATION, Math.round((dr.startVal + deltaPx * dr.msPerPx) / 50) * 50)
      const clips = cfg.clips.map((c, i) => i === dr.idx ? { ...c, duration: next } : c)
      const nc = { ...cfg, clips }
      setCfg(nc); saveConfig(nc)

    } else if (dr.type === 'reorder') {
      const newX = e.clientX
      dragRef.current = { ...dr, currentX: newX }
      const containerW = timelineRef.current?.clientWidth ?? 800
      const msPerPx = timelineMs / containerW

      // Find cursor position in ms
      const containerLeft = timelineRef.current!.getBoundingClientRect().left
      const cursorMs = (newX - containerLeft) * msPerPx

      // Find which index the cursor is over
      let accMs = 0
      let targetIdx = dr.idx
      for (let i = 0; i < cfg.clips.length; i++) {
        const mid = accMs + cfg.clips[i].duration / 2
        if (cursorMs < mid) { targetIdx = i; break }
        accMs += cfg.clips[i].duration
        targetIdx = i
      }

      if (targetIdx !== dr.idx) {
        const clips = [...cfg.clips]
        const [moved] = clips.splice(dr.idx, 1)
        clips.splice(targetIdx, 0, moved)
        const nc = { ...cfg, clips }
        setCfg(nc); saveConfig(nc)
        dragRef.current = { ...dragRef.current, idx: targetIdx, currentX: newX }
        setSelected(targetIdx)
      } else {
        setCfg(c => ({ ...c }))  // force re-render for ghost
      }
    }
  }, [cfg, previewPlaying])

  const onTimelinePointerUp = useCallback(() => {
    dragRef.current = { type: 'idle' }
    setSaved(true); setTimeout(() => setSaved(false), 1200)
  }, [])

  const reset = () => {
    apply({ clips: DEFAULT_CLIPS.map(c => ({ ...c })), crossFade: DEFAULT_CROSSFADE })
    setSelected(0)
  }

  const sel = selected !== null ? cfg.clips[selected] : null

  return (
    <div className="flex h-full w-full flex-col bg-ink-900 text-mist-200 overflow-hidden select-none"
      style={{ fontSize: 13, fontFamily: 'system-ui, sans-serif', letterSpacing: '0.01em' }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="font-mincho text-[14px] tracking-[0.15em] text-mist-200/80">时间线编辑器</span>
          <span className="text-[10px] text-mist-300/35">Track 01 · 解开那束结</span>
          <span className="text-[10px] transition-opacity duration-300" style={{ color: '#5aad7a', opacity: saved ? 1 : 0 }}>✓ 已保存</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="rounded px-2.5 py-1 text-[11px] text-mist-300/45 hover:text-mist-200/70 border border-white/8 hover:border-white/15 transition">
            重置
          </button>
          <button onClick={() => navigate('/')} className="rounded px-2.5 py-1 text-[11px] bg-ember/20 text-ember border border-ember/30 hover:bg-ember/30 transition">
            预览场景 →
          </button>
        </div>
      </div>

      {/* ── Upper section: preview + controls ───────────────────── */}
      <div className="flex shrink-0 border-b border-white/8" style={{ height: 240 }}>

        {/* Video preview */}
        <div className="flex flex-col border-r border-white/8" style={{ width: 360 }}>
          <div className="relative flex-1 bg-black overflow-hidden">
            <video
              ref={previewRef}
              muted playsInline
              className="h-full w-full"
              style={{ objectFit: 'cover' }}
            />
            {selected === null && (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-mist-300/30">
                点击片段预览
              </div>
            )}
          </div>
          {/* Playback controls */}
          <div className="flex shrink-0 items-center gap-2 border-t border-white/8 px-3 py-2">
            <button
              onClick={toggleSeq}
              className="flex h-7 w-7 items-center justify-center rounded bg-white/8 hover:bg-white/14 transition text-[13px]"
              title="播放完整序列"
            >
              {seqPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={stopSeq}
              className="flex h-7 w-7 items-center justify-center rounded bg-white/8 hover:bg-white/14 transition text-[11px]"
            >
              ⏹
            </button>
            {/* Scrub bar — shows full sequence position */}
            <div
              className="relative flex-1 h-1.5 cursor-pointer rounded-full bg-white/10"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                seekSeq((e.clientX - rect.left) / rect.width * totalMs)
              }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  width: `${(seqTime / totalMs) * 100}%`,
                  background: seqPlaying ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.35)',
                }}
              />
            </div>
            <span className="tabular-nums text-[10px] text-mist-300/45 w-20 text-right shrink-0">
              {fmtTime(seqTime / 1000)} / {fmtTime(totalMs / 1000)}
            </span>
          </div>
        </div>

        {/* Clip controls */}
        <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4 gap-3">
          {sel && selected !== null ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: CLIP_COLORS[selected] }} />
                <span className="font-bold text-mist-200/90 text-[13px]">#{selected + 1} · {CLIP_LABELS[selected]}</span>
                <span className="text-[10px] text-mist-300/30">{CLIP_SRCS[selected]}</span>
              </div>

              {/* Speed */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-mist-300/45 w-14 shrink-0">速度</label>
                <div className="flex gap-1 flex-wrap">
                  {SPEED_PRESETS.map(sp => (
                    <button key={sp} onClick={() => updateClip(selected, { speed: sp })}
                      className="rounded px-2 py-0.5 text-[11px] tabular-nums border transition"
                      style={{
                        borderColor: sel.speed === sp ? CLIP_COLORS[selected] : 'rgba(255,255,255,0.1)',
                        background:  sel.speed === sp ? `${CLIP_COLORS[selected]}28` : 'transparent',
                        color:       sel.speed === sp ? CLIP_COLORS[selected] : 'rgba(255,255,255,0.4)',
                      }}
                    >{sp}×</button>
                  ))}
                  <input type="number" min={0.1} max={16} step={0.05} value={sel.speed}
                    onChange={(e) => updateClip(selected, { speed: Math.max(0.1, +e.target.value) })}
                    className="w-14 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-mist-200/55 tabular-nums"
                  />
                </div>
              </div>

              {/* In / out */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-mist-300/45 w-14 shrink-0">入点</label>
                <input type="number" min={0} max={60} step={0.05} value={sel.trimStart}
                  onChange={(e) => {
                    const v = Math.max(0, +e.target.value)
                    updateClip(selected, { trimStart: v })
                    const video = previewRef.current
                    if (video && !previewPlaying) video.currentTime = v
                  }}
                  className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-[12px] text-mist-200/75 tabular-nums"
                />
                <span className="text-[11px] text-mist-300/35">s</span>
                <label className="ml-3 text-[11px] text-mist-300/45 w-10 shrink-0">出点</label>
                <input type="number" min={0} max={60} step={0.05} value={sel.trimEnd}
                  onChange={(e) => updateClip(selected, { trimEnd: Math.max(0, +e.target.value) })}
                  className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-[12px] text-mist-200/75 tabular-nums"
                />
                <span className="text-[11px] text-mist-300/35">s</span>
                <button onClick={() => updateClip(selected, { trimEnd: 0 })}
                  className="ml-1 rounded px-2 py-1 text-[10px] border border-white/8 text-mist-300/35 hover:text-mist-200/60 transition"
                  title="出点归零 = 自然循环"
                >自然</button>
              </div>

              {/* Display duration */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-mist-300/45 w-14 shrink-0">显示时长</label>
                <input type="range" min={MIN_DURATION} max={8000} step={50} value={sel.duration}
                  onChange={(e) => updateClip(selected, { duration: +e.target.value })}
                  className="flex-1" style={{ accentColor: CLIP_COLORS[selected] }}
                />
                <input type="number" min={MIN_DURATION} max={8000} step={50} value={sel.duration}
                  onChange={(e) => updateClip(selected, { duration: Math.max(MIN_DURATION, +e.target.value) })}
                  className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-[12px] text-mist-200/75 tabular-nums"
                />
                <span className="text-[11px] text-mist-300/35">ms</span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-[11px] text-mist-300/25">
              点击时间线上的片段选中
            </div>
          )}

          {/* Crossfade — always visible */}
          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/6">
            <label className="text-[11px] text-mist-300/45 w-14 shrink-0">淡入淡出</label>
            <input type="range" min={0} max={1200} step={50} value={cfg.crossFade}
              onChange={(e) => apply({ ...cfg, crossFade: +e.target.value })}
              className="flex-1" style={{ accentColor: '#c9a84c' }}
            />
            <input type="number" min={0} max={1200} step={50} value={cfg.crossFade}
              onChange={(e) => apply({ ...cfg, crossFade: +e.target.value })}
              className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-[12px] text-mist-200/75 tabular-nums"
            />
            <span className="text-[11px] text-mist-300/35">ms</span>
          </div>
        </div>
      </div>

      {/* ── Timeline ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-2 text-[10px] text-mist-300/35">
          <span>
            视频 <b className="text-mist-200/60">{(totalMs / 1000).toFixed(2)}s</b>
            {audioDurMs > 0 && (
              <>
                <span className="mx-2 opacity-30">/</span>
                音频 <b className="text-mist-200/60">{(audioDurMs / 1000).toFixed(2)}s</b>
                {Math.abs(totalMs - audioDurMs) > 100 && (
                  <span style={{ color: totalMs > audioDurMs ? '#e07b5a' : '#c9a84c' }} className="ml-2">
                    {totalMs > audioDurMs ? `超出 ${((totalMs - audioDurMs)/1000).toFixed(2)}s` : `剩余 ${((audioDurMs - totalMs)/1000).toFixed(2)}s`}
                  </span>
                )}
              </>
            )}
          </span>
          <span>左柄 = 入点 · 右柄 = 时长 · 中间拖 = 排序</span>
        </div>

        {/* Timeline: audio track + clip track */}
        <div
          ref={timelineRef}
          className="relative w-full"
          style={{ height: 68 }}
          onPointerMove={onTimelinePointerMove}
          onPointerUp={onTimelinePointerUp}
        >
          {/* ── Sequence playhead ── */}
          {seqTime > 0 && (
            <div
              className="pointer-events-none absolute top-0"
              style={{
                left: `${(seqTime / timelineMs) * 100}%`,
                height: 68,
                borderLeft: '2px solid rgba(255,255,255,0.85)',
                zIndex: 20,
              }}
            >
              <div
                className="absolute top-0 text-[8px] tabular-nums whitespace-nowrap px-1"
                style={{ background: 'rgba(255,255,255,0.85)', color: '#1a1a1f', borderRadius: 2 }}
              >
                {fmtTime(seqTime / 1000)}
              </div>
            </div>
          )}

          {/* ── Navigate-to-tracklist marker at right edge of clips ── */}
          <div
            className="pointer-events-none absolute top-0"
            style={{
              left: `${(totalMs / timelineMs) * 100}%`,
              height: 88,
              borderLeft: '2px solid rgba(224,123,90,0.6)',
              zIndex: 10,
            }}
          >
            <span className="absolute top-1 text-[8px] tabular-nums whitespace-nowrap" style={{ color: '#e07b5a', left: 3 }}>
              → 目录
            </span>
          </div>

          {/* ── Clip blocks (top row) ── */}
          {cfg.clips.map((clip, i) => {
            const leftPct = cfg.clips.slice(0, i).reduce((a, c) => a + c.duration, 0) / timelineMs * 100
            const widthPct = clip.duration / timelineMs * 100
            const isSelected = selected === i
            const isDragging = dragRef.current.type === 'reorder' && dragRef.current.idx === i
            const color = CLIP_COLORS[i]

            return (
              <div
                key={i}
                className="absolute top-0 flex overflow-hidden rounded"
                style={{
                  left: `${leftPct}%`,
                  width: `calc(${widthPct}% - 2px)`,
                  height: 64,
                  background: isSelected ? `${color}bb` : `${color}55`,
                  border: `1px solid ${isSelected ? color : color + '44'}`,
                  opacity: isDragging ? 0.5 : 1,
                  zIndex: isSelected ? 2 : 1,
                  transition: isDragging ? 'none' : 'background 0.1s, opacity 0.1s',
                }}
              >
                {/* Left trim handle */}
                <div
                  className="absolute left-0 top-0 h-full cursor-ew-resize z-10 flex items-center justify-center"
                  style={{ width: 10, background: `${color}cc` }}
                  onPointerDown={(e) => onTimelinePointerDown(e, i, 'left')}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="w-0.5 h-2 rounded-full bg-white/60" />
                    <div className="w-0.5 h-2 rounded-full bg-white/60" />
                  </div>
                </div>

                {/* Body (reorder) */}
                <div
                  className="absolute top-0 h-full cursor-grab active:cursor-grabbing"
                  style={{ left: 10, right: 10 }}
                  onPointerDown={(e) => onTimelinePointerDown(e, i, 'body')}
                >
                  <div className="flex h-full flex-col justify-between px-2 py-1.5 overflow-hidden pointer-events-none">
                    <div className="flex items-center gap-1">
                      {clip.speed !== 1 && (
                        <span className="rounded bg-black/30 px-1 text-[9px] text-white/80">{clip.speed}×</span>
                      )}
                      {clip.trimStart > 0 && (
                        <span className="rounded bg-black/30 px-1 text-[9px] text-white/80">@{fmt(clip.trimStart)}</span>
                      )}
                    </div>
                    <span className="truncate text-[11px] font-semibold text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                      {i + 1}. {CLIP_LABELS[i]}
                    </span>
                    <span className="text-[10px] text-white/60 tabular-nums">{(clip.duration / 1000).toFixed(2)}s</span>
                  </div>
                </div>

                {/* Right resize handle */}
                <div
                  className="absolute right-0 top-0 h-full cursor-ew-resize z-10 flex items-center justify-center"
                  style={{ width: 10, background: `${color}cc` }}
                  onPointerDown={(e) => onTimelinePointerDown(e, i, 'right')}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="w-0.5 h-2 rounded-full bg-white/60" />
                    <div className="w-0.5 h-2 rounded-full bg-white/60" />
                  </div>
                </div>

                {/* Crossfade overlap at right edge */}
                {i < cfg.clips.length - 1 && (
                  <div
                    className="pointer-events-none absolute right-0 top-0 h-full"
                    style={{
                      width: `${Math.min(100, cfg.crossFade / clip.duration * 100)}%`,
                      background: 'rgba(255,255,255,0.08)',
                      borderLeft: '1px dashed rgba(255,255,255,0.2)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Ruler */}
        <div className="relative mt-1 h-4 text-[9px] text-mist-300/25 tabular-nums">
          {Array.from({ length: Math.ceil(timelineMs / 1000) + 1 }, (_, s) => (
            <span key={s} className="absolute" style={{ left: `${(s * 1000 / timelineMs) * 100}%`, transform: 'translateX(-50%)' }}>
              {s}s
            </span>
          ))}
        </div>

        {/* Mini song-position bar — shows where scene sits in full track */}
        {audioDurMs > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="shrink-0 text-[9px] text-mist-300/30">全曲</span>
            <div className="relative flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {/* Scene region */}
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  left: 0,
                  width: `${(totalMs / audioDurMs) * 100}%`,
                  background: 'rgba(201,168,76,0.5)',
                }}
              />
            </div>
            <span className="shrink-0 tabular-nums text-[9px] text-mist-300/30">
              {(totalMs / 1000).toFixed(1)}s / {(audioDurMs / 1000).toFixed(1)}s
            </span>
          </div>
        )}

        {/* Clip list */}
        <div className="mt-3 rounded border border-white/6 overflow-hidden">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/6 text-[10px] text-mist-300/35">
                {['#', '片段', '速度', '入点', '出点', '显示', '时间轴@'].map(h => (
                  <th key={h} className="px-3 py-1.5 text-left font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.clips.map((clip, i) => {
                const startMs = cfg.clips.slice(0, i).reduce((a, c) => a + c.duration, 0)
                return (
                  <tr key={i} className="border-b border-white/4 cursor-pointer"
                    style={{ background: selected === i ? `${CLIP_COLORS[i]}18` : 'transparent' }}
                    onClick={() => setSelected(i === selected ? null : i)}
                  >
                    <td className="px-3 py-1 text-mist-300/35">{i + 1}</td>
                    <td className="px-3 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-sm shrink-0" style={{ background: CLIP_COLORS[i] }} />
                        <span className="text-mist-200/70">{CLIP_LABELS[i]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-1 tabular-nums" style={{ color: clip.speed !== 1 ? '#e0a84c' : 'rgba(255,255,255,0.3)' }}>{clip.speed}×</td>
                    <td className="px-3 py-1 tabular-nums text-mist-300/40">{clip.trimStart > 0 ? fmt(clip.trimStart) : '—'}</td>
                    <td className="px-3 py-1 tabular-nums text-mist-300/40">{clip.trimEnd > 0 ? fmt(clip.trimEnd) : '自然'}</td>
                    <td className="px-3 py-1 tabular-nums text-mist-200/65">{(clip.duration / 1000).toFixed(2)}s</td>
                    <td className="px-3 py-1 tabular-nums text-mist-300/35">{(startMs / 1000).toFixed(2)}s</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
