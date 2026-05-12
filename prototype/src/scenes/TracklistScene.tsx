import { useNavigate } from 'react-router-dom'
import { TRACKS } from '@/data/tracks'
import { usePlayerStore } from '@/store/usePlayerStore'

const BASE = import.meta.env.BASE_URL

/** 漂浮的结 SVG — 旧编手绳风格线稿 */
function FloatingKnot() {
  return (
    <div
      className="pointer-events-none select-none"
      style={{
        animation: 'knot-float 5s ease-in-out infinite',
        filter: 'drop-shadow(0 0 18px rgba(180,140,100,0.35))',
      }}
    >
      <svg
        viewBox="-85 -95 170 210"
        width="200"
        height="240"
        fill="none"
        stroke="#c8a97a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.82"
      >
        {/* 上环 */}
        <path d="M -13,-22 C -38,-50 -32,-82 0,-85 C 32,-82 38,-50 13,-22" />
        {/* 右环 */}
        <path d="M 22,-13 C 50,-38 82,-32 85,0 C 82,32 50,38 22,13" />
        {/* 下环 */}
        <path d="M 13,22 C 38,50 32,82 0,85 C -32,82 -38,50 -13,22" />
        {/* 左环 */}
        <path d="M -22,13 C -50,38 -82,32 -85,0 C -82,-32 -50,-38 -22,-13" />
        {/* 中心编织区 */}
        <ellipse cx="0" cy="0" rx="18" ry="18" strokeOpacity="0.6" />
        <path d="M -18,0 C -9,-10 9,-10 18,0" strokeOpacity="0.5" />
        <path d="M -18,0 C -9,10 9,10 18,0" strokeOpacity="0.5" />
        <path d="M 0,-18 C 10,-9 10,9 0,18" strokeOpacity="0.4" />
        <path d="M 0,-18 C -10,-9 -10,9 0,18" strokeOpacity="0.4" />
        {/* 两条尾线 */}
        <path d="M -9,18 C -11,45 -9,68 -7,95 C -6,105 -8,108 -7,112" strokeOpacity="0.7" />
        <path d="M 9,18 C 11,45 9,68 7,95 C 6,105 8,108 7,112" strokeOpacity="0.7" />
      </svg>

      <style>{`
        @keyframes knot-float {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-14px) rotate(1deg); }
        }
      `}</style>
    </div>
  )
}

export function TracklistScene() {
  const navigate = useNavigate()
  const goToTrack = usePlayerStore((s) => s.goToTrack)

  const onPick = (id: number) => {
    goToTrack(id)
    navigate(`/track/${id}`)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-900">

      {/* ── 走廊背景视频 ──────────────────────────────────────────── */}
      <video
        src={`${BASE}tracklist_corridor.mp4`}
        autoPlay loop muted playsInline preload="auto"
        className="absolute inset-0 h-full w-full select-none"
        style={{
          objectFit: 'cover',
          objectPosition: 'center center',
          filter: 'brightness(0.45) saturate(0.8)',
        }}
      />

      {/* ── 渐变压暗（上下） ──────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/60 via-transparent to-ink-900/75" />
      {/* 中央暗晕，突出文字 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(55% 55% at 50% 50%, rgba(10,10,13,0.3), transparent 80%)' }}
      />

      {/* ── 顶部副标题 ────────────────────────────────────────────── */}
      <div className="absolute left-10 top-10 select-none" style={{ zIndex: 10 }}>
        <div className="font-sans text-[10px] tracking-[0.4em] text-mist-300/50">RUBEN 25 / 26</div>
        <div className="font-mincho mt-1 text-[18px] tracking-[0.3em] text-mist-200/75">十二曲 · 入記憶</div>
      </div>

      <div className="absolute right-10 top-10 select-none" style={{ zIndex: 10 }}>
        <button
          onClick={() => navigate('/')}
          className="font-mincho text-[11px] tracking-[0.4em] text-mist-300/45 hover:text-ember transition"
        >
          返回
        </button>
      </div>

      {/* ── 漂浮的结（走廊正中） ──────────────────────────────────── */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ zIndex: 5 }}
      >
        <FloatingKnot />
      </div>

      {/* ── 12 列竖排歌单 ─────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center px-10" style={{ zIndex: 8 }}>
        <div className="flex flex-row-reverse gap-5 md:gap-7">
          {TRACKS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="group relative flex h-[58vh] flex-col items-center justify-start overflow-visible py-2 cursor-pointer"
              style={{
                animation: `track-fall 1.2s ${0.06 * i}s cubic-bezier(0.22,1,0.36,1) both`,
              }}
            >
              <span className="font-mincho mb-2 text-[10px] tracking-[0.3em] text-mist-300/35 group-hover:text-ember transition">
                {String(t.id).padStart(2, '0')}
              </span>
              <span
                className="font-mincho writing-vertical text-[24px] leading-[1.5] tracking-[0.22em] text-mist-200/90 group-hover:text-ember transition-colors"
                style={{ textShadow: '0 0 28px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' }}
              >
                {t.title}
              </span>
              {t.feat && (
                <span className="font-mincho mt-2 writing-vertical text-[9px] tracking-[0.3em] text-mist-300/40 group-hover:text-mist-300/75 transition">
                  feat. {t.feat}
                </span>
              )}
              <span className="pointer-events-none absolute -bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-ember transition-all duration-500 group-hover:w-10" />
            </button>
          ))}
        </div>
      </div>

      {/* ── 底部 hint ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 select-none" style={{ zIndex: 10 }}>
        <div className="font-mincho text-[11px] tracking-[0.5em] text-mist-300/35">點 · 一 · 首 · 進 · 入</div>
      </div>

      <style>{`
        @keyframes track-fall {
          0%   { transform: translateY(-35px); opacity: 0; filter: blur(6px); }
          60%  { opacity: 0.85; filter: blur(0); }
          100% { transform: translateY(0);    opacity: 1; filter: blur(0); }
        }
      `}</style>
    </div>
  )
}
