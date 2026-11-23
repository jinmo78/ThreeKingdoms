// 도전 — 천하 토벌전(끝없는 도전) · 모의전(연습 전투)
import { BarChart3, Coins, Crown, Dices, Eye, Lock, Mountain, Swords, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CounterFormationButton } from '../components/CounterFormation';
import { EnemyLineup } from '../components/EnemyLineup';
import { FormationEditor } from '../components/FormationEditor';
import { Desk, type Slip } from '../components/Desk';
import { TroopAdviceBox } from '../components/Matchup';
import { PowerCompare } from '../components/UnitPreview';
import { Btn, cn, Panel, useLandscape } from '../components/ui';
import { ARMY_THEMES, practiceOpponent, themeLabel } from '../engine/aiArmy';
import { simulateBattle } from '../engine/battle';
import { conquestFloor, imprintBonus, UNIFY_FLOOR } from '../engine/conquest';
import { decreeFormationOk, decreeOfWeek, decreeTroopOk } from '../engine/decree';
import { GENERAL_MAP } from '../data/generals';
import { deployedAvgLevel, enemyUnitsToProfiles } from '../engine/profiles';
import { randomSeed } from '../engine/rng';
import type { UnitProfile } from '../engine/unit';
import { playerProfiles, useGame, type PracticeDifficulty } from '../store/gameStore';

const DIFFS: { value: PracticeDifficulty; label: string }[] = [
  { value: -3, label: '약함' },
  { value: 0, label: '보통' },
  { value: 3, label: '강함' },
  { value: 6, label: '지옥' },
];
/** 100전 측정용 고정 시드 — 편성끼리 같은 조건에서 비교되도록 */
const MEASURE_SEEDS = Array.from({ length: 100 }, (_, i) => 31 + i * 7919);

export default function Challenge() {
  const [tab, setTab] = useState<'practice' | 'conquest' | 'decree'>('conquest');
  const conquestOpen = useGame((s) => (s.cleared['4-3'] ?? 0) > 0);
  const land = useLandscape();
  const slips: Slip[] = [
    { id: 'conquest', han: '討', label: '토벌', on: tab === 'conquest', onClick: () => setTab('conquest') },
    { id: 'decree', han: '令', label: '군령', on: tab === 'decree', onClick: () => setTab('decree') },
    { id: 'practice', han: '模', label: '모의', on: tab === 'practice', onClick: () => setTab('practice') },
  ];

  if (land) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden">
        <div className="flex shrink-0 gap-1 self-start rounded-xl bg-stone-950/80 p-1">
          <TabBtn active={tab === 'conquest'} onClick={() => setTab('conquest')}>
            {conquestOpen ? <Mountain size={14} /> : <Lock size={13} />} 토벌
          </TabBtn>
          <TabBtn active={tab === 'decree'} onClick={() => setTab('decree')}>군령</TabBtn>
          <TabBtn active={tab === 'practice'} onClick={() => setTab('practice')}><Target size={14} /> 모의</TabBtn>
        </div>
        <div className="min-h-0 flex-1">
          {tab === 'practice' ? <Practice /> : tab === 'decree' ? <Decree /> : <Conquest />}
        </div>
      </div>
    );
  }

  return tab === 'practice' ? <Practice slips={slips} /> : tab === 'decree' ? <Decree slips={slips} /> : <Conquest slips={slips} />;
}

// ---------------- 모의전 ----------------
function Practice({ slips }: { slips?: Slip[] }) {
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const practice = useGame((s) => s.practice);
  const setPractice = useGame((s) => s.setPractice);
  const startPractice = useGame((s) => s.startPractice);
  const log = useGame((s) => s.practiceLog);
  const addRecord = useGame((s) => s.addPracticeRecord);
  const [measuring, setMeasuring] = useState(false);
  const land = useLandscape();

  const mine = useMemo(() => playerProfiles(formation, roster, gear), [formation, roster, gear]);
  // 상대 레벨 = 출진 장수 평균 레벨 + 강도
  const avgLevel = useMemo(() => deployedAvgLevel(formation, roster), [formation, roster]);
  const opp = useMemo(
    () => practiceOpponent(practice.theme, practice.diff, practice.seed, avgLevel),
    [practice.theme, practice.diff, practice.seed, avgLevel],
  );
  const enemies = opp.enemies;
  const enemyProf = useMemo(() => enemyUnitsToProfiles(enemies), [enemies]);
  const opponent = opp.label;
  const commanders = mine.map((p) => p.members[0]!.def.name).join('·');

  function measure() {
    setMeasuring(true);
    // 버튼 상태가 먼저 그려지도록 한 틱 미룸
    setTimeout(() => {
      let wins = 0;
      let chains = 0;
      for (const seed of MEASURE_SEEDS) {
        const r = simulateBattle(mine, enemyProf, seed);
        if (r.win) wins++;
        chains += r.stats.chains;
      }
      addRecord({ opponent, commanders, winRate: wins / MEASURE_SEEDS.length, avgChains: chains / MEASURE_SEEDS.length });
      setMeasuring(false);
    }, 30);
  }

  const setupPanels = (
    <>
        <Panel title="상대 설정" icon={<Target size={15} />}>
          <div className="space-y-3 text-xs">
            <div>
              <div className="mb-1 text-stone-400">상대 군단</div>
              <div className="flex flex-wrap gap-1">
                {ARMY_THEMES.map((t) => (
                  <Chip key={t} active={practice.theme === t} onClick={() => setPractice({ theme: t })}>{themeLabel(t)}</Chip>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-stone-400">강도 <span className="text-stone-500">(내 출진 장수 평균 Lv.{avgLevel} 기준)</span></div>
              <div className="flex flex-wrap gap-1">
                {DIFFS.map((d) => (
                  <Chip key={d.value} active={practice.diff === d.value} onClick={() => setPractice({ diff: d.value })}>
                    {d.label} <span className="opacity-60">Lv.{Math.max(1, avgLevel + d.value)}</span>
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-stone-300">보상 없음</span>
              <Btn size="sm" variant="ghost" onClick={() => setPractice({ seed: randomSeed() })}><Dices size={13} /> 새 상대</Btn>
            </div>
          </div>
        </Panel>

        <Panel title={`상대: ${opponent}`} icon={<Swords size={15} />}>
          <EnemyLineup units={enemyProf} />
        </Panel>

    </>
  );
  const testPanels = (
    <>
        <Panel title="내 편성 시험" icon={<BarChart3 size={15} />}>
          <div className="space-y-3">
            {!land && mine.length > 0 && <TroopAdviceBox enemy={enemyProf} mine={mine} />}
            {mine.length > 0 && <PowerCompare mine={sumPower(mine)} enemy={sumPower(enemyProf)} />}
            <div className="grid grid-cols-2 gap-2">
              <Btn disabled={mine.length === 0} onClick={() => startPractice(enemies, `모의전 · ${themeLabel(practice.theme)}`)}><Eye size={15} /> 관전</Btn>
              <Btn variant="gold" onClick={measure} disabled={measuring || mine.length === 0}>
                <BarChart3 size={15} /> {measuring ? '측정' : '100전'}
              </Btn>
            </div>
            <CounterFormationButton enemies={enemies} unlocked className="w-full" />
          </div>
        </Panel>

        <Panel title="측정 기록" icon={<BarChart3 size={15} />}>
          {log.length === 0 ? null : (
            <div className="space-y-1.5">
              {log.map((r, i) => (
                <div key={r.id} className={cn('rounded-lg p-2 text-xs', i === 0 ? 'bg-amber-400/10 ring-1 ring-amber-400/30' : 'bg-stone-950/60')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-bold text-stone-200">주장 {r.commanders}</span>
                    <span className={cn('tabular text-base font-black', r.winRate >= 0.7 ? 'text-emerald-300' : r.winRate >= 0.4 ? 'text-amber-300' : 'text-red-300')}>
                      {Math.round(r.winRate * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span className="truncate">vs {r.opponent}</span>
                    <span>연쇄 {r.avgChains.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
    </>
  );

  if (land) {
    return (
      <div className="grid h-full min-h-0 grid-cols-[13.5rem_minmax(0,1fr)] gap-1.5 overflow-hidden">
        <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
          <div className="flex flex-wrap gap-1">
            {ARMY_THEMES.map((t) => (
              <Chip key={t} active={practice.theme === t} onClick={() => setPractice({ theme: t })}>{themeLabel(t)}</Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {DIFFS.map((d) => (
              <Chip key={d.value} active={practice.diff === d.value} onClick={() => setPractice({ diff: d.value })}>{d.label}</Chip>
            ))}
            <Btn size="sm" variant="ghost" onClick={() => setPractice({ seed: randomSeed() })}><Dices size={13} /></Btn>
          </div>
          {mine.length > 0 && <PowerCompare mine={sumPower(mine)} enemy={sumPower(enemyProf)} />}
          <div className="grid grid-cols-2 gap-1">
            <Btn size="sm" disabled={mine.length === 0} onClick={() => startPractice(enemies, `모의전 · ${themeLabel(practice.theme)}`)}><Eye size={14} /> 관전</Btn>
            <Btn size="sm" variant="gold" onClick={measure} disabled={measuring || mine.length === 0}><BarChart3 size={14} /> {measuring ? '측정' : '100전'}</Btn>
          </div>
          <CounterFormationButton enemies={enemies} unlocked size="sm" className="w-full" />
          <EnemyLineup units={enemyProf} />
          {log[0] && <p className="truncate text-[11px] font-bold text-stone-300">{Math.round(log[0].winRate * 100)}% · {log[0].commanders}</p>}
        </div>
        <div className="min-h-0 overflow-hidden"><EditorSection enemy={enemyProf} /></div>
      </div>
    );
  }

  return (
    <Desk title="도전" hanja="挑戰" slips={slips} seal="模擬">
      <div className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-2">{setupPanels}{testPanels}</div>
        <EditorSection enemy={enemyProf} />
      </div>
    </Desk>
  );
}

// ---------------- 천하 토벌전 ----------------
function Conquest({ slips }: { slips?: Slip[] }) {
  const open = useGame((s) => (s.cleared['4-3'] ?? 0) > 0);
  const best = useGame((s) => s.conquestBest);
  const failFloor = useGame((s) => s.conquestFailFloor);
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const startConquest = useGame((s) => s.startConquest);
  const land = useLandscape();

  const imprint = imprintBonus(best);
  const floor = useMemo(() => conquestFloor(best + 1), [best]);
  const enemyProf = useMemo(() => enemyUnitsToProfiles(floor.enemies), [floor]);
  const mine = useMemo(() => playerProfiles(formation, roster, gear, imprint), [formation, roster, gear, imprint]);
  const upcoming = useMemo(() => [2, 3, 4, 5, 6].map((d) => {
    const f = best + d;
    const info = conquestFloor(f);
    return { f, boss: info.boss, theme: info.theme, unified: info.unified };
  }), [best]);

  if (!open) {
    const locked = (
      <div className="mx-auto max-w-md rounded-2xl border border-stone-800 bg-stone-900/60 p-8 text-center">
        <Lock size={32} className="mx-auto text-stone-500" />
        <p className="mt-3 font-serif text-lg font-black">4-3 잠금</p>
      </div>
    );
    if (land) return locked;
    return (
      <Desk title="도전" hanja="挑戰" slips={slips} seal="討伐" scrollTitle="토벌전"
        scroll={<p className="text-xs font-bold">4-3 잠금</p>}>
        {locked}
      </Desk>
    );
  }

  const recordBox = (
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <Crown size={36} className="shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-stone-400">최고 기록{best >= UNIFY_FLOOR ? ' · 천하통일' : ` · ${UNIFY_FLOOR}층 통일`}</div>
          <div className="font-serif text-2xl font-black text-amber-200">{best}층</div>
          {imprint > 0 && <div className="text-[11px] text-amber-300/90">각인 +{(imprint * 100).toFixed(1)}%</div>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {upcoming.map((u) => (
            <span key={u.f} className={cn('rounded-lg px-2 py-1 text-[11px]', u.boss || u.unified ? 'bg-red-500/15 font-bold text-red-300' : 'bg-stone-800 text-stone-300')}>
              {u.f}층 {themeLabel(u.theme)}{u.boss && ' 👑'}
            </span>
          ))}
        </div>
      </div>
  );
  const asidePanels = (
    <>
          <Panel title="출진" icon={<Swords size={15} />}>
            <div className="space-y-3">
              <Btn size="lg" className="w-full" disabled={mine.length === 0} onClick={() => startConquest()}>
                <Swords size={18} /> {floor.floor}층
              </Btn>
              {!land && <TroopAdviceBox enemy={enemyProf} mine={mine} />}
              <PowerCompare mine={sumPower(mine)} enemy={sumPower(enemyProf)} />
              <CounterFormationButton
                enemies={floor.enemies}
                unlocked={failFloor === floor.floor}
                lockedNote="이 층에서 1회 패배 후 개방"
                className="w-full"
              />
              <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                {floor.boss && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-red-300">{floor.floor}층 정예</span>}
                <span className="rounded bg-stone-800 px-1.5 py-0.5 text-stone-300">패배 금 10% · 경험 30%</span>
              </div>
            </div>
          </Panel>

          <Panel title={`${floor.floor}층 · ${themeLabel(floor.theme)}${floor.boss ? ' (정예)' : ''}`} icon={<Mountain size={15} />}>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-stone-400">적 Lv.{floor.level}{floor.stars > 0 && ` · ★${floor.stars}`}</span>
              <span className="flex items-center gap-1 text-amber-300"><Coins size={13} /> {floor.reward.gold}</span>
              <span className="text-stone-400">EXP {floor.reward.exp}</span>
              {floor.boss && <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-bold text-red-300">보스층</span>}
            </div>
            <EnemyLineup units={enemyProf} />
          </Panel>
    </>
  );

  if (land) {
    return (
      <div className="grid h-full min-h-0 grid-cols-[13.5rem_minmax(0,1fr)] gap-1.5 overflow-hidden">
        <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <Crown size={18} className="shrink-0 text-amber-300" />
            <span className="font-serif text-lg font-black text-amber-200">{best}층</span>
            <span className="truncate text-[10px] text-stone-400">{upcoming.map((u) => `${u.f}${u.boss ? '👑' : ''}`).join(' ')}</span>
          </div>
          <Btn size="sm" className="w-full" disabled={mine.length === 0} onClick={() => startConquest()}>
            <Swords size={15} /> {floor.floor}층
          </Btn>
          <PowerCompare mine={sumPower(mine)} enemy={sumPower(enemyProf)} />
          <CounterFormationButton
            enemies={floor.enemies}
            unlocked={failFloor === floor.floor}
            lockedNote="이 층에서 1회 패배 후 개방"
            size="sm"
            className="w-full"
          />
          <EnemyLineup units={enemyProf} />
          <p className="truncate text-[10px] font-bold text-stone-400">
            Lv.{floor.level} · 금 {floor.reward.gold} · EXP {floor.reward.exp}{floor.boss ? ' · 보스' : ''}
          </p>
        </div>
        <div className="min-h-0 overflow-hidden"><EditorSection enemy={enemyProf} /></div>
      </div>
    );
  }

  return (
    <Desk title="도전" hanja="挑戰" slips={slips} seal="討伐">
      <div className="space-y-4">
        {recordBox}
        <div className="grid gap-3 lg:grid-cols-2">{asidePanels}</div>
        <EditorSection enemy={enemyProf} />
      </div>
    </Desk>
  );
}

/** 적군을 보면서 바로 고치는 편성 편집기 */
function EditorSection({ enemy }: { enemy: UnitProfile[] }) {
  const land = useLandscape();
  return (
    <section className={land ? 'h-full min-h-0 overflow-hidden' : 'space-y-2'}>
      <div className={land ? 'hidden' : undefined}>
        <h3 className="flex items-center gap-1.5 font-serif text-lg font-black"><Swords size={16} className="text-red-300" /> 내 부대 편성</h3>
      </div>
      <FormationEditor enemy={enemy} />
    </section>
  );
}

function Decree({ slips }: { slips?: Slip[] }) {
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const gear = useGame((s) => s.gear);
  const best = useGame((s) => s.conquestBest);
  const claimed = useGame((s) => s.decreeClaimWeek);
  const startDecree = useGame((s) => s.startDecree);
  const land = useLandscape();
  const d = useMemo(() => decreeOfWeek(), []);
  const imprint = imprintBonus(best);
  const mine = useMemo(() => playerProfiles(formation, roster, gear, imprint), [formation, roster, gear, imprint]);
  const enemyProf = useMemo(() => enemyUnitsToProfiles(d.enemies), [d]);
  const okUnits = decreeFormationOk(formation, d.constraint);
  const okTroop = decreeTroopOk(formation, d.constraint, (id) => GENERAL_MAP[id]?.troop ?? null);
  const ok = okUnits && okTroop && mine.length > 0;
  const done = claimed === d.week;

  const body = (
    <div className={land ? 'grid h-full min-h-0 grid-cols-[13.5rem_minmax(0,1fr)] gap-1.5 overflow-hidden' : 'space-y-4'}>
      <Panel title={`이번 주 ${d.week}`} icon={<Target size={15} />}>
        <div className="space-y-2 text-xs">
          <p className="font-bold text-amber-200">제약 · {d.constraint.label}</p>
          <p className="text-stone-400">적 {themeLabel(d.theme)} Lv.{d.level} · 승리 금 {d.rewardGold}</p>
          {!okUnits && <p className="text-red-300">부대 수를 줄이세요</p>}
          {!okTroop && <p className="text-red-300">병과 제약을 맞추세요</p>}
          {done && <p className="text-emerald-300">이번 주 보상 수령 완료</p>}
          <Btn size={land ? 'sm' : 'lg'} className="w-full" disabled={!ok || done} onClick={() => startDecree()}>
            <Swords size={16} /> {done ? '완료' : '출진'}
          </Btn>
          <PowerCompare mine={sumPower(mine)} enemy={sumPower(enemyProf)} />
        </div>
      </Panel>
      {!land && <EnemyLineup units={enemyProf} />}
      <div className={land ? 'min-h-0 overflow-hidden' : undefined}>
        <EditorSection enemy={enemyProf} />
      </div>
    </div>
  );
  if (land) return body;
  return (
    <Desk title="도전" hanja="挑戰" slips={slips} seal="軍令">
      {body}
    </Desk>
  );
}

function sumPower(list: UnitProfile[]) {
  return list.reduce((s, p) => s + p.power, 0);
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold', active ? 'bg-stone-700 text-stone-100' : 'text-stone-500')}>
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors',
        active ? 'bg-red-700 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200')}>
      {children}
    </button>
  );
}
