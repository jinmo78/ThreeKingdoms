// 장비 그림. 장수 초상과 같은 실사풍 webp (public/gear/<id>.webp).
import { GEAR_MAP } from '../data/gear';
import { cn } from './ui';

export function GearArt({ id, dim, size = 'md' }: { id: string; dim?: boolean; size?: 'sm' | 'md' }) {
  const def = GEAR_MAP[id];
  return (
    <img
      src={`${import.meta.env.BASE_URL}gear/${def?.art ?? id}.webp`}
      alt={def?.name ?? ''}
      draggable={false}
      loading="lazy"
      className={cn(
        'shrink-0 rounded-xl object-cover brightness-[1.35] contrast-[1.08]',
        size === 'sm' ? 'h-12 w-12' : 'h-24 w-24',
        dim && 'opacity-70',
      )}
    />
  );
}
