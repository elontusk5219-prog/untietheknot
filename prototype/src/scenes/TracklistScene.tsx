import { useNavigate } from 'react-router-dom'
import { TRACKS } from '@/data/tracks'
import { usePlayerStore } from '@/store/usePlayerStore'

/** 竖排明朝歌单——结散开后散落出 12 列 */
export function TracklistScene() {
  const navigate = useNavigate()
  const goToTrack = usePlayerStore((s) => s.goToTrack)

  const onPick = (id: number) => {
    goToTrack(id)
    navigate(`/track/${id}`)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-900">
      {/* 暗底 + 微弱 v5 plate 余韵 */}
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}entry_plate.png)`,
          filter: 'brightness(0.32) blur(40px) saturate(0.7)',
          transform: 'scale(1.3)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-900/70 via-ink-900/40 to-ink-900/85" />
      {/* 中央暗晕，让文字突出 */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 50% at 50% 50%, rgba(10,10,13,0.55), transparent 80%)' }} />

      {/* 顶部副标题 */}
      <div className="absolute left-10 top-10 select-none">
        <div className="font-sans text-[10px] tracking-[0.4em] text-mist-300/50">
          RUBEN 25 / 26
        </div>
        <div className="font-mincho mt-2 text-[20px] tracking-[0.3em] text-mist-200/80">
          十二曲 · 入記憶
        </div>
      </div>

      <div className="absolute right-10 top-10 select-none">
        <button
          onClick={() => navigate('/')}
          className="font-mincho text-[11px] tracking-[0.4em] text-mist-300/50 hover:text-ember transition"
        >
          返回 入口
        </button>
      </div>

      {/* 12 列竖排明朝歌单，水平排开 */}
      <div className="absolute inset-0 flex items-center justify-center px-12">
        <div className="flex flex-row-reverse gap-6 md:gap-8 lg:gap-10">
          {TRACKS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="group relative flex h-[60vh] flex-col items-center justify-start overflow-visible py-2 cursor-pointer"
              style={{
                animation: `track-fall 1.2s ${0.07 * i}s cubic-bezier(0.22,1,0.36,1) both`,
              }}
            >
              {/* 编号 */}
              <span className="font-mincho mb-3 text-[11px] tracking-[0.3em] text-mist-300/40 group-hover:text-ember transition">
                {String(t.id).padStart(2, '0')}
              </span>

              {/* 标题——竖排 */}
              <span
                className="font-mincho writing-vertical text-[26px] leading-[1.5] tracking-[0.22em] text-mist-200 group-hover:text-ember transition-colors"
                style={{ textShadow: '0 0 24px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.6)' }}
              >
                {t.title}
              </span>

              {/* feat */}
              {t.feat && (
                <span className="font-mincho mt-3 writing-vertical text-[10px] tracking-[0.3em] text-mist-300/45 group-hover:text-mist-300/80 transition">
                  feat. {t.feat}
                </span>
              )}

              {/* 右悬停余韵线 */}
              <span className="pointer-events-none absolute -bottom-1 left-1/2 h-px w-0 -translate-x-1/2 bg-ember transition-all duration-500 group-hover:w-12" />
            </button>
          ))}
        </div>
      </div>

      {/* 底部 hint */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 select-none">
        <div className="font-mincho text-[11px] tracking-[0.5em] text-mist-300/40">
          點 · 一 · 首 · 進 · 入
        </div>
      </div>

      <style>{`
        @keyframes track-fall {
          0% { transform: translateY(-40px); opacity: 0; filter: blur(8px); }
          60% { opacity: 0.85; filter: blur(0); }
          100% { transform: translateY(0); opacity: 1; filter: blur(0); }
        }
      `}</style>
    </div>
  )
}
