import { useNavigate } from 'react-router-dom'
import type { Track } from '@/data/tracks'
import { usePlayerStore } from '@/store/usePlayerStore'

export function PlayerHud({ track }: { track: Track }) {
  const navigate = useNavigate()
  const { isPlaying, progress, togglePlay, next, prev } = usePlayerStore()

  return (
    <>
      {/* 顶部——返回 + 当前曲目编号 */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between p-8">
        <button
          onClick={() => navigate('/tracklist')}
          className="font-mincho text-[11px] tracking-[0.4em] text-mist-300/60 hover:text-ember transition"
        >
          歸 · 歌單
        </button>

        <div className="text-right select-none">
          <div className="font-mincho text-[10px] tracking-[0.4em] text-mist-300/40">
            TRACK
          </div>
          <div className="font-mincho text-[28px] leading-none text-mist-200/85">
            {String(track.id).padStart(2, '0')}
            <span className="ml-1 text-[14px] text-mist-300/50">
              / 12
            </span>
          </div>
        </div>
      </div>

      {/* 中间——曲名（竖排，左侧） */}
      <div className="pointer-events-none absolute left-12 top-1/2 z-10 -translate-y-1/2 select-none">
        <div className="font-mincho writing-vertical text-[40px] leading-[1.4] tracking-[0.2em] text-mist-200/90"
             style={{ textShadow: '0 0 24px rgba(0,0,0,0.7)' }}>
          {track.title}
        </div>
        {track.feat && (
          <div className="font-mincho mt-2 writing-vertical text-[11px] tracking-[0.4em] text-mist-300/55">
            feat. {track.feat}
          </div>
        )}
      </div>

      {/* 右侧 hint 文字 */}
      <div className="pointer-events-none absolute right-12 top-1/2 z-10 -translate-y-1/2 select-none">
        <div className="font-mincho writing-vertical text-[12px] tracking-[0.5em] text-mist-300/45 max-h-[60vh]">
          {track.hint}
        </div>
      </div>

      {/* 底部——播放控制 + 进度条 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-12 pb-10">
        {/* 进度条 */}
        <div className="relative mb-6 h-px w-full overflow-visible bg-mist-300/15">
          <div
            className="absolute inset-y-0 left-0 bg-ember/80"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute -top-[3px] size-[7px] -translate-x-1/2 rounded-full bg-ember shadow-[0_0_12px_rgba(201,138,107,0.9)]"
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        {/* 控件 */}
        <div className="flex items-center justify-center gap-10">
          <button
            onClick={prev}
            className="font-mincho text-[13px] tracking-[0.4em] text-mist-300/70 hover:text-ember transition"
          >
            前 一 曲
          </button>
          <button
            onClick={togglePlay}
            className="grid size-14 place-items-center rounded-full border border-mist-300/30 text-mist-200/90 hover:border-ember hover:text-ember transition"
            aria-label={isPlaying ? 'pause' : 'play'}
          >
            {isPlaying ? (
              <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
                <rect width="4" height="16" />
                <rect x="10" width="4" height="16" />
              </svg>
            ) : (
              <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
                <path d="M0 0 L14 8 L0 16 Z" />
              </svg>
            )}
          </button>
          <button
            onClick={next}
            className="font-mincho text-[13px] tracking-[0.4em] text-mist-300/70 hover:text-ember transition"
          >
            下 一 曲
          </button>
        </div>
      </div>
    </>
  )
}
