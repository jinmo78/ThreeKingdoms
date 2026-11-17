// 원정 지도. 진행·드롭·출진 함수는 그대로 두고 고르는 화면만 지도로 보여 준다.
import { Lock, Swords } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CounterFormationButton } from '../components/CounterFormation';
import { GearArt } from '../components/GearArt';
import { Btn, cn } from '../components/ui';
import { GENERAL_MAP } from '../data/generals';
import { GEAR_MAP, stageGearId } from '../data/gear';
import { TROOP } from '../data/meta';
import { CHAPTERS, isUnlocked, STAGE_MAP, stageIndex, STAGES } from '../data/stages';
import { matchupGrade, matchupVs } from '../engine/matchup';
import type { UnitProfile } from '../engine/unit';
import { enemyProfiles, playerProfiles, useGame } from '../store/gameStore';
import type { EnemyUnit, GearSlot, Troop } from '../types';

type GearFilter = 'all' | GearSlot;

const ROW = 108;
const MAP_H = 56 + STAGES.length * ROW;

function nodeCenter(i: number) {
  return { x: i % 2 === 0 ? 27 : 73, y: 48 + i * ROW };
}

export default function Campaign() {
  const cleared = useGame((s) => s.cleared);
  const fought = useGame((s) => s.fought);
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const startBattle = useGame((s) => s.startBattle);
  const setView = useGame((s) => s.setView);
  const focusStage = useGame((s) => s.focusStage);
  const setFocusStage = useGame((s) => s.setFocusStage);
  const [filter, setFilter] = useState<GearFilter>('all');
  const frontierRef = useRef<HTMLButtonElement>(null);

  const frontier = STAGES.find((s) => isUnlocked(s.id, cleared) && !(cleared[s.id] > 0)) ?? STAGES[STAGES.length - 1];
  const firstOpen = frontier;
  const [selected, setSelectedState] = useState(
    focusStage && STAGE_MAP[focusStage] && isUnlocked(focusStage, cleared) ? focusStage : firstOpen.id,
  );
  const setSelected = (id: string) => {
    setSelectedState(id);
    setFocusStage(id);
  };
  const stage = STAGE_MAP[selected] ?? firstOpen;

  const mine = useMemo(() => playerProfiles(formation, roster, gear), [formation, roster, gear]);
  const enemies = useMemo(() => enemyProfiles(stage.id), [stage.id]);
  const powers = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of STAGES) out[s.id] = enemyProfiles(s.id).reduce((n, p) => n + p.power, 0);
    return out;
  }, []);

  useEffect(() => {
    frontierRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  const path = STAGES.map((_, i) => {
    const p = nodeCenter(i);
    return `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
  }).join(' ');
  const clearedCount = STAGES.filter((s) => cleared[s.id]).length;
  const dropId = stageGearId(stage.chapter, stageIndex(stage.id));
  const drop = dropId ? GEAR_MAP[dropId] : undefined;

  return (
    <div className="pb-[22rem]">
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="font-serif text-xl font-black">천하 원정</h2>
        <span className="text-xs text-stone-500">점령 {clearedCount}/{STAGES.length}</span>
      </div>

      <div className="mb-2 grid grid-cols-4 gap-1">
        {([
          ['all', '전체'],
          ['weapon', '무기 劍'],
          ['armor', '갑주 甲'],
          ['tome', '서책 書'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)}
            className={cn('min-h-11 rounded-lg border px-1 font-serif text-[11px] font-bold',
              filter === id ? 'border-[#C6A15B] bg-[#C6A15B] text-[#171513]' : 'border-[#C6A15B]/40 text-stone-600 dark:text-[#E7DCC8]')}>
            {label}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[#C6A15B]/50 bg-[#EFE6D5] text-[#2a241c] dark:bg-[#231F1A] dark:text-[#E7DCC8]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${MAP_H}`} preserveAspectRatio="none" aria-hidden>
          <path d="M-2 80 C 20 40, 40 120, 70 70 S 110 30, 102 140" fill="none" stroke="#7f97a8" strokeWidth="3" opacity="0.35" />
          <path d="M-2 420 C 30 380, 55 470, 102 430" fill="none" stroke="#7f97a8" strokeWidth="2.4" opacity="0.28" />
          <path d="M8 200 l6 14 h-12 z M78 520 l7 16 h-14 z M18 900 l6 14 h-12 z" fill="#8d8474" opacity="0.35" />
          <path d={path} fill="none" stroke="#8a6230" strokeWidth="2" strokeDasharray="6 8" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="relative" style={{ height: MAP_H }}>
          {STAGES.map((s, i) => {
            const unlocked = isUnlocked(s.id, cleared);
            const done = (cleared[s.id] ?? 0) > 0;
            const front = frontier.id === s.id && !done;
            const gearId = stageGearId(s.chapter, i);
            const slot = gearId ? GEAR_MAP[gearId]?.slot : undefined;
            const lit = filter !== 'all' && slot === filter;
            const chapter = s.id.endsWith('-1') ? CHAPTERS.find((c) => c.id === s.chapter) : undefined;
            return (
              <button
                key={s.id}
                type="button"
                ref={s.id === frontier.id ? frontierRef : undefined}
                disabled={!unlocked}
                onClick={() => setSelected(s.id)}
                style={{ top: nodeCenter(i).y - 40, left: i % 2 === 0 ? '4%' : undefined, right: i % 2 === 0 ? undefined : '4%' }}
                className={cn(
                  'absolute flex w-[46%] max-w-[11.5rem] min-h-16 flex-col justify-center rounded-lg border px-2 py-1.5 text-left',
                  done ? 'border-[#B8382E]/70 bg-[#F7F1E4]' : 'border-[#8a6230]/50 bg-[#F7F1E4]/95',
                  selected === s.id && 'ring-2 ring-[#B8382E]',
                  front && 'gate-pulse border-[#C6A15B]',
                  lit && 'border-[#C6A15B] shadow-[0_0_14px_rgba(198,161,91,0.85)]',
                  !unlocked && 'border-[#2a241c] bg-[#2a241c]/80 text-[#E7DCC8]/70',
                  'dark:bg-[#2c2823]',
                )}
              >
                {chapter && <span className="text-[10px] text-[#8A6230]">제{chapter.id}장 · {chapter.year}</span>}
                <span className="flex items-center gap-1">
                  {front && <Swords size={13} className="shrink-0 text-[#B8382E]" />}
                  {!unlocked && <Lock size={12} className="shrink-0" />}
                  <span className="truncate font-serif text-sm font-black">{s.title}</span>
                </span>
                <span className="truncate text-[10px] opacity-70">{s.id} · {shortPower(powers[s.id] ?? 0)}</span>
                {done && <span className="seal absolute -right-1 -top-2 px-1">旗</span>}
              </button>
            );
          })}
        </div>
      </div>

      <Briefing
        stageId={stage.id}
        title={stage.title}
        desc={stage.desc}
        done={(cleared[stage.id] ?? 0) > 0}
        enemies={enemies}
        mine={mine}
        dropId={dropId}
        dropName={drop?.name}
        canFight={mine.length > 0}
        fought={(fought[stage.id] ?? 0) > 0}
        stageEnemies={stage.enemies}
        onFight={() => { setFocusStage(stage.id); startBattle(stage.id); }}
        onFormation={() => setView('formation')}
      />
    </div>
  );
}

function shortPower(n: number) {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString();
}

function mainTroop(enemies: UnitProfile[]): Troop | null {
  if (enemies.length === 0) return null;
  const counts: Record<Troop, number> = { cavalry: 0, infantry: 0, archer: 0 };
  for (const e of enemies) counts[e.troop]++;
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as Troop;
}

function gradeLabel(mine: UnitProfile[], enemies: UnitProfile[]) {
  if (mine.length === 0) return '편성 없음';
  const troops = enemies.map((e) => e.troop);
  const grades = mine.map((p) => matchupGrade(matchupVs(p.troop, troops)));
  const good = grades.filter((g) => g === 'good').length;
  const bad = grades.filter((g) => g === 'bad').length;
  if (bad > good) return '주의';
  if (good > bad) return '상성 유리';
  return '호각';
}

function Briefing({
  stageId, title, desc, done, enemies, mine, dropId, dropName, canFight, fought, stageEnemies, onFight, onFormation,
}: {
  stageId: string; title: string; desc: string; done: boolean;
  enemies: UnitProfile[]; mine: UnitProfile[];
  dropId: string | null; dropName?: string; canFight: boolean; fought: boolean;
  stageEnemies: EnemyUnit[];
  onFight: () => void; onFormation: () => void;
}) {
  const lead = enemies[0];
  const commander = stageEnemies[0]?.members[0];
  const leadName = commander ? GENERAL_MAP[commander]?.name ?? lead?.name : lead?.name;
  const troop = mainTroop(enemies);
  const grade = gradeLabel(mine, enemies);
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto max-h-[46dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-2 border-[#C6A15B] bg-[#F3ECE0] px-4 py-3 text-[#2a241c] shadow-[0_-12px_30px_rgba(0,0,0,0.35)] lg:bottom-4 dark:bg-[#221E1A] dark:text-[#F3ECE0]">
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[#C6A15B]/70" />
      <div className="font-serif text-lg font-black">{stageId} {title}</div>
      <p className="text-[11px] text-[#6b6258] dark:text-[#C9BBA6]">{desc}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span>적 주장 {leadName ?? '—'}</span>
        {troop && <span className="seal">{TROOP[troop].seal}</span>}
        <span className="text-[#6b6258]">{troop ? TROOP[troop].label : ''} {enemies.length}부대</span>
        <span className={cn('rounded px-1.5 py-0.5 font-bold',
          grade === '상성 유리' ? 'bg-[#276347]/15 text-[#276347]' : grade === '주의' ? 'bg-[#B8382E]/15 text-[#B8382E]' : 'bg-[#8a6230]/15 text-[#8A6230]')}>
          {grade}
        </span>
      </div>
      {dropId && dropName && (
        <div className="mt-2 flex items-center gap-2">
          <GearArt id={dropId} size="sm" />
          <div className="min-w-0">
            <div className="text-[10px] text-[#8A6230]">전리품</div>
            <div className="truncate font-serif text-sm font-bold">{dropName}</div>
          </div>
          {done && <span className="ml-auto text-[10px] text-[#6b6258]">재도전 시 가끔</span>}
        </div>
      )}
      {canFight ? (
        <Btn size="lg" className="mt-3 w-full" onClick={onFight}><Swords size={18} /> 출진하기</Btn>
      ) : (
        <Btn size="lg" variant="outline" className="mt-3 w-full" onClick={onFormation}>편성하러 가기</Btn>
      )}
      <CounterFormationButton enemies={stageEnemies} unlocked={fought} lockedNote="첫 전투 후 개방" className="mt-2 w-full" />
    </div>
  );
}
