// 공성 편: 어느 부대를 보낼지 고르고, 성 수비대의 남은 병력을 보여 준다. (군령 두루마리 안에 들어감)
import { TROOP } from '../data/meta';
import { MIN_SORTIE } from '../engine/siege';
import type { UnitProfile } from '../engine/unit';
import { cn } from './ui';

export interface SquadRow { idx: number; p: UnitProfile; r: number }
export interface GarrisonRow { p: UnitProfile; r: number }

const pct = (r: number) => `${Math.round(r * 100)}%`;

function Bar({ r, tone }: { r: number; tone: 'mine' | 'foe' }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#1b1713]/70">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: pct(r), background: tone === 'mine' ? (r < 0.4 ? '#c4352a' : '#3f8f68') : '#c4352a' }}
      />
    </div>
  );
}

export function SiegePanel({ squads, garrison, picks, onToggle }: {
  squads: SquadRow[]; garrison: GarrisonRow[]; picks: Set<number>; onToggle: (idx: number) => void;
}) {
  const wounded = garrison.some((g) => g.r < 0.999);
  return (
    <div className="mt-3 space-y-2.5 text-xs">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <b className="font-serif text-[13px]">出征 출정 부대</b>
          <span className="text-[10px] opacity-60">나눠 보내도 됩니다</span>
        </div>
        <div className="space-y-1">
          {squads.map(({ idx, p, r }) => {
            const ready = r >= MIN_SORTIE;
            const on = ready && picks.has(idx);
            return (
              <button
                key={idx}
                type="button"
                disabled={!ready}
                onClick={() => onToggle(idx)}
                aria-pressed={on}
                className={cn(
                  'block w-full rounded-md px-2 py-1.5 text-left ring-1 transition',
                  on ? 'bg-[#8e2a22]/15 ring-[#8e2a22]/60' : 'bg-[#8a6230]/10 ring-[#8a6230]/30',
                  !ready && 'opacity-50',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-black ring-1',
                    on ? 'bg-[#8e2a22] text-[#fff4d6] ring-[#8e2a22]' : 'ring-[#8a6230]/50')}>{on ? '✓' : ''}</span>
                  <span className="seal">{TROOP[p.troop].seal}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{idx + 1}부대 · {p.name.replace(' 부대', '')}</span>
                  <span className="tabular opacity-70">{ready ? `전투력 ${p.power.toLocaleString()}` : '회복 중'}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <div className="flex-1"><Bar r={r} tone="mine" /></div>
                  <span className={cn('tabular w-8 text-right text-[10px]', r < 0.999 && 'font-bold text-[#B8382E]')}>{pct(r)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <b className="font-serif text-[13px]">守備 성 수비대</b>
          {wounded && <span className="text-[10px] font-bold text-[#B8382E]">공격받아 약해진 상태 · 시간이 지나면 회복</span>}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {garrison.map(({ p, r }, i) => (
            <div key={i} className="rounded-md bg-[#1b1713]/10 px-1.5 py-1 ring-1 ring-[#8a6230]/30">
              <div className="flex items-center justify-between gap-1">
                <span className="seal">{TROOP[p.troop].seal}</span>
                <span className="tabular text-[10px] opacity-70">{p.power.toLocaleString()}</span>
              </div>
              <div className="mt-1"><Bar r={r} tone="foe" /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
