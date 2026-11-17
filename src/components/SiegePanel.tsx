// 공성 편: 어느 부대를 보낼지 고르고, 성 수비대의 남은 병력을 보여 준다. (군령 두루마리 안에 들어감)
import { GENERAL_MAP } from '../data/generals';
import { TROOP } from '../data/meta';
import { STAGE_MAP } from '../data/stages';
import { MIN_SORTIE, type March } from '../engine/siege';
import {
  TACTICS, TACTIC_LIST, TERRAINS, WEATHERS, reinforceChance, tacticEffect, terrainOf, weatherAt, type Tactic,
} from '../engine/tactics';
import type { UnitProfile } from '../engine/unit';
import { cn } from './ui';

/** busy: 다른 성으로 행군 중 */
export interface SquadRow { idx: number; p: UnitProfile; r: number; busy: boolean }
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

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** 행군 중인 부대: 도착까지 남은 시간. 도착하면 곧 전투가 시작된다. */
export function MarchList({ marches, now }: { marches: March[]; now: number }) {
  if (marches.length === 0) return null;
  return (
    <div className="mt-3 text-xs">
      <b className="font-serif text-[13px]">行軍 행군 중</b>
      <div className="mt-1 space-y-1">
        {marches.map((m) => {
          const left = m.eta - now;
          const prog = Math.min(1, Math.max(0, (now - m.from) / Math.max(1, m.eta - m.from)));
          const names = m.units.map((u) => GENERAL_MAP[u.commander ?? '']?.name ?? '?').join('·');
          return (
            <div key={m.id} className="rounded-md bg-[#8a6230]/10 px-2 py-1.5 ring-1 ring-[#8a6230]/30">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-bold">{m.stageId} {STAGE_MAP[m.stageId]?.title} ← {names}</span>
                <span className="tabular shrink-0 font-bold text-[#8e2a22]">{left > 0 ? clock(left) : '도착!'}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1b1713]/70">
                <div className="h-full rounded-full bg-[#c4a15a] transition-[width] duration-1000 ease-linear" style={{ width: `${prog * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FIT_MARK = { good: '◎', ok: '○', bad: '△' } as const;
const FIT_COLOR = { good: 'text-[#276347]', ok: 'text-[#8a6230]', bad: 'text-[#B8382E]' } as const;

/** 계략 고르기: 이 성의 지형과 지금 날씨에 맞는 전술을 고른다 */
export function TacticPicker({ stageId, stageIdx, now, gold, tactic, onPick }: {
  stageId: string; stageIdx: number; now: number; gold: number; tactic: Tactic; onPick: (t: Tactic) => void;
}) {
  const terrain = terrainOf(stageId);
  const weather = weatherAt(now);
  const chance = reinforceChance(stageIdx);
  const fx = tacticEffect(tactic, terrain, weather);
  return (
    <div className="mt-3 text-xs">
      <div className="mb-1 flex items-baseline justify-between">
        <b className="font-serif text-[13px]">計略 전술</b>
        <span className="opacity-70">{TERRAINS[terrain].emoji} {TERRAINS[terrain].name} · {WEATHERS[weather].emoji} {WEATHERS[weather].name}</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {TACTIC_LIST.map((t) => {
          const e = tacticEffect(t, terrain, weather);
          const afford = gold >= TACTICS[t].cost;
          const on = tactic === t;
          return (
            <button
              key={t}
              type="button"
              disabled={!afford}
              aria-pressed={on}
              onClick={() => onPick(t)}
              className={cn('rounded-md px-1 py-1.5 text-center ring-1 transition',
                on ? 'bg-[#8e2a22]/15 ring-[#8e2a22]/60' : 'bg-[#8a6230]/10 ring-[#8a6230]/30', !afford && 'opacity-40')}
            >
              <div className="text-base leading-none">{TACTICS[t].emoji}</div>
              <div className="mt-0.5 font-bold">{TACTICS[t].name}</div>
              <div className="tabular text-[10px] opacity-70">{TACTICS[t].cost ? `${TACTICS[t].cost}금` : '무료'}
                {t !== 'none' && <b className={cn('ml-0.5', FIT_COLOR[e.fit])}>{FIT_MARK[e.fit]}</b>}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] opacity-70">
        {tactic === 'none' ? TACTICS.none.desc : fx.note}
        {tactic !== 'ambush' && <> · 인근 지원군 가능성 {Math.round(chance * 100)}% (기습이면 차단)</>}
      </p>
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
          {squads.map(({ idx, p, r, busy }) => {
            const ready = r >= MIN_SORTIE && !busy;
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
                  <span className="tabular opacity-70">{busy ? '행군 중' : ready ? `전투력 ${p.power.toLocaleString()}` : '회복 중'}</span>
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
