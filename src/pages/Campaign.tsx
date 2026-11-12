import { Check, ChevronRight, Coins, Lock, Swords, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CounterFormationButton } from '../components/CounterFormation';
import { GeneralToken, SynergyList } from '../components/General';
import { TroopAdviceBox } from '../components/Matchup';
import { Btn, cn, Panel } from '../components/ui';
import { CHAPTERS, isUnlocked, STAGES } from '../data/stages';
import { FACTION } from '../data/meta';
import type { UnitProfile } from '../engine/unit';
import { enemyProfiles, playerProfiles, useGame } from '../store/gameStore';

export default function Campaign() {
  const cleared = useGame((s) => s.cleared);
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const startBattle = useGame((s) => s.startBattle);
  const setView = useGame((s) => s.setView);
  const focusStage = useGame((s) => s.focusStage);
  const setFocusStage = useGame((s) => s.setFocusStage);

  // 기본 선택: 마지막으로 본 스테이지, 없으면 아직 클리어 못 한 첫 스테이지
  const firstOpen = STAGES.find((s) => !cleared[s.id] && isUnlocked(s.id, cleared)) ?? STAGES[STAGES.length - 1];
  const [selected, setSelectedState] = useState(focusStage && isUnlocked(focusStage, cleared) ? focusStage : firstOpen.id);
  const setSelected = (id: string) => {
    setSelectedState(id);
    setFocusStage(id);
  };
  const stage = STAGES.find((s) => s.id === selected)!;

  const mine = useMemo(() => playerProfiles(formation, roster), [formation, roster]);
  const enemies = useMemo(() => enemyProfiles(selected), [selected]);
  const myPower = mine.reduce((s, p) => s + p.power, 0);
  const enemyPower = enemies.reduce((s, p) => s + p.power, 0);
  const clearedCount = STAGES.filter((s) => cleared[s.id]).length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl font-black">천하 원정</h2>
            <p className="text-xs text-stone-500">스테이지를 선택하고 편성한 부대로 출진하세요.</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-stone-400"><Trophy size={14} className="text-amber-400" /> {clearedCount} / {STAGES.length}</div>
        </div>

        {CHAPTERS.map((ch) => (
          <section key={ch.id}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-serif text-lg font-black text-red-200">제{ch.id}장 {ch.title}</span>
              <span className="text-xs text-stone-500">{ch.year}</span>
            </div>
            <p className="mb-2 text-xs text-stone-500">{ch.desc}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {STAGES.filter((s) => s.chapter === ch.id).map((s) => {
                const unlocked = isUnlocked(s.id, cleared);
                const done = (cleared[s.id] ?? 0) > 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setSelected(s.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                      selected === s.id ? 'border-red-500/70 bg-red-950/40' : 'border-stone-800 bg-stone-900/60 hover:border-stone-600',
                      !unlocked && 'opacity-40',
                    )}
                  >
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-serif text-sm font-black',
                      done ? 'bg-amber-400 text-stone-900' : unlocked ? 'bg-red-800 text-white' : 'bg-stone-800 text-stone-500')}>
                      {!unlocked ? <Lock size={14} /> : done ? <Check size={16} /> : s.id}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{s.title}</div>
                      <div className="text-[11px] text-stone-500">적 {s.enemies.length}부대 · Lv.{Math.max(...s.enemies.map((e) => e.level))}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <Panel title={`${stage.id} ${stage.title}`} icon={<Swords size={16} />}>
          <p className="mb-3 text-xs text-stone-400">{stage.desc}</p>

          <div className="mb-3 flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-amber-300"><Coins size={13} /> {stage.reward.gold}</span>
            <span className="text-stone-400">EXP {stage.reward.exp}</span>
            {!cleared[stage.id] && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-amber-200">첫 클리어 +{stage.firstClearGold}</span>}
          </div>

          <div className="mb-2 text-xs font-bold text-stone-400">적군 편성</div>
          <div className="space-y-2">
            {enemies.map((p, i) => <UnitPreview key={i} p={p} />)}
          </div>

          <div className="mt-3">
            <TroopAdviceBox enemy={enemies} mine={mine} />
          </div>

          <PowerCompare mine={myPower} enemy={enemyPower} />

          {mine.length === 0 ? (
            <div className="mt-3 space-y-2 text-center">
              <p className="text-xs text-red-300">출진할 부대가 없습니다. 주장을 1명 이상 배치하세요.</p>
              <Btn variant="outline" onClick={() => setView('formation')}>편성하러 가기 <ChevronRight size={14} /></Btn>
            </div>
          ) : (
            <Btn size="lg" className="mt-3 w-full" onClick={() => { setFocusStage(stage.id); startBattle(stage.id); }}>
              <Swords size={18} /> 출진! ({mine.length}부대)
            </Btn>
          )}
          <CounterFormationButton stageId={stage.id} className="mt-2 w-full" />
        </Panel>
      </div>
    </div>
  );
}

function UnitPreview({ p }: { p: UnitProfile }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex -space-x-2">
          {p.members.map((m, i) => m && <GeneralToken key={i} def={m.def} size="sm" />)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{p.name}</div>
          <div className="truncate text-[11px] text-stone-500">
            {p.members.map((m) => m && <span key={m.def.id} className={cn('mr-1', FACTION[m.def.faction].text)}>{m.def.name}</span>)}
            · Lv.{p.members[0]!.level}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-stone-500">전투력</div>
          <div className="tabular text-sm font-bold text-amber-300">{p.power.toLocaleString()}</div>
        </div>
      </div>
      <SynergyList synergy={p.synergy} empty="시너지 없음" />
    </div>
  );
}

function PowerCompare({ mine, enemy }: { mine: number; enemy: number }) {
  const total = mine + enemy || 1;
  const ratio = mine / (enemy || 1);
  const verdict = ratio >= 1.25 ? ['우세', 'text-emerald-300'] : ratio >= 0.95 ? ['접전', 'text-amber-300'] : ['열세', 'text-red-300'];
  return (
    <div className="mt-4 rounded-xl bg-stone-950/60 p-3">
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-stone-400">아군 <b className="tabular text-stone-100">{mine.toLocaleString()}</b></span>
        <span className={cn('font-bold', verdict[1])}>{verdict[0]}</span>
        <span className="text-stone-400"><b className="tabular text-stone-100">{enemy.toLocaleString()}</b> 적군</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-stone-800">
        <div className="bg-sky-500 transition-all" style={{ width: `${(mine / total) * 100}%` }} />
        <div className="flex-1 bg-red-600" />
      </div>
      <p className="mt-1.5 text-[10px] text-stone-500">전투력은 참고치입니다. 병과 상성과 연쇄 전법이 승부를 뒤집을 수 있습니다.</p>
    </div>
  );
}
