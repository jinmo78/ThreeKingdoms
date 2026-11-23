// 장수 등용(가챠) 화면 — 일일 무료 · 출석 · 금화 등용
import { CalendarCheck, Coins, Flag, Gift } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Desk } from '../components/Desk';
import { GeneralDetail, GeneralToken } from '../components/General';
import { sceneUrl } from '../components/PageHero';
import { Btn, cn, Hint, Modal, Panel, useLandscape } from '../components/ui';
import { RECRUITABLE } from '../data/generals';
import { FACTION, TROOP } from '../data/meta';
import {
  ATTEND_REWARDS,
  attendancePreview,
  FREE_DAILY_PULLS,
  recruitCost,
} from '../engine/attendance';
import { DUPLICATE_REFUND, PULL_COST, RATES } from '../engine/gacha';
import { useGame, type RecruitResult } from '../store/gameStore';
import type { GeneralDef, Rarity } from '../types';

type Phase = 'idle' | 'reveal';

export default function Recruit() {
  const gold = useGame((s) => s.gold);
  const roster = useGame((s) => s.roster);
  const recruit = useGame((s) => s.recruit);
  const refreshDailyFree = useGame((s) => s.refreshDailyFree);
  const claimAttendance = useGame((s) => s.claimAttendance);
  const totalPulls = useGame((s) => s.totalPulls);
  const freePulls = useGame((s) => s.freePulls);
  const attendDay = useGame((s) => s.attendDay);
  const attendStreak = useGame((s) => s.attendStreak);
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<RecruitResult[]>([]);
  const [opened, setOpened] = useState<boolean[]>([]);
  const [skipped, setSkipped] = useState(false);
  const [lastCount, setLastCount] = useState<1 | 10>(1);
  const [detail, setDetail] = useState<GeneralDef | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [attendNote, setAttendNote] = useState<string | null>(null);
  const land = useLandscape();

  useEffect(() => {
    refreshDailyFree();
  }, [refreshDailyFree]);

  const attend = attendancePreview(attendDay, attendStreak);
  const cost1 = recruitCost(1, freePulls);
  const cost10 = recruitCost(10, freePulls);

  function pull(count: 1 | 10) {
    const r = recruit(count);
    if (!r) return;
    setLastCount(count);
    setResults(r);
    setOpened(r.map(() => false));
    setSkipped(false);
    setPhase('reveal');
  }

  // 닫힌 밀서를 하나씩 연다. 모두 펼치기를 누르면 남은 예약은 지운다.
  useEffect(() => {
    if (phase !== 'reveal' || skipped || results.length === 0) return;
    const timers = results.map((_, i) => window.setTimeout(() => {
      setOpened((prev) => prev.map((v, j) => (j === i ? true : v)));
    }, 700 + i * 240));
    return () => timers.forEach(clearTimeout);
  }, [phase, results, skipped]);

  function openAll() {
    setSkipped(true);
    setOpened(results.map(() => true));
  }

  function onAttend() {
    const r = claimAttendance();
    if (!r) {
      setAttendNote('오늘은 이미 출석했습니다.');
      return;
    }
    setAttendNote(`연속 ${r.streak}일 출석! 무료 등용 +${r.reward}`);
  }

  const allOpen = phase === 'reveal' && opened.length > 0 && opened.every(Boolean);
  const again = recruitCost(lastCount, freePulls);
  const ownedCount = RECRUITABLE.filter((g) => roster[g.id]).length;
  const spentFree = results[0]?.freeUsed ?? 0;
  const spentGold = results[0]?.goldSpent ?? 0;

  const command = (
    <div className={cn(land ? 'space-y-1.5' : 'space-y-3')}>
      <Panel title="출석" icon={<CalendarCheck size={15} />}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-stone-200">
              연속 {attend.claimedToday ? attendStreak : Math.max(0, attend.nextStreak - 1)}일
              {attend.canClaim && <span className="text-amber-300"> · +{attend.reward}</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {ATTEND_REWARDS.map((n, i) => {
                const day = i + 1;
                const cycle = attend.claimedToday
                  ? ((attendStreak - 1) % 7) + 1
                  : attend.canClaim
                    ? ((attend.nextStreak - 1) % 7) + 1
                    : 0;
                const done = cycle > 0 && day < cycle;
                const current = day === cycle;
                return (
                  <span
                    key={day}
                    className={cn(
                      'rounded-lg px-2 py-1 text-[10px] font-bold',
                      current ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/50'
                        : done ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-stone-950/60 text-stone-500',
                    )}
                  >
                    {day}일 +{n}
                  </span>
                );
              })}
            </div>
          </div>
          <Btn variant={attend.canClaim ? 'gold' : 'ghost'} disabled={!attend.canClaim} onClick={onAttend} className="shrink-0">
            <Gift size={15} /> {attend.canClaim ? '출석' : '완료'}
          </Btn>
        </div>
        {attendNote && <p className="mt-2 text-xs text-amber-300">{attendNote}</p>}
      </Panel>

      <div className="flex flex-wrap gap-1 text-[10px] font-bold">
        <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-200">무료 {freePulls}</span>
        <span className="rounded bg-stone-800 px-1.5 py-0.5">SSR {Math.round(RATES.SSR * 100)}% · SR {Math.round(RATES.SR * 100)}% · R {Math.round(RATES.R * 100)}%</span>
        <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-200">10연 SR확정</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PullButton
          label="1회"
          free={cost1.freeUsed}
          gold={cost1.gold}
          canAfford={gold >= cost1.gold}
          disabled={phase === 'reveal'}
          onClick={() => pull(1)}
        />
        <PullButton
          label="10연"
          free={cost10.freeUsed}
          gold={cost10.gold}
          canAfford={gold >= cost10.gold}
          disabled={phase === 'reveal'}
          onClick={() => pull(10)}
          note="SR확정"
          gold10
        />
      </div>

      {!land && (
        <div>
          <div className="mb-1 flex items-center gap-1 font-serif text-sm font-black">확률 <Hint text={`매일 무료 ${FREE_DAILY_PULLS}. 1회 ${PULL_COST.single} · 10연 ${PULL_COST.ten}. ★5 이후 환급 SSR ${DUPLICATE_REFUND.SSR} · SR ${DUPLICATE_REFUND.SR} · R ${DUPLICATE_REFUND.R}.`} /></div>
          <RatesBody />
        </div>
      )}
    </div>
  );

  const stage = (
      <div className={cn('relative flex items-center justify-center overflow-hidden', land ? 'h-full min-h-0 rounded-2xl border border-stone-800 bg-stone-950 p-2' : 'min-h-[22rem] rounded-lg')}>
        <img src={sceneUrl('scene-recruit.webp')} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover brightness-[1.85] contrast-[1.05] saturate-[1.08]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
        <div className="relative w-full">
          {phase === 'idle' && (
            <div className="text-center">
              <div className={cn('relative mx-auto', land ? 'h-20 w-20' : 'h-32 w-32')}>
                <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-dashed border-red-800/60" />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-red-950/60">
                  <Flag size={land ? 28 : 44} className="text-red-300" />
                </div>
              </div>
              <p className={cn('text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]', land ? 'mt-1' : 'mt-4')}>누적 {totalPulls}</p>
            </div>
          )}
        </div>
      </div>
  );

  const overlays = (
    <>
      {phase === 'reveal' && createPortal(
        <div className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden bg-[#241B15]/94 land:overflow-hidden">
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-3 py-4 land:h-full land:min-h-0 land:justify-center land:overflow-hidden land:py-2">
            <div className="mb-3 flex w-full items-center justify-between gap-2">
              <p className="min-w-0 text-xs text-[#E7DCC8]">
                {spentFree > 0 && `무료 -${spentFree}`}
                {spentFree > 0 && spentGold > 0 && ' · '}
                {spentGold > 0 && `금화 -${spentGold}`}
                {spentFree === 0 && spentGold === 0 && '무료'}
                {results.some((r) => r.refund) && ` · 중복 환급 +${results.reduce((n, r) => n + r.refund, 0)}`}
              </p>
              {!allOpen && (
                <button type="button" onClick={openAll}
                  className="min-h-11 shrink-0 rounded-lg border border-[#E2B866]/70 px-3 font-serif text-xs font-bold text-[#2C221E]">
                  모두 펼치기
                </button>
              )}
            </div>
            <div className={cn('grid w-full items-start gap-3', results.length === 1 ? 'max-w-[16rem] grid-cols-1' : 'max-w-sm grid-cols-2 sm:max-w-none sm:grid-cols-5', 'land:flex land:max-w-none land:flex-nowrap land:items-center land:justify-start land:overflow-x-auto land:overflow-y-hidden')}>
              {results.map((r, i) => (
                <Missive
                  key={`${r.def.id}-${i}`}
                  result={r}
                  solo={results.length === 1}
                  open={!!opened[i]}
                  instant={skipped}
                  onOpen={() => setOpened((prev) => prev.map((v, j) => (j === i ? true : v)))}
                  onDetail={() => setDetail(r.def)}
                />
              ))}
            </div>
            {allOpen && (
              <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2">
                <Btn variant="ghost" onClick={() => setPhase('idle')}>확인</Btn>
                <Btn onClick={() => pull(lastCount)} disabled={gold < again.gold}>다시 등용</Btn>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {ratesOpen && (
        <Modal onClose={() => setRatesOpen(false)}>
          <h3 className="mb-3 font-serif text-lg font-black">등용 확률</h3>
          <RatesBody />
          <Btn variant="ghost" className="mt-4 w-full" onClick={() => setRatesOpen(false)}>닫기</Btn>
        </Modal>
      )}

      {detail && (
        <Modal ink onClose={() => setDetail(null)}>
          <GeneralDetail def={detail} owned={roster[detail.id]} onClose={() => setDetail(null)} />
        </Modal>
      )}
    </>
  );

  if (land) {
    return (
      <div className="grid h-full min-h-0 grid-cols-2 gap-2 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-col gap-1.5 overflow-hidden">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-base font-black">장수 등용</h2>
            <span className="shrink-0 text-xs text-stone-400">
              도감 {ownedCount}/{RECRUITABLE.length}
              <button type="button" onClick={() => setRatesOpen(true)} className="ml-2 rounded-full border border-stone-700 px-2 py-0.5 font-bold text-stone-300">확률</button>
            </span>
          </div>
          {command}
        </div>
        {stage}
        {overlays}
      </div>
    );
  }

  return (
    <>
      <Desk
        title="장수 등용"
        hanja="招募"
        meta={<>도감 {ownedCount}/{RECRUITABLE.length}</>}
        seal="招募"
        scrollTitle="등용"
        scroll={command}
      >
        {stage}
      </Desk>
      {overlays}
    </>
  );
}

function Missive({
  result, solo, open, instant, onOpen, onDetail,
}: {
  result: RecruitResult; solo?: boolean; open: boolean; instant: boolean; onOpen: () => void; onDetail: () => void;
}) {
  const { def } = result;
  const faction = FACTION[def.faction];
  const grand = def.rarity === 'SSR';
  const note = result.isNew ? '' : result.refund ? `환급 +${result.refund}` : `돌파 ★${result.stars}`;
  return (
    <button
      type="button"
      onClick={() => (open ? onDetail() : onOpen())}
      className={cn(
        'missive',
        solo && 'is-solo',
        grand ? 'missive-ssr' : def.rarity === 'SR' ? 'missive-sr' : 'missive-r',
        open && 'is-open',
        instant && 'is-instant',
      )}
    >
      <span className="roller" />
      <span className="paper-clip">
        <span className="paper">
          <span className="sheet">
            <span className="flex items-center justify-between gap-1">
              <span className="truncate font-serif text-[10px] font-bold" style={{ color: faction.hex }}>{faction.full}</span>
              <span className="seal">{TROOP[def.troop].seal}</span>
            </span>
            <GeneralToken def={def} size="fill" className={cn('mx-auto mt-1', !solo && 'max-w-[11rem]')} />
            <span className={cn('mt-1 block truncate text-center font-serif font-black', solo ? 'text-lg' : 'text-sm')}>{def.name}</span>
            <span className="block h-4 truncate text-center text-[10px] text-[#6b6258]">{def.title}</span>
            <span className="block h-4 truncate text-center font-serif text-[11px] font-bold">【{def.skill.name}】</span>
            <span className="mt-auto flex h-9 items-end justify-between gap-1">
              <span className="truncate text-[10px] text-[#8A6230]">{note}</span>
              {open && <span className="stamp">{result.isNew ? '신규' : '중복'}</span>}
            </span>
          </span>
        </span>
      </span>
      <span className="roller" />
      {!instant && <span className="wax">封</span>}
      {grand && open && <Motes />}
    </button>
  );
}

const MOTES: [string, string][] = [
  ['-18px', '-28px'], ['22px', '-24px'], ['-28px', '8px'], ['26px', '12px'], ['0px', '-34px'], ['16px', '-8px'],
];

function Motes() {
  return (
    <span className="pointer-events-none absolute inset-0">
      {MOTES.map(([dx, dy], i) => (
        <span key={i} className="mote" style={{ left: '50%', top: '30%', '--dx': dx, '--dy': dy, animationDelay: `${i * 0.08}s` } as CSSProperties} />
      ))}
    </span>
  );
}

function RatesBody() {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {(['SSR', 'SR', 'R'] as Rarity[]).map((r) => (
          <div key={r} className="rounded-lg bg-[#1C1613]/55 p-2 ring-1 ring-[#C89D54]/35">
            <div className={cn('font-black', r === 'SSR' ? 'text-[#F0D48A]' : r === 'SR' ? 'text-[#C4B5FD]' : 'text-[#E8DCC8]')}>{r}</div>
            <div className="tabular font-bold text-[#F5EAD8]">{Math.round(RATES[r] * 100)}%</div>
            <div className="text-[10px] text-[#D4C4A8]">{RECRUITABLE.filter((g) => g.rarity === r).length}명</div>
          </div>
        ))}
      </div>
    </>
  );
}

function PullButton({ label, free, gold, canAfford, onClick, disabled, note, gold10 }: {
  label: string; free: number; gold: number; canAfford: boolean; onClick: () => void; disabled?: boolean; note?: string; gold10?: boolean;
}) {
  const short = !canAfford;
  return (
    <Btn size="md" variant={gold10 ? 'gold' : 'primary'} onClick={onClick} disabled={disabled || short} className="h-full w-full flex-col gap-0 px-2 py-2">
      <span className="text-sm">{label}</span>
      <span className="flex flex-wrap items-center justify-center gap-x-1.5 text-[11px] font-semibold opacity-80">
        {free > 0 && <span>무료 {free}</span>}
        {free > 0 && gold > 0 && <span>·</span>}
        {gold > 0 && <span className="inline-flex items-center gap-0.5"><Coins size={11} />{gold}</span>}
        {free === 0 && gold === 0 && <span>무료</span>}
      </span>
      {note && !short && <span className="text-[10px] font-normal leading-tight">{note}</span>}
    </Btn>
  );
}
