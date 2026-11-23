// 전투 재생 화면 — 미리 계산된 이벤트를 순서대로 보여 줌 (엔진 로직은 그대로)
import { ChevronRight, FastForward, RotateCcw, ScrollText, SkipForward, Swords, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GeneralToken } from '../components/General';
import { sceneUrl } from '../components/PageHero';
import { Btn, cn, useLandscape } from '../components/ui';
import { GENERAL_MAP } from '../data/generals';
import { TROOP, UNIT_TINT } from '../data/meta';
import { nextStage } from '../data/stages';
import type { BattleEvent, Side } from '../engine/battle';
import { shownRarity, type UnitProfile } from '../engine/unit';
import { useGame, type BattleReward } from '../store/gameStore';
import type { GeneralDef } from '../types';

const DELAY: Record<BattleEvent['kind'], number> = {
  start: 900, attack: 560, skill: 1400, chain: 1450, rout: 700, end: 400,
};

export default function BattlePage() {
  const battle = useGame((s) => s.battle);
  const closeBattle = useGame((s) => s.closeBattle);
  const startMarch = useGame((s) => s.startMarch);
  const startPractice = useGame((s) => s.startPractice);
  const startConquest = useGame((s) => s.startConquest);
  const setView = useGame((s) => s.setView);
  const land = useLandscape();
  const [idx, setIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [rawLog, setRawLog] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [seenBattle, setSeenBattle] = useState(battle);
  const logRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  if (battle !== seenBattle) {
    setSeenBattle(battle);
    setIdx(0);
    setLogOpen(false);
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
    if (logOpen) logRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [idx, logOpen]);

  const heavy = (ev?.kind === 'skill' || ev?.kind === 'chain') && !!ev.hits?.some((h) => h.kind === 'dmg');
  useEffect(() => {
    if (!heavy || !fieldRef.current) return;
    try {
      fieldRef.current.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
        { duration: 340 / speed, easing: 'ease-in-out' },
      );
    } catch {
      /* 구형 WebView는 Element.animate 미지원 */
    }
  }, [idx, heavy, speed]);

  const log = useMemo(() => events.slice(0, idx + 1).reverse(), [events, idx]);
  const ticker = useMemo(() => log.slice(0, 3), [log]);

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
  const onNext = !result.win ? undefined
    : mode === 'stage' && next ? () => { closeBattle(); startMarch(next.id); }
      : mode === 'conquest' ? () => { startConquest(); } : undefined;
  const nextTitle = mode === 'stage' ? next?.title : mode === 'conquest' ? `${(battle.floor ?? 0) + 1}층` : undefined;
  const showCutin = ev.kind === 'skill' || ev.kind === 'chain';
  const showSideLog = !land || logOpen;

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#EAE0D0]"
      style={{ '--battle-speed': speed } as CSSProperties}
    >
      {/* 상단 전투 HUD (글로벌 헤더 대신) */}
      <div className="relative z-30 flex shrink-0 items-center gap-2 bg-[#EAE0D0]/90 px-3 py-2 text-[#2C221E] backdrop-blur land:py-1">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-stone-400">{battle.subtitle}</div>
          <h2 className="truncate font-serif text-lg font-black land:text-base">{battle.title}</h2>
        </div>
        {!done && (
          <div className="flex shrink-0 gap-1">
            <Btn size="sm" variant="ghost" onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}>
              <FastForward size={13} /> ×{speed}
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setIdx(events.length - 1)}>
              <SkipForward size={13} /> 건너뛰기
            </Btn>
          </div>
        )}
        {land && (
          <button
            type="button"
            aria-pressed={logOpen}
            aria-label={logOpen ? '기록 닫기' : '기록 열기'}
            onClick={() => setLogOpen((v) => !v)}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D99B26]/50',
              logOpen ? 'bg-[#B8332A] text-[#FAF6EE]' : 'bg-transparent text-[#2C221E]',
            )}
          >
            {logOpen ? <X size={14} /> : <ScrollText size={14} />}
          </button>
        )}
      </div>

      <div className={cn(
        'relative flex min-h-0 flex-1 flex-col',
        showSideLog && 'lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:flex-none',
        showSideLog && land && 'land:grid land:grid-cols-[minmax(0,1fr)_12rem] land:flex-none',
      )}>
        {/* 전장 — 항상 남은 높이를 채움 */}
        <div className="battle-stage relative min-h-0 flex-1 overflow-hidden bg-[#EAE0D0]">
          <img src={sceneUrl('scene-campaign.webp')} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-75" />
          <div className="pointer-events-none absolute inset-0 bg-[#EAE0D0]/45" />

          <div ref={fieldRef} className="relative flex h-full min-h-0 flex-col items-stretch justify-center gap-3 p-3 sm:gap-5 sm:p-4 lg:gap-8 land:gap-2 land:p-2">
            {showCutin && (
              <SkillCutin key={ev.id} ev={ev} units={result.units} />
            )}

            <SideRow side={1} units={result.units[1]} ev={ev} events={events} idx={idx} cinematic={speed === 1} speed={speed} label="적군" />

            <div className="relative z-[2] flex min-h-6 flex-none items-center justify-center land:min-h-3">
              {!showCutin && (ev.kind === 'start'
                ? <div key={ev.id} className="animate-banner font-serif text-2xl font-black text-[#2C221E]">전투 개시</div>
                : <Swords size={26} className="text-[#D99B26]" />)}
              {showCutin && <div className="h-px w-2/3 max-w-md bg-gradient-to-r from-transparent via-[#D99B26]/80 to-transparent" />}
            </div>

            <SideRow side={0} units={result.units[0]} ev={ev} events={events} idx={idx} cinematic={speed === 1} speed={speed} label="아군" />

            {/* 좌하단 미니 로그 티커 */}
            {!done && (
              <div className="pointer-events-none absolute bottom-2 left-2 z-20 w-[min(18rem,58%)] space-y-0.5 rounded-lg bg-[#FAF6EE]/90 px-2.5 py-1.5 text-xs leading-snug text-[#2C221E] backdrop-blur-sm land:bottom-1.5 land:left-1.5 land:text-[11px]">
                {ticker.map((e) => (
                  <div key={e.id} className="animate-slide-in truncate opacity-90">{briefLog(e)}</div>
                ))}
              </div>
            )}

            {done && (
              <ResultOverlay
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
              />
            )}
          </div>
        </div>

        {/* 기록 패널 — 세로: 아래/옆, 가로: 토글로만 */}
        {showSideLog && (
          <div
            ref={logRef}
            className={cn(
              'z-20 hidden min-h-0 space-y-1 overflow-y-auto border-[#D99B26]/35 bg-[#FAF6EE]/95 p-2.5 text-sm text-[#2C221E] lg:block lg:border-l',
              land && '!absolute inset-y-0 right-0 !block w-48 border-l shadow-xl',
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold text-stone-400">기록</span>
              <button
                type="button"
                aria-pressed={rawLog}
                onClick={() => setRawLog((v) => !v)}
                className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', rawLog ? 'bg-[#8e2a22] text-[#FAF6EE]' : 'bg-[#EAE0D0]/40')}
              >
                {rawLog ? '전문' : '요약'}
              </button>
            </div>
            {log.map((e) => (
              <LogLine key={e.id} e={e} raw={rawLog} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function briefLog(e: BattleEvent) {
  if (e.kind === 'skill') return e.skill ? `${e.skill}!` : '전법';
  if (e.kind === 'chain') return `${(e.chainStep ?? 0) + 1}단 연쇄!`;
  if (e.kind === 'attack') return e.hits[0] ? `💥 -${e.hits[0].amount}` : '공격';
  if (e.kind === 'rout') return '궤멸';
  if (e.kind === 'start') return '개시';
  if (e.kind === 'end') return '종료';
  return e.text;
}

function LogLine({ e, raw }: { e: BattleEvent; raw: boolean }) {
  const text = raw ? e.text : briefLog(e);
  if (e.kind === 'skill' || e.kind === 'chain') {
    const chain = e.kind === 'chain';
    const n = (e.chainStep ?? 0) + 1;
    return (
      <div className="animate-slide-in flex items-start gap-1.5 leading-snug">
        <span className={cn('mt-px shrink-0 rounded-sm px-1 font-serif text-[10px] font-black',
          chain ? 'bg-[#B8332A] text-[#FAF6EE]' : 'bg-[#D99B26] text-[#3D261C]')}>
          {chain ? `${n}연쇄` : '전법'}
        </span>
        <span className={chain ? 'font-bold text-red-300' : 'font-semibold text-amber-200'}>{text}</span>
      </div>
    );
  }
  const calm = e.kind === 'rout' ? 'text-[#8a8178] line-through decoration-[#B8332A]/50'
    : e.kind === 'end' || e.kind === 'start' ? 'font-bold'
      : 'text-[#C9BBA6]';
  return <div className={cn('animate-slide-in leading-snug', calm)}>{text}</div>;
}

function findCaster(units: UnitProfile[][], ev: BattleEvent): { def: GeneralDef; promote: number } | null {
  if (!ev.actor || !ev.caster) return null;
  const unit = units[ev.actor.side]?.[ev.actor.idx];
  const m = unit?.members.find((x) => x?.def.name === ev.caster);
  return m ? { def: m.def, promote: m.promote } : null;
}

/** 전법 컷인 — 세로 중앙 전체 너비 배너 + 초상 25%/75% */
function SkillCutin({
  ev, units,
}: {
  ev: BattleEvent; units: UnitProfile[][];
}) {
  const ally = ev.actor?.side === 0;
  const caster = findCaster(units, ev);
  const chain = ev.kind === 'chain' && !!ev.chainStep;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div key={`dim-${ev.id}`} className="ink-dim absolute inset-0 bg-[#060a12]/78" />
      <div
        key={`cut-${ev.id}`}
        className={cn(
          'skill-cutin absolute w-full',
          ally ? 'skill-banner-ally' : 'skill-banner-enemy',
        )}
      >
        <div className="relative flex h-24 w-full items-center sm:h-28 land:h-16">
          {/* 시전 장수 초상: 아군 좌측 25% · 적군 우측 25% */}
          <div
            className={cn(
              'absolute top-1/2 z-[1] -translate-y-1/2 rounded-xl p-[3px]',
              ally ? 'left-[25%] -translate-x-1/2 skill-aura-ally' : 'left-[75%] -translate-x-1/2 skill-aura-enemy',
            )}
          >
            {caster ? (
              <GeneralToken
                def={caster.def}
                rarity={shownRarity(caster.def.rarity, caster.promote)}
                size="lg"
                className="!h-16 !w-16 sm:!h-20 sm:!w-20 land:!h-12 land:!w-12"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-stone-900 font-serif text-xl text-amber-200 sm:h-20 sm:w-20 land:h-12 land:w-12">⚔</div>
            )}
          </div>

          {/* 전법명 정중앙 */}
          <div className="absolute left-1/2 top-1/2 z-[2] flex max-w-[70%] -translate-x-1/2 -translate-y-1/2 flex-col items-center px-2 text-center text-[#FAF6EE]">
            <div className="truncate font-serif text-[10px] tracking-[0.25em] text-[#FAF6EE]/90 sm:text-xs">{ev.caster}</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="truncate font-serif text-2xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] sm:text-4xl land:text-xl">
                【{ev.skill}】
              </span>
              {chain && (
                <span key={`seal-${ev.id}`} className="chain-seal animate-chain-stamp">
                  {ev.chainStep}단 연쇄!
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TroopBar({ value, max, speed }: { value: number; max: number; speed: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-[#3D261C]/55 land:h-2">
      <div className="absolute inset-y-0 left-0 bg-white/85" style={{ width: `${pct}%`, transition: `width ${0.28 / speed}s ease ${0.3 / speed}s` }} />
      <div className="absolute inset-y-0 left-0 bg-[#C45A32]" style={{ width: `${pct}%`, transition: `width ${0.08 / speed}s linear` }} />
    </div>
  );
}

/** 부대 카드 위쪽 바깥에서 떠오르는 대미지 팝업 */
function FloatingDamage({
  amount, kind, matchup, emphasis,
}: {
  amount: number; kind: 'dmg' | 'heal'; matchup?: 'adv' | 'dis' | 'even'; emphasis: 'chain' | 'skill' | 'normal';
}) {
  const heal = kind === 'heal';
  const adv = !heal && matchup === 'adv';
  return (
    <span
      className={cn(
        'animate-float-dmg pointer-events-none absolute left-1/2 -top-8 z-20 flex -translate-x-1/2 flex-col items-center whitespace-nowrap text-center font-black tabular-nums',
        heal && 'float-dmg-heal text-2xl sm:text-3xl',
        !heal && adv && 'float-dmg-gold text-3xl sm:text-5xl',
        !heal && !adv && emphasis === 'chain' && 'float-dmg-gold text-3xl sm:text-4xl',
        !heal && !adv && emphasis === 'skill' && 'float-dmg-crimson text-3xl sm:text-4xl',
        !heal && !adv && emphasis === 'normal' && 'float-dmg-crimson text-2xl sm:text-3xl',
      )}
    >
      {adv && (
        <span className="mb-0.5 rounded bg-[#D99B26]/25 px-1.5 py-px text-[10px] font-black tracking-wide text-[#FAF6EE] ring-1 ring-[#D99B26]/80 sm:text-xs">
          상성 유리
        </span>
      )}
      <span>{heal ? '+' : '-'}{amount.toLocaleString()}</span>
    </span>
  );
}

function SideRow({
  side, units, ev, events, idx, cinematic, speed, label,
}: {
  side: Side; units: UnitProfile[]; ev: BattleEvent; events: BattleEvent[]; idx: number; cinematic: boolean; speed: number; label: string;
}) {
  const land = useLandscape();
  const portrait = land ? 'xs' as const : 'sm' as const;
  const announced = new Set<number>();
  if (cinematic) {
    for (let n = 0; n <= idx; n++) {
      const e = events[n];
      if (e.kind === 'rout' && e.actor && e.actor.side === side) announced.add(e.actor.idx);
    }
  }
  return (
    <div className="relative z-[2] shrink-0">
      <div className={cn('mb-1.5 text-center text-xs font-bold sm:text-sm', side === 0 ? 'text-sky-300' : 'text-red-300')}>{label}</div>
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 land:gap-2">
        {units.map((u, i) => {
          const hp = ev.hp[side][i];
          const acting = ev.actor?.side === side && ev.actor.idx === i && (ev.kind === 'attack' || ev.kind === 'skill' || ev.kind === 'chain');
          const hit = ev.hits?.find((h) => h.side === side && h.idx === i);
          const routed = hp <= 0;
          const justRouted = cinematic && ev.kind === 'rout' && ev.actor?.side === side && ev.actor.idx === i;
          const legacyFade = !cinematic && routed;
          const casting = acting && (ev.kind === 'skill' || ev.kind === 'chain');
          const emphasis = ev.kind === 'chain' ? 'chain' : ev.kind === 'skill' ? 'skill' : 'normal';
          return (
            <div
              key={i}
              className={cn(
                'relative w-[31%] min-w-[8.5rem] max-w-[15rem] overflow-visible rounded-2xl border-2 p-2.5 transition-all sm:min-w-[10rem] sm:max-w-[17rem] sm:p-3 land:min-w-[7.25rem] land:max-w-[12rem] land:rounded-xl land:p-2',
                side === 0 ? UNIT_TINT[i]?.card ?? 'border-sky-900/70 bg-sky-950/55' : 'border-red-900/70 bg-red-950/50',
                acting && 'animate-pulse-ring border-amber-400/80',
                casting && 'synergy-glow',
                hit?.kind === 'dmg' && 'animate-hit-flash',
                legacyFade && 'opacity-40 grayscale',
              )}
            >
              <div
                key={(cinematic && acting) || hit?.kind === 'dmg' ? `go-${ev.id}` : 'still'}
                className={cn(
                  cinematic && acting && (side === 0 ? 'animate-lunge-up' : 'animate-lunge-down'),
                  hit?.kind === 'dmg' && 'animate-shake',
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-base sm:text-lg">{TROOP[u.troop].emoji}</span>
                  {side === 0 && <span className={cn('text-xs font-black sm:text-sm', UNIT_TINT[i]?.title)}>{i + 1}</span>}
                  <span className="truncate text-sm font-bold text-[#2C221E] sm:text-base">{u.name.replace(/ 부대$/, '')}</span>
                </div>
                <div className={cn(
                  'mt-2 grid grid-cols-3 justify-items-center gap-1 sm:grid-cols-6',
                  justRouted && 'animate-rout-sink',
                  (cinematic ? announced.has(i) : routed) && 'grayscale',
                  cinematic && announced.has(i) && !justRouted && 'translate-y-2.5 opacity-40',
                )}>
                  {u.members.map((m, mi) => m ? (
                    <div key={mi} className="relative">
                      <GeneralToken
                        def={m.def}
                        rarity={shownRarity(m.def.rarity, m.promote)}
                        size={portrait}
                        className={cn(acting && ev.caster === m.def.name && 'z-10 scale-125 transition-transform')}
                      />
                      {cinematic && hit?.kind === 'dmg' && (
                        <span className={cn(
                          'animate-portrait-hit pointer-events-none absolute left-0 top-0 rounded-lg',
                          land ? 'h-8 w-8 rounded-md' : 'h-10 w-10',
                        )} />
                      )}
                    </div>
                  ) : (
                    <div
                      key={mi}
                      className={cn(
                        'rounded-lg border border-dashed border-stone-700',
                        land ? 'h-8 w-8 rounded-md' : 'h-10 w-10',
                      )}
                    />
                  ))}
                </div>
              </div>
              <TroopBar value={hp} max={u.hp} speed={speed} />
              <div className="tabular mt-1 text-center text-xs font-semibold text-[#E7DCC8] sm:text-sm">{hp.toLocaleString()} / {u.hp.toLocaleString()}</div>
              {(cinematic ? announced.has(i) || justRouted : routed) && (
                <div className={cn('absolute inset-0 flex items-center justify-center', justRouted && 'animate-rout-pop')}>
                  <span className="seal px-1.5 py-2 font-serif text-sm tracking-widest">패퇴</span>
                </div>
              )}
              {hit && (
                <FloatingDamage
                  key={ev.id}
                  amount={hit.amount}
                  kind={hit.kind}
                  matchup={hit.matchup}
                  emphasis={emphasis}
                />
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 land:overflow-hidden">
      <div className="flex min-h-full items-center justify-center p-4 land:h-full land:min-h-0 land:p-2">
        <div className="animate-pop-in w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-5 text-center">
          {win ? <Trophy size={40} className="mx-auto text-amber-300" /> : <RotateCcw size={36} className="mx-auto text-stone-400" />}
          <div className={cn('mt-2 font-serif text-3xl font-black', win ? 'text-amber-200' : 'text-stone-300')}>{win ? '승리' : '패배'}</div>
          <div className="mt-1 text-xs text-stone-400">연쇄 {chains} · 최대 {maxChain}{maxChain >= 3 && ' 🔥'}</div>

          {siege && (
            <p className={cn('mt-3 text-xs font-bold', siege.captured ? 'text-amber-200' : 'text-stone-300')}>
              {siege.captured ? '점령' : `수비 ${siege.left}/${siege.total}`}
            </p>
          )}

          {reward ? (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-sm font-bold">
              {(reward.gold > 0 || reward.exp > 0) ? (
                <>
                  <span className="text-amber-300">금 +{reward.gold}</span>
                  <span>경험 +{reward.exp}</span>
                </>
              ) : (
                <span className="text-stone-400">보상 0</span>
              )}
              {reward.gear && <span className="text-amber-200">{reward.gear.isNew ? reward.gear.name : reward.gear.copy ? '장비 +1' : '파편 +1'}</span>}
              {reward.levelUps.map((l) => {
                const name = GENERAL_MAP[l.id]?.name;
                if (!name) return null;
                return <span key={l.id} className="text-emerald-300">{name} Lv.{l.to}</span>;
              })}
            </div>
          ) : (
            <p className="mt-4 text-xs font-bold text-stone-400">{mode === 'stage' ? '보상 0' : '보상 없음'}</p>
          )}

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
