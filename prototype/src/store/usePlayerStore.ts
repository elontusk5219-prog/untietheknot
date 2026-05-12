import { create } from 'zustand'

export type Phase =
  | 'entry'        // 入口（电瓶车 + 结）
  | 'unraveling'   // 结正在散开
  | 'tracklist'    // 竖排歌单展开
  | 'transition'   // 场景之间的转场
  | 'track'        // 在某首歌的场景里
  | 'outro'        // 出口（回到现实）

type State = {
  phase: Phase
  currentTrackId: number | null
  isPlaying: boolean
  /** 0..1 播放进度（占位；正式接入 audio element 后由 timeupdate 驱动） */
  progress: number
  /** 简易 audio-reactive 信号：0..1，给粒子用 */
  audioLevel: number
  muted: boolean
  /** 用户已经做过第一次 click——浏览器 autoplay 解锁 */
  userInteracted: boolean
}

type Actions = {
  setPhase: (p: Phase) => void
  enterTracklist: () => void
  goToTrack: (id: number) => void
  next: () => void
  prev: () => void
  togglePlay: () => void
  setProgress: (p: number) => void
  setAudioLevel: (level: number) => void
  toggleMute: () => void
  markInteracted: () => void
  exit: () => void
}

const TOTAL_TRACKS = 12

export const usePlayerStore = create<State & Actions>((set, get) => ({
  phase: 'entry',
  currentTrackId: null,
  isPlaying: false,
  progress: 0,
  audioLevel: 0,
  muted: false,
  userInteracted: false,

  setPhase: (p) => set({ phase: p }),

  enterTracklist: () =>
    set({ phase: 'unraveling', userInteracted: true }),

  goToTrack: (id) => {
    if (id < 1 || id > TOTAL_TRACKS) return
    set({
      phase: 'transition',
      currentTrackId: id,
      isPlaying: true,
      progress: 0,
      userInteracted: true,
    })
    // 转场短暂展示后切到 track 视图
    window.setTimeout(() => {
      if (get().phase === 'transition') set({ phase: 'track' })
    }, 1200)
  },

  next: () => {
    const cur = get().currentTrackId ?? 0
    if (cur >= TOTAL_TRACKS) {
      set({ phase: 'outro', isPlaying: false })
      return
    }
    get().goToTrack(cur + 1)
  },

  prev: () => {
    const cur = get().currentTrackId ?? 1
    if (cur <= 1) {
      set({ phase: 'tracklist' })
      return
    }
    get().goToTrack(cur - 1)
  },

  togglePlay: () =>
    set((s) => ({ isPlaying: !s.isPlaying, userInteracted: true })),

  setProgress: (p) => set({ progress: Math.min(1, Math.max(0, p)) }),

  setAudioLevel: (level) => set({ audioLevel: level }),

  toggleMute: () => set((s) => ({ muted: !s.muted })),

  markInteracted: () => set({ userInteracted: true }),

  exit: () => set({ phase: 'outro', isPlaying: false }),
}))
