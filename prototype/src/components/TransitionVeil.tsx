/** 场景切换之间的快速 veil——后续替换成更花哨的转场 */
export function TransitionVeil({ active }: { active: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-500"
      style={{
        opacity: active ? 1 : 0,
        background:
          'radial-gradient(80% 60% at 50% 50%, rgba(10,10,13,0.4), rgba(10,10,13,0.95))',
        backdropFilter: active ? 'blur(18px)' : 'blur(0)',
      }}
    />
  )
}
