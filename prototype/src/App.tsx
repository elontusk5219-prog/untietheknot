import { useEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TracklistScene } from '@/scenes/TracklistScene'
import { TrackScene } from '@/scenes/TrackScene'
import { Track01Scene } from '@/scenes/Track01Scene'

/**
 * 全局音频：一打开网站就挂载，第一次任意交互后开始播放
 * 跟随整个 SPA 生命周期，不会因为路由切换而中断
 */
function GlobalAudio() {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.85

    const tryPlay = () => audio.play().catch(() => {})

    // 立即尝试（有些浏览器在视频 autoplay 后会允许）
    tryPlay()

    // 第一次任意交互解锁
    const unlock = () => {
      tryPlay()
      ;['click', 'touchstart', 'keydown', 'pointerdown'].forEach(e =>
        document.removeEventListener(e, unlock)
      )
    }
    ;['click', 'touchstart', 'keydown', 'pointerdown'].forEach(e =>
      document.addEventListener(e, unlock)
    )

    // 300ms 保底再试
    const t = setTimeout(tryPlay, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <audio
      ref={audioRef}
      src="/t01_audio.mp3"
      preload="auto"
      autoPlay
      loop
      style={{ display: 'none' }}
    />
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/preview">
      {/* 一打开就挂载，跨路由持续播放 */}
      <GlobalAudio />
      <Routes>
        {/* 入口直接是 Track01 金色麦田开场，21s 后切到目录 */}
        <Route path="/" element={<Track01Scene />} />
        <Route path="/tracklist" element={<TracklistScene />} />
        <Route path="/track/:id" element={<TrackScene />} />
      </Routes>
    </BrowserRouter>
  )
}
