// 도전 — 모의전(연습 전투) · 천하 토벌전(끝없는 도전)
import { BarChart3, ChevronRight, Coins, Crown, Dices, Eye, Lock, Mountain, Swords, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CounterFormationButton } from '../components/CounterFormation';
import { EnemyLineup } from '../components/EnemyLineup';
import { FormationEditor } from '../components/FormationEditor';
import { TroopAdviceBox } from '../components/Matchup';
import { PageHero } from '../components/PageHero';
import { PowerCompare } from '../components/UnitPreview';
import { Btn, cn, Panel } from '../components/ui';
import { ARMY_THEMES, practiceOpponent, themeLabel } from '../engine/aiArmy';
import { simulateBattle } from '../engine/battle';
import { conquestFloor } from '../engine/conquest';
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
  const [tab, setTab] = useState<'practice' | 'conquest'>('practice');
  const conquestOpen = useGame((s) => (s.cleared['4-3'] ?? 0) > 0);

  return (
    <div className="space-y-5">
      <PageHero
        image="scene-challenge.webp"
        title="도전"
        aside={
          <div className="flex shrink-0 gap-1 rounded-xl bg-stone-950/80 p-1">
            <TabBtn active={tab === 'practice'} onClick={() => setTab('practice')}><Target size={14} /> 모의전</TabBtn>
            <TabBtn active={tab === 'conquest'} onClick={() => setTab('conquest')}>
              {conquestOpen ? <Mountain size={14} /> : <Lock size={13} />} 토벌전
            </TabBtn>
          </div>
        }
      >
        <p className="mt-1 hidden text-xs text-stone-300 sm:block">AI 군단을 상대로 편성을 시험하거나, 끝없는 토벌전에 도전하세요.</p>
      </PageHero>
      {tab === 'practice' ? <Practice /> : <Conquest />}
    </div>
  );
}

// ---------------- 모의전 ----------------
function Practice() {
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const practice = useGame((s) => s.practice);
  const setPractice = useGame((s) => s.setPractice);
  const startPractice = useGame((s) => s.startPractice);
  const setView = useGame((s) => s.setView);
  const log = useGame((s) => s.practiceLog);
  const addRecord = useGame((s) => s.addPracticeRecord);
  const [measuring, setMeasuring] = useState(false);

  const mine = useMemo(() => playerProfiles(formation, roster), [formation, roster]);
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
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
            <Btn size="sm" variant="ghost" onClick={() => setPractice({ seed: randomSeed() })}><Dices size={13} /> 새 상대 뽑기</Btn>
            <p className="hidden text-[11px] text-stone-500 sm:block">
              상대는 해당 세력 장수 18명을 무작위로 뽑아 <b className="text-stone-300">자동 편성으로 시너지를 맞춘 AI 군단</b>입니다.
              모의전은 보상·경험치가 없습니다.
            </p>
          </div>
        </Panel>

        <Panel title={`상대: ${opponent}`} icon={<Swords size={15} />}>
          <EnemyLineup units={enemyProf} />
        </Panel>

        <EditorSection enemy={enemyProf} />
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Panel title="내 편성 시험" icon={<BarChart3 size={15} />}>
          {mine.length === 0 ? (
            <div className="space-y-2 text-center">
              <p className="text-xs text-red-300">출진할 부대가 없습니다.</p>
              <Btn variant="outline" onClick={() => setView('formation')}>편성하러 가기 <ChevronRight size={14} /></Btn>
            </div>
          ) : (
            <div className="space-y-3">
              <TroopAdviceBox enemy={enemyProf} mine={mine} />
              <PowerCompare mine={sumPower(mine)} enemy={sumPower(enemyProf)} />
              <div className="grid grid-cols-2 gap-2">
                <Btn onClick={() => startPractice(enemies, `모의전 · ${themeLabel(practice.theme)}`)}><Eye size={15} /> 관전</Btn>
                <Btn variant="gold" onClick={measure} disabled={measuring}>
                  <BarChart3 size={15} /> {measuring ? '측정 중…' : '100전 승률 측정'}
                </Btn>
              </div>
              <CounterFormationButton enemies={enemies} unlocked className="w-full" />
            </div>
          )}
        </Panel>

        <Panel title="측정 기록" icon={<BarChart3 size={15} />}>
          {log.length === 0 ? (
            <p className="text-xs text-stone-500">
              [100전 승률 측정]을 누르면 같은 100가지 전투 조건으로 승률을 재서 여기에 쌓입니다. 편성을 바꿔 가며 비교해 보세요.
            </p>
          ) : (
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
                    <span>평균 연쇄 {r.avgChains.toFixed(1)}회</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---------------- 천하 토벌전 ----------------
function Conquest() {
  const open = useGame((s) => (s.cleared['4-3'] ?? 0) > 0);
  const best = useGame((s) => s.conquestBest);
  const failFloor = useGame((s) => s.conquestFailFloor);
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const startConquest = useGame((s) => s.startConquest);

  const floor = useMemo(() => conquestFloor(best + 1), [best]);
  const enemyProf = useMemo(() => enemyUnitsToProfiles(floor.enemies), [floor]);
  const mine = useMemo(() => playerProfiles(formation, roster), [formation, roster]);
  const upcoming = useMemo(() => [2, 3, 4, 5, 6].map((d) => {
    const f = best + d;
    const boss = f % 5 === 0;
    return { f, boss, theme: boss ? 'mixed' as const : (['wei', 'shu', 'wu', 'qun'] as const)[(f - 1) % 4] };
  }), [best]);

  if (!open) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-stone-800 bg-stone-900/60 p-8 text-center">
        <Lock size={32} className="mx-auto text-stone-500" />
        <p className="mt-3 font-serif text-lg font-black">천하 토벌전</p>
        <p className="mt-1 text-xs text-stone-400">원정 4-3 「적벽」을 클리어하면 열립니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <Crown size={36} className="shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-stone-400">최고 기록</div>
          <div className="font-serif text-2xl font-black text-amber-200">{best}층</div>
          <p className="text-[11px] text-stone-500">층마다 위 → 촉 → 오 → 군웅 군단이 번갈아 나오고, 5층마다 정예 혼성군이 지킵니다.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {upcoming.map((u) => (
            <span key={u.f} className={cn('rounded-lg px-2 py-1 text-[11px]', u.boss ? 'bg-red-500/15 font-bold text-red-300' : 'bg-stone-800 text-stone-300')}>
              {u.f}층 {themeLabel(u.theme)}{u.boss && ' 👑'}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* 적군 + 출진: 모바일에서는 위, PC에서는 오른쪽에 고정 */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:order-last lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
          <Panel title={`${floor.floor}층 · ${themeLabel(floor.theme)}${floor.boss ? ' (정예)' : ''}`} icon={<Mountain size={15} />}>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-stone-400">적 Lv.{floor.level}{floor.stars > 0 && ` · ★${floor.stars}`}</span>
              <span className="flex items-center gap-1 text-amber-300"><Coins size={13} /> {floor.reward.gold}</span>
              <span className="text-stone-400">EXP {floor.reward.exp}</span>
              {floor.boss && <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-bold text-red-300">보스층</span>}
            </div>
            <EnemyLineup units={enemyProf} />
          </Panel>

          <Panel title="출진" icon={<Swords size={15} />}>
            <div className="space-y-3">
              <TroopAdviceBox enemy={enemyProf} mine={mine} />
              <PowerCompare mine={sumPower(mine)} enemy={sumPower(enemyProf)} />
              <Btn size="lg" className="w-full" disabled={mine.length === 0} onClick={() => startConquest()}>
                <Swords size={18} /> {floor.floor}층 도전!
              </Btn>
              {mine.length === 0 && <p className="text-center text-xs text-red-300">아래 편성에서 주장을 1명 이상 배치하세요.</p>}
              <CounterFormationButton
                enemies={floor.enemies}
                unlocked={failFloor === floor.floor}
                lockedNote="이 층에서 1회 패배 후 개방"
                className="w-full"
              />
              <p className="text-[11px] text-stone-500">
                같은 층의 적 구성은 고정입니다. 지면 금화 10%·경험치 30%를 받고, 편성을 바꿔 다시 도전할 수 있습니다.
              </p>
            </div>
          </Panel>
        </div>

        <div className="min-w-0">
          <EditorSection enemy={enemyProf} />
        </div>
      </div>
    </div>
  );
}

/** 적군을 보면서 바로 고치는 편성 편집기 */
function EditorSection({ enemy }: { enemy: UnitProfile[] }) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="flex items-center gap-1.5 font-serif text-lg font-black"><Swords size={16} className="text-red-400" /> 내 부대 편성</h3>
        <p className="hidden text-[11px] text-stone-500 sm:block">
          이 상대를 기준으로 상성 배지와 "주장 상성 유리/불리"가 표시됩니다. 여기서 바꾼 편성은 편성 탭과 같은 편성입니다.
        </p>
      </div>
      <FormationEditor enemy={enemy} unitGridClass="xl:grid-cols-3" />
    </section>
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
