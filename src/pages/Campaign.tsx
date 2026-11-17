// 원정 지도. 진행·드롭·출진 함수는 그대로 두고 고르는 화면만 고지도로 보여 준다.
// 그림(한지 질감·산수·성루·두루마리)은 SVG와 index.css(.war-*, .gate, .silk 등)로만 그린다.
import { Lock, Swords } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CounterFormationButton } from '../components/CounterFormation';
import { GearArt } from '../components/GearArt';
import { cn } from '../components/ui';
import { GENERAL_MAP } from '../data/generals';
import { GEAR_MAP, stageGearId } from '../data/gear';
import { TROOP } from '../data/meta';
import { CHAPTERS, isUnlocked, STAGE_MAP, stageIndex, STAGES } from '../data/stages';
import { matchupGrade, matchupVs } from '../engine/matchup';
import type { UnitProfile } from '../engine/unit';
import { enemyProfiles, playerProfiles, useGame } from '../store/gameStore';
import type { EnemyUnit, GearSlot, Troop } from '../types';

type GearFilter = 'all' | GearSlot;

const FILTERS: readonly [GearFilter, string, string][] = [
  ['all', '全', '전체'],
  ['weapon', '劍', '무기'],
  ['armor', '甲', '갑주'],
  ['tome', '書', '서책'],
];
const SLOT_HAN: Record<GearSlot, string> = { weapon: '劍', armor: '甲', tome: '書' };

/* ───────── 지도 좌표 (viewBox 400 × MAP_H, 노드는 % 로 얹는다) ───────── */
const VW = 400;
const ROW = 124;
const HEAD = 76;
const TOP = 24;
const BOT = 80;

type Spot = { x: number; y: number };
const { SPOTS, HEADS, MAP_H } = (() => {
  const spots: Spot[] = [];
  const heads: { id: number; title: string; year: string; y: number }[] = [];
  let y = TOP;
  STAGES.forEach((s, i) => {
    if (STAGES[i - 1]?.chapter !== s.chapter) {
      const c = CHAPTERS.find((ch) => ch.id === s.chapter);
      if (c) heads.push({ id: c.id, title: c.title, year: c.year, y: y + HEAD / 2 });
      y += HEAD;
    }
    const side = i % 2 === 0 ? -1 : 1;
    spots.push({ x: 200 + side * (78 + 30 * Math.sin(i * 1.9)), y: y + 38 });
    y += ROW;
  });
  return { SPOTS: spots, HEADS: heads, MAP_H: y + BOT };
})();

/** 노드 i → i+1 을 잇는 S자 곡선 */
const SEGMENTS = SPOTS.slice(0, -1).map((a, i) => {
  const b = SPOTS[i + 1];
  const k = (b.y - a.y) * 0.55;
  return `M${a.x} ${a.y}C${a.x} ${a.y + k} ${b.x} ${b.y - k} ${b.x} ${b.y}`;
});

/* ───────── 수묵 산수 배경 (시드 고정이라 항상 같은 그림) ───────── */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ridgePath(rand: () => number, base: number, amp: number) {
  const pts: [number, number][] = [];
  for (let x = -220, n = 0; x <= 620; x += 46, n++) {
    const side = Math.min(1, Math.abs(x - 200) / 250); // 가운데(길)는 낮게, 가장자리는 높게
    const peak = (n % 2 === 0 ? 0.55 + 0.45 * rand() : 0.12 + 0.2 * rand()) * amp * (0.28 + 0.72 * side);
    pts.push([x, base - peak]);
  }
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += `Q${pts[i][0]} ${pts[i][1].toFixed(1)} ${mx} ${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d}L${last[0]} ${last[1].toFixed(1)}L${last[0]} ${base + 150}L${pts[0][0]} ${base + 150}Z`;
}

function riverPath(phase: number, amp: number) {
  const pts: [number, number][] = [];
  for (let y = -40, k = 0; y <= MAP_H + 60; y += 270, k++) pts.push([200 + amp * Math.sin(k * 1.15 + phase), y]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const ym = (y0 + y1) / 2;
    d += `C${x0.toFixed(1)} ${ym} ${x1.toFixed(1)} ${ym} ${x1.toFixed(1)} ${y1}`;
  }
  return d;
}

const ART = (() => {
  const rand = mulberry32(1914);
  const bands: { d: string; op: number }[][] = [];
  const mists: { cx: number; cy: number; rx: number; ry: number }[] = [];
  for (let base = 150, n = 0; base < MAP_H; base += 330, n++) {
    bands.push([
      { d: ridgePath(rand, base - 30, 150), op: 0.14 },
      { d: ridgePath(rand, base + 20, 115), op: 0.24 },
      { d: ridgePath(rand, base + 70, 80), op: 0.36 },
    ]);
    mists.push({ cx: 90 + rand() * 220, cy: base + 80 + rand() * 40, rx: 190 + rand() * 90, ry: 26 + rand() * 12 });
    if (n % 2 === 0) mists.push({ cx: 60 + rand() * 280, cy: base + 215, rx: 150, ry: 20 });
  }
  return { bands, mists, rivers: [riverPath(1, 120), riverPath(3.6, 85)] };
})();

/** 성루·지도 공용 정의. 노드 24개가 <use> 로 한 번만 그린 성루를 가져다 쓴다. */
function MapDefs() {
  return (
    <defs>
      <linearGradient id="cm-stone" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b3a98f" />
        <stop offset="1" stopColor="#766e5d" />
      </linearGradient>
      <linearGradient id="cm-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2d98f" />
        <stop offset="1" stopColor="#a9822f" />
      </linearGradient>
      <linearGradient id="cm-roof" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#566a65" />
        <stop offset="1" stopColor="#202b29" />
      </linearGradient>
      <linearGradient id="cm-ridge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
        <stop offset="1" stopColor="currentColor" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="cm-mist">
        <stop offset="0" stopColor="#fff8e6" stopOpacity="0.75" />
        <stop offset="1" stopColor="#fff8e6" stopOpacity="0" />
      </radialGradient>
      {/* 먹이 번진 가장자리 */}
      <filter id="cm-ink" x="-5%" y="-25%" width="110%" height="150%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="0.9" />
      </filter>

      {/* 동양식 성루: 석축 + 문 + 2층 누각(붉은 기둥, 치켜 올린 기와지붕) + 깃대 */}
      <symbol id="cm-tower" viewBox="0 0 48 50">
        <polygon points="4,49 8,40 40,40 44,49" fill="url(#cm-stone)" />
        <path d="M7 44H41M6 46.6H42" stroke="#4a4338" strokeWidth=".6" opacity=".55" />
        <path d="M20.5 49V44.5a3.5 3.5 0 0 1 7 0V49Z" fill="#1d1915" />
        <rect x="7" y="39" width="34" height="1.7" fill="url(#cm-gold)" />
        <rect x="16" y="21" width="16" height="7" fill="#7a2820" />
        {[16, 23.2, 30.4].map((x) => <rect key={x} x={x} y="21" width="1.6" height="7" fill="#c04a3a" />)}
        <rect x="11" y="32" width="26" height="7.4" fill="#7a2820" />
        {[11, 19.4, 27.8, 35.4].map((x) => <rect key={x} x={x} y="32" width="1.6" height="7.4" fill="#c04a3a" />)}
        <path d="M2 33Q13 33 16 27H32Q35 33 46 33Q37 36.4 24 36.4Q11 36.4 2 33Z" fill="url(#cm-roof)" stroke="#16201e" strokeWidth=".6" strokeLinejoin="round" />
        <path d="M16.5 27.4H31.5M6 33.4Q14 34.6 24 34.8" stroke="#9db3aa" strokeWidth=".7" opacity=".6" fill="none" />
        <path d="M8 19Q18 19 20.5 12.5H27.5Q30 19 40 19Q32 22.2 24 22.2Q16 22.2 8 19Z" fill="url(#cm-roof)" stroke="#16201e" strokeWidth=".6" strokeLinejoin="round" />
        <path d="M21 13H27" stroke="#9db3aa" strokeWidth=".7" opacity=".6" />
        <rect x="22.6" y="10.2" width="2.8" height="2.4" fill="url(#cm-gold)" />
        <path d="M24 10.2V0.6" stroke="#5a3a1a" strokeWidth="1" />
        {([[2.4, 33], [45.6, 33], [8.4, 19], [39.6, 19]] as const).map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="1" fill="url(#cm-gold)" />)}
      </symbol>
    </defs>
  );
}

/** 지도 뒤쪽: 겹겹의 산맥 · 안개 · 강줄기 */
function Backdrop() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${VW} ${MAP_H}`} aria-hidden>
      <MapDefs />
      {ART.rivers.map((d, i) => (
        <g key={i} fill="none" strokeLinecap="round" style={{ stroke: 'var(--river)' }}>
          <path d={d} strokeWidth={i === 0 ? 24 : 15} opacity=".14" />
          <path d={d} strokeWidth={i === 0 ? 13 : 8} opacity=".26" />
          <path d={d} strokeWidth="1.6" strokeDasharray="30 14 8 18" style={{ stroke: '#fff8e6' }} opacity=".45" />
        </g>
      ))}
      {ART.bands.map((band, i) => (
        <g key={i} filter="url(#cm-ink)">
          {band.map((r, j) => <path key={j} d={r.d} fill="url(#cm-ridge)" opacity={r.op} />)}
        </g>
      ))}
      {ART.mists.map((m, i) => <ellipse key={i} cx={m.cx} cy={m.cy} rx={m.rx} ry={m.ry} fill="url(#cm-mist)" />)}
    </svg>
  );
}

/** 굽이치는 진군로. 점령한 구간은 주홍 붓길, 다음 구간은 금빛 점선이 움직인다. */
function Road({ cleared, frontierId }: { cleared: Record<string, number>; frontierId: string }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${VW} ${MAP_H}`} aria-hidden>
      {SEGMENTS.map((d, i) => {
        const id = STAGES[i].id;
        const st = (cleared[id] ?? 0) > 0 ? 'done' : id === frontierId ? 'front' : 'lock';
        return (
          <g key={i} className={`road road-${st}`}>
            <path className="road-wash" d={d} />
            <path className="road-brush" d={d} />
            <path className="road-gold" d={d} />
          </g>
        );
      })}
    </svg>
  );
}

/** 성루 아이콘. 점령하면 금박 테두리의 주홍 군기, 아니면 어두운 적 깃발. */
function Tower({ flag, wave, delay }: { flag: 'red' | 'dark'; wave: boolean; delay: number }) {
  return (
    <svg viewBox="0 0 48 50" aria-hidden>
      <use href="#cm-tower" width="48" height="50" />
      <g className={wave ? 'flag-wave' : undefined} style={wave ? { animationDelay: `${-delay}s` } : undefined}>
        <path
          d="M24.6 1L38 4.6L24.6 8.2Z"
          fill={flag === 'red' ? '#c4352a' : '#3a342c'}
          stroke={flag === 'red' ? '#f0d58a' : '#6b6258'}
          strokeWidth=".9"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/** 모서리 전통 문양. 부모에 position:relative 가 있어야 한다. */
const CORNER_POS = [
  { top: 2, left: 2 },
  { top: 2, right: 2, transform: 'scaleX(-1)' },
  { bottom: 2, left: 2, transform: 'scaleY(-1)' },
  { bottom: 2, right: 2, transform: 'scale(-1,-1)' },
] as const;

function Corners({ size = 26 }: { size?: number }) {
  return (
    <>
      {CORNER_POS.map((pos, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className="pointer-events-none absolute z-[4]" style={pos} aria-hidden>
          <path d="M2 22V8Q2 2 8 2H22" fill="none" stroke="#1b1713" strokeWidth="3.2" opacity=".45" />
          <path d="M2 22V8Q2 2 8 2H22" fill="none" stroke="#C5A059" strokeWidth="1.5" />
          <path d="M6.5 17V11Q6.5 6.5 11 6.5H17" fill="none" stroke="#C5A059" strokeWidth=".9" opacity=".8" />
          <path d="M4.5 1.2L7.8 4.5L4.5 7.8L1.2 4.5Z" fill="#B8382E" stroke="#C5A059" strokeWidth=".8" />
          <circle cx="22" cy="2" r="1.1" fill="#C5A059" />
          <circle cx="2" cy="22" r="1.1" fill="#C5A059" />
        </svg>
      ))}
    </>
  );
}

function Compass() {
  return (
    <svg className="pointer-events-none absolute right-3 top-3 z-[2] h-12 w-12 opacity-70" viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="26" r="15" fill="none" stroke="#8a6230" strokeWidth=".9" />
      <circle cx="24" cy="26" r="11" fill="none" stroke="#8a6230" strokeWidth=".5" strokeDasharray="1.5 2" />
      <path d="M24 12L27 26L24 40L21 26Z" fill="#8a6230" opacity=".55" />
      <path d="M24 12L27 26H21Z" fill="#b8382e" />
      <path d="M10 26L24 23L38 26L24 29Z" fill="#8a6230" opacity=".4" />
      <text x="24" y="9" textAnchor="middle" fontSize="8" fontWeight="900" fill="#b8382e" fontFamily="serif">北</text>
    </svg>
  );
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

  const clearedCount = STAGES.filter((s) => cleared[s.id]).length;
  const dropId = stageGearId(stage.chapter, stageIndex(stage.id));
  const drop = dropId ? GEAR_MAP[dropId] : undefined;

  return (
    <div className="pb-[20rem] lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4 lg:pb-0">
      <div className="min-w-0">
        <div className="mb-3">
          <div className="flex items-end justify-between gap-2">
            <h2 className="font-serif text-xl font-black tracking-wide">
              천하 원정 <span className="ml-1 text-[11px] font-bold tracking-[0.3em] text-[#B8382E]">天下遠征</span>
            </h2>
            <span className="text-xs font-bold text-stone-500">점령 {clearedCount}/{STAGES.length}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-[#1b1713]/80 p-px shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <div className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(clearedCount / STAGES.length) * 100}%`, background: 'linear-gradient(90deg,#8e2a22,#c4352a 60%,#E3C070)' }} />
          </div>
        </div>

        {/* 병법서 책갈피(죽간) 탭 */}
        <div className="slip-rail">
          <div className="slip-row grid grid-cols-4 gap-1.5 px-2">
            {FILTERS.map(([id, han, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)} className="slip" data-on={filter === id} aria-pressed={filter === id}>
                <span>
                  <b>{han}</b>
                  <i>{label}</i>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="frame war-map paper-tex overflow-hidden">
          <Corners size={36} />
          <Compass />
          <div className="relative mx-auto w-full max-w-[34rem]" style={{ aspectRatio: `${VW} / ${MAP_H}` }}>
            <Backdrop />
            <Road cleared={cleared} frontierId={frontier.id} />

            {HEADS.map((h) => (
              <div key={h.id} className="chapter-banner" style={{ top: `${(h.y / MAP_H) * 100}%` }}>
                <span>
                  <b>제{h.id}장 {h.title}</b>
                  <i>{h.year}</i>
                </span>
              </div>
            ))}

            {STAGES.map((s, i) => {
              const unlocked = isUnlocked(s.id, cleared);
              const done = (cleared[s.id] ?? 0) > 0;
              const front = frontier.id === s.id && !done;
              const gearId = stageGearId(s.chapter, i);
              const slot = gearId ? GEAR_MAP[gearId]?.slot : undefined;
              const lit = filter !== 'all' && slot === filter;
              const state = !unlocked ? 'locked' : done ? 'done' : front ? 'front' : 'open';
              return (
                <button
                  key={s.id}
                  type="button"
                  ref={s.id === frontier.id ? frontierRef : undefined}
                  disabled={!unlocked}
                  onClick={() => setSelected(s.id)}
                  className="gate"
                  data-state={state}
                  data-sel={selected === s.id}
                  data-lit={lit}
                  data-dim={filter !== 'all' && !lit}
                  aria-label={`${s.id} ${s.title}`}
                  style={{ left: `${(SPOTS[i].x / VW) * 100}%`, top: `${(SPOTS[i].y / MAP_H) * 100}%` }}
                >
                  <span className="medal">
                    <Tower flag={done ? 'red' : 'dark'} wave={unlocked} delay={(i * 0.37) % 1.8} />
                    {!unlocked && <span className="gate-badge gate-badge-lock -bottom-1 left-1/2 -translate-x-1/2"><Lock size={11} /></span>}
                    {front && <span className="gate-badge -right-1.5 -top-1.5"><Swords size={11} /></span>}
                    {lit && slot && <span className="gate-badge -right-1.5 -top-1.5">{SLOT_HAN[slot]}</span>}
                  </span>
                  <span className="plaque">
                    <span>
                      <b>{s.title}</b>
                      <i>{s.id} · 전투력 {shortPower(powers[s.id] ?? 0)}</i>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
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

/** 나무 축목 */
function Roller() {
  return <div className="roller-bar" aria-hidden />;
}

/** 군령 두루마리: 모바일은 하단 시트, 넓은 화면은 지도 옆에 붙는다. */
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
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-h-[46dvh] w-[calc(100%-1.5rem)] max-w-lg flex-col lg:sticky lg:bottom-auto lg:top-20 lg:z-0 lg:mx-0 lg:max-h-[calc(100dvh-6rem)] lg:w-auto">
      <Roller />
      <div className="silk paper-tex flex min-h-0 flex-1 flex-col">
        <div key={stageId} className="animate-slide-in min-h-0 flex-1 overflow-y-auto px-6 py-3">
          <div className="flex items-start gap-2.5">
            <span className="seal seal-lg shrink-0">軍令</span>
            <div className="min-w-0">
              <div className="font-serif text-lg font-black leading-tight">{stageId} {title}</div>
              <p className="mt-0.5 text-[11px] opacity-70">{desc}</p>
            </div>
          </div>

          <div className="ornate-rule"><i /></div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span>적 주장 <b className="font-serif">{leadName ?? '—'}</b></span>
            {troop && <span className="seal">{TROOP[troop].seal}</span>}
            <span className="opacity-70">{troop ? TROOP[troop].label : ''} {enemies.length}부대</span>
            <span className={cn('rounded px-1.5 py-0.5 font-bold ring-1',
              grade === '상성 유리' ? 'bg-[#276347]/15 text-[#276347] ring-[#276347]/40'
                : grade === '주의' ? 'bg-[#B8382E]/15 text-[#B8382E] ring-[#B8382E]/40'
                  : 'bg-[#8a6230]/15 text-[#8A6230] ring-[#8a6230]/40')}>
              {grade}
            </span>
          </div>

          {dropId && dropName && (
            <div className="frame frame-sm mt-2.5 flex items-center gap-2.5 p-2">
              <Corners size={14} />
              <GearArt id={dropId} size="sm" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#8A6230]">전리품</div>
                <div className="truncate font-serif text-sm font-bold">{dropName}</div>
              </div>
              {done && <span className="ml-auto text-[10px] opacity-60">재도전 시 가끔</span>}
            </div>
          )}

          <div className="mt-3.5 mb-1">
            {canFight ? (
              <button type="button" className="btn-war" onClick={onFight}><Swords size={18} /> 출진하기</button>
            ) : (
              <button type="button" className="btn-war btn-war-alt" onClick={onFormation}>편성하러 가기</button>
            )}
          </div>
          <CounterFormationButton enemies={stageEnemies} unlocked={fought} lockedNote="첫 전투 후 개방" className="mt-2 w-full" />
        </div>
      </div>
      <Roller />
    </div>
  );
}
