// 장수 토큰 · 카드 · 시너지 배지 등 장수 관련 UI
import { Flame, Link2, Sparkles, Star, Users } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BOND_MAP, bondMembers } from '../data/bonds';
import { GEAR_MAP } from '../data/gear';
import { EFFECT_LABEL, FACTION, FACTIONS, RARITY, STAT_LABEL, TROOP } from '../data/meta';
import type { ActiveSynergy, SynergyResult } from '../engine/synergy';
import { gearSkill, gearStats, type GearBag } from '../engine/gear';
import { effectiveStats, expToNext, maxLevel, MAX_STARS, PROMOTE_COST, promoteTarget, shownRarity, type UnitProfile } from '../engine/unit';
import { EquippedGear } from './GearPanel';
import { useGame } from '../store/gameStore';
import type { GeneralDef, OwnedGeneral, Stats } from '../types';
import { portraitFullImageUrl, portraitImageUrl } from '../data/portraitImages';
import { Portrait } from './Portrait';
import { Bar, cn, Hint } from './ui';

const SIZE = {
  xs: { box: 'h-8 w-8 rounded-md border', troop: 'hidden' },
  sm: { box: 'h-10 w-10 rounded-lg border', troop: 'text-[10px] -bottom-1 -right-1' },
  md: { box: 'h-12 w-12 rounded-xl border-2', troop: 'text-xs -bottom-1 -right-1' },
  lg: { box: 'h-24 w-24 rounded-2xl border-2', troop: 'text-base -bottom-1.5 -right-1.5' },
  /** 부모 폭에 맞춘 정사각형 (편성 칸) */
  fill: { box: 'aspect-square w-full rounded-xl border-2', troop: 'text-sm -bottom-1 -right-1' },
};

/** 장수 토큰: 상반신 초상(SVG) + 등급 테두리 + 병과 이모지 */
export function GeneralToken({ def, size = 'md', className, rarity }: {
  def: GeneralDef; size?: keyof typeof SIZE; className?: string; rarity?: GeneralDef['rarity'];
}) {
  const s = SIZE[size];
  const img = portraitImageUrl(def.id);
  const rank = rarity ?? def.rarity;
  const troop = TROOP[def.troop];
  return (
    <div className={cn('relative shrink-0', className)}>
      <div className={cn('relative overflow-hidden bg-[#241B15]', s.box, RARITY[rank].border, FACTION[def.faction].frame, RARITY[rank].ring)}>
        {!img && (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[1.7em] text-[#E2B866]/30">{def.name}</span>
        )}
        {img ? <img src={img} alt={`${def.name} 초상`} loading="lazy" draggable={false} className="relative block h-full w-full object-cover object-top brightness-[1.35] contrast-[1.08]" />
          : <Portrait def={def} className="relative block h-full w-full" />}
      </div>
      {size !== 'xs' && (
        <span className={cn('seal absolute', s.troop)} aria-label={troop.label}>{troop.seal}</span>
      )}
    </div>
  );
}

export function RarityBadge({ rarity, className }: { rarity: GeneralDef['rarity']; className?: string }) {
  return <span className={cn('rounded px-1.5 py-px text-[10px] font-black tracking-wider', RARITY[rarity].badge, className)}>{rarity}</span>;
}

export function FactionBadge({ faction }: { faction: GeneralDef['faction'] }) {
  const f = FACTION[faction];
  return <span className={cn('rounded px-1.5 py-px text-[10px] font-bold text-white', f.bg)}>{f.label}</span>;
}

export function Stars({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return null;
  return (
    <span className={cn('inline-flex items-center gap-px text-amber-300', className)}>
      {Array.from({ length: n }, (_, i) => <Star key={i} size={10} fill="currentColor" strokeWidth={0} />)}
    </span>
  );
}

export function BondTag({ id, active }: { id: string; active?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px]',
      active ? 'border-amber-400/60 bg-amber-400/15 text-amber-200' : 'border-stone-700 text-stone-400')}
    >
      <Link2 size={9} />{id}
    </span>
  );
}

/** 도감/등용 결과용 세로 카드 */
export function GeneralCard({
  def, owned, onClick, className, highlight,
}: {
  def: GeneralDef; owned?: OwnedGeneral; onClick?: () => void; className?: string; highlight?: boolean;
}) {
  const rank = shownRarity(def.rarity, owned?.promote);
  const r = RARITY[rank];
  const faction = FACTION[def.faction];
  const sealed = owned === undefined && !highlight;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 p-3 text-center leading-relaxed transition-transform hover:-translate-y-0.5',
        sealed ? 'border-stone-600 bg-stone-800/80' : cn('bg-stone-900', faction.frame, faction.wash),
        highlight && r.glow, className,
      )}
    >
      <div className="relative flex w-full items-center justify-between">
        <RarityBadge rarity={rank} />
        <FactionBadge faction={def.faction} />
      </div>
      <GeneralToken def={def} rarity={rank} size="lg" className="relative mt-1" />
      <div className="relative">
        <div className={cn('font-serif text-lg font-black', owned || highlight ? 'text-stone-100' : 'text-stone-200')}>{def.name}</div>
        <div className="text-[11px] text-stone-500">{def.title}</div>
      </div>
      <div className="relative flex h-4 items-center gap-1 text-[11px] text-stone-400">
        {owned ? <>Lv.{owned.level} <Stars n={owned.stars} /></> : !highlight && '미등용'}
      </div>
    </button>
  );
}

const SYN_ICON = { bond: Link2, faction: Users, troop: Flame, sage: Sparkles } as const;
const SYN_STYLE = {
  bond: 'border-amber-400/50 bg-amber-400/10 text-amber-200',
  faction: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
  troop: 'border-orange-400/40 bg-orange-400/10 text-orange-200',
  sage: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
} as const;

function shortSynergy(s: ActiveSynergy) {
  if (s.kind === 'sage') return '명참모';
  const times = s.label.match(/×(\d+)/)?.[1];
  if (s.kind === 'faction') {
    const hit = FACTIONS.find((id) => s.label.startsWith(FACTION[id].full));
    return `${hit ? FACTION[hit].label : '세력'} ${times ?? ''}`.trim();
  }
  if (s.kind === 'troop') {
    const hit = (Object.keys(TROOP) as (keyof typeof TROOP)[]).find((id) => s.label.includes(TROOP[id].label));
    return `${hit ? TROOP[hit].label : '병과'} ${times ?? ''}`.trim();
  }
  const count = s.label.match(/\((\d+)/)?.[1] ?? '';
  return `${s.label.split(' (')[0]} ${count}`.trim();
}

export function SynergyBadge({ s }: { s: ActiveSynergy }) {
  const [open, setOpen] = useState(false);
  const Icon = SYN_ICON[s.kind];
  return (
    <button type="button" onClick={() => setOpen((v) => !v)}
      className={cn('animate-slide-in inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold', SYN_STYLE[s.kind], s.maxed && 'ring-1 ring-amber-500/50')}>
      <Icon size={12} />
      <span>{shortSynergy(s)}</span>
      {open && <span className="font-normal opacity-75">{s.detail.replaceAll('전투력', '공격')}</span>}
    </button>
  );
}

export function SynergyList({ synergy }: { synergy: SynergyResult; empty?: string }) {
  if (synergy.list.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {synergy.list.map((s) => <SynergyBadge key={s.key} s={s} />)}
    </div>
  );
}

/** 부대 요약 수치 */
export function UnitStats({ p }: { p: UnitProfile }) {
  const chainPct = Math.round(Math.min(0.85, p.synergy.chainRate + (p.chainBonus ?? 0)) * 100);
  return (
    <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
      <Stat label="전투력" value={p.power.toLocaleString()} strong />
      <Stat label="병력" value={p.hp.toLocaleString()} />
      <Stat label="전법" value={`${Math.round(p.skillRate * 100)}%`} />
      <Stat label="연쇄" value={`${chainPct}%`} accent />
    </div>
  );
}
function Stat({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-stone-950/60 px-1 py-1.5">
      <div className="text-stone-500">{label}</div>
      <div className={cn('tabular font-bold', strong ? 'text-amber-300' : accent ? 'text-red-300' : 'text-stone-200')}>{value}</div>
    </div>
  );
}

function wornSkill(owned: OwnedGeneral | undefined, bag: GearBag) {
  let power = 0;
  let rate = 0;
  for (const id of Object.values(owned?.gear ?? {})) {
    if (!id) continue;
    const piece = GEAR_MAP[id];
    const item = bag[id];
    if (!piece || !item) continue;
    const skill = gearSkill(piece, item);
    power += skill.power;
    rate += skill.rate;
  }
  return { power, rate };
}

/** 무력·통솔·위력·발동·지력. 스탯은 기존 필드만 쓰고, 전법 위력·발동을 나머지 두 축으로 둔다. */
function StatRadar({ stats, bonus, power, powerAdd, rate, rateAdd }: {
  stats: Stats; bonus: Stats; power: number; powerAdd: number; rate: number; rateAdd: number;
}) {
  const axes = [
    { label: '무력', value: stats.war + bonus.war, add: bonus.war, max: 160, text: String(stats.war + bonus.war) },
    { label: '통솔', value: stats.lead + bonus.lead, add: bonus.lead, max: 160, text: String(stats.lead + bonus.lead) },
    { label: '위력', value: power * (1 + powerAdd), add: powerAdd, max: 3.2, text: power.toFixed(1) },
    { label: '발동', value: rate + rateAdd, add: rateAdd, max: 0.7, text: `${Math.round((rate + rateAdd) * 100)}%` },
    { label: '지력', value: stats.int + bonus.int, add: bonus.int, max: 160, text: String(stats.int + bonus.int) },
  ];
  const cx = 140;
  const cy = 118;
  const radius = 68;
  const point = (i: number, scale: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
    return [cx + Math.cos(a) * radius * scale, cy + Math.sin(a) * radius * scale];
  };
  const ring = (scale: number) => axes.map((_, i) => point(i, scale).join(',')).join(' ');
  const shape = axes.map((axis, i) => point(i, Math.max(0.08, Math.min(1, axis.value / axis.max))).join(',')).join(' ');
  return (
    <svg viewBox="0 0 280 236" className="mx-auto w-full max-w-[280px]" role="img" aria-label={axes.map((a) => `${a.label} ${a.text}`).join(', ')}>
      {[0.33, 0.66, 1].map((scale) => (
        <polygon key={scale} points={ring(scale)} fill="none" stroke="currentColor" strokeOpacity={0.2} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.2} />;
      })}
      <polygon points={shape} fill="rgba(198,161,91,0.35)" stroke="#E2B866" strokeWidth="1.5" />
      {axes.map((axis, i) => {
        const [x, y] = point(i, 1.28);
        const [vx, vy] = point(i, Math.max(0.08, Math.min(1, axis.value / axis.max)));
        const addText = axis.label === '위력' || axis.label === '발동'
          ? (axis.add ? `+${Math.round(axis.add * 100)}%` : '')
          : (axis.add ? `+${axis.add}` : '');
        return (
          <g key={axis.label}>
            <text x={x} y={y} textAnchor="middle" className="fill-current text-[11px] font-bold">{axis.label}</text>
            <text x={vx} y={vy - 8} textAnchor="middle" className="fill-current text-[10px] font-bold">{axis.text}</text>
            {addText && <text x={vx} y={vy + 4} textAnchor="middle" className="fill-emerald-300 text-[9px] font-bold">{addText}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** 장수 상세 (모달 내용) */
export function GeneralDetail({ def, owned, onClose }: { def: GeneralDef; owned?: OwnedGeneral; onClose?: () => void }) {
  const gold = useGame((s) => s.gold);
  const promote = useGame((s) => s.promote);
  const roster = useGame((s) => s.roster);
  const level = owned?.level ?? 1;
  const steps = owned?.promote ?? 0;
  const rank = shownRarity(def.rarity, steps);
  const target = owned ? promoteTarget(def.rarity, steps) : null;
  const cost = target ? PROMOTE_COST[target] : 0;
  const gearBag = useGame((s) => s.gear);
  const stats = effectiveStats(def, level, owned?.stars ?? 0, steps);
  const bonus = owned ? gearStats(owned, gearBag) : { war: 0, int: 0, lead: 0 };
  const skillAdd = wornSkill(owned, gearBag);
  const cap = maxLevel(rank);
  const ready = !!owned && !!target && owned.level >= cap && owned.stars >= MAX_STARS;
  const ladder = def.rarity === 'R'
    ? [
      { rarity: 'R' as const, promote: 0, label: '태생' },
      { rarity: 'SR' as const, promote: 1, label: '1차 승급' },
      { rarity: 'SSR' as const, promote: 2, label: '2차 승급' },
    ]
    : def.rarity === 'SR'
      ? [{ rarity: 'SR' as const, promote: 0, label: '태생' }, { rarity: 'SSR' as const, promote: 1, label: '승급' }]
      : [{ rarity: 'SSR' as const, promote: 0, label: '태생' }];
  const faction = FACTION[def.faction];
  const troop = TROOP[def.troop];
  const fullImg = portraitFullImageUrl(def.id);
  const [showFull, setShowFull] = useState(false);
  return (
    <div className="space-y-3">
      <header className={cn('z-10', onClose && 'sticky top-0 -mx-5 -mt-5')}>
        <div className={cn('flex items-center gap-2 px-3 py-2.5 text-[#EFE6D5]', faction.bg)}>
          {fullImg ? (
            <button type="button" onClick={() => setShowFull(true)} className="shrink-0" aria-label={`${def.name} 전신 보기`}>
              <GeneralToken def={def} size="md" rarity={rank} />
            </button>
          ) : (
            <GeneralToken def={def} size="md" rarity={rank} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-widest opacity-80">{faction.full}</div>
            <div className="truncate font-serif text-xl font-bold leading-tight">{def.name}</div>
            <div className="truncate text-[11px] opacity-80">{def.title}</div>
          </div>
          <RarityBadge rarity={rank} />
          <span className="seal" aria-label={troop.label}>{troop.seal}</span>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="닫기" className="ml-1 flex h-11 w-11 items-center justify-center text-lg text-[#EFE6D5]">✕</button>
          )}
        </div>
      </header>

      {showFull && fullImg && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${def.name} 전신`}
          onClick={() => setShowFull(false)}
        >
          <img
            src={fullImg}
            alt={`${def.name} 전신`}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-lg bg-stone-800/90 px-3 py-1.5 text-sm text-stone-100"
            onClick={() => setShowFull(false)}
          >
            닫기
          </button>
        </div>,
        document.body,
      )}

      {owned && (
        <div className="rounded-xl border border-[#E2B866]/35 bg-stone-950/50 px-3 py-2 text-xs">
          <div className="mb-1 flex justify-between text-stone-300">
            <span>Lv.{owned.level}/{cap} <Stars n={owned.stars} className="ml-1" /></span>
            <span className="tabular">EXP {owned.exp} / {expToNext(owned.level)}</span>
          </div>
          <Bar value={owned.exp} max={expToNext(owned.level)} color="bg-[#E2B866]" />
          <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-400">★{owned.stars}/{MAX_STARS} · 중복 +4%{steps > 0 ? ` · ${def.rarity}→${rank}` : ''} <Hint text="중복 ★ · +4% · 최대 ★5. 품계 시 Lv1." /></div>
        </div>
      )}

      <StatRadar
        stats={stats}
        bonus={bonus}
        power={def.skill.power}
        powerAdd={skillAdd.power}
        rate={def.skill.rate}
        rateAdd={skillAdd.rate}
      />

      {owned ? <EquippedGear generalId={def.id} /> : (
        <p className="text-center text-[11px] text-stone-500">미등용 · 장비 3칸</p>
      )}

      <div>
        <div className="flex items-center gap-1 text-xs font-bold text-stone-400">
          품계
          <Hint text={def.rarity === 'SSR' ? '태생 SSR · 상한 Lv150' : '만렙·★5 → 품계 · Lv1. R는 SR·SSR 2회.'} />
        </div>
        <div className={cn('mt-2 grid gap-2', ladder.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
          {ladder.map((step) => {
            const stepCap = maxLevel(step.rarity);
            const current = steps === step.promote;
            const st = effectiveStats(def, current && owned ? owned.level : stepCap, owned?.stars ?? 0, step.promote);
            return (
              <div key={step.rarity} className={cn('rounded-xl border p-2 text-xs', current ? 'border-amber-400/70 bg-amber-400/10' : 'border-stone-800')}>
                <div className="flex items-center gap-1.5">
                  <RarityBadge rarity={step.rarity} />
                  <span className="font-bold">{step.label}</span>
                  {current && <span className="text-[10px] text-stone-500">현재</span>}
                </div>
                <div className="mt-1 text-stone-500">상한 Lv.{stepCap} · 무 {st.war} · 지 {st.int} · 통 {st.lead}</div>
                {step.promote > 0 && step.rarity !== 'R' && (
                  <div className="mt-1 text-[10px] text-stone-500">만렙·★{MAX_STARS} · 🪙{PROMOTE_COST[step.rarity].toLocaleString()} · Lv.1</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {owned && target && (
        <button
          type="button"
          disabled={!ready || gold < cost}
          onClick={() => promote(def.id)}
          className="flex w-full flex-col items-center rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-[#1c1612] disabled:opacity-40"
        >
          <span>{target} 승급</span>
          <span className="text-xs font-semibold">
            {ready
              ? `🪙${cost.toLocaleString()} · Lv.1 리셋 · 상한 ${maxLevel(target)}${gold < cost ? ' · 부족' : ''}`
              : `Lv.${owned.level}/${cap} · ★${owned.stars}/${MAX_STARS}`}
          </span>
        </button>
      )}
      {owned && !target && (
        <p className="text-center text-[11px] text-stone-500">최고 품계 · 상한 Lv.{cap}</p>
      )}

      <section className="rounded-xl border border-[#E2B866]/45 bg-stone-950/40 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="font-serif text-base font-bold text-[#B8332A]">【{def.skill.name}】</span>
          <span className="text-[10px] text-stone-500">{EFFECT_LABEL[def.skill.effect]} · {STAT_LABEL[def.skill.scaling]} 기반</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-stone-200">{def.skill.desc}</p>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
          전법 {Math.round((def.skill.rate + (skillAdd.rate ?? 0)) * 100)}%
          <Hint text="주장 직접 발동. 부장 연쇄 1·2단, 참모 3단, 보좌는 시너지." />
        </div>
      </section>

      <section className="space-y-2">
        <div className="font-serif text-sm font-bold">인연 관계</div>
        {def.bonds.length === 0 && <p className="text-[11px] text-stone-500">인연 없음</p>}
        {def.bonds.map((id) => {
          const bond = BOND_MAP[id];
          const members = bondMembers(id);
          return (
            <div key={id} className="rounded-xl border border-[#E2B866]/30 p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-sm font-bold">{id}</span>
                <span className="text-right text-[10px] text-stone-500">{bond?.desc}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {members.map((g) => {
                  const has = !!roster[g.id];
                  return (
                    <span key={g.id} className={cn(
                      'rounded border px-1.5 py-0.5 text-[11px]',
                      has ? 'border-[#E2B866] bg-[#E2B866]/15 font-bold text-[#2C221E]' : 'border-stone-500 text-stone-400 opacity-50 grayscale',
                      g.id === def.id && 'ring-1 ring-[#B8332A]',
                    )}>
                      {g.name}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
