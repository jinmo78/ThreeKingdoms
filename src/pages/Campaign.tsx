import { Check, ChevronRight, Coins, Lock, Swords, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CounterFormationButton } from '../components/CounterFormation';
import { TroopAdviceBox } from '../components/Matchup';
import { PageHero } from '../components/PageHero';
import { PowerCompare, UnitPreview } from '../components/UnitPreview';
import { Btn, cn, Modal, Panel } from '../components/ui';
import { CHAPTERS, isUnlocked, STAGE_MAP, STAGES } from '../data/stages';
import { enemyProfiles, playerProfiles, useGame } from '../store/gameStore';

export default function Campaign() {
  const cleared = useGame((s) => s.cleared);
  const formation = useGame((s) => s.formation);
  const roster = useGame((s) => s.roster);
  const startBattle = useGame((s) => s.startBattle);
  const setView = useGame((s) => s.setView);
  const focusStage = useGame((s) => s.focusStage);
  const setFocusStage = useGame((s) => s.setFocusStage);

  // 기본 선택: 마지막으로 본 원정 스테이지. 모의전·토벌전 표시는 스테이지가 아니므로 쓰지 않는다.
  const firstOpen = STAGES.find((s) => !cleared[s.id] && isUnlocked(s.id, cleared)) ?? STAGES[STAGES.length - 1];
  const [selected, setSelectedState] = useState(
    focusStage && STAGE_MAP[focusStage] && isUnlocked(focusStage, cleared) ? focusStage : firstOpen.id,
  );
  const setSelected = (id: string) => {
    setSelectedState(id);
    setFocusStage(id);
  };
  const stage = STAGE_MAP[selected] ?? firstOpen;

  const mine = useMemo(() => playerProfiles(formation, roster), [formation, roster]);
  const enemies = useMemo(() => enemyProfiles(stage.id), [stage.id]);
  const myPower = mine.reduce((s, p) => s + p.power, 0);
  const enemyPower = enemies.reduce((s, p) => s + p.power, 0);
  const clearedCount = STAGES.filter((s) => cleared[s.id]).length;
  const [detailOpen, setDetailOpen] = useState(false);

  const stageBody = (
    <>
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
      <CounterFormationButton enemies={stage.enemies} unlocked={(cleared[stage.id] ?? 0) > 0} lockedNote="1회 클리어 후 개방" className="mt-2 w-full" />
    </>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <PageHero
          image="scene-campaign.webp"
          title="천하 원정"
          vivid
          aside={<div className="flex shrink-0 items-center gap-1 rounded-full bg-stone-950/70 px-2.5 py-1 text-xs text-stone-200"><Trophy size={14} className="text-amber-300" /> {clearedCount}/{STAGES.length}</div>}
        >
          <p className="mt-1 hidden text-xs text-stone-300 sm:block">스테이지를 선택하고 편성한 부대로 출진하세요.</p>
        </PageHero>

        <div className="sticky top-14 z-20 -mx-4 border-b border-stone-800 bg-stone-950 px-4 py-2 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{stage.id} {stage.title}</div>
              <div className="text-[11px] text-stone-500">{cleared[stage.id] ? '격파' : '미격파'} · 적 {stage.enemies.length}부대</div>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setDetailOpen(true)}>상세</Btn>
          </div>
          {mine.length === 0
            ? <Btn size="lg" variant="outline" className="mt-2 w-full" onClick={() => setView('formation')}>편성하러 가기</Btn>
            : <Btn size="lg" className="mt-2 w-full" onClick={() => { setFocusStage(stage.id); startBattle(stage.id); }}><Swords size={18} /> 출진</Btn>}
        </div>

        {CHAPTERS.map((ch) => (
          <section key={ch.id}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-serif text-lg font-black text-red-200">제{ch.id}장 {ch.title}</span>
              <span className="text-xs text-stone-500">{ch.year}</span>
            </div>
            <p className="mb-2 hidden text-xs text-stone-500 sm:block">{ch.desc}</p>
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
                      done ? 'bg-amber-400 text-[#1c1612]' : unlocked ? 'bg-red-800 text-white' : 'bg-stone-800 text-stone-500')}>
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

      <div className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:self-start">
        <Panel title={`${stage.id} ${stage.title}`} icon={<Swords size={16} />}>
          {stageBody}
        </Panel>
      </div>

      {detailOpen && (
        <Modal onClose={() => setDetailOpen(false)}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="font-serif text-lg font-black">{stage.id} {stage.title}</h3>
            <Btn size="sm" variant="ghost" onClick={() => setDetailOpen(false)}>닫기</Btn>
          </div>
          {stageBody}
          <Btn variant="ghost" className="mt-3 w-full" onClick={() => setDetailOpen(false)}>닫기</Btn>
        </Modal>
      )}
    </div>
  );
}
