import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { TRACKS } from '@/data/tracks'

/**
 * v16 静帧上的 12 个挂件按钮——每个挂件映射一首歌。
 * 坐标是对 1:1 image 的 % 定位（左/上百分比）。
 *
 * 这些坐标按 v16 (1024x1024) 中可见挂件的位置估算；后续可以微调。
 * 编号对应 src/data/tracks.ts。
 */
type CharmDef = {
  id: number
  charm: string // 描述这是哪个挂件（debug 用）
  // 位置 % from left/top of the 1:1 plate
  left: number
  top: number
  size?: number // % size; default 5
}

const CHARMS: CharmDef[] = [
  { id: 1, charm: '中央旧编手绳结',  left: 18, top: 70, size: 7 }, // 解开那束结
  { id: 2, charm: '透明亚克力大头贴', left: 22, top: 62, size: 5 }, // Flight To Paris
  { id: 3, charm: '米奇塑料挂件',     left: 7,  top: 64, size: 5 }, // 蜂蜜
  { id: 4, charm: '木珠串',           left: 9,  top: 80, size: 4 }, // 象形文字
  { id: 5, charm: '飘出的褪色绳尾',   left: 32, top: 80, size: 6 }, // 捕风捉影
  { id: 6, charm: '粉色亚克力心',     left: 12, top: 84, size: 5 }, // 得到你的爱
  { id: 7, charm: '铜铃',             left: 11, top: 56, size: 5 }, // 咒语之声
  { id: 8, charm: '干菊花扎束',       left: 16, top: 60, size: 4 }, // 吉卜力音乐
  { id: 9, charm: '玻璃弹珠（小）',   left: 14, top: 78, size: 4 }, // 销声匿迹
  { id: 10, charm: '小铜铃 / pompom 状', left: 20, top: 76, size: 5 }, // Dream Big
  { id: 11, charm: '红绳串珠',        left: 16, top: 73, size: 4 }, // 你跳着舞，我唱着歌
  { id: 12, charm: '飘出的最远端绳尾', left: 38, top: 88, size: 7 }, // 看完花火再回
]

export function CharmButtons({ disabled }: { disabled?: boolean }) {
  const navigate = useNavigate()
  const [hover, setHover] = useState<number | null>(null)

  const onPick = (id: number) => {
    if (disabled) return
    navigate(`/track/${id}`)
  }

  return (
    <>
      {CHARMS.map((c) => {
        const track = TRACKS.find((t) => t.id === c.id)!
        const isHover = hover === c.id
        const size = c.size ?? 5
        return (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            onMouseEnter={() => setHover(c.id)}
            onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
            disabled={disabled}
            aria-label={`Track ${c.id}: ${track.title}`}
            className="group absolute z-30 cursor-pointer"
            style={{
              left: `${c.left}%`,
              top: `${c.top}%`,
              width: `${size}%`,
              aspectRatio: '1 / 1',
              transform: 'translate(-50%, -50%)',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
          >
            {/* 呼吸光圈 + 中心 ember 点 */}
            <span
              className="absolute inset-0 rounded-full transition-all duration-500"
              style={{
                background:
                  'radial-gradient(circle, rgba(201,138,107,0.45), transparent 65%)',
                transform: isHover ? 'scale(1.5)' : 'scale(1)',
                opacity: isHover ? 1 : 0.0,
              }}
            />
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
              style={{
                width: isHover ? '10px' : '5px',
                height: isHover ? '10px' : '5px',
                background: '#c98a6b',
                boxShadow: isHover
                  ? '0 0 14px rgba(201,138,107,1), 0 0 36px rgba(201,138,107,0.5)'
                  : '0 0 6px rgba(201,138,107,0.6)',
                opacity: isHover ? 1 : 0.55,
                animation: isHover
                  ? 'none'
                  : `charm-pulse 3.${c.id % 7}s ease-in-out ${(c.id % 5) * 0.3}s infinite`,
              }}
            />

            {/* hover 显示曲名（竖排明朝） */}
            {isHover && (
              <span
                className="font-mincho writing-vertical pointer-events-none absolute text-[14px] tracking-[0.3em] text-mist-200"
                style={{
                  // place to the upper-right of the charm to avoid overlap with cluster
                  left: '120%',
                  top: '-40%',
                  textShadow:
                    '0 0 10px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  animation: 'charm-label-in 250ms ease-out forwards',
                }}
              >
                <span className="text-mist-300/60 mr-1">
                  {String(c.id).padStart(2, '0')}
                </span>
                {track.title}
              </span>
            )}
          </button>
        )
      })}

      <style>{`
        @keyframes charm-pulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.3); }
        }
        @keyframes charm-label-in {
          0% { opacity: 0; transform: translateX(-6px); }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
