// 전투 재생 화면 — 미리 계산된 이벤트를 순서대로 보여 줌
import { ChevronRight, Coins, FastForward, RotateCcw, SkipForward, Swords, Trophy, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GeneralToken } from '../components/General';
import { Bar, Btn, cn } from '../components/ui';
import { getGeneral } from '../data/generals';
import { TROOP } from '../data/meta';
import { nextStage, STAGE_MAP } from '../data/stages';
import type { BattleEvent, Side } from '../engine/battle';
import type { UnitProfile } from '../engine/unit';
import { useGame } from '../store/gameStore';

const DELAY: Record<BattleEvent['kind'], number> = {
  start: 900, attack: 520, skill: 1050, chain: 1150, rout: 700, end: 400,
};

export default function BattlePage() {
  const battle = useGame((s) => s.battle);
  const closeBattle = useGame((s) => s.closeBattle);
  const startBattle = useGame((s) => s.startBattle);
  const setView = useGame((s) => s.setView);
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const logRef = useRef<HTMLDivElement>(null);

  const events = battle?.result.events ?? [];
  const ev = events[Math.min(idx, events.length - 1)];
  const done = idx >= events.length - 1;

  // 전투가 바뀌면 처음부터 재생
  useEffect(() => setIdx(0), [battle]);

  useEffect(() => {
    if (!battle || done) return;
    const t = setTimeout(() => setIdx((i) => i + 1), DELAY[ev.kind] / speed);
    return () => clearTimeout(t);
  }, [idx, speed, battle, done, ev]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [idx]);

  const log = useMemo(() => events.slice(0, idx + 1).reverse(), [events, idx]);

  if (!battle || !ev) {
    return <div className="py-20 text-center"><Btn onClick={closeBattle}>캠페인으로</Btn></div>;
  }

  const { result, reward, stageId } = battle;
  const stage = STAGE_MAP[stageId];
  const next = nextStage(stageId);
  const showBanner = ev.kind === 'skill' || ev.kind === 'chain';

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-stone-500">{stage.id}</div>
          <h2 className="font-serif text-xl font-black">{stage.title}</h2>
        </div>
        {!done && (
          <div className="flex gap-1.5">
            <Btn size="sm" variant="ghost" onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}>
              <FastForward size={13} /> ×{speed}
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setIdx(events.length - 1)}>
              <SkipForward size={13} /> 건너뛰기
            </Btn>
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
        {/* 전장 */}
        <div className="relative overflow-hidden rounded-2xl border border-stone-800 bg-[linear-gradient(180deg,#1c1917_0%,#0c0a09_50%,#1c1917_100%)] p-3">
          <SideRow side={1} units={result.units[1]} ev={ev} label="적군" />

          <div className="relative my-3 flex h-16 items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-red-900 to-transparent" />
            {showBanner ? (
              <div key={ev.id} className="animate-banner relative text-center">
                {ev.kind === 'chain' && (
                  <div className="flex items-center justify-center gap-1 text-sm font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
                    <Zap size={16} fill="currentColor" /> {ev.chainStep === 2 ? '연쇄 2단!!' : '연쇄 발동!'} <Zap size={16} fill="currentColor" />
                  </div>
                )}
                <div className={cn('font-serif font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]',
                  ev.kind === 'chain' ? 'text-3xl text-amber-200' : 'text-2xl text-red-200')}>
                  【{ev.skill}】
                </div>
                <div className="text-[11px] text-stone-300">{ev.caster}</div>
              </div>
            ) : ev.kind === 'start' ? (
              <div key={ev.id} className="animate-banner relative font-serif text-2xl font-black text-stone-100">전투 개시</div>
            ) : (
              <Swords size={20} className="relative text-stone-700" />
            )}
            {ev.kind === 'chain' && <div key={`f${ev.id}`} className="pointer-events-none absolute -inset-x-3 -inset-y-40 animate-flash bg-amber-300/10" />}
          </div>

          <SideRow side={0} units={result.units[0]} ev={ev} label="아군" />

          {done && <ResultOverlay
            win={result.win}
            reward={reward}
            maxChain={result.stats.maxChain}
            chains={result.stats.chains}
            onRetry={() => startBattle(stageId)}
            onNext={next && result.win ? () => startBattle(next.id) : undefined}
            nextTitle={next?.title}
            onFormation={() => { closeBattle(); setView('formation'); }}
            onCampaign={closeBattle}
          />}
        </div>

        {/* 전투 기록 */}
        <div ref={logRef} className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-stone-800 bg-stone-950/70 p-3 text-xs lg:max-h-[560px]">
          {log.map((e) => (
            <div key={e.id} className={cn('animate-slide-in leading-snug', logColor(e))}>
              {e.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function logColor(e: BattleEvent) {
  if (e.kind === 'chain') return 'font-bold text-amber-300';
  if (e.kind === 'skill') return 'font-semibold text-red-300';
  if (e.kind === 'rout') return 'text-stone-500 line-through decoration-red-500/60';
  if (e.kind === 'end' || e.kind === 'start') return 'font-bold text-stone-100';
  return e.actor?.side === 0 ? 'text-sky-200/80' : 'text-stone-400';
}

function SideRow({ side, units, ev, label }: { side: Side; units: UnitProfile[]; ev: BattleEvent; label: string }) {
  return (
    <div>
      <div className={cn('mb-1.5 text-[11px] font-bold', side === 0 ? 'text-sky-300' : 'text-red-300')}>{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {units.map((u, i) => {
          const hp = ev.hp[side][i];
          const acting = ev.actor?.side === side && ev.actor.idx === i && ev.kind !== 'rout';
          const hit = ev.hits.find((h) => h.side === side && h.idx === i);
          const routed = hp <= 0;
          return (
            // 같은 부대가 연달아 맞아도 흔들림이 다시 재생되도록 피격 시 key를 바꿔 다시 마운트
            <div key={hit?.kind === 'dmg' ? `${i}-${ev.id}` : i}
              className={cn('relative rounded-xl border p-2 transition-all',
                side === 0 ? 'border-sky-900/70 bg-sky-950/30' : 'border-red-900/70 bg-red-950/20',
                acting && 'animate-pulse-ring border-amber-400/80',
                hit?.kind === 'dmg' && 'animate-shake',
                routed && 'opacity-30 grayscale')}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{TROOP[u.troop].emoji}</span>
                <span className="truncate text-xs font-bold">{u.name}</span>
              </div>
              <div className="mt-1.5 flex -space-x-1.5">
                {u.members.map((m, mi) => m && (
                  <GeneralToken key={mi} def={getGeneral(m.def.id)} size="sm"
                    className={cn(acting && ev.caster === m.def.name && 'z-10 scale-110 transition-transform')} />
                ))}
              </div>
              <Bar value={hp} max={u.hp} className="mt-2" color={side === 0 ? 'bg-sky-500' : 'bg-red-500'} />
              <div className="tabular mt-0.5 text-right text-[10px] text-stone-400">{hp.toLocaleString()} / {u.hp.toLocaleString()}</div>
              {routed && <div className="absolute inset-0 flex items-center justify-center font-serif text-lg font-black text-red-400/90">궤멸</div>}
              {hit && (
                <span key={ev.id}
                  className={cn('animate-float-up pointer-events-none absolute left-1/2 top-2 font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)]',
                    hit.kind === 'heal' ? 'text-emerald-300' : ev.kind === 'chain' ? 'text-xl text-amber-300' : ev.kind === 'skill' ? 'text-lg text-red-300' : 'text-base text-stone-100')}>
                  {hit.kind === 'heal' ? '+' : '-'}{hit.amount}
                  {hit.matchup === 'adv' && <span className="ml-0.5 text-[10px] text-orange-300">상성!</span>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultOverlay({
  win, reward, maxChain, chains, onRetry, onNext, nextTitle, onFormation, onCampaign,
}: {
  win: boolean;
  reward: { gold: number; exp: number; firstClear: boolean; levelUps: { id: string; from: number; to: number }[] };
  maxChain: number; chains: number;
  onRetry: () => void; onNext?: () => void; nextTitle?: string; onFormation: () => void; onCampaign: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="animate-pop-in w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-5 text-center">
        {win ? <Trophy size={40} className="mx-auto text-amber-300" /> : <RotateCcw size={36} className="mx-auto text-stone-400" />}
        <div className={cn('mt-2 font-serif text-3xl font-black', win ? 'text-amber-200' : 'text-stone-300')}>{win ? '승 리' : '패 배'}</div>
        <div className="mt-1 text-xs text-stone-500">연쇄 발동 {chains}회 · 최대 {maxChain}단 연쇄</div>

        <div className="mt-4 space-y-1.5 rounded-xl bg-stone-950/70 p-3 text-sm">
          <div className="flex justify-between"><span className="text-stone-400">금화</span><span className="flex items-center gap-1 font-bold text-amber-300"><Coins size={14} />+{reward.gold}{reward.firstClear && <span className="text-[10px] text-amber-200">(첫 클리어 포함)</span>}</span></div>
          <div className="flex justify-between"><span className="text-stone-400">출진 장수 경험치</span><span className="font-bold">+{reward.exp}</span></div>
          {reward.levelUps.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 border-t border-stone-800 pt-2">
              {reward.levelUps.map((l) => (
                <span key={l.id} className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                  {getGeneral(l.id).name} Lv.{l.from}→{l.to}
                </span>
              ))}
            </div>
          )}
        </div>

        {!win && <p className="mt-3 text-xs text-stone-400">시너지를 맞추거나 상성을 고려해 편성을 바꿔 보세요. 다른 스테이지에서 경험치를 쌓는 것도 방법입니다.</p>}

        <div className="mt-4 grid gap-2">
          {onNext && <Btn onClick={onNext}>다음: {nextTitle} <ChevronRight size={15} /></Btn>}
          <div className="grid grid-cols-3 gap-2">
            <Btn variant="ghost" size="sm" onClick={onRetry}>다시 도전</Btn>
            <Btn variant="ghost" size="sm" onClick={onFormation}>편성</Btn>
            <Btn variant="ghost" size="sm" onClick={onCampaign}>원정 지도</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
