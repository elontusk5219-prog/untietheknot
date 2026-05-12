export type Track = {
  id: number
  title: string
  feat?: string
  /** 主导自然粒子（待分配，先放占位） */
  particle: ParticleKind
  /** 单句意象——后续替换为 Magnolia 的真实文字 */
  hint: string
}

export type ParticleKind =
  | 'willow' // 柳絮
  | 'sakura' // 樱花
  | 'firefly' // 萤火虫
  | 'snow' // 雪花
  | 'firework' // 烟花碎屑
  | 'rain' // 雨丝
  | 'dust' // 阳光灰尘
  | 'dandelion' // 蒲公英
  | 'leaf' // 落叶
  | 'ripple' // 水面波纹
  | 'thread' // 解开的线
  | 'ember' // 余烬

export const TRACKS: Track[] = [
  { id: 1,  title: '解开那束结',           particle: 'thread',    hint: '入口——解结，进入洞穴' },
  { id: 2,  title: 'Flight To Paris',       particle: 'dust',       hint: '直飞巴黎；机舱小屏放着 DV' },
  { id: 3,  title: '蜂蜜',                   feat: 'jolae & Jeriyaki',  particle: 'firefly',   hint: '甜，但黏在牙齿上' },
  { id: 4,  title: '象形文字',               particle: 'leaf',       hint: '看不懂的旧符号' },
  { id: 5,  title: '捕风捉影',               feat: '马马魚子',         particle: 'willow',    hint: '风过无痕' },
  { id: 6,  title: '得到你的爱',             feat: 'LimboLimbs & G3GE', particle: 'sakura',    hint: '一瞬的拥抱' },
  { id: 7,  title: '咒语之声',               particle: 'ripple',     hint: '低语在水面上漾' },
  { id: 8,  title: '吉卜力音乐',             feat: '汉堡黄',           particle: 'dandelion', hint: '童年的午后云' },
  { id: 9,  title: '销声匿迹',               feat: 'hpsb & jackzebra', particle: 'rain',      hint: '雨夜消失的人' },
  { id: 10, title: 'Dream Big',              particle: 'snow',       hint: '做大梦，雪不停' },
  { id: 11, title: '你跳着舞，我唱着歌',     particle: 'ember',      hint: '篝火旁的最后一夜' },
  { id: 12, title: '看完花火再回',           particle: 'firework',   hint: '出口——两个自己重合' },
]

export const trackById = (id: number) =>
  TRACKS.find((t) => t.id === id) ?? null
