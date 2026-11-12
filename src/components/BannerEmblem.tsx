/** 게임 로고: 깃대 + 제비꼬리 깃발 + 금빛 인장 (순수 SVG) */
export function BannerEmblem({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect x="14" y="6" width="4" height="54" rx="2" fill="#d6d3d1" />
      <circle cx="16" cy="6" r="3" fill="#fbbf24" />
      <g className={animated ? 'animate-wave' : undefined} style={{ transformOrigin: '18px 20px' }}>
        <path d="M18 9 H54 L46 21 L54 33 H18 Z" fill="#b91c1c" />
        <path d="M18 9 H54 L46 21 L54 33 H18 Z" fill="url(#bannerShade)" />
        <circle cx="33" cy="21" r="6.5" fill="none" stroke="#fbbf24" strokeWidth="2" />
        <path d="M33 16.5 V25.5 M28.5 21 H37.5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      </g>
      <defs>
        <linearGradient id="bannerShade" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
      </defs>
    </svg>
  );
}
