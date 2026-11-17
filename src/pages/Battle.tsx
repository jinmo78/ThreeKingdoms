// 전투 재생 화면 — 미리 계산된 이벤트를 순서대로 보여 줌
import { ChevronRight, Coins, FastForward, RotateCcw, SkipForward, Swords, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GeneralToken } from '../components/General';
import { sceneUrl } from '../components/PageHero';
import { Btn, cn } from '../components/ui';
import { GENERAL_MAP } from '../data/generals';
import { FACTION, TROOP, UNIT_TINT } from '../data/meta';
import { nextStage } from '../data/stages';
import type { BattleEvent, Side } from '../engine/battle';
import { shownRarity, type UnitProfile } from '../engine/unit';
import { useGame, type BattleReward } from '../store/gameStore';

const DELAY: Record<BattleEvent['kind'], number> = {
  start: 900, attack: 520, skill: 1050, chain: 1150, rout: 700, end: 400,
};

export default function BattlePage() {
  const battle = useGame((s) => s.battle);
  const closeBattle = useGame((s) => s.closeBattle);
  const startMarch = useGame((s) => s.startMarch);
  const startPractice = useGame((s) => s.startPractice);
  const startConquest = useGame((s) => s.startConquest);
  const setView = useGame((s) => s.setView);
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [seenBattle, setSeenBattle] = useState(battle);
  const logRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // 새 전투의 첫 화면이 이전 인덱스를 잠깐 보여 주지 않게, 그리기 전에 되돌린다
  if (battle !== seenBattle) {
    setSeenBattle(battle);
    setIdx(0);
  }

  const events = battle?.result.events ?? [];
  const ev = events[Math.min(idx, events.length - 1)];
  const done = idx >= events.length - 1;

  useEffect(() => {
    if (!battle || done) return;
    const t = setTimeout(() => setIdx((i) => i + 1), DELAY[ev.kind] / speed);
    return () => clearTimeout(t);
  }, [idx, speed, battle, done, ev]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [idx]);

  // 전법 적중 때만 전장을 흔든다. 재생 타이머와는 별개라 배속을 바꿔도 전투가 멈추지 않는다
  const heavy = (ev?.kind === 'skill' || ev?.kind === 'chain') && !!ev.hits.some((h) => h.kind === 'dmg');
  useEffect(() => {
    if (!heavy || !fieldRef.current) return;
    fieldRef.current.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }],
      { duration: 320 / speed, easing: 'ease-in-out' },
    );
  }, [idx, heavy, speed]);

  const log = useMemo(() => events.slice(0, idx + 1).reverse(), [events, idx]);

  if (!battle || !ev) {
    return <div className="py-20 text-center"><Btn onClick={closeBattle}>캠페인으로</Btn></div>;
  }

  const { result, reward, mode } = battle;
  const next = mode === 'stage' && battle.stageId ? nextStage(battle.stageId) : null;
  const retry = () => {
    if (mode === 'stage') { closeBattle(); startMarch(battle.stageId!); }
    else if (mode === 'practice') startPractice(battle.enemies, battle.title);
    else startConquest();
  };
  // 다음: 원정은 다음 스테이지, 토벌전은 다음 층 (승리했을 때만)
  const onNext = !result.win ? undefined
    : mode === 'stage' && next ? () => { closeBattle(); startMarch(next.id); }
      : mode === 'conquest' ? () => { startConquest(); } : undefined;
  const nextTitle = mode === 'stage' ? next?.title : mode === 'conquest' ? `${(battle.floor ?? 0) + 1}층` : undefined;
  const showBanner = ev.kind === 'skill' || ev.kind === 'chain';

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-stone-500">{battle.subtitle}</div>
          <h2 className="font-serif text-xl font-black">{battle.title}</h2>
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* 전장. 적군이 위, 아군이 아래, 가운데가 컷인 */}
        <div
          className="battle-stage relative overflow-hidden rounded-2xl border border-[#C6A15B]/40 bg-[#171513] p-2 sm:p-3"
          style={{ '--battle-speed': speed } as CSSProperties}
        >
          <img src={sceneUrl('scene-campaign.webp')} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[#171513]/40" />
          <div ref={fieldRef} className="relative">
          {showBanner && <div key={`dim-${ev.id}`} className="ink-dim pointer-events-none absolute inset-0 z-[1] bg-[#171513]/60" />}
          <div className="relative z-[2]">
          <SideRow side={1} units={result.units[1]} ev={ev} events={events} idx={idx} cinematic={speed === 1} speed={speed} label="적군" />

          <CenterStage ev={ev} events={events} idx={idx} units={result.units} showBanner={showBanner} />

          <SideRow side={0} units={result.units[0]} ev={ev} events={events} idx={idx} cinematic={speed === 1} speed={speed} label="아군" />

          {done && <ResultOverlay
            win={result.win}
            reward={reward}
            siege={battle.siege}
            mode={mode}
            maxChain={result.stats.maxChain}
            chains={result.stats.chains}
            onRetry={retry}
            onNext={onNext}
            nextTitle={nextTitle}
            onFormation={() => { closeBattle(); setView('formation'); }}
            onCampaign={closeBattle}
            backLabel={mode === 'stage' ? '원정 지도' : '돌아가기'}
          />}
          </div>
          </div>
        </div>

        {/* 전투 기록 */}
        <div ref={logRef} className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-[#C6A15B]/35 bg-[#F3ECE0]/90 p-2 text-xs text-[#3a332c] lg:max-h-[560px] dark:bg-[#221E1A]/90 dark:text-[#E7DCC8]">
          {log.map((e) => (
            <LogLine key={e.id} e={e} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LogLine({ e }: { e: BattleEvent }) {
  if (e.kind === 'skill' || e.kind === 'chain') {
    const chain = e.kind === 'chain';
    const n = (e.chainStep ?? 0) + 1;
    return (
      <div className="animate-slide-in flex items-start gap-1.5 leading-snug">
        <span className={cn('mt-px shrink-0 rounded-sm px-1 font-serif text-[10px] font-black',
          chain ? 'bg-[#B8382E] text-[#F8E7D2]' : 'bg-[#C6A15B] text-[#171513]')}>
          {chain ? `${n}연쇄` : '전법'}
        </span>
        <span className={chain ? 'font-bold text-[#B8382E]' : 'font-semibold text-[#8A6230]'}>{e.text}</span>
      </div>
    );
  }
  const calm = e.kind === 'rout' ? 'text-[#8a8178] line-through decoration-[#B8382E]/50'
    : e.kind === 'end' || e.kind === 'start' ? 'font-bold'
      : 'text-[#4a433c] dark:text-[#C9BBA6]';
  return <div className={cn('animate-slide-in leading-snug', calm)}>{e.text}</div>;
}

/** 이번 전법 연쇄에 이름을 올린 장수. 주장 발동부터 현재 단계까지 */
function chainNames(events: BattleEvent[], idx: number): string[] {
  const ev = events[idx];
  if (!ev || (ev.kind !== 'skill' && ev.kind !== 'chain') || !ev.actor) return [];
  const names: string[] = [];
  for (let i = idx; i >= 0; i--) {
    const e = events[i];
    if ((e.kind !== 'skill' && e.kind !== 'chain') || e.actor?.side !== ev.actor.side || e.actor.idx !== ev.actor.idx) break;
    if (e.caster) names.unshift(e.caster);
    if (e.kind === 'skill') break;
  }
  return names;
}

function CenterStage({
  ev, events, idx, units, showBanner,
}: {
  ev: BattleEvent; events: BattleEvent[]; idx: number; units: UnitProfile[][]; showBanner: boolean;
}) {
  const names = ev.kind === 'chain' ? chainNames(events, idx) : [];
  const n = (ev.chainStep ?? 0) + 1;
  const hex = casterHex(units, ev);
  return (
    <div className="relative my-2 flex min-h-24 items-center justify-center overflow-hidden sm:min-h-28">
      <div className="absolute inset-x-4 top-1/2 h-px bg-gradient-to-r from-transparent via-[#B8382E] to-transparent" />
      {showBanner ? (
        <div key={ev.id} className="ink-cutin relative z-10 w-full max-w-[18rem] px-2 sm:max-w-md">
          <div
            className="px-3 py-2 text-center text-[#F8E7D2] shadow-lg"
            style={{
              background: `linear-gradient(100deg, transparent, ${hex} 8%, #171513 22%, #171513 78%, ${hex} 92%, transparent)`,
              clipPath: 'polygon(1% 22%, 6% 4%, 94% 0, 100% 68%, 96% 100%, 4% 88%)',
            }}
          >
            <div className="truncate font-serif text-[11px] tracking-widest sm:text-xs">{ev.caster}</div>
            <div className="truncate font-serif text-xl font-black sm:text-3xl">【{ev.skill}】</div>
          </div>
          {names.length > 1 && (
            <div className={cn('mt-1 flex flex-wrap items-center justify-center gap-1', comboClass(n))}>
              {names.map((name, i) => (
                <span key={`${name}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span className="text-[10px] text-[#C6A15B]">—</span>}
                  <span className="max-w-16 truncate rounded-sm border border-[#C6A15B]/70 bg-[#171513]/80 px-1 py-px font-serif text-[10px] text-[#F3ECE0]">{name}</span>
                </span>
              ))}
              <span className="font-serif font-black">{n}연쇄</span>
            </div>
          )}
        </div>
      ) : ev.kind === 'start' ? (
        <div key={ev.id} className="animate-banner relative font-serif text-2xl font-black text-[#F3ECE0]">전투 개시</div>
      ) : (
        <Swords size={20} className="relative text-[#C6A15B]" />
      )}
    </div>
  );
}

function comboClass(n: number) {
  if (n >= 4) return 'text-base text-[#F8E7D2] drop-shadow-[0_0_8px_rgba(184,56,46,0.9)] sm:text-xl';
  if (n >= 3) return 'text-sm text-[#B8382E] drop-shadow-[0_0_6px_rgba(198,161,91,0.8)] sm:text-lg';
  return 'text-xs text-[#C6A15B] sm:text-sm';
}

function casterHex(units: UnitProfile[][], ev: BattleEvent) {
  const unit = ev.actor ? units[ev.actor.side][ev.actor.idx] : undefined;
  const m = unit?.members.find((x) => x?.def.name === ev.caster);
  return m ? FACTION[m.def.faction].hex : '#C6A15B';
}

function TroopBar({ value, max, speed }: { value: number; max: number; speed: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[#171513]/50">
      <div className="absolute inset-y-0 left-0 bg-white/85" style={{ width: `${pct}%`, transition: `width ${0.28 / speed}s ease ${0.3 / speed}s` }} />
      <div className="absolute inset-y-0 left-0 bg-[#C45A32]" style={{ width: `${pct}%`, transition: `width ${0.08 / speed}s linear` }} />
    </div>
  );
}

function SideRow({
  side, units, ev, events, idx, cinematic, speed, label,
}: {
  side: Side; units: UnitProfile[]; ev: BattleEvent; events: BattleEvent[]; idx: number; cinematic: boolean; speed: number; label: string;
}) {
  // 1배속에서는 '궤멸' 이벤트에 도달한 뒤에만 쓰러진 상태로 둔다
  const announced = new Set<number>();
  if (cinematic) {
    for (let n = 0; n <= idx; n++) {
      const e = events[n];
      if (e.kind === 'rout' && e.actor && e.actor.side === side) announced.add(e.actor.idx);
    }
  }
  return (
    <div>
      <div className={cn('mb-1.5 text-[11px] font-bold', side === 0 ? 'text-sky-300' : 'text-red-300')}>{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {units.map((u, i) => {
          const hp = ev.hp[side][i];
          const acting = ev.actor?.side === side && ev.actor.idx === i && (ev.kind === 'attack' || ev.kind === 'skill' || ev.kind === 'chain');
          const hit = ev.hits.find((h) => h.side === side && h.idx === i);
          const routed = hp <= 0;
          const justRouted = cinematic && ev.kind === 'rout' && ev.actor?.side === side && ev.actor.idx === i;
          // 2·4배속은 카드 전체를 바로 흐리게. 1배속은 초상만 가라앉히고 '궤멸' 글자는 남긴다
          const legacyFade = !cinematic && routed;
          const casting = acting && (ev.kind === 'skill' || ev.kind === 'chain');
          return (
            <div key={i}
              className={cn('relative min-w-0 rounded-xl border p-1.5 transition-all sm:p-2',
                side === 0 ? UNIT_TINT[i]?.card ?? 'border-sky-900/70 bg-sky-950/30' : 'border-red-900/70 bg-red-950/20',
                acting && 'animate-pulse-ring border-amber-400/80',
                casting && 'synergy-glow',
                legacyFade && 'opacity-40 grayscale')}
            >
              <div key={(cinematic && acting) || hit?.kind === 'dmg' ? `go-${ev.id}` : 'still'}
                className={cn(
                  cinematic && acting && (side === 0 ? 'animate-lunge-up' : 'animate-lunge-down'),
                  hit?.kind === 'dmg' && 'animate-shake',
                )}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{TROOP[u.troop].emoji}</span>
                  {side === 0 && <span className={cn('text-[10px] font-black', UNIT_TINT[i]?.title)}>{i + 1}</span>}
                  <span className="truncate text-xs font-bold">{u.name}</span>
                </div>
                <div className={cn('mt-1.5 grid grid-cols-3 justify-items-center gap-0.5 sm:grid-cols-6',
                  justRouted && 'animate-rout-sink',
                  (cinematic ? announced.has(i) : routed) && 'grayscale',
                  cinematic && announced.has(i) && !justRouted && 'translate-y-2.5 opacity-40')}>
                  {u.members.map((m, mi) => m ? (
                    <div key={mi} className="relative">
                      <GeneralToken def={m.def} rarity={shownRarity(m.def.rarity, m.promote)} size="xs"
                        className={cn(acting && ev.caster === m.def.name && 'z-10 scale-125 transition-transform')} />
                      {cinematic && hit?.kind === 'dmg' && (
                        <span className="animate-portrait-hit pointer-events-none absolute left-0 top-0 h-8 w-8 rounded-md" />
                      )}
                    </div>
                  ) : <div key={mi} className="h-8 w-8 rounded-md border border-dashed border-stone-800" />)}
                </div>
              </div>
              <TroopBar value={hp} max={u.hp} speed={speed} />
              <div className="tabular mt-0.5 text-right text-[10px] text-[#E7DCC8]">{hp.toLocaleString()} / {u.hp.toLocaleString()}</div>
              {(cinematic ? announced.has(i) || justRouted : routed) && (
                <div className={cn('absolute inset-0 flex items-center justify-center', justRouted && 'animate-rout-pop')}>
                  <span className="seal px-1.5 py-2 font-serif text-sm tracking-widest">패퇴</span>
                </div>
              )}
              {hit && (
                <span key={ev.id}
                  className={cn('animate-float-up pointer-events-none absolute left-1/2 top-1 z-10 max-w-[9rem] -translate-x-1/2 whitespace-nowrap text-center font-black',
                    hit.kind === 'heal' ? 'text-sm text-emerald-300' : ev.kind === 'chain' ? 'text-base text-amber-200 sm:text-xl' : ev.kind === 'skill' ? 'text-sm text-red-200 sm:text-lg' : 'text-xs text-[#F3ECE0] sm:text-base')}>
                  {hit.kind === 'heal' ? '+' : '-'}{hit.amount}
                  {hit.matchup === 'adv' && <span className="ml-0.5 block text-[10px] font-bold text-orange-300">상성 유리!</span>}
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
  win, reward, siege, mode, maxChain, chains, onRetry, onNext, nextTitle, onFormation, onCampaign, backLabel,
}: {
  win: boolean;
  reward: BattleReward | null;
  siege?: { captured: boolean; left: number; total: number };
  mode: 'stage' | 'practice' | 'conquest';
  maxChain: number; chains: number;
  onRetry: () => void; onNext?: () => void; nextTitle?: string; onFormation: () => void; onCampaign: () => void; backLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="animate-pop-in w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-5 text-center">
        {win ? <Trophy size={40} className="mx-auto text-amber-300" /> : <RotateCcw size={36} className="mx-auto text-stone-400" />}
        <div className={cn('mt-2 font-serif text-3xl font-black', win ? 'text-amber-200' : 'text-stone-300')}>{win ? '승 리' : '패 배'}</div>
        <div className="mt-1 text-xs text-stone-500">연쇄 발동 {chains}회 · 최대 {maxChain}단 연쇄{maxChain >= 3 && ' 🔥'}</div>

        {siege && (
          <p className={cn('mt-3 rounded-lg px-3 py-2 text-xs font-bold', siege.captured ? 'bg-amber-500/15 text-amber-200' : 'bg-stone-950/70 text-stone-300')}>
            {siege.captured
              ? '🏯 성을 점령했다!'
              : `성은 아직 버티고 있다. 수비대 ${siege.left}/${siege.total}부대 남음 — 공격받은 수비대는 시간이 지나면 회복되고, 아군 부대도 약 3분이면 병력이 찬다.`}
          </p>
        )}

        {reward ? (
          <div className="mt-4 space-y-1.5 rounded-xl bg-stone-950/70 p-3 text-sm">
            {(reward.gold > 0 || reward.exp > 0) ? (
              <>
                <div className="flex justify-between"><span className="text-stone-400">금화</span><span className="flex items-center gap-1 font-bold text-amber-300"><Coins size={14} />+{reward.gold}{reward.firstClear && <span className="text-[10px] text-amber-200">(첫 클리어 포함)</span>}</span></div>
                <div className="flex justify-between"><span className="text-stone-400">출진 장수 경험치</span><span className="font-bold">+{reward.exp}</span></div>
              </>
            ) : (
              <p className="text-xs text-stone-400">금화·경험치는 첫 클리어에만 나옵니다.</p>
            )}
            {reward.gear && (
              <div className="flex justify-between border-t border-stone-800 pt-1.5">
                <span className="text-stone-400">장비</span>
                <span className="text-right font-bold text-amber-200">{reward.gear.name} {reward.gear.isNew ? '획득' : reward.gear.copy ? '1개 추가' : '파편 +1'}<span className="mt-0.5 block text-[10px] font-normal text-stone-400">편성 화면의 장비에서 확인</span></span>
              </div>
            )}
            {reward.levelUps.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 border-t border-stone-800 pt-2">
                {reward.levelUps.map((l) => {
                  const name = GENERAL_MAP[l.id]?.name;
                  if (!name) return null;
                  return (
                    <span key={l.id} className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                      {name} Lv.{l.from}→{l.to}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-stone-950/70 p-3 text-xs text-stone-400">
            {mode === 'stage'
              ? '이미 클리어한 전투라 금화·경험치는 없습니다. 이기면 가끔 장비 파편이 나옵니다.'
              : '모의전이라 보상과 경험치는 없습니다. 편성을 바꿔 가며 다시 시험해 보세요.'}
          </p>
        )}

        {!win && reward && <p className="mt-3 text-xs text-stone-400">시너지를 맞추거나 상성을 고려해 편성을 바꿔 보세요. 다른 스테이지에서 경험치를 쌓는 것도 방법입니다.</p>}

        <div className="mt-4 grid gap-2">
          {onNext && <Btn onClick={onNext}>다음: {nextTitle} <ChevronRight size={15} /></Btn>}
          <div className="grid grid-cols-3 gap-2">
            <Btn variant="ghost" size="sm" onClick={onRetry}>{mode === 'stage' ? '다시 출정' : '다시 도전'}</Btn>
            <Btn variant="ghost" size="sm" onClick={onFormation}>편성</Btn>
            <Btn variant="ghost" size="sm" onClick={onCampaign}>{backLabel}</Btn>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
