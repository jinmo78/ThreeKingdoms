// 출진과 같은 책상: 왼쪽 한지 판 + 오른쪽 군령 두루마리. 폰 가로는 쓰지 않는다.
import type { CSSProperties, ReactNode } from 'react';
import { cn } from './ui';

export type Slip = { id: string; han: string; label: string; on: boolean; onClick: () => void };

const CORNER_POS: CSSProperties[] = [
  { top: 2, left: 2 },
  { top: 2, right: 2, transform: 'scaleX(-1)' },
  { bottom: 2, left: 2, transform: 'scaleY(-1)' },
  { bottom: 2, right: 2, transform: 'scale(-1,-1)' },
];

function Corners() {
  return (
    <>
      {CORNER_POS.map((pos, i) => (
        <svg key={i} width={22} height={22} viewBox="0 0 24 24" className="pointer-events-none absolute z-[4]" style={pos} aria-hidden>
          <path d="M2 22V8Q2 2 8 2H22" fill="none" stroke="#1b1713" strokeWidth="3.2" opacity=".45" />
          <path d="M2 22V8Q2 2 8 2H22" fill="none" stroke="#C5A059" strokeWidth="1.5" />
          <path d="M6.5 17V11Q6.5 6.5 11 6.5H17" fill="none" stroke="#C5A059" strokeWidth=".9" opacity=".8" />
          <path d="M4.5 1.2L7.8 4.5L4.5 7.8L1.2 4.5Z" fill="#B8332A" stroke="#C5A059" strokeWidth=".8" />
          <circle cx="22" cy="2" r="1.1" fill="#C5A059" />
          <circle cx="2" cy="22" r="1.1" fill="#C5A059" />
        </svg>
      ))}
    </>
  );
}

export function SlipTabs({ slips }: { slips: Slip[] }) {
  const cols = slips.length <= 2 ? 'grid-cols-2' : slips.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <div className="slip-rail">
      <div className={cn('slip-row grid gap-1.5 px-2', cols)}>
        {slips.map((s) => (
          <button key={s.id} type="button" onClick={s.onClick} className="slip" data-on={s.on} aria-pressed={s.on}>
            <span>
              <b>{s.han}</b>
              <i>{s.label}</i>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Desk({
  title, hanja, meta, slips, seal, scrollTitle, scroll, children, scrollFirst = true,
}: {
  title: string;
  hanja: string;
  meta?: ReactNode;
  slips?: Slip[];
  seal: string;
  scrollTitle?: ReactNode;
  scroll?: ReactNode;
  children: ReactNode;
  /** 좁은 화면에서 두루마리를 본문 위에 둔다 */
  scrollFirst?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-4', scroll != null && 'lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start')}>
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 className="font-serif text-xl font-black tracking-wide text-[#2C221E]">
            {title} <span className="ml-1 text-[11px] font-bold tracking-[0.3em] text-[#B8332A]">{hanja}</span>
          </h2>
          {meta && <span className="text-xs font-bold text-stone-200">{meta}</span>}
        </div>
        {slips && slips.length > 0 && <SlipTabs slips={slips} />}
        <div className="frame desk-sheet relative p-3 sm:p-4">
          <Corners />
          {children}
        </div>
      </div>

      {scroll != null && <div className={cn(
        'lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:flex lg:max-h-[calc(100dvh-6rem)] lg:flex-col',
        scrollFirst && 'max-lg:order-first',
      )}>
        <div className="roller-bar" aria-hidden />
        <div className="silk lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <div className="flex items-start gap-2.5 px-5 pt-3">
            <span className="seal seal-lg shrink-0">{seal}</span>
            {scrollTitle && <div className="min-w-0 font-serif text-lg font-black leading-tight">{scrollTitle}</div>}
          </div>
          <div className="px-5 pb-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <div className="ornate-rule"><i /></div>
            {scroll}
          </div>
        </div>
        <div className="roller-bar" aria-hidden />
      </div>}
    </div>
  );
}
