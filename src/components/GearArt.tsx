// 장비 그림. 외부 이미지 없이 칸·등급이 구분되게 그린다.
import { GEAR_MAP } from '../data/gear';
import type { Rarity } from '../types';
import { cn } from './ui';

const TONE: Record<Rarity, string> = { R: '#d6d3d1', SR: '#7dd3fc', SSR: '#fbbf24' };

export function GearArt({ id, dim, size = 'md' }: { id: string; dim?: boolean; size?: 'sm' | 'md' }) {
  const def = GEAR_MAP[id];
  const c = TONE[def?.rarity ?? 'R'];
  return (
    <svg viewBox="0 0 64 64" className={cn('shrink-0 rounded-xl', size === 'sm' ? 'h-8 w-8' : 'h-14 w-14', dim && 'opacity-60')} style={{ background: '#1c1917' }} aria-hidden>
      <rect width="64" height="64" fill="#1c1917" />
      {def?.rarity === 'SSR' && <circle cx="32" cy="32" r="26" fill={c} opacity="0.16" />}
      <Picture id={id} c={c} />
    </svg>
  );
}

function Picture({ id, c }: { id: string; c: string }) {
  if (id === 'sword_r') {
    return (
      <g fill={c}>
        <path d="M30 6h4v34h-4z" />
        <path d="M22 40h20v4H22z" />
        <path d="M30 44h4v12h-4z" />
      </g>
    );
  }
  if (id === 'spear_sr') {
    return (
      <g fill={c}>
        <path d="M32 4l7 14H25z" />
        <rect x="30" y="18" width="4" height="40" />
        <rect x="22" y="24" width="20" height="3" />
      </g>
    );
  }
  if (id === 'blade_ssr') {
    return (
      <g fill={c}>
        <path d="M20 52c-2-20 12-36 22-44-4 16-2 30-2 44z" />
        <rect x="16" y="50" width="20" height="4" rx="1" />
        <rect x="24" y="54" width="4" height="6" />
      </g>
    );
  }
  if (id === 'hide_r' || id === 'scale_sr' || id === 'iron_ssr') {
    return (
      <g fill={c}>
        <path d="M14 24h10l2-8h12l2 8h10l-4 12H18z" />
        <path d="M20 36h24v16H20z" />
        {id === 'scale_sr' && (
          <g fill="#1c1917">
            <circle cx="26" cy="42" r="1.6" /><circle cx="32" cy="42" r="1.6" /><circle cx="38" cy="42" r="1.6" />
            <circle cx="29" cy="47" r="1.6" /><circle cx="35" cy="47" r="1.6" />
          </g>
        )}
        {id === 'iron_ssr' && <path d="M28 36h8v16h-8z" fill="#1c1917" opacity="0.55" />}
      </g>
    );
  }
  if (id === 'manual_r') {
    return (
      <g fill={c}>
        <path d="M12 16h18v34H12z" />
        <path d="M34 16h18v34H34z" opacity="0.75" />
        <rect x="30" y="14" width="4" height="38" />
      </g>
    );
  }
  if (id === 'treatise_sr') {
    return (
      <g fill={c}>
        <rect x="14" y="14" width="8" height="36" rx="4" />
        <rect x="22" y="18" width="20" height="28" />
        <rect x="42" y="14" width="8" height="36" rx="4" />
        <g stroke="#1c1917" strokeWidth="1.4">
          <path d="M26 26h12M26 32h12M26 38h8" />
        </g>
      </g>
    );
  }
  if (id === 'secret_ssr') {
    return (
      <g fill={c}>
        <rect x="16" y="12" width="32" height="40" rx="2" />
        <rect x="30" y="12" width="4" height="40" fill="#1c1917" opacity="0.45" />
        <circle cx="32" cy="32" r="7" fill="#1c1917" />
        <circle cx="32" cy="32" r="4" />
      </g>
    );
  }
  return null;
}
